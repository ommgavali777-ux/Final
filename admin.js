// ---------------- Firebase Imports & Init ----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  updateDoc,
  setDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDHXsOkRKsWmP1sVXewCMi-UgWAZ_bSSs8",
  authDomain: "titan-s-gym.firebaseapp.com",
  projectId: "titan-s-gym",
  storageBucket: "titan-s-gym.firebasestorage.app",
  messagingSenderId: "1072648769617",
  appId: "1:1072648769617:web:585c4771710684738fa870",
  measurementId: "G-Q5628B94NR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------------- Admin Access Config ----------------
const ADMIN_EMAIL = "titanadmin@gmail.com";

// ---------------- Global State ----------------
let allData = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 10;
let currentSort = { field: "date", asc: false };

// ---------------- DOM Elements ----------------
const tableBody = document.getElementById("attendance-table");
const cardContainer = document.getElementById("attendance-cards");
const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");
const exportBottomBtn = document.getElementById("exportBtn");
const pagination = document.getElementById("pagination");
const headers = document.querySelectorAll("th[data-sort]");
const logoutBtn = document.getElementById("logoutBtn");

// ---------------- Functions ----------------
function renderTable(data) {
  tableBody.innerHTML = "";
  cardContainer.innerHTML = "";

  if (!data.length) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-400">No records found</td></tr>`;
    return;
  }

  const start = (currentPage - 1) * rowsPerPage;
  const paginated = data.slice(start, start + rowsPerPage);

  paginated.forEach(item => {
    tableBody.innerHTML += `
      <tr class="hover:bg-gray-800">
        <td class="py-2 px-3">${item.name || "Unknown"}</td>
        <td class="py-2 px-3">${item.email || "N/A"}</td>
        <td class="py-2 px-3">${item.uid || "N/A"}</td>
        <td class="py-2 px-3">${item.date || "N/A"}</td>
        <td class="py-2 px-3">${item.entryTime}</td>
        <td class="py-2 px-3">${item.exitTime}</td>
      </tr>
    `;

    cardContainer.innerHTML += `
      <div class="bg-gray-800/80 p-4 rounded-lg shadow">
        <p><span class="font-semibold text-indigo-400">Name:</span> ${item.name || "Unknown"}</p>
        <p><span class="font-semibold text-indigo-400">Email:</span> ${item.email || "N/A"}</p>
        <p><span class="font-semibold text-indigo-400">UID:</span> ${item.uid || "N/A"}</p>
        <p><span class="font-semibold text-indigo-400">Date:</span> ${item.date || "N/A"}</p>
        <p><span class="font-semibold text-indigo-400">Entry:</span> ${item.entryTime}</p>
        <p><span class="font-semibold text-indigo-400">Exit:</span> ${item.exitTime}</p>
      </div>
    `;
  });

  renderPagination(data.length);
}

function renderPagination(totalRows) {
  pagination.innerHTML = "";
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = `px-3 py-1 rounded ${i === currentPage ? "bg-indigo-600" : "bg-gray-700 hover:bg-gray-600"}`;
    btn.addEventListener("click", () => {
      currentPage = i;
      renderTable(filteredData);
    });
    pagination.appendChild(btn);
  }
}

function handleSearch() {
  const q = searchInput.value.toLowerCase();
  filteredData = allData.filter(item =>
    (item.name?.toLowerCase().includes(q)) ||
    (item.email?.toLowerCase().includes(q)) ||
    (item.uid?.toLowerCase().includes(q))
  );
  applyFilter();
}

