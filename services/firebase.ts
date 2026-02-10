import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";

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
 * MASTER SYNC LISTENER
 * This listens for ANY changes in the cloud and tells App.tsx to update.
 */
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Real-time sync active for:", user.email);
    
    onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        // This sends the "firebase-sync" signal that your App.tsx is waiting for
        const syncEvent = new CustomEvent('firebase-sync', { detail: data });
        window.dispatchEvent(syncEvent);
      }
    });
  }
});

/**
 * MASTER SAVE FUNCTION
 * This is the function App.tsx was looking for!
 * It saves all your subjects, goals, and sessions at once.
 */
export const syncAllData = async (data: any) => {
  const user = auth.currentUser;
  if (user) {
    try {
      await setDoc(doc(db, "users", user.uid), {
        ...data,
        lastUpdated: new Date()
      }, { merge: true });
      console.log("Cloud sync successful");
    } catch (error) {
      console.error("Cloud sync failed:", error);
    }
  }
};

// Kept for your older timer logic
export const saveUserProgress = async (minutes: number) => {
  await syncAllData({ focusMinutes: minutes });
};
