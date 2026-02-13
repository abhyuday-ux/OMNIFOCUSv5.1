
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
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

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app); // Realtime Database for Live Status
export const googleProvider = new GoogleAuthProvider();

// Analytics (safe init)
let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(console.error);

export { analytics };
