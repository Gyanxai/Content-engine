import { Bell, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ROLE_COLORS: Record<string, string> = {
  admin: '#8A5CFF',
  creator: '#1DAAF4',
  reviewer: '#4EB679',
  editor: '#FEC61F',
};

export default function Topbar() {
  const { user, role, signOut } = useAuth();

  return (
    <header className="topbar">
      <div>
        <h2 style={{ fontSize: '18px', color: 'var(--text-primary)' }}>GyanX Content Engine</h2>
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 8 }}>
          <Bell size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', backgroundColor: 'var(--bg-main)', borderRadius: 999 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #8A5CFF, #1DAAF4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>
            {user?.email?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.email?.split('@')[0] ?? 'Admin'}</div>
            <div style={{ fontSize: 11, color: ROLE_COLORS[role ?? 'admin'], fontWeight: 600, textTransform: 'capitalize' }}>{role}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          style={{ background: 'none', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-secondary)', padding: '6px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: 'inherit' }}
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </header>
  );
}
