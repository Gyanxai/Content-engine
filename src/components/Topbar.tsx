import { useEffect, useState } from 'react';
import { Bell, LogOut, Moon, Sun, Key, X, Eye, EyeOff, Check, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

const ROLE_COLORS: Record<string, string> = {
  super_admin: '#8A5CFF',
  admin: '#8A5CFF',
  creator: '#1DAAF4',
  reviewer: '#4EB679',
};

export default function Topbar() {
  const { user, role, signOut } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem('gyanx-theme') || 'dark');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('gyanx-theme', theme);
  }, [theme]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email || !oldPassword || !newPassword || !confirmPassword) return;
    
    if (newPassword.length < 6) {
      alert('New password must be at least 6 characters long.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match. Please verify both fields.');
      return;
    }
    
    setLoading(true);
    try {
      // 1. Validate the old password by reauthenticating the client
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
      
      // 2. Update the password
      await updatePassword(user, newPassword);
      
      alert('Your password has been changed successfully!');
      setShowModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        alert('Invalid current password. Please verify and try again.');
      } else {
        alert(err.message || 'Failed to change password. Please check your network or credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="topbar">
      <div>
        <h2 style={{ fontSize: '18px', color: 'var(--text-primary)' }}>GyanX Content Engine</h2>
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 8 }}>
          <Bell size={20} />
        </button>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="icon-btn"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        
        {/* Profile Card and Dropdown */}
        <div style={{ position: 'relative' }}>
          <div 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', backgroundColor: 'var(--bg-main)', borderRadius: 999, cursor: 'pointer', border: '1px solid var(--border-color)', userSelect: 'none' }}
          >
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #8A5CFF, #1DAAF4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>
              {user?.email?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.email?.split('@')[0] ?? 'Admin'}</div>
              <div style={{ fontSize: 11, color: ROLE_COLORS[role ?? 'admin'], fontWeight: 600, textTransform: 'capitalize' }}>{role}</div>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-secondary)', marginLeft: 4, transform: showProfileMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>

          {showProfileMenu && (
            <>
              {/* Backdrop overlay to close dropdown */}
              <div onClick={() => setShowProfileMenu(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} />
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '6px', width: '180px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button
                  onClick={() => { setShowModal(true); setShowProfileMenu(false); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontFamily: 'inherit', width: '100%', textAlign: 'left' }}
                  className="nav-item-btn"
                >
                  <Key size={14} style={{ color: 'var(--text-secondary)' }} /> Change Password
                </button>
                <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />
                <button
                  onClick={() => { signOut(); setShowProfileMenu(false); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4d4d', padding: '8px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontFamily: 'inherit', width: '100%', textAlign: 'left' }}
                  className="nav-item-btn"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '420px', padding: '24px', zIndex: 1001, border: '1px solid var(--border-color)', textAlign: 'left' }}>
            <div className="flex-between" style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Change Password</h2>
              <button className="icon-btn" onClick={() => { setShowModal(false); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Change the password for your account <strong>{user?.email}</strong>.
            </p>
            <form onSubmit={handlePasswordChange}>
              <label style={{ display: 'block', marginBottom: '14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Old Password
                <div style={{ position: 'relative', marginTop: '6px' }}>
                  <input
                    className="field"
                    type={showOldPassword ? 'text' : 'password'}
                    required
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    style={{ width: '100%', paddingRight: '40px' }}
                    placeholder="Enter your current password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
                  >
                    {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <label style={{ display: 'block', marginBottom: '14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                New Password
                <div style={{ position: 'relative', marginTop: '6px' }}>
                  <input
                    className="field"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={{ width: '100%', paddingRight: '40px' }}
                    placeholder="Enter at least 6 characters"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <label style={{ display: 'block', marginBottom: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Confirm New Password
                <div style={{ position: 'relative', marginTop: '6px' }}>
                  <input
                    className="field"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    style={{ width: '100%', paddingRight: '40px' }}
                    placeholder="Verify new password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }} disabled={loading}>
                <Check size={16} />
                {loading ? 'Updating Password...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
