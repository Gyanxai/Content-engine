import { useEffect, useMemo, useState } from 'react';
import {
  createAdminUser, deleteAdminRecord, getAdmins, setAdminDisabled, updateAdminAccess, updateAdminPassword
} from '../services/adminService';
import type { AdminUser } from '../services/adminService';
import type { AdminPermission, AdminRole } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';
import { Check, ShieldCheck, ToggleLeft, ToggleRight, Trash2, UserPlus, X, Eye, EyeOff, Key } from 'lucide-react';

const ALL_PERMISSIONS: { id: AdminPermission; label: string; superOnly?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'curriculum_builder', label: 'Curriculum Builder' },
  { id: 'existing_curriculum', label: 'Existing Curriculum' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'bulk_import', label: 'JSON Bulk Import' },
  { id: 'review_publish', label: 'Review & Publish' },
  { id: 'manage_admins', label: 'Create Admin Users' },
  { id: 'manage_super_admins', label: 'Create Super Admins', superOnly: true },
];

const ROLE_LABEL: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  creator: 'Content Creator',
  reviewer: 'Reviewer',
};

const ROLE_COLORS: Record<AdminRole, string> = {
  super_admin: '#8A5CFF',
  admin: '#1DAAF4',
  creator: '#FEC61F',
  reviewer: '#4EB679',
};

const ROLE_DEFAULTS: Record<AdminRole, AdminPermission[]> = {
  super_admin: ALL_PERMISSIONS.map(p => p.id),
  admin: ['dashboard', 'curriculum_builder', 'existing_curriculum', 'analytics', 'bulk_import', 'review_publish', 'manage_admins'],
  creator: ['dashboard', 'curriculum_builder', 'existing_curriculum', 'bulk_import'],
  reviewer: ['dashboard', 'existing_curriculum', 'analytics', 'review_publish'],
};

