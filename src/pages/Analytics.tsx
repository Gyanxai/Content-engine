import { useEffect, useState } from 'react';
import { getAggregatedStats } from '../services/analyticsService';
import {
  Activity, AlertCircle, BarChart3, BookOpen, Brain, Clock, FileText,
  Flame, Gift, GraduationCap, Layers3, Map, TrendingDown, UserPlus, Users
} from 'lucide-react';
import gyanxLogo from '../assets/Gyanxlogo.jpeg';

type AnalyticsStats = Awaited<ReturnType<typeof getAggregatedStats>>;

export default function Analytics() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAggregatedStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Total Content Created', value: stats?.totalContentCreated ?? 0, icon: BookOpen },
    { label: 'Completion Rate', value: `${stats?.completionRate ?? 0}%`, icon: BarChart3 },
    { label: 'Total User', value: stats?.totalUsers ?? 0, icon: Users },
    { label: 'Active User', value: stats?.activeUsers ?? 0, icon: Activity },
    { label: 'New User/month', value: stats?.newUsersThisMonth ?? 0, icon: UserPlus },
    { label: 'Engagement Heat-map', value: stats?.engagementHeatmap ?? 0, icon: Flame },
    { label: 'Test Given', value: stats?.testGiven ?? 0, icon: GraduationCap },
    { label: 'Student Level 0 | 1 | 2 | 3', value: stats?.studentLevel.join(' | ') ?? '0 | 0 | 0 | 0', icon: Layers3 },
    { label: 'Daily Active User', value: stats?.dailyActiveUsers ?? 0, icon: Activity },
    { label: 'Monthly Active User', value: stats?.monthlyActiveUsers ?? 0, icon: Users },
    { label: 'Time Spend', value: `${stats?.timeSpendSeconds ?? 0}s`, icon: Clock },
    { label: 'Content Issues / Flagged Content', value: `${stats?.contentIssues ?? 0} / ${stats?.flaggedContent ?? 0}`, icon: AlertCircle },
    { label: 'GP Earned', value: stats?.gpEarned ?? 0, icon: Gift },
    { label: 'Notes Earned', value: stats?.notesEarned ?? 0, icon: FileText },
    { label: 'AI Tutor Interactive Rate', value: `${stats?.aiTutorInteractiveRate ?? 0}%`, icon: Brain },
    { label: 'Content Type', value: stats?.contentType ?? 0, icon: Map },
    { label: 'Drop Off Points', value: stats?.dropOffPoints ?? 0, icon: TrendingDown },
    { label: 'Weak Topics Standard Wise', value: stats?.weakTopicsStandardWise.length ?? 0, icon: AlertCircle },
  ];

  return (
    <div className="dashboard-screen">
      <section className="dashboard-hero card">
        <div className="dashboard-orbit" aria-hidden="true" style={{ background: 'transparent' }}>
          <img src={gyanxLogo} alt="GyanX Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        </div>
        <div className="dashboard-copy">
          <h1>Analytics</h1>
          <p>Real platform analytics from users, sessions, quiz attempts, AI tutor events, content issues, GP transactions, notes, and content collections.</p>
        </div>
      </section>

      {loading ? (
        <div className="empty-state">Loading analytics...</div>
      ) : (
        <>
          <section className="analytics-grid">
            {cards.map(({ label, value, icon: Icon }) => (
              <article key={label} className="metric-tile metric-blue analytics-tile">
                <div>
                  <p>{label}</p>
                  <strong>{value}</strong>
                </div>
                <Icon size={22} />
              </article>
            ))}
          </section>

          {stats?.weakTopicsStandardWise.length ? (
            <section className="card">
              <h2 style={{ fontSize: 18, marginBottom: 14 }}>Weak Topics Standard Wise</h2>
              <div className="history-list">
                {stats.weakTopicsStandardWise.map(([topic, count]) => (
                  <div key={topic} className="history-row">
                    <div><strong>{topic}</strong><span>{count} low-score attempts</span></div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
