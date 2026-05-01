import { useEffect, useState } from 'react';
import { FileText, Users, AlertCircle, Clock, TrendingUp, CheckCircle } from 'lucide-react';
import { getDashboardStats } from '../services/contentService';

interface Stats {
  publishedQuestions: number;
  totalStudents: number;
  pendingReview: number;
  draftCount: number;
  recentAttempts: Record<string, unknown>[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then(s => { setStats(s); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const cards = stats ? [
    { label: 'Published Questions', value: stats.publishedQuestions, icon: CheckCircle, color: 'var(--success-green)' },
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'var(--info-blue)' },
    { label: 'Pending Review', value: stats.pendingReview, icon: AlertCircle, color: 'var(--warning-yellow)' },
    { label: 'Drafts', value: stats.draftCount, icon: FileText, color: 'var(--primary-purple)' },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h1>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Live overview from Cloud Firestore.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
          Loading live data from Firebase…
        </div>
      ) : (
        <>
          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {cards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card stat-card">
                <div className="flex-between">
                  <span className="label">{label}</span>
                  <Icon size={20} color={color} />
                </div>
                <span className="value">{value ?? '—'}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 16 }}>Recent Quiz Attempts</h2>
              <TrendingUp size={18} color="var(--text-secondary)" />
            </div>
            {stats?.recentAttempts.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 24 }}>No quiz attempts yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: '#050505' }}>
                      {['Student UID', 'Subject', 'Chapter', 'Level', 'Score', 'Time'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.recentAttempts.map((a, i) => {
                      const att = a as Record<string, unknown>;
                      const score = att.score as number;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: 13 }}>{String(att.student_uid ?? '').slice(0, 12)}…</td>
                          <td style={{ padding: '12px' }}>{String(att.subject ?? '—')}</td>
                          <td style={{ padding: '12px' }}>{String(att.chapter_id ?? '—')}</td>
                          <td style={{ padding: '12px' }}><span className="badge badge-info">{String(att.level ?? '—')}</span></td>
                          <td style={{ padding: '12px' }}>
                            <span className={`badge badge-${score >= 80 ? 'success' : 'warning'}`}>{score}%</span>
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: 13 }}>
                            <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
                            {Math.round((att.time_ms as number) / 1000)}s
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
