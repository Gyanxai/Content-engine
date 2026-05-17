import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { db } from '../lib/firebase';

export type AdminRole = 'super_admin' | 'admin' | 'creator' | 'reviewer';
export type AdminPermission =
  | 'dashboard'
  | 'curriculum_builder'
  | 'existing_curriculum'
  | 'analytics'
  | 'bulk_import'
  | 'review_publish'
  | 'manage_admins'
  | 'manage_super_admins';

interface AuthContextType {
  user: User | null;
  role: AdminRole | null;
  permissions: AdminPermission[];
  idToken: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const tokenResult = await firebaseUser.getIdTokenResult();
          const claimRole = tokenResult.claims.role as AdminRole | undefined;
          const claimPermissions = (tokenResult.claims.permissions as AdminPermission[] | undefined) ?? [];
          const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
          const disabled = adminDoc.exists() && adminDoc.data().disabled === true;
          if (!claimRole || disabled) {
            await firebaseSignOut(auth);
            setUser(null); setRole(null); setPermissions([]); setIdToken(null);
          } else {
            setUser(firebaseUser);
            setRole(claimRole);
            setPermissions(claimRole === 'super_admin' ? ['dashboard', 'curriculum_builder', 'existing_curriculum', 'analytics', 'bulk_import', 'review_publish', 'manage_admins', 'manage_super_admins'] : claimPermissions);
            setIdToken(tokenResult.token);
          }
        } catch (error) {
          console.error("Auth initialization error:", error);
          await firebaseSignOut(auth);
          setUser(null); setRole(null); setPermissions([]); setIdToken(null);
        }
      } else {
        setUser(null); setRole(null); setPermissions([]); setIdToken(null);
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
    <AuthContext.Provider value={{ user, role, permissions, idToken, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

