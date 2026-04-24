import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthContextType {
  user: User | null;
  agentProfile: any | null;
  loading: boolean;
  isAdmin: boolean;
  isBrandOwner: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  agentProfile: null,
  loading: true,
  isAdmin: false,
  isBrandOwner: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [agentProfile, setAgentProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const BRAND_OWNER_EMAIL = 'kingsclothingbrand7@gmail.com';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'agents', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAgentProfile(docSnap.data());
        }
      } else {
        setAgentProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    agentProfile,
    loading,
    isAdmin: agentProfile?.role === 'admin' || user?.email === BRAND_OWNER_EMAIL,
    isBrandOwner: user?.email === BRAND_OWNER_EMAIL,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
