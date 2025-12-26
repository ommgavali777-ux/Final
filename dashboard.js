// ===============================
// 🔥 Firebase Imports
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
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
  measurementId: "G-Q5628B94NR",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===============================
// ⚙️ DOM Elements
// ===============================
const welcomeMsg = document.getElementById("welcomeMsg");
const statusMsg = document.getElementById("statusMsg");
const logoutBtn = document.getElementById("logoutBtn");
const entryBtn = document.getElementById("entryBtn");
const exitBtn = document.getElementById("exitBtn");
const attendanceTable = document.getElementById("attendanceTable");
const clockProgress = document.getElementById("clockProgress");
const timeSpent = document.getElementById("timeSpent");

// Membership card
const membershipCard = document.getElementById("membershipCard");
const membershipPlan = document.getElementById("membershipPlan");
const membershipDates = document.getElementById("membershipDates");
const membershipStatus = document.getElementById("membershipStatus");
const renewBtn = document.getElementById("renewBtn");

// Workout tracker
const workoutForm = document.getElementById("workoutLogForm");

// ===============================
// 🧩 Helper Functions
// ===============================
function safeToDate(ts) {
  if (!ts) return null;
  // Firestore Timestamp
  if (typeof ts.toDate === "function") return ts.toDate();
  // Object with seconds (older pattern)
  if (ts && ts.seconds) return new Date(ts.seconds * 1000);
  // ISO string or "YYYY-MM-DD" or number
  if (typeof ts === "string" || typeof ts === "number") {
    const d = new Date(ts);
    if (!isNaN(d.getTime())) return d;
    // try parsing YYYY-MM-DD specifically (avoid timezone shifts)
    const isoMatch = String(ts).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [_, y, m, day] = isoMatch;
      return new Date(Number(y), Number(m) - 1, Number(day));
    }
    return null;
  }
  if (ts instanceof Date) return ts;
  return null;
}

