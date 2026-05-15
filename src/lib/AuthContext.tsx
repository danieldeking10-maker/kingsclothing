import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthContextType {
  user: User | null;
  agentProfile: any | null;
  loading: boolean;
  isAdmin: boolean;
  isBrandOwner: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  agentProfile: null,
  loading: true,
  isAdmin: false,
  isBrandOwner: false,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [agentProfile, setAgentProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const BRAND_OWNER_EMAILS = ['kingsclothingbrand7@gmail.com', 'danieldeking10@gmail.com'];

  const refreshProfile = async () => {
    if (!auth.currentUser) {
      setAgentProfile(null);
      return;
    }
    const docRef = doc(db, 'agents', auth.currentUser.uid);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setAgentProfile(docSnap.data());
      }
    } catch (error) {
      console.error("Error refreshing profile:", error);
    }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        // Use onSnapshot for real-time profile updates
        const docRef = doc(db, 'agents', user.uid);
        unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setAgentProfile(docSnap.data());
          } else {
            setAgentProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("AuthContext Profile Fetch Error:", error);
          setAgentProfile(null);
          setLoading(false);
        });
      } else {
        setAgentProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const value = {
    user,
    agentProfile,
    loading,
    isAdmin: !!(agentProfile?.role === 'admin' || (user?.email && BRAND_OWNER_EMAILS.includes(user.email))),
    isBrandOwner: !!(user?.email && BRAND_OWNER_EMAILS.includes(user.email)),
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
