
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration for Ekagrazone
const firebaseConfig = {
  apiKey: "AIzaSyBCVT9moOC9VSatrlNlyWBrbqWr0ZIRQ1A",
  authDomain: "ekagrazone.firebaseapp.com",
  projectId: "ekagrazone",
  storageBucket: "ekagrazone.firebasestorage.app",
  messagingSenderId: "1020160533794",
  appId: "1:1020160533794:web:6de09581a9fa536319317b",
  measurementId: "G-RX790Z2Y98"
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
