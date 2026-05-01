import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ContentBuilder from './pages/ContentBuilder';
import ContentLibrary from './pages/ContentLibrary';
import BulkImport from './pages/BulkImport';
import Analytics from './pages/Analytics';
import AdminUsers from './pages/AdminUsers';
import TaxonomyManager from './pages/TaxonomyManager';

function AdminLayout() {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <main className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/builder" element={<ContentBuilder />} />
            <Route path="/library" element={<ContentLibrary />} />
            <Route path="/taxonomy" element={<TaxonomyManager />} />
            <Route path="/import" element={<BulkImport />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/admins" element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminUsers />
              </PrivateRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000000' }}>
        <div style={{ textAlign: 'center', fontFamily: "'Outfit', sans-serif" }}>
          <img src="/favicon.jpeg" alt="GyanX" style={{ width: 60, height: 60, borderRadius: 14, marginBottom: 16, objectFit: 'cover' }} />
          <div style={{ color: 'rgba(255,255,255,0.5)' }}>Loading GyanX Admin…</div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user && role ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={
        <PrivateRoute>
          <AdminLayout />
        </PrivateRoute>
      } />
    </Routes>
  );
}

export default App;
