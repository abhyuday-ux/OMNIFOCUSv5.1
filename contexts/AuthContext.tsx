
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { dbService } from '../services/db';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  signupWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  continueAsGuest: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  isGuest: false,
  signInWithGoogle: async () => {},
  signupWithEmail: async () => {},
  loginWithEmail: async () => {},
  continueAsGuest: () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Check for guest mode preference
    const guestPref = localStorage.getItem('omni_guest_mode');
    if (guestPref === 'true') {
        setIsGuest(true);
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        dbService.setUserId(user.uid);
        
        try {
            // 1. Pull existing cloud data (merges into local)
            await dbService.pullFromFirestore();
            
            // 2. Push all local data (including guest progress) to the cloud
            // This ensures safe migration from guest -> user
            await dbService.syncLocalToCloud();
            
            // 3. Emit update
            window.dispatchEvent(new Event('omni_sync_complete'));
        } catch (e) {
            console.error("Auto-sync failed on login", e);
        }

        // Turn off guest mode if they sign in
        setIsGuest(false);
        localStorage.removeItem('omni_guest_mode');
      } else {
        // If not logged in, ensure dbService knows no user ID
        // Unless we are in explicit guest mode?
        // Note: dbService handles null userId as local-only
        dbService.setUserId(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const signupWithEmail = async (email: string, pass: string) => {
      await createUserWithEmailAndPassword(auth, email, pass);
  };

  const loginWithEmail = async (email: string, pass: string) => {
      await signInWithEmailAndPassword(auth, email, pass);
  };

  const continueAsGuest = () => {
      setIsGuest(true);
      dbService.setUserId(null);
      localStorage.setItem('omni_guest_mode', 'true');
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setIsGuest(false);
      localStorage.removeItem('omni_guest_mode');
      dbService.setUserId(null);
      // Optional: clear local state or reload to flush
      window.location.reload(); 
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, isGuest, signInWithGoogle, signupWithEmail, loginWithEmail, continueAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
