import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Zap, BarChart3 } from 'lucide-react';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'NO_ADMIN_ROLE') setError('This account has no admin access. Contact your Super Admin.');
      else if (msg.includes('invalid-credential') || msg.includes('wrong-password')) setError('Invalid email or password.');
      else if (msg.includes('too-many-requests')) setError('Too many attempts. Please try again later.');
      else setError('Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  const features = [
    { icon: BookOpen, title: 'Content Engine', desc: 'Build Brilliant-style interactive questions across all subjects.' },
    { icon: Zap, title: 'Live Delivery', desc: 'Auto-serve content by student level via Firestore.' },
    { icon: BarChart3, title: 'Analytics', desc: 'Track individual and aggregated student performance.' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Outfit', sans-serif", backgroundColor: '#000000' }}>
      {/* Left Panel */}
      <div style={{
        flex: 1, background: 'linear-gradient(135deg, #000000 0%, #0a0a0a 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px',
        position: 'relative', overflow: 'hidden',
        borderRight: '1px solid #1f2937'
      }}>
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '-80px', left: '-80px', width: 300, height: 300, background: 'radial-gradient(circle, rgba(138,92,255,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-60px', right: '-60px', width: 250, height: 250, background: 'radial-gradient(circle, rgba(29,170,244,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/favicon.jpeg" alt="GyanX" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
            <span style={{ fontSize: 28, fontWeight: 700, color: 'white' }}>GyanX Admin</span>
          </div>

          <h1 style={{ fontSize: 40, fontWeight: 700, color: 'white', lineHeight: 1.2, marginBottom: 16 }}>
            Power the Future<br />
            <span style={{ background: 'linear-gradient(90deg, #8A5CFF, #1DAAF4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              of Learning
            </span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, marginBottom: 48 }}>
            The content engine behind India's next-gen learning platform.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(138,92,255,0.1)', border: '1px solid rgba(138,92,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} color="#8A5CFF" />
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: 600, marginBottom: 2 }}>{title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ width: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 48px', backgroundColor: '#000000' }}>
        <div style={{ width: '100%' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#FFFFFF', marginBottom: 8 }}>Welcome back</h2>
          <p style={{ color: '#9CA3AF', marginBottom: 36, fontSize: 15 }}>Sign in to the GyanX Admin Portal</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#9CA3AF' }}>Email address</label>
              <input
                type="email" required autoFocus
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@gyanx.in"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #1f2937', outline: 'none', fontFamily: 'inherit', fontSize: 15, boxSizing: 'border-box', transition: 'border-color 0.15s', backgroundColor: '#0a0a0a', color: '#FFFFFF' }}
                onFocus={e => e.target.style.borderColor = '#8A5CFF'}
                onBlur={e => e.target.style.borderColor = '#1f2937'}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#9CA3AF' }}>Password</label>
              <input
                type="password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #1f2937', outline: 'none', fontFamily: 'inherit', fontSize: 15, boxSizing: 'border-box', transition: 'border-color 0.15s', backgroundColor: '#0a0a0a', color: '#FFFFFF' }}
                onFocus={e => e.target.style.borderColor = '#8A5CFF'}
                onBlur={e => e.target.style.borderColor = '#1f2937'}
              />
            </div>

            {error && (
              <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', fontSize: 14 }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{ marginTop: 8, padding: '14px', borderRadius: 10, border: 'none', background: loading ? '#4b2a8f' : 'linear-gradient(90deg, #8A5CFF, #7b4df0)', color: 'white', fontWeight: 700, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px 0 rgba(138,92,255,0.3)', transition: 'all 0.2s' }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p style={{ marginTop: 32, fontSize: 13, color: '#6B7280', textAlign: 'center' }}>
            Contact your Super Admin to get access.
          </p>
        </div>
      </div>
    </div>
  );
}
