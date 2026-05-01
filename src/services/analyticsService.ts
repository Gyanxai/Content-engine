import {
  collection, getDocs, query, where, orderBy, limit, getDoc, doc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface StudentProgress {
  uid: string;
  display_name?: string;
  email?: string;
  xp: number;
  gems: number;
  streak: number;
  language_preference: string;
  progress: {
    maths?: { current_level: string; completed_chapters: string[] };
    science?: { current_level: string; completed_chapters: string[] };
  };
  last_active?: unknown;
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
  submitted_at: unknown;
}

export async function getStudents(): Promise<StudentProgress[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }) as StudentProgress);
}

export async function getStudentById(uid: string): Promise<StudentProgress | null> {
  const d = await getDoc(doc(db, 'users', uid));
  return d.exists() ? ({ uid: d.id, ...d.data() } as StudentProgress) : null;
}

export async function getStudentAttempts(uid: string): Promise<QuizAttempt[]> {
  const q = query(
    collection(db, 'quiz_attempts'),
    where('student_uid', '==', uid),
    orderBy('submitted_at', 'desc'),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as QuizAttempt);
}

export async function getAggregatedStats() {
  const [attemptsSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, 'quiz_attempts')),
    getDocs(collection(db, 'users')),
  ]);
  const attempts = attemptsSnap.docs.map(d => d.data() as QuizAttempt);
  const totalAttempts = attempts.length;
  const passed = attempts.filter(a => a.passed).length;
  const avgScore = totalAttempts > 0
    ? Math.round(attempts.reduce((s, a) => s + (a.score || 0), 0) / totalAttempts)
    : 0;
  const avgTime = totalAttempts > 0
    ? Math.round(attempts.reduce((s, a) => s + (a.time_ms || 0), 0) / totalAttempts / 1000)
    : 0;

  return {
    totalStudents: usersSnap.size,
    totalAttempts,
    passRate: totalAttempts > 0 ? Math.round((passed / totalAttempts) * 100) : 0,
    avgScore,
    avgTimeSeconds: avgTime,
    recentAttempts: attempts.slice(0, 10),
  };
}