function applyFilter() {
  const filter = filterSelect.value;
  const now = new Date();

  let temp = [...filteredData];
  if (filter === "today") {
    temp = temp.filter(item => {
      const d = new Date(item.date);
      return d.getDate() === now.getDate() &&
             d.getMonth() === now.getMonth() &&
             d.getFullYear() === now.getFullYear();
    });
  } else if (filter === "week") {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    temp = temp.filter(item => {
      const d = new Date(item.date);
      return d >= weekStart && d <= weekEnd;
    });
  } else if (filter === "month") {
    const month = now.getMonth();
    const year = now.getFullYear();
    temp = temp.filter(item => {
      const d = new Date(item.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }

  filteredData = temp;
  currentPage = 1;
  sortTable(currentSort.field, true); // Keep current sort
}

function sortTable(field, keepAsc) {
  if (!keepAsc) {
    if (currentSort.field === field) currentSort.asc = !currentSort.asc;
    else currentSort = { field, asc: true };
  }

  filteredData.sort((a, b) => {
    if (field === "date") {
      const valA = new Date(a.date);
      const valB = new Date(b.date);
      return currentSort.asc ? valA - valB : valB - valA;
    } else {
      const valA = (a[field] || "").toString().toLowerCase();
      const valB = (b[field] || "").toString().toLowerCase();
      if (valA < valB) return currentSort.asc ? -1 : 1;
      if (valA > valB) return currentSort.asc ? 1 : -1;
      return 0;
    }
  });

  renderTable(filteredData);
}

function exportCSV() {
  const headersCSV = ["Name", "Email", "UID", "Date", "Entry", "Exit"];
  const rows = filteredData.map(item => [
    item.name, item.email, item.uid, item.date, item.entryTime, item.exitTime
  ]);
  const csvContent = [headersCSV, ...rows].map(e => e.join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "attendance.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------- Event Listeners ----------------
searchInput.addEventListener("input", handleSearch);
filterSelect.addEventListener("change", handleSearch);
exportBottomBtn.addEventListener("click", exportCSV);
headers.forEach(h => h.addEventListener("click", () => sortTable(h.dataset.sort)));

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (err) {
    console.error("Logout error:", err);
  }
});

// ---------------- Admin Access Control ----------------
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    alert("Access denied: Only admin can view this page");
    window.location.href = "dashboard.html";
    return;
  }

  // Load attendance data
  tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-400">Loading...</td></tr>`;
  onSnapshot(collection(db, "attendance"), snapshot => {
    allData = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        name: d.name || "",
        email: d.email || "",
        uid: d.uid || "",
        date: d.date || "",
        entryTime: d.entryTime?.seconds
          ? new Date(d.entryTime.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : (d.entryTime || "N/A"),
        exitTime: d.exitTime?.seconds
          ? new Date(d.exitTime.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : (d.exitTime || "N/A")
      };
    });

    // Sort latest first by default
    allData.sort((a, b) => new Date(b.date) - new Date(a.date));
    filteredData = [...allData];
    currentPage = 1;
    renderTable(filteredData);
  });
});

// =================== MEMBERSHIP REQUEST MANAGEMENT ===================
const membershipSection = document.getElementById("membershipSection");
const attendanceSection = document.getElementById("attendanceSection");
const membershipTable = document.getElementById("membershipTable");
const membershipTab = document.getElementById("membershipTab");
const attendanceTab = document.getElementById("attendanceTab");

// Tab switching
membershipTab.addEventListener("click", () => {
  membershipSection.classList.remove("hidden");
  attendanceSection.classList.add("hidden");
  membershipTab.classList.add("bg-indigo-600");
  attendanceTab.classList.remove("bg-indigo-600");
  loadPendingMemberships();
});
attendanceTab.addEventListener("click", () => {
  membershipSection.classList.add("hidden");
  attendanceSection.classList.remove("hidden");
  attendanceTab.classList.add("bg-indigo-600");
  membershipTab.classList.remove("bg-indigo-600");
});

// Load pending requests
async function loadPendingMemberships() {
  membershipTable.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-400">Loading...</td></tr>`;
  const q = query(collection(db, "payments"), where("status", "==", "pending"));
  const snap = await getDocs(q);

  if (snap.empty) {
    membershipTable.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-400">No pending requests</td></tr>`;
    return;
  }

  membershipTable.innerHTML = "";
  snap.forEach((docSnap) => {
    const d = docSnap.data();
    const row = document.createElement("tr");
    row.className = "hover:bg-gray-800";

    const dateStr = d.createdAt?.toDate?.().toLocaleDateString() || "-";

    row.innerHTML = `
      <td class="py-2 px-3">${d.email || "Unknown"}</td>
      <td class="py-2 px-3">${d.plan}</td>
      <td class="py-2 px-3">₹${d.amount}</td>
      <td class="py-2 px-3">${dateStr}</td>
      <td class="py-2 px-3 flex gap-2">
        <button class="approve bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-white text-sm">Approve</button>
        <button class="reject bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white text-sm">Reject</button>
      </td>
    `;

    row.querySelector(".approve").addEventListener("click", async () => {
      if (!confirm(`Approve ${d.plan} for ${d.email}?`)) return;
      await approveMembership(docSnap.id, d);
      row.remove();
    });

    row.querySelector(".reject").addEventListener("click", async () => {
      if (!confirm(`Reject ${d.plan} for ${d.email}?`)) return;
      await updateDoc(doc(db, "payments", docSnap.id), { status: "rejected" });
      row.remove();
    });

    membershipTable.appendChild(row);
  });
}

async function approveMembership(paymentId, paymentData) {
  try {
    const userId = paymentData.uid;
    const memberRef = doc(db, "member", userId);
    const now = new Date();
    const expiry = new Date(now);
    expiry.setMonth(now.getMonth() + (paymentData.plan.includes("3") ? 3 : paymentData.plan.includes("Yearly") ? 12 : 1));

    const membership = {
      plan: paymentData.plan,
      amount: paymentData.amount,
      startDate: now.toISOString().slice(0,10),
      expiryDate: expiry.toISOString().slice(0,10),
      status: "active",
      createdAt: serverTimestamp()
    };
    await setDoc(memberRef, { membership }, { merge: true });

    await updateDoc(doc(db, "payments", paymentId), { status: "approved" });

    alert(`${paymentData.email} has been approved for ${paymentData.plan}`);
  } catch (err) {
    console.error("Error approving membership:", err);
    alert("Failed to approve membership. Check console for details.");
  }
}
