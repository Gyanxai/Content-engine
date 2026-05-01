import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PenTool, BarChart3, Library, Upload, ShieldCheck, Layers } from 'lucide-react';
import type { AdminRole } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  roles?: AdminRole[];
}

const navItems: NavItem[] = [
  { name: 'Dashboard',       path: '/',          icon: LayoutDashboard },
  { name: 'Content Builder', path: '/builder',    icon: PenTool },
  { name: 'Content Library', path: '/library',    icon: Library },
  { name: 'Learning Path',   path: '/taxonomy',   icon: Layers, roles: ['admin', 'editor'] },
  { name: 'Bulk Import',     path: '/import',     icon: Upload },
  { name: 'Analytics',       path: '/analytics',  icon: BarChart3 },
  { name: 'Admin Users',     path: '/admins',     icon: ShieldCheck, roles: ['admin'] },
];

export default function Sidebar() {
  const location = useLocation();
  const { role } = useAuth();

  const visible = navItems.filter(item => !item.roles || (role && item.roles.includes(role)));

  return (
    <div className="sidebar">
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '24px' }}>
        <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <img src="/favicon.jpeg" alt="GyanX Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
        <span style={{ fontSize: '20px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>GyanX Admin</span>
      </div>
      <div className="sidebar-nav">
        {visible.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.name} to={item.path} className={`nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={20} />
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

