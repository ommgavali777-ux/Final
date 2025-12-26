// 1️⃣ Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword,updateProfile } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";  // ⭐ NEW

const firebaseConfig = {
        apiKey: "AIzaSyDHXsOkRKsWmP1sVXewCMi-UgWAZ_bSSs8",
        authDomain: "titan-s-gym.firebaseapp.com",
        projectId: "titan-s-gym",
        storageBucket: "titan-s-gym.firebasestorage.app",
        messagingSenderId: "1072648769617",
        appId: "1:1072648769617:web:585c4771710684738fa870",
        measurementId: "G-Q5628B94NR"
    };

// 3️⃣ Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 4️⃣ Grab form & status message
const signupForm = document.getElementById("signupForm")
const statusMsg = document.getElementById("statusMsg")

// 5️⃣ Listen to form submit
signupForm.addEventListener("submit", async (e) =>{
    e.preventDefault(); // page reload 
    // Disable the submit button to prevent multiple clicks
    const submitBtn = signupForm.querySelector("button");
    submitBtn.disabled = true;

    // 6️⃣ Grab user input
    const fullName = document.getElementById("fullName").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const mobile = document.getElementById("mobile").value;

    try{
        // 7️⃣ Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth,email,password);
        const uid = userCredential.user.uid;

        // ⭐ NEW → Update Firebase Auth profile with full name
        await updateProfile(userCredential.user,{
            displayName:fullName
        });
        const counterRef=doc(db,"metadata","counters");
        let newGymId;

        await runTransaction(db,async(transaction)=>{
            const counterDoc = await transaction.get(counterRef);

            let currentCount = 0;
            if(counterDoc.exists()){
                currentCount = counterDoc.data().memberCount || 0;
            }
            const nextCount = currentCount+1;
            newGymId = `GYM${String(nextCount).padStart(3,"0")}`;// e.g. GYM001

            // Update counter in transaction
            transaction.set(counterRef,{memberCount:nextCount},{merge:true});

        });

         // 8️⃣ Save extra info in Firestore
         await setDoc(doc(db,"member",uid),{
            gymId: newGymId,   
            fullName: fullName ,
            email: email ,
            mobile: mobile ,
            createdAt: serverTimestamp()


         });
         // 9️⃣ Show success message
         statusMsg.textContent = `✅ Registration successful! Your Gym ID is ${newGymId}`;
         signupForm.reset();

    }catch(error){
        // 10️⃣ Show error message
        statusMsg.textContent = `❌ Error: ${error.message}`;
    }finally {
        // Re-enable the button after success or error
        submitBtn.disabled = false;
    }
});