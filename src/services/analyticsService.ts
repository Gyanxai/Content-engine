import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface StudentProgress {
  uid: string;
  display_name?: string;
  email?: string;
  xp?: number;
  gp?: number;
  gems?: number;
  notes_count?: number;
  level?: number;
  created_at?: Timestamp;
  last_active?: Timestamp;
}

export interface QuizAttempt {
  id: string;
  student_uid: string;
  subject: string;
  chapter_id: string;
  level: string;
  score: number;
  passed: boolean;
  time_ms: number;
  submitted_at?: Timestamp;
}

function isThisMonth(value?: Timestamp) {
  if (!value) return false;
  const date = value.toDate();
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function isWithinDays(value: Timestamp | undefined, days: number) {
  if (!value) return false;
  return Date.now() - value.toDate().getTime() <= days * 24 * 60 * 60 * 1000;
}

export async function getStudents(): Promise<StudentProgress[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }) as StudentProgress);
}

export async function getAggregatedStats() {
  const [
    contentSnap,
    usersSnap,
    attemptsSnap,
    sessionsSnap,
    issuesSnap,
    aiEventsSnap,
    notesSnap,
    gpSnap,
  ] = await Promise.all([
    getDocs(collection(db, 'content_items')),
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'quiz_attempts')),
    getDocs(collection(db, 'learning_sessions')),
    getDocs(collection(db, 'content_issues')),
    getDocs(collection(db, 'ai_tutor_events')),
    getDocs(collection(db, 'notes')),
    getDocs(collection(db, 'gp_transactions')),
  ]);

  const content = contentSnap.docs.map(d => d.data());
  const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }) as StudentProgress);
  const attempts = attemptsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as QuizAttempt);
  const sessions = sessionsSnap.docs.map(d => d.data());
  const issues = issuesSnap.docs.map(d => d.data());
  const aiEvents = aiEventsSnap.docs.map(d => d.data());
  const notes = notesSnap.docs.map(d => d.data());
  const gpEvents = gpSnap.docs.map(d => d.data());

  const passed = attempts.filter(a => a.passed || Number(a.score ?? 0) >= 80).length;
  const activeUsers = users.filter(user => isWithinDays(user.last_active, 30)).length;
  const dailyActiveUsers = users.filter(user => isWithinDays(user.last_active, 1)).length;
  const monthlyActiveUsers = activeUsers;
  const newUsersThisMonth = users.filter(user => isThisMonth(user.created_at)).length;
  const totalTimeMs = sessions.reduce((sum, session) => sum + Number(session.duration_ms ?? session.time_ms ?? 0), 0);
  const attemptTimeMs = attempts.reduce((sum, attempt) => sum + Number(attempt.time_ms ?? 0), 0);
  const levelCounts = [0, 1, 2, 3].map(level => users.filter(user => Number(user.level ?? 0) === level).length);
  const contentTypes = new Set(content.map(item => item.type).filter(Boolean));
  const flagged = issues.filter(issue => issue.status !== 'resolved').length;
  const gpEarned = gpEvents.length
    ? gpEvents.reduce((sum, event) => sum + Number(event.amount ?? 0), 0)
    : users.reduce((sum, user) => sum + Number(user.gp ?? user.gems ?? 0), 0);
  const notesEarned = notes.length || users.reduce((sum, user) => sum + Number(user.notes_count ?? 0), 0);
  const weakTopicMap = new Map<string, number>();
  attempts.forEach(attempt => {
    if (Number(attempt.score ?? 0) < 60) {
      weakTopicMap.set(attempt.chapter_id || 'Unknown', (weakTopicMap.get(attempt.chapter_id || 'Unknown') ?? 0) + 1);
    }
  });

  return {
    totalContentCreated: content.length,
    completionRate: attempts.length ? Math.round((passed / attempts.length) * 100) : 0,
    totalUsers: users.length,
    activeUsers,
    newUsersThisMonth,
    engagementHeatmap: sessions.length,
    testGiven: attempts.length,
    studentLevel: levelCounts,
    dailyActiveUsers,
    monthlyActiveUsers,
    timeSpendSeconds: Math.round((totalTimeMs || attemptTimeMs) / 1000),
    contentIssues: issues.length,
    flaggedContent: flagged,
    gpEarned,
    notesEarned,
    aiTutorInteractiveRate: users.length ? Math.round((aiEvents.length / users.length) * 100) : 0,
    contentType: contentTypes.size,
    dropOffPoints: attempts.filter(attempt => Number(attempt.score ?? 0) < 40).length,
    weakTopicsStandardWise: Array.from(weakTopicMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
  };
}

export async function getStudentAttempts(uid: string): Promise<QuizAttempt[]> {
  const q = query(collection(db, 'quiz_attempts'), where('student_uid', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as QuizAttempt);
}
