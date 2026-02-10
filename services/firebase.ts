import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Default Config (Updated with user provided credentials)
const DEFAULT_CONFIG = {
  apiKey: "AIzaSyDhJGMrYH0PXZkVASHfJ1Cb7-QSSQuTauE",
  authDomain: "omnifocus-7cb1a.firebaseapp.com",
  projectId: "omnifocus-7cb1a",
  storageBucket: "omnifocus-7cb1a.firebasestorage.app",
  messagingSenderId: "40728095284",
  appId: "1:40728095284:web:fd8898e755d33f92dd7861",
  measurementId: "G-V0TCKBN14G"
};

// Function to get config (checks LocalStorage first for overrides)
const getFirebaseConfig = () => {
  try {
    const saved = localStorage.getItem('omni_firebase_config');
    if (saved) {
      const config = JSON.parse(saved);
      if (config.apiKey && config.authDomain) {
        console.log("Using custom Firebase configuration from settings.");
        return config;
      }
    }
  } catch (e) {
    console.warn("Failed to parse custom firebase config from localStorage", e);
  }
  return DEFAULT_CONFIG;
};

// Initialize App
const app = initializeApp(getFirebaseConfig());

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics (Safe initialization)
let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(console.error);

export { analytics };