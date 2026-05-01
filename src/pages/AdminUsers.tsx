import { useEffect, useState } from 'react';
import { getAdmins, updateAdminRole, setAdminDisabled, createAdminUser, deleteAdminRecord } from '../services/adminService';
import type { AdminUser } from '../services/adminService';
import type { AdminRole } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, ToggleLeft, ToggleRight, UserPlus, Trash2, X, Check } from 'lucide-react';

const ROLE_COLORS: Record<AdminRole, string> = {
  admin: '#8A5CFF', creator: '#1DAAF4', reviewer: '#4EB679', editor: '#FEC61F',
};

export default function AdminUsers() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    role: 'editor' as AdminRole
  });

  useEffect(() => {
    getAdmins().then(a => { setAdmins(a); setLoading(false); });
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const result = await createAdminUser(formData, user?.uid || '');
      if (result.success) {
        const newAdmin: AdminUser = {
          uid: result.uid,
          email: formData.email,
          display_name: formData.displayName,
          role: formData.role,
          disabled: false,
          created_by: user?.uid || '',
          created_at: { seconds: Date.now() / 1000, nanoseconds: 0 } as any
        };
        setAdmins(prev => [newAdmin, ...prev]);
        setShowForm(false);
        setFormData({ displayName: '', email: '', password: '', role: 'editor' });
      }
    } catch (err: any) {
      alert('Error creating admin: ' + err.message);
    } finally {
      setFormLoading(false);
    }
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

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)', backgroundColor: '#0a0a0a', color: 'inherit', fontFamily: 'inherit', fontSize: 14, outline: 'none' };
  const sel = { padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', fontFamily: 'inherit', fontSize: 13, outline: 'none', backgroundColor: '#0a0a0a', color: 'inherit' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="flex-between">
        <div><h1>Admin Users</h1><p style={{ color: 'var(--text-secondary)' }}>Manage roles and access — Super Admin only.</p></div>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={18} /> New Admin Account
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ padding: '24px', position: 'relative', border: '1px solid var(--primary-purple)' }}>
          <button onClick={() => setShowForm(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
          <h2 style={{ fontSize: 18, marginBottom: 20 }}>Create New Admin</h2>
          <form onSubmit={handleFormSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Full Name</label>
              <input style={inputStyle} required placeholder="John Doe" value={formData.displayName} onChange={e => setFormData(p => ({ ...p, displayName: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Email Address</label>
              <input style={inputStyle} type="email" required placeholder="admin@gyanx.in" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Initial Password</label>
              <input style={inputStyle} type="password" required placeholder="••••••••" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Access Role</label>
              <select style={{ ...inputStyle, padding: '9px 14px' }} value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value as AdminRole }))}>
                <option value="admin">Super Admin</option>
                <option value="editor">Editor</option>
                <option value="creator">Creator</option>
                <option value="reviewer">Reviewer</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={formLoading} style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                {formLoading ? 'Creating Account...' : <><Check size={18} /> Create Admin</>}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ padding: '12px 16px', backgroundColor: 'rgba(138,92,255,0.1)', border: '1px solid rgba(138,92,255,0.2)', borderRadius: 10, display: 'flex', gap: 10 }}>
        <ShieldCheck size={18} color="var(--primary-purple)" />
        <span style={{ fontSize: 14, color: 'var(--primary-purple)', fontWeight: 500 }}>
          Changes here update both the <strong>Auth Custom Claims</strong> and the <strong>Firestore Record</strong> automatically.
        </span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>⏳ Loading admins…</div>
        ) : admins.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No admins found. Create an account above to get started.
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