function updateClock(durationMinutes) {
  const percent = Math.min((durationMinutes / 180) * 100, 100);
  const offset = 100 - percent;
  if (clockProgress) {
    try { clockProgress.style.strokeDashoffset = offset; } catch (e) {}
  }
  const h = Math.floor(durationMinutes / 60);
  const m = durationMinutes % 60;
  if (timeSpent) timeSpent.textContent = `${h}h ${m}m`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ===============================
// 📍 Geolocation Verification
// ===============================
const GYM_LOCATION = { lat: 19.243463, lng: 73.172326 }; 
const GEOFENCE_RADIUS = 10000; // in meters

function distanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function verifyGymLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      alert("❌ Geolocation not supported.");
      resolve(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = distanceInMeters(
          pos.coords.latitude,
          pos.coords.longitude,
          GYM_LOCATION.lat,
          GYM_LOCATION.lng
        );
        if (dist <= GEOFENCE_RADIUS) resolve(true);
        else {
          alert(`❌ Too far from gym (${Math.round(dist)}m)`);
          resolve(false);
        }
      },
      () => {
        alert("⚠️ Please allow location access.");
        resolve(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

// ===============================
// 📅 Attendance
// ===============================
async function loadRecentAttendance(user) {
  try {
    const q = query(
      collection(db, "attendance"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const snap = await getDocs(q);
    attendanceTable.innerHTML = "";

    if (snap.empty) {
      attendanceTable.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-400">No attendance yet</td></tr>`;
      updateClock(0);
      return null;
    }

    let latest = null;
    snap.docs.forEach((docSnap, idx) => {
      const d = docSnap.data();
      if (idx === 0) latest = { id: docSnap.id, data: d };

      const entry = safeToDate(d.entryTime);
      const exit = safeToDate(d.exitTime);
      const durationMinutes = entry && exit ? Math.round((exit - entry) / 60000) : 0;

      const dateStr = d.date || (entry ? entry.toLocaleDateString() : "-");
      const entryStr = entry ? entry.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
      const exitStr = exit ? exit.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="py-2 px-3">${dateStr}, ${entryStr}</td>
        <td class="py-2 px-3">${exitStr}</td>
        <td class="py-2 px-3">${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m</td>
      `;
      attendanceTable.appendChild(tr);
    });

    if (latest) {
      const entry = safeToDate(latest.data.entryTime);
      const exit = safeToDate(latest.data.exitTime);
      const diff = entry && exit ? Math.round((exit - entry) / 60000) : 0;
      updateClock(diff);
    }
    return latest;
  } catch (err) {
    console.error("Error loading attendance:", err);
    attendanceTable.innerHTML = `<tr><td colspan="3" class="text-center text-red-400">Error loading history</td></tr>`;
    return null;
  }
}

// ===============================
// 🔘 Entry / Exit
// ===============================
async function markEntry(user) {
  const ok = await verifyGymLocation();
  if (!ok) return;

  try {
    const memberSnap = await getDoc(doc(db, "member", user.uid));
    const memberData = memberSnap.exists() ? memberSnap.data() : {};
    // Accept nested membership OR flat membership fields
    const membership = memberData.membership || {
      plan: memberData.plan,
      startDate: memberData.startDate,
      expiryDate: memberData.expiryDate,
      status: memberData.status
    };

    if (membership.status !== "active") {
      alert("❌ Membership not active.");
      return;
    }

    const dateStr = new Date().toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });

    await addDoc(collection(db, "attendance"), {
      uid: user.uid,
      date: dateStr,
      entryTime: serverTimestamp(),
      exitTime: null,
      createdAt: serverTimestamp(),
    });

    statusMsg.textContent = "✅ Entry marked!";
    await sleep(1000);
    await loadRecentAttendance(user);
    await updateButtonState(user);
  } catch (err) {
    console.error(err);
    alert("❌ Failed to mark entry.");
  }
}

async function markExit(user) {
  const ok = await verifyGymLocation();
  if (!ok) return;

  try {
    const q = query(
      collection(db, "attendance"),
      where("uid", "==", user.uid),
      where("exitTime", "==", null),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      alert("No open entry found!");
      return;
    }

    await updateDoc(snap.docs[0].ref, { exitTime: serverTimestamp() });
    statusMsg.textContent = "✅ Exit marked!";
    await sleep(1000);
    await loadRecentAttendance(user);
    await updateButtonState(user);
  } catch (err) {
    console.error(err);
    alert("❌ Failed to mark exit.");
  }
}

// ===============================
// 🔘 Button Display
// ===============================
async function updateButtonState(user) {
  const latest = await loadRecentAttendance(user);
  if (!latest) {
    entryBtn.classList.remove("hidden");
    exitBtn.classList.add("hidden");
    return;
  }

  const hasEntry = !!latest.data.entryTime;
  const hasExit = !!latest.data.exitTime;
  if (hasEntry && !hasExit) {
    entryBtn.classList.add("hidden");
    exitBtn.classList.remove("hidden");
  } else {
    entryBtn.classList.remove("hidden");
    exitBtn.classList.add("hidden");
  }
}

// ===============================
// 🧾 Membership Status
// ===============================
async function loadMembershipStatus(user) {
  const docSnap = await getDoc(doc(db, "member", user.uid));
  membershipCard.classList.remove("hidden");

  if (!docSnap.exists()) {
    console.log("🔥 Firestore membership data: no document for user", user.uid);
    membershipPlan.textContent = "No membership data found";
    membershipDates.textContent = `Start: - | Expiry: -`;
    membershipStatus.textContent = "❌ Not a member";
    membershipStatus.classList.remove("text-green-400", "text-yellow-400", "text-red-400");
    membershipStatus.classList.add("text-red-400");
    return {};
  }

  const raw = docSnap.data();
  console.log("🔥 Firestore membership data:", raw);

  // Support both structures: nested { membership: {...} } or flat { plan, startDate, expiryDate, status }
  const data = raw.membership ? raw.membership : {
    plan: raw.plan,
    startDate: raw.startDate,
    expiryDate: raw.expiryDate,
    status: raw.status
  };

  // Normalize dates
  let startDate = safeToDate(data.startDate);
  let expiryDate = safeToDate(data.expiryDate);

  // Fallback parsing for plain "YYYY-MM-DD" strings
  if (!startDate && typeof data.startDate === "string") startDate = new Date(data.startDate);
  if (!expiryDate && typeof data.expiryDate === "string") expiryDate = new Date(data.expiryDate);

  // Prepare display values (if date parsing fails, show the raw value)
  const startDisplay = startDate ? startDate.toLocaleDateString() : (data.startDate || "-");
  const expiryDisplay = expiryDate ? expiryDate.toLocaleDateString() : (data.expiryDate || "-");

  membershipPlan.textContent = `Plan: ${data.plan || "-"}`;
  membershipDates.textContent = `Start: ${startDisplay} | Expiry: ${expiryDisplay}`;

  // Clear color classes first
  membershipStatus.classList.remove("text-green-400", "text-yellow-400", "text-red-400");

  // Determine status (prefer the explicit status field; if missing, compute from expiry)
  let status = (data.status || "").toString().toLowerCase();
  if (!status) {
    if (expiryDate) {
      status = expiryDate >= new Date() ? "active" : "expired";
    } else {
      status = "pending";
    }
  }

  if (status === "active") {
    membershipStatus.textContent = "✅ Active";
    membershipStatus.classList.add("text-green-400");
  } else if (status === "pending") {
    membershipStatus.textContent = "⏳ Pending approval";
    membershipStatus.classList.add("text-yellow-400");
  } else {
    membershipStatus.textContent = "❌ Expired";
    membershipStatus.classList.add("text-red-400");
  }

  return data;
}

// ===============================
// 👤 Auth
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  welcomeMsg.textContent = `Welcome, ${user.email}`;
  const membership = await loadMembershipStatus(user);
  await loadRecentAttendance(user);
  await updateButtonState(user);
});

// ===============================
// 🔘 Listeners
// ===============================
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

entryBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (user) await markEntry(user);
});

exitBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (user) await markExit(user);
});

// ===============================
// 🏋️ Workout Logging
// ===============================
if (workoutForm) {
  workoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in.");

    const exerciseName = document.getElementById("exerciseName").value.trim();
    const workoutDate = document.getElementById("workoutDate").value;
    const weightKg = parseFloat(document.getElementById("weightKg").value);
    const sets = parseInt(document.getElementById("sets").value);
    const reps = parseInt(document.getElementById("reps").value);

    if (!exerciseName || !workoutDate || isNaN(weightKg) || isNaN(sets) || isNaN(reps)) {
      alert("Fill all workout fields.");
      return;
    }

    await addDoc(collection(db, "workouts"), {
      uid: user.uid,
      exerciseName,
      date: workoutDate,
      weightKg,
      sets,
      reps,
      createdAt: serverTimestamp(),
    });

    loadRecentWorkouts(user);
    workoutForm.reset();
  });
}

async function loadRecentWorkouts(user) {
  const q = query(
    collection(db, "workouts"),
    where("uid", "==", user.uid),
    orderBy("createdAt", "desc"),
    limit(5)
  );
  const snap = await getDocs(q);
  const tbody = document.getElementById("workoutHistory");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (snap.empty) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-gray-400 py-2">No workouts logged</td></tr>`;
    return;
  }
  snap.docs.forEach((docSnap) => {
    const w = docSnap.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 px-3">${w.date || "-"}</td>
      <td class="py-2 px-3">${w.exerciseName || "-"}</td>
      <td class="py-2 px-3">${w.weightKg || "-"}</td>
      <td class="py-2 px-3">${w.sets || "-"}</td>
      <td class="py-2 px-3">${w.reps || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}
