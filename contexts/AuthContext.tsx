import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { dbService } from '../services/db';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signupWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  signInWithGoogle: async () => {},
  signupWithEmail: async () => {},
  loginWithEmail: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use modular onAuthStateChanged
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      dbService.setUserId(user ? user.uid : null);
      
      if (user) {
        // Trigger sync on login
        try {
            await dbService.pullFromFirestore();
            window.dispatchEvent(new Event('omni_sync_complete'));
        } catch (e) {
            console.error("Auto-sync failed on login", e);
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleAuthError = (error: any) => {
      console.error("Auth error full details:", error);
      
      if (error.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        // More friendly message for unauthorized domain
        alert(
          `Cloud Sync Unavailable (Unauthorized Domain)\n\n` +
          `The current domain (${domain}) is not authorized by the Firebase project configuration.\n\n` +
          `The app will continue to work in "Local Mode" (data saved to device only).\n\n` +
          `To enable Cloud Sync:\n` +
          `1. Go to Settings > Firebase Configuration.\n` +
          `2. Provide a configuration for a Firebase project that authorizes this domain.`
        );
      } else if (error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, ignore.
      } else if (error.code === 'auth/popup-blocked') {
        alert("Sign-in popup was blocked by your browser. Please allow popups for this site.");
      } else if (error.code === 'auth/email-already-in-use') {
        alert("This email is already in use. Please log in instead.");
      } else if (error.code === 'auth/weak-password') {
        alert("Password should be at least 6 characters.");
      } else if (error.code === 'auth/invalid-email') {
        alert("Invalid email address.");
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        alert("Invalid email or password.");
      } else {
        alert(`Authentication failed: ${error.message}`);
      }
  };

  const signInWithGoogle = async () => {
    try {
      // Modular syntax: signInWithPopup(authInstance, provider)
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      handleAuthError(error);
    }
  };

  const signupWithEmail = async (email: string, pass: string) => {
      try {
          // Modular syntax
          await createUserWithEmailAndPassword(auth, email, pass);
      } catch (error: any) {
          handleAuthError(error);
          // Don't throw to UI to prevent crash, error handled above
      }
  };

  const loginWithEmail = async (email: string, pass: string) => {
      try {
          // Modular syntax
          await signInWithEmailAndPassword(auth, email, pass);
      } catch (error: any) {
          handleAuthError(error);
      }
  };

  const logout = async () => {
    try {
      // Modular syntax
      await signOut(auth);
      dbService.setUserId(null);
      window.location.reload(); 
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, signInWithGoogle, signupWithEmail, loginWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);