import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import type { AdminPermission, AdminRole } from '../contexts/AuthContext';

export interface AdminUser {
  uid: string;
  email: string;
  display_name: string;
  role: AdminRole;
  permissions: AdminPermission[];
  disabled: boolean;
  created_by: string;
  created_at: unknown;
  last_login?: unknown;
}

export async function getAdmins(): Promise<AdminUser[]> {
  const snap = await getDocs(query(collection(db, 'admins'), orderBy('created_at', 'desc')));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }) as AdminUser);
}

export async function getAdminByUid(uid: string): Promise<AdminUser | null> {
  const d = await getDoc(doc(db, 'admins', uid));
  return d.exists() ? ({ uid: d.id, ...d.data() } as AdminUser) : null;
}

export async function createAdminRecord(
  uid: string, email: string, role: AdminRole, createdBy: string, permissions: AdminPermission[] = []
): Promise<void> {
  const ref = doc(db, 'admins', uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, { role, permissions, disabled: false });
  } else {
    await setDoc(ref, {
      email,
      display_name: email.split('@')[0],
      role,
      permissions,
      disabled: false,
      created_by: createdBy,
      created_at: serverTimestamp(),
    });
  }
}

export async function updateAdminRole(uid: string, role: AdminRole): Promise<void> {
  await updateDoc(doc(db, 'admins', uid), { role });
}

export async function updateAdminAccess(uid: string, role: AdminRole, permissions: AdminPermission[], requesterUid: string): Promise<void> {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch('/api/create-admin', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ uid, role, permissions, requesterUid })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Failed to update access');
}

export async function updateAdminPassword(uid: string, password: string): Promise<void> {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch('/api/create-admin', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ uid, password })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Failed to update password');
}

export async function setAdminDisabled(uid: string, disabled: boolean): Promise<void> {
  await updateDoc(doc(db, 'admins', uid), { disabled });
}

export async function deleteAdminRecord(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'admins', uid));
}

export async function createAdminUser(data: {
  email: string;
  password: string;
  displayName: string;
  role: AdminRole;
  permissions: AdminPermission[];
}, requesterUid: string): Promise<{ success: boolean; uid: string }> {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch('/api/create-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ ...data, requesterUid })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Failed to create admin');
  }
  return result;
}
