import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

// Your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDhJGMrYH0PXZkVASHfJ1Cb7-QSSQuTauE",
  authDomain: "omnifocus-7cb1a.firebaseapp.com",
  projectId: "omnifocus-7cb1a",
  storageBucket: "omnifocus-7cb1a.firebasestorage.app",
  messagingSenderId: "40728095284",
  appId: "1:40728095284:web:fd8898e755d33f92dd7861",
  measurementId: "G-V0TCKBN14G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * SYNC LOGIC: This listens for changes in the cloud 
 * and updates your local app automatically.
 */
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Logged in as:", user.email);
    
    // Listen for data changes in Firestore for this specific user
    onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log("Cloud data received:", data);
        
        // This triggers a custom event that your main app can listen to
        const syncEvent = new CustomEvent('firebase-sync', { detail: data });
        window.dispatchEvent(syncEvent);
      }
    });
  }
});

/**
 * SAVE LOGIC: Call this function when the timer ends 
 * to send data to the cloud.
 */
export const saveUserProgress = async (minutes) => {
  const user = auth.currentUser;
  if (user) {
    try {
      await setDoc(doc(db, "users", user.uid), {
        focusMinutes: minutes,
        lastUpdated: new Date()
      }, { merge: true });
      console.log("Progress saved to cloud!");
    } catch (error) {
      console.error("Error saving to cloud:", error);
    }
  }
};