export default function AdminUsers() {
  const { user, role, permissions } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  
  const [passwordTarget, setPasswordTarget] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordShow, setPasswordShow] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTarget || !newPassword) return;
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }
    setPasswordLoading(true);
    try {
      await updateAdminPassword(passwordTarget.uid, newPassword);
      alert(`Password updated successfully!`);
      setPasswordTarget(null);
      setNewPassword('');
    } catch (err: any) {
      alert(err.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    role: 'creator' as AdminRole,
    permissions: ROLE_DEFAULTS.creator,
  });

  const canManageSuper = role === 'super_admin' || permissions.includes('manage_super_admins');
  const canManageAdmins = role === 'super_admin' || permissions.includes('manage_admins');
  const availableRoles = useMemo<AdminRole[]>(() => canManageSuper
    ? ['super_admin', 'admin', 'creator', 'reviewer']
    : ['admin', 'creator', 'reviewer'], [canManageSuper]);
  const grantablePermissions = ALL_PERMISSIONS.filter(permission => canManageSuper || !permission.superOnly);

  useEffect(() => {
    getAdmins().then(results => {
      setAdmins(results);
      setLoading(false);
    });
  }, []);

  const setRoleWithDefaults = (nextRole: AdminRole) => {
    const nextPermissions = ROLE_DEFAULTS[nextRole].filter(permission =>
      canManageSuper || !ALL_PERMISSIONS.find(p => p.id === permission)?.superOnly
    );
    setFormData(prev => ({ ...prev, role: nextRole, permissions: nextPermissions }));
  };

  const toggleFormPermission = (permission: AdminPermission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canManageAdmins) return;
    setFormLoading(true);
    try {
      const result = await createAdminUser(formData, user.uid);
      setAdmins(prev => [{
        uid: result.uid,
        email: formData.email,
        display_name: formData.displayName,
        role: formData.role,
        permissions: formData.permissions,
        disabled: false,
        created_by: user.uid,
        created_at: new Date(),
      }, ...prev]);
      setShowForm(false);
      setFormData({ displayName: '', email: '', password: '', role: 'creator', permissions: ROLE_DEFAULTS.creator });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create user.');
    } finally {
      setFormLoading(false);
    }
  };

  const updateAccess = async (admin: AdminUser, nextRole: AdminRole, nextPermissions: AdminPermission[]) => {
    if (!user) return;
    await updateAdminAccess(admin.uid, nextRole, nextPermissions, user.uid);
    setAdmins(prev => prev.map(item => item.uid === admin.uid ? { ...item, role: nextRole, permissions: nextPermissions } : item));
  };

  const toggleUserPermission = (admin: AdminUser, permission: AdminPermission) => {
    const nextPermissions = admin.permissions?.includes(permission)
      ? admin.permissions.filter(p => p !== permission)
      : [...(admin.permissions ?? []), permission];
    updateAccess(admin, admin.role, nextPermissions);
  };

  const handleDelete = async (uid: string) => {
    if (!confirm('Delete this admin record? Firebase Auth deletion must be handled server-side if needed.')) return;
    await deleteAdminRecord(uid);
    setAdmins(prev => prev.filter(admin => admin.uid !== uid));
  };

  const handleToggle = async (uid: string, disabled: boolean) => {
    await setAdminDisabled(uid, !disabled);
    setAdmins(prev => prev.map(admin => admin.uid === uid ? { ...admin, disabled: !disabled } : admin));
  };

  if (!canManageAdmins) {
    return <div className="empty-state">You do not have access to manage admin accounts.</div>;
  }

  return (
    <div className="library-screen">
      <div className="page-heading">
        <div>
          <h1>Access Control</h1>
          <p>Create admin accounts, assign roles, and check exact permissions.</p>
        </div>
        {!showForm && <button className="btn btn-primary" onClick={() => setShowForm(true)}><UserPlus size={18} /> New Account</button>}
      </div>

      {showForm && (
        <section className="card access-form">
          <div className="flex-between">
            <h2>Create Account</h2>
            <button className="icon-btn" onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>
          <form onSubmit={handleFormSubmit}>
            <label>Name<input className="field" required value={formData.displayName} onChange={e => setFormData(prev => ({ ...prev, displayName: e.target.value }))} /></label>
            <label>Email<input className="field" type="email" required value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} /></label>
            <label>Password
              <div style={{ position: 'relative' }}>
                <input className="field" type={showPassword ? 'text' : 'password'} required value={formData.password} onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))} style={{ width: '100%', paddingRight: '40px' }} />
                <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <label>Role<select className="field" value={formData.role} onChange={e => setRoleWithDefaults(e.target.value as AdminRole)}>{availableRoles.map(nextRole => <option key={nextRole} value={nextRole}>{ROLE_LABEL[nextRole]}</option>)}</select></label>
            <div className="permission-grid">
              {grantablePermissions.map(permission => (
                <label key={permission.id} className="permission-check">
                  <input type="checkbox" checked={formData.permissions.includes(permission.id)} onChange={() => toggleFormPermission(permission.id)} />
                  <span>{permission.label}</span>
                </label>
              ))}
            </div>
            <button type="submit" className="btn btn-primary" disabled={formLoading}><Check size={16} /> {formLoading ? 'Creating...' : 'Create Account'}</button>
          </form>
        </section>
      )}

      <section className="card access-note">
        <ShieldCheck size={18} />
        <span>Super admin access is controlled by Firebase custom claims and the `/admins` record. Credentials are not hardcoded in the app.</span>
      </section>

      <section className="card table-card">
        {loading ? (
          <div className="empty-state">Loading accounts...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>{['User', 'Role', 'Permissions', 'Status', 'Actions'].map(header => <th key={header}>{header}</th>)}</tr>
              </thead>
              <tbody>
                {admins.map(admin => {
                  const isSelf = admin.uid === user?.uid;
                  const editable = !isSelf && (canManageSuper || admin.role !== 'super_admin');
                  return (
                    <tr key={admin.uid}>
                      <td>
                        <strong>{admin.display_name}</strong>
                        <span>{admin.email}</span>
                      </td>
                      <td>
                        {editable ? (
                          <select className="field" value={admin.role} onChange={e => updateAccess(admin, e.target.value as AdminRole, ROLE_DEFAULTS[e.target.value as AdminRole])}>
                            {availableRoles.map(nextRole => <option key={nextRole} value={nextRole}>{ROLE_LABEL[nextRole]}</option>)}
                          </select>
                        ) : (
                          <span style={{ color: ROLE_COLORS[admin.role], fontWeight: 700 }}>{ROLE_LABEL[admin.role]}{isSelf ? ' (you)' : ''}</span>
                        )}
                      </td>
                      <td>
                        <div className="permission-grid compact">
                          {grantablePermissions.map(permission => (
                            <label key={permission.id} className="permission-check">
                              <input
                                type="checkbox"
                                disabled={!editable || admin.role === 'super_admin'}
                                checked={(admin.permissions ?? []).includes(permission.id)}
                                onChange={() => toggleUserPermission(admin, permission.id)}
                              />
                              <span>{permission.label}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td><span className={`badge badge-${admin.disabled ? 'warning' : 'success'}`}>{admin.disabled ? 'Disabled' : 'Active'}</span></td>
                      <td>
                        <div className="row-actions">
                          {isSelf && (
                            <button className="mini-action" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={() => setPasswordTarget(admin)}>
                              <Key size={14} /> Change Password
                            </button>
                          )}
                          {editable && (
                            <>
                              <button className="mini-action" onClick={() => handleToggle(admin.uid, admin.disabled)}>
                                {admin.disabled ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                                {admin.disabled ? 'Enable' : 'Disable'}
                              </button>
                              <button className="icon-btn" title="Change Password" style={{ color: 'var(--text-secondary)' }} onClick={() => setPasswordTarget(admin)}>
                                <Key size={14} />
                              </button>
                              <button className="icon-btn danger" onClick={() => handleDelete(admin.uid)}><Trash2 size={14} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {passwordTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '400px', padding: '24px', zIndex: 1001, border: '1px solid var(--border-color)' }}>
            <div className="flex-between" style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Change Password</h2>
              <button className="icon-btn" onClick={() => { setPasswordTarget(null); setNewPassword(''); }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Setting new password for <strong>{passwordTarget.display_name}</strong>.
            </p>
            <form onSubmit={handlePasswordChange}>
              <label style={{ display: 'block', marginBottom: '16px', fontSize: '13px' }}>
                New Password
                <div style={{ position: 'relative', marginTop: '6px' }}>
                  <input
                    className="field"
                    type={passwordShow ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={{ width: '100%', paddingRight: '40px' }}
                    placeholder="Enter at least 6 characters"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setPasswordShow(!passwordShow)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
                  >
                    {passwordShow ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }} disabled={passwordLoading}>
                <Check size={16} />
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
