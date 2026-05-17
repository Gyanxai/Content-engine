import { Link, useLocation } from 'react-router-dom';
import { BarChart3, LayoutDashboard, Library, Layers, ShieldCheck } from 'lucide-react';
import type { AdminPermission, AdminRole } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';
import GyanxLogo from '../assets/Gyanxlogo.jpeg';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  roles?: AdminRole[];
  permission: AdminPermission;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, permission: 'dashboard' },
  { name: 'Curriculum Builder', path: '/taxonomy', icon: Layers, permission: 'curriculum_builder' },
  { name: 'Existing Curriculum', path: '/library', icon: Library, permission: 'existing_curriculum' },
  { name: 'Analytics', path: '/analytics', icon: BarChart3, permission: 'analytics' },
  { name: 'Access Control', path: '/admins', icon: ShieldCheck, permission: 'manage_admins' },
];

export default function Sidebar() {
  const location = useLocation();
  const { role, permissions } = useAuth();

  const visible = navItems.filter(item => {
    if (role === 'super_admin') return true;
    return permissions.includes(item.permission);
  });

  return (
    <div className="sidebar">
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '24px' }}>
        <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <img src={GyanxLogo} alt="GyanX Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

