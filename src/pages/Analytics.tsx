import { useEffect, useState } from 'react';
import { getStudents, getStudentById, getStudentAttempts, getAggregatedStats } from '../services/analyticsService';
import type { StudentProgress, QuizAttempt } from '../services/analyticsService';
import { Search, ChevronRight, Activity, Clock, Trophy, X } from 'lucide-react';

export default function Analytics() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAggregatedStats>> | null>(null);
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentProgress | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillLoading, setDrillLoading] = useState(false);

  useEffect(() => {
    Promise.all([getAggregatedStats(), getStudents()]).then(([s, sts]) => {
      setStats(s); setStudents(sts); setLoading(false);
    });
  }, []);

  const openDrilldown = async (uid: string) => {
    setDrillLoading(true);
    const [student, atts] = await Promise.all([getStudentById(uid), getStudentAttempts(uid)]);
    setSelectedStudent(student); setAttempts(atts); setDrillLoading(false);
  };

  const filtered = students.filter(s =>
    (s.display_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.uid ?? '').includes(searchTerm)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div><h1>Analytics</h1><p style={{ color: 'var(--text-secondary)' }}>Live data from Cloud Firestore.</p></div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>⏳ Loading analytics…</div>
      ) : (
        <>
          <div className="grid-3">
            {[
              { label: 'Total Students', value: stats?.totalStudents, icon: Activity, color: 'var(--info-blue)' },
              { label: 'Pass Rate (≥80%)', value: `${stats?.passRate}%`, icon: Trophy, color: 'var(--success-green)' },
              { label: 'Avg. Quiz Time', value: `${stats?.avgTimeSeconds}s`, icon: Clock, color: 'var(--primary-purple)' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card stat-card">
                <div className="flex-between"><span className="label">{label}</span><Icon size={20} color={color} /></div>
                <span className="value">{value}</span>
              </div>
            ))}
          </div>

          {/* Student List */}
          <div className="card">
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 16 }}>Student Progress Drilldown</h2>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input placeholder="Search by name or UID…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  style={{ padding: '8px 12px 8px 32px', borderRadius: 8, border: '1px solid var(--border-color)', fontFamily: 'inherit', fontSize: 14, outline: 'none', width: 240, backgroundColor: '#0a0a0a', color: 'inherit' }} />
              </div>
            </div>
            {filtered.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>No students found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map(s => (
                  <div key={s.uid} onClick={() => openDrilldown(s.uid)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--primary-purple)')}
                    onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #8A5CFF, #1DAAF4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                      {(s.display_name ?? s.uid)[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{s.display_name ?? 'Unknown'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{s.uid}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                      <span>⚡ {s.xp ?? 0} XP</span>
                      <span>💎 {s.gems ?? 0}</span>
                      <span>🔥 {s.streak ?? 0}d</span>
                    </div>
                    <ChevronRight size={16} color="var(--text-secondary)" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Drilldown Modal */}
      {(selectedStudent || drillLoading) && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div className="card" style={{ width: '100%', maxWidth: 640, maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setSelectedStudent(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            {drillLoading ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading…</div>
            ) : selectedStudent && (
              <>
                <h2 style={{ marginBottom: 4 }}>{selectedStudent.display_name ?? 'Student'}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20, fontFamily: 'monospace' }}>{selectedStudent.uid}</p>
                <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                  {[['XP', selectedStudent.xp], ['Gems', selectedStudent.gems], ['Streak', `${selectedStudent.streak}d`]].map(([l, v]) => (
                    <div key={String(l)} className="card" style={{ flex: 1, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{v ?? 0}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{l}</div>
                    </div>
                  ))}
                </div>
                <h3 style={{ fontSize: 14, marginBottom: 12 }}>Quiz Attempts ({attempts.length})</h3>
                {attempts.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No attempts yet.</p> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {attempts.map(a => (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, backgroundColor: 'var(--bg-main)', fontSize: 14 }}>
                        <div><strong>{a.subject}</strong> — {a.chapter_id} <span className="badge badge-info" style={{ marginLeft: 8 }}>{a.level}</span></div>
                        <span className={`badge badge-${a.score >= 80 ? 'success' : 'warning'}`}>{a.score}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

