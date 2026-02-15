
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
    const guestPref = localStorage.getItem('ekagrazone_guest_mode');
    if (guestPref === 'true') {
        setIsGuest(true);
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        dbService.setUserId(user.uid);
        
        try {
            // Check if we were in guest mode previously
            const wasGuest = localStorage.getItem('ekagrazone_guest_mode') === 'true';
            
            if (wasGuest) {
                // If coming from guest mode, we TRUST the local data and want to merge it up
                console.log("Merging Guest Data to Cloud...");
                await dbService.syncLocalToCloud();
                localStorage.removeItem('ekagrazone_guest_mode');
            } else {
                // If just logging in normally, we TRUST THE CLOUD.
                // Do NOT push local data. The listener in startRealtimeSync will handle pulling cloud data
                // and cleaning up stale local data.
                console.log("Standard Login - Prioritizing Cloud Data");
            }
            
            // Start listening for real-time updates from cloud (this handles the sync down)
            dbService.startRealtimeSync();
            
        } catch (e) {
            console.error("Auto-sync failed on login", e);
        }

        setIsGuest(false);
      } else {
        dbService.setUserId(null);
        dbService.stopRealtimeSync();
      }
      
      setLoading(false);
    });

    return () => {
        unsubscribe();
        dbService.stopRealtimeSync();
    };
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
      localStorage.setItem('ekagrazone_guest_mode', 'true');
  };

  const logout = async () => {
    try {
      dbService.stopRealtimeSync();
      await signOut(auth);
      setIsGuest(false);
      localStorage.removeItem('ekagrazone_guest_mode');
      dbService.setUserId(null);
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
