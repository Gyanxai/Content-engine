import { useEffect, useState } from 'react';
import { getAdmins, updateAdminRole, setAdminDisabled, createAdminRecord, deleteAdminRecord } from '../services/adminService';
import type { AdminUser } from '../services/adminService';
import type { AdminRole } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, ToggleLeft, ToggleRight, UserPlus, Trash2 } from 'lucide-react';

const ROLE_COLORS: Record<AdminRole, string> = {
  admin: '#8A5CFF', creator: '#1DAAF4', reviewer: '#4EB679', editor: '#FEC61F',
};

export default function AdminUsers() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdmins().then(a => { setAdmins(a); setLoading(false); });
  }, []);

  const handleAddAdmin = async () => {
    const uid = prompt('Enter User UID:');
    if (!uid) return;
    const email = prompt('Enter User Email:');
    if (!email) return;
    const role = prompt('Enter Role (admin/editor/creator/reviewer):', 'editor') as AdminRole;
    if (!role || !ROLE_COLORS[role]) { alert('Invalid role'); return; }

    try {
      await createAdminRecord(uid, email, role, user?.uid || '');
      setAdmins(prev => [{
        uid, email, display_name: email.split('@')[0], role, disabled: false, created_by: user?.uid || '', created_at: Date.now()
      } as any, ...prev]);
    } catch (err) { alert('Failed to add admin record.'); }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm('Delete this admin record? This does NOT delete the Firebase Auth account.')) return;
    try {
      await deleteAdminRecord(uid);
      setAdmins(prev => prev.filter(a => a.uid !== uid));
    } catch (err) { alert('Failed to delete.'); }
  };

  const handleRoleChange = async (uid: string, role: AdminRole) => {
    await updateAdminRole(uid, role);
    setAdmins(prev => prev.map(a => a.uid === uid ? { ...a, role } : a));
  };

  const handleToggle = async (uid: string, disabled: boolean) => {
    await setAdminDisabled(uid, !disabled);
    setAdmins(prev => prev.map(a => a.uid === uid ? { ...a, disabled: !disabled } : a));
  };

  const sel = { padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', fontFamily: 'inherit', fontSize: 13, outline: 'none', backgroundColor: '#0a0a0a', color: 'inherit' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="flex-between">
        <div><h1>Admin Users</h1><p style={{ color: 'var(--text-secondary)' }}>Manage roles and access — Super Admin only.</p></div>
        <button className="btn btn-primary" onClick={handleAddAdmin} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserPlus size={18} /> Add Admin Record
        </button>
      </div>

      <div style={{ padding: '12px 16px', backgroundColor: 'rgba(138,92,255,0.1)', border: '1px solid rgba(138,92,255,0.2)', borderRadius: 10, display: 'flex', gap: 10 }}>
        <ShieldCheck size={18} color="var(--primary-purple)" />
        <span style={{ fontSize: 14, color: 'var(--primary-purple)', fontWeight: 500 }}>
          Role changes update the <code>/admins</code> Firestore record. Call <code>npx ts-node scripts/setAdminClaims.ts</code> to also update Firebase Custom Claims.
        </span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>⏳ Loading admins…</div>
        ) : admins.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No admins found. Add documents to the <code>/admins</code> Firestore collection.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: '#050505' }}>
                {['Admin', 'UID', 'Role', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {admins.map(a => (
                <tr key={a.uid} style={{ borderBottom: '1px solid var(--border-color)', opacity: a.disabled ? 0.5 : 1 }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${ROLE_COLORS[a.role] || '#8A5CFF'}, #1DAAF4)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>
                        {a.email?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{a.display_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{a.uid.slice(0, 16)}…</td>
                  <td style={{ padding: '14px 16px' }}>
                    {a.uid === user?.uid ? (
                      <span style={{ color: ROLE_COLORS[a.role], fontWeight: 700, fontSize: 13, textTransform: 'capitalize' }}>{a.role} (you)</span>
                    ) : (
                      <select style={{ ...sel, color: ROLE_COLORS[a.role], fontWeight: 600 }} value={a.role}
                        onChange={e => handleRoleChange(a.uid, e.target.value as AdminRole)}>
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="creator">Creator</option>
                        <option value="reviewer">Reviewer</option>
                      </select>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className={`badge badge-${a.disabled ? 'warning' : 'success'}`}>{a.disabled ? 'Disabled' : 'Active'}</span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {a.uid !== user?.uid && (
                        <>
                          <button onClick={() => handleToggle(a.uid, a.disabled)}
                            style={{ background: 'none', border: `1px solid ${a.disabled ? 'var(--success-green)' : 'rgba(239,68,68,0.4)'}`, borderRadius: 6, padding: '5px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: a.disabled ? 'var(--success-green)' : '#ef4444', fontFamily: 'inherit' }}>
                            {a.disabled ? <ToggleLeft size={15} /> : <ToggleRight size={15} />}
                            {a.disabled ? 'Enable' : 'Disable'}
                          </button>
                          <button onClick={() => handleDelete(a.uid)}
                            style={{ background: 'none', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6, padding: '5px', cursor: 'pointer', color: '#ef4444' }}>
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

