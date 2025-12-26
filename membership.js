// ===============================
// 🔥 Firebase Imports
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  addDoc,
  getDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ===============================
// 🔧 Firebase Config
// ===============================
const firebaseConfig = {
  apiKey: "AIzaSyDHXsOkRKsWmP1sVXewCMi-UgWAZ_bSSs8",
  authDomain: "titan-s-gym.firebaseapp.com",
  projectId: "titan-s-gym",
  storageBucket: "titan-s-gym.firebasestorage.app",
  messagingSenderId: "1072648769617",
  appId: "1:1072648769617:web:585c4771710684738fa870",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===============================
// ⚙️ DOM Elements
// ===============================
const planCards = document.querySelectorAll(".plan-card");
const selectedPlanDisplay = document.getElementById("selectedPlanDisplay");
const proceedBtn = document.getElementById("proceedBtn");
const paymentModal = document.getElementById("paymentModal");
const paymentModalCard = document.getElementById("paymentModalCard");
const confirmPaymentBtn = document.getElementById("confirmPaymentBtn");
const cancelBtn = document.getElementById("cancelBtn");
const modalCloseBtn = document.getElementById("modalCloseBtn");

let selectedPlan = null;
let currentUser = null;

// ===============================
// 💰 Plan Details
// ===============================
const planDetails = {
  "1month": { name: "1 Month", price: 700, months: 1 },
  "3months": { name: "3 Months", price: 1800, months: 3 },
  "yearly": { name: "Yearly", price: 6000, months: 12 },
};

// ===============================
// 🧮 Helper: Safe Month Add
// ===============================
function addMonthsSafe(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

// ===============================
// 👤 Auth Check
// ===============================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get("plan") || "";
    window.location.href = `login.html?redirect=membership.html?plan=${planParam}`;
    return;
  }
  currentUser = user;
});

// ===============================
// 🎨 Plan Selection Logic
// ===============================
function highlightPlan(planId) {
  planCards.forEach((card) =>
    card.classList.remove("ring-4", "ring-indigo-400", "scale-[1.02]")
  );
  const card = document.getElementById(`plan-${planId}`);
  if (card) card.classList.add("ring-4", "ring-indigo-400", "scale-[1.02]");
}

function selectPlan(planId) {
  selectedPlan = planId;
  highlightPlan(planId);
  const plan = planDetails[planId];
  selectedPlanDisplay.textContent = `✅ Selected: ${plan.name} — ₹${plan.price}`;
  proceedBtn.disabled = false;
}

planCards.forEach((card) => {
  card.addEventListener("click", () => {
    const id = card.id.replace("plan-", "");
    selectPlan(id);
  });
});

// Auto-select plan from URL
const urlParams = new URLSearchParams(window.location.search);
const selectedPlanFromURL = urlParams.get("plan");
if (selectedPlanFromURL && planDetails[selectedPlanFromURL]) {
  selectPlan(selectedPlanFromURL);
}

// ===============================
// 🧾 Save Pending Membership (Admin Verification)
// ===============================
async function savePendingMembership(planObj) {
  try {
    const now = new Date();
    const startDate = now.toISOString().split("T")[0];
    const expiryDate = addMonthsSafe(now, planObj.months).toISOString().split("T")[0];

    const memberRef = doc(db, "member", currentUser.uid);
    const memberSnap = await getDoc(memberRef);

    let userName = "Unknown";
    let userEmail = "Unknown";

    if (memberSnap.exists()) {
      const data = memberSnap.data();
      userName = data.name || currentUser.displayName || "Unknown";
      userEmail = data.email || currentUser.email || "Unknown";
    } else {
      userName = currentUser.displayName || "Unknown";
      userEmail = currentUser.email || "Unknown";
      await setDoc(memberRef, { name: userName, email: userEmail }, { merge: true });
    }

    const membershipObj = {
      plan: planObj.name,
      amount: planObj.price,
      startDate,
      expiryDate,
      status: "pending",
      paymentProof: "UPI_QR",
      paymentId: `MANUAL_${Date.now()}`,
      createdAt: serverTimestamp(),
    };

    // Save membership under member doc
    await setDoc(memberRef, { membership: membershipObj }, { merge: true });

    // Add payment record
    await addDoc(collection(db, "payments"), {
      uid: currentUser.uid,
      plan: planObj.name,
      amount: planObj.price,
      paymentId: membershipObj.paymentId,
      status: "pending",
      createdAt: serverTimestamp(),
      name: userName,
      email: userEmail
    });

    return { ok: true, membership: membershipObj };
  } catch (err) {
    console.error("❌ Error saving pending membership:", err);
    return { ok: false, error: err };
  }
}

// ===============================
// 💳 QR PAYMENT MODAL LOGIC
// ===============================
function openModal() {
  paymentModal.classList.remove("hidden");
  setTimeout(() => {
    paymentModalCard.classList.remove("scale-95", "opacity-0");
    paymentModalCard.classList.add("scale-100", "opacity-100");
  }, 20);
}

function closeModal() {
  paymentModalCard.classList.add("scale-95", "opacity-0");
  setTimeout(() => {
    paymentModal.classList.add("hidden");
  }, 200);
}

proceedBtn.addEventListener("click", () => {
  if (!selectedPlan) return alert("Please select a plan first.");
  if (!currentUser) return alert("Please log in to continue.");
  openModal();
});

cancelBtn.addEventListener("click", closeModal);
modalCloseBtn.addEventListener("click", closeModal);

// ===============================
// 🧾 Confirm Payment → Save as Pending
// ===============================
confirmPaymentBtn.addEventListener("click", async () => {
  if (!selectedPlan) return alert("Please select a plan first.");
  const plan = planDetails[selectedPlan];

  if (!confirm(`Have you completed the UPI payment of ₹${plan.price} for ${plan.name}? Click OK to record a pending request.`)) return;

  const res = await savePendingMembership(plan);
  if (res.ok) {
    alert("⏳ Payment recorded as PENDING. Admin will verify and activate your membership shortly.");
    selectedPlanDisplay.textContent = `⏳ ${plan.name} — Payment pending approval`;
    closeModal();
    window.location.href = "dashboard.html";
  } else {
    alert("❌ Failed to record payment. Check console for details.");
  }
});

// ===============================
// 🧩 Demo Mode (Simulated Payment)
// ===============================
function createDemoButton() {
  if (!urlParams.get("demo")) return;

  const demoBtn = document.createElement("button");
  demoBtn.textContent = "💡 Simulate Payment (Demo Mode)";
  demoBtn.className =
    "mt-3 bg-yellow-400 text-black px-4 py-2 rounded-md font-semibold hover:bg-yellow-500 transition";
  proceedBtn.insertAdjacentElement("afterend", demoBtn);

  demoBtn.addEventListener("click", async () => {
    if (!selectedPlan) return alert("Select a plan first!");
    if (!confirm(`Simulate payment for ${planDetails[selectedPlan].name}?`)) return;

    const res = await savePendingMembership(planDetails[selectedPlan]);
    if (res.ok) {
      alert("✅ Demo payment simulated — membership request pending admin approval!");
      window.location.href = "dashboard.html";
    } else {
      alert("❌ Saving failed. Check console.");
    }
  });
}
createDemoButton();
