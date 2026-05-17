import { useEffect, useState } from 'react';
import {
  AlertCircle, BookOpen, CheckCircle2, Clock, FileStack,
  GraduationCap, Layers3, Users
} from 'lucide-react';
import { getDashboardStats } from '../services/contentService';
import gyanxLogo from '../assets/Gyanxlogo.jpeg';

interface Stats {
  totalContent: number;
  publishedContent: number;
  totalStudents: number;
  pendingReview: number;
  curricula: number;
  contentTypes: number;
  contentIssues: number;
  completionRate: number;
  averageLearningTime: number;
  testsAttempted: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(s => setStats(s as Stats))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Total Content Created', value: stats?.totalContent ?? 0, icon: FileStack, tone: 'blue' },
    { label: 'Completion Rate', value: `${stats?.completionRate ?? 0}%`, icon: CheckCircle2, tone: 'green' },
    { label: 'Total User', value: stats?.totalStudents ?? 0, icon: Users, tone: 'purple' },
    { label: 'Content Issues Reported', value: stats?.contentIssues ?? 0, icon: AlertCircle, tone: 'yellow' },
    { label: 'Tests Attempted', value: stats?.testsAttempted ?? 0, icon: GraduationCap, tone: 'purple' },
    { label: 'Published Content', value: stats?.publishedContent ?? 0, icon: BookOpen, tone: 'green' },
    { label: 'Types of Content', value: stats?.contentTypes ?? 0, icon: Layers3, tone: 'blue' },
    { label: 'Average Learning Time', value: `${stats?.averageLearningTime ?? 0}s`, icon: Clock, tone: 'yellow' },
  ];

  return (
    <div className="dashboard-screen">
      <section className="dashboard-hero card">
        <div className="dashboard-orbit" aria-hidden="true" style={{ background: 'transparent' }}>
          <img src={gyanxLogo} alt="GyanX Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        </div>
        <div className="dashboard-copy">
          <h1>Content Builder Dashboard</h1>
          <p>Track curriculum readiness, content review, learner engagement, and publishing health for the GyanX app.</p>
          <div className="dashboard-summary">
            <span>{stats?.curricula ?? 0} curricula</span>
            <span>{stats?.pendingReview ?? 0} awaiting review</span>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="empty-state">Loading live dashboard data...</div>
      ) : (
        <section className="metric-grid">
          {cards.map(({ label, value, icon: Icon, tone }) => (
            <article key={label} className={`metric-tile metric-${tone}`}>
              <div>
                <p>{label}</p>
                <strong>{value}</strong>
              </div>
              <Icon size={24} />
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
