import { Navigate } from 'react-router-dom';
import type { AdminRole } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: AdminRole[];
}

export default function PrivateRoute({ children, allowedRoles }: PrivateRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0a1e' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/favicon.jpeg" alt="GyanX" style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 16, objectFit: 'cover' }} />
          <div style={{ color: 'rgba(255,255,255,0.6)', fontFamily: "'Outfit', sans-serif" }}>Loading…</div>
        </div>
      </div>
    );
  }

  if (!user || !role) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div style={{ padding: 64, textAlign: 'center', color: 'var(--text-secondary)' }}>
        <h2>Access Restricted</h2>
        <p>Your role (<strong>{role}</strong>) doesn't have permission to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}

