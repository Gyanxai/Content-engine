import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';

export type AdminRole = 'admin' | 'creator' | 'reviewer' | 'editor';

interface AuthContextType {
  user: User | null;
  role: AdminRole | null;
  idToken: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const tokenResult = await firebaseUser.getIdTokenResult();
        const claimRole = tokenResult.claims.role as AdminRole | undefined;
        if (!claimRole) {
          await firebaseSignOut(auth);
          setUser(null); setRole(null); setIdToken(null);
        } else {
          setUser(firebaseUser);
          setRole(claimRole);
          setIdToken(tokenResult.token);
        }
      } else {
        setUser(null); setRole(null); setIdToken(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const tokenResult = await cred.user.getIdTokenResult();
    const claimRole = tokenResult.claims.role as AdminRole | undefined;
    if (!claimRole) {
      await firebaseSignOut(auth);
      throw new Error('NO_ADMIN_ROLE');
    }
  };

  const signOut = () => firebaseSignOut(auth);

  return (
    <AuthContext.Provider value={{ user, role, idToken, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

