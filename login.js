// ================= Firebase v12.1.0 Imports =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ================= Firebase Config =================
const firebaseConfig = {
    apiKey: "AIzaSyDHXsOkRKsWmP1sVXewCMi-UgWAZ_bSSs8",
    authDomain: "titan-s-gym.firebaseapp.com",
    projectId: "titan-s-gym",
    storageBucket: "titan-s-gym.firebasestorage.app",
    messagingSenderId: "1072648769617",
    appId: "1:1072648769617:web:585c4771710684738fa870",
    measurementId: "G-Q5628B94NR"
};

// ================= Initialize Firebase =================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================= Show Page Immediately =================
// We no longer hide body — user can see the login form instantly
document.body.style.display = "block";

// ================= Login Form =================
const loginForm = document.getElementById("loginForm");
const statusMsg = document.getElementById("statusMsg");

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const loginBtn = loginForm.querySelector("button");
    loginBtn.disabled = true;

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        const isAdmin = userDoc.exists() && userDoc.data().isAdmin;

        statusMsg.textContent = "✅ Login successful! Redirecting...";

        // Handle redirect logic
        const urlParams = new URLSearchParams(window.location.search);
        const redirectTo = urlParams.get("redirect");
        const redirectUrl = redirectTo ? decodeURIComponent(redirectTo) : null;

        setTimeout(() => {
            if (isAdmin) {
                window.location.href = "admin.html";
            } else if (redirectUrl) {
                window.location.href = redirectUrl;
            } else {
                window.location.href = "dashboard.html";
            }
        }, 800);

    } catch (error) {
        statusMsg.textContent = `❌ Error: ${error.message}`;
    } finally {
        loginBtn.disabled = false;
    }
});

// ================= Forgot Password =================
const forgetLink = document.getElementById("forgetLink");

forgetLink.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();

    if (!email) {
        statusMsg.textContent = "❌ Please enter your email first";
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        statusMsg.textContent = "✅ Password reset email sent! Check your inbox.";
    } catch (error) {
        statusMsg.textContent = `❌ Error: ${error.message}`;
    }
});
