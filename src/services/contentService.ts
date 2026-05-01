import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp, writeBatch, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ContentStatus = 'draft' | 'in_review' | 'published';
export type QuestionLevel = 'lv0' | 'lv1' | 'lv2';
export type QuestionType =
  | 'mcq' | 'trueFalse' | 'fillBlank'
  | 'interactive_graph' | 'slider_simulation'
  | 'logic_puzzle' | 'step_by_step';

export interface TranslationContent {
  text: string;
  options?: string[];
  answer?: string;
  explanation?: string;
}

export interface Question {
  id?: string;
  subtopic_id: string;
  type: QuestionType;
  level: QuestionLevel;
  order: number;
  difficulty: number;
  status: ContentStatus;
  lottie_url: string;
  media_url: string;
  dsl_params: Record<string, unknown>;
  content_en: TranslationContent;
  content_hi?: TranslationContent;
  content_bn?: TranslationContent;
  content_te?: TranslationContent;
  content_ta?: TranslationContent;
  content_mr?: TranslationContent;
  content_gu?: TranslationContent;
  content_kn?: TranslationContent;
  content_ml?: TranslationContent;
  content_pa?: TranslationContent;
  content_ur?: TranslationContent;
  created_by: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
  // taxonomy fields for flat querying
  subject: string;
  class: string;
  chapter_id: string;
  topic_id: string;
}

export interface Chapter {
  id?: string;
  subject: string;
  class: string;
  name: string;
  order: number;
  status: ContentStatus;
}

export interface Topic {
  id?: string;
  chapter_id: string;
  name: string;
  order: number;
}

export interface Subtopic {
  id?: string;
  topic_id: string;
  name: string;
  order: number;
  type: 'lesson' | 'quiz';
  status: ContentStatus;
}

// ─── Chapter / Taxonomy CRUD ──────────────────────────────────────────────────

export async function getChapters(subject: string, cls: string): Promise<Chapter[]> {
  const q = query(
    collection(db, 'chapters'),
    where('subject', '==', subject),
    where('class', '==', cls),
    orderBy('order')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Chapter);
}

export async function addChapter(data: Omit<Chapter, 'id'>): Promise<string> {
  const ref2 = await addDoc(collection(db, 'chapters'), {
    ...data, created_at: serverTimestamp()
  });
  return ref2.id;
}

export async function updateChapter(id: string, data: Partial<Chapter>): Promise<void> {
  await updateDoc(doc(db, 'chapters', id), { ...data, updated_at: serverTimestamp() });
}

export async function deleteChapter(id: string): Promise<void> {
  await deleteDoc(doc(db, 'chapters', id));
}

export async function getTopics(chapterId: string): Promise<Topic[]> {
  const q = query(
    collection(db, 'topics'),
    where('chapter_id', '==', chapterId),
    orderBy('order')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Topic);
}

export async function addTopic(data: Omit<Topic, 'id'>): Promise<string> {
  const ref2 = await addDoc(collection(db, 'topics'), {
    ...data, created_at: serverTimestamp()
  });
  return ref2.id;
}

export async function updateTopic(id: string, data: Partial<Topic>): Promise<void> {
  await updateDoc(doc(db, 'topics', id), { ...data });
}

export async function deleteTopic(id: string): Promise<void> {
  await deleteDoc(doc(db, 'topics', id));
}

export async function getSubtopics(topicId: string): Promise<Subtopic[]> {
  const q = query(
    collection(db, 'subtopics'),
    where('topic_id', '==', topicId),
    orderBy('order')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Subtopic);
}

export async function addSubtopic(data: Omit<Subtopic, 'id'>): Promise<string> {
  const ref2 = await addDoc(collection(db, 'subtopics'), {
    ...data, created_at: serverTimestamp()
  });
  return ref2.id;
}

export async function updateSubtopic(id: string, data: Partial<Subtopic>): Promise<void> {
  await updateDoc(doc(db, 'subtopics', id), { ...data });
}

export async function deleteSubtopic(id: string): Promise<void> {
  await deleteDoc(doc(db, 'subtopics', id));
}

// ─── Question CRUD ────────────────────────────────────────────────────────────

export async function getQuestions(subtopicId: string, level?: QuestionLevel): Promise<Question[]> {
  const constraints = [
    where('subtopic_id', '==', subtopicId),
    orderBy('order')
  ];
  if (level) constraints.unshift(where('level', '==', level));
  const q = query(collection(db, 'questions'), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Question);
}

export async function getAllQuestions(filters: {
  subject?: string; class?: string; chapter_id?: string; status?: ContentStatus; level?: QuestionLevel;
}): Promise<Question[]> {
  let q = query(collection(db, 'questions'), orderBy('created_at', 'desc'));
  if (filters.subject) q = query(collection(db, 'questions'), where('subject', '==', filters.subject), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  let results = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Question);
  // Client-side filter for additional fields
  if (filters.class) results = results.filter(q => q.class === filters.class);
  if (filters.chapter_id) results = results.filter(q => q.chapter_id === filters.chapter_id);
  if (filters.status) results = results.filter(q => q.status === filters.status);
  if (filters.level) results = results.filter(q => q.level === filters.level);
  return results;
}

export async function addQuestion(data: Omit<Question, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  const ref2 = await addDoc(collection(db, 'questions'), {
    ...data, created_at: serverTimestamp(), updated_at: serverTimestamp()
  });
  return ref2.id;
}

export async function updateQuestion(id: string, data: Partial<Question>): Promise<void> {
  await updateDoc(doc(db, 'questions', id), { ...data, updated_at: serverTimestamp() });
}

export async function deleteQuestion(id: string): Promise<void> {
  await deleteDoc(doc(db, 'questions', id));
}

export async function updateQuestionStatus(
  id: string, status: ContentStatus, uid: string
): Promise<void> {
  await updateDoc(doc(db, 'questions', id), {
    status,
    reviewed_by: status === 'published' ? uid : null,
    updated_at: serverTimestamp()
  });
}

export async function bulkWriteQuestions(questions: Omit<Question, 'id'>[]): Promise<void> {
  const BATCH_SIZE = 499;
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    questions.slice(i, i + BATCH_SIZE).forEach(q => {
      const ref2 = doc(collection(db, 'questions'));
      batch.set(ref2, { ...q, created_at: serverTimestamp(), updated_at: serverTimestamp() });
    });
    await batch.commit();
  }
}

// ─── Media Upload ─────────────────────────────────────────────────────────────

export async function uploadMedia(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const [questionsSnap, usersSnap, attemptsSnap] = await Promise.all([
    getDocs(query(collection(db, 'questions'), where('status', '==', 'published'))),
    getDocs(collection(db, 'users')),
    getDocs(query(collection(db, 'quiz_attempts'), orderBy('submitted_at', 'desc'))),
  ]);
  const draftSnap = await getDocs(query(collection(db, 'questions'), where('status', '==', 'draft')));
  const reviewSnap = await getDocs(query(collection(db, 'questions'), where('status', '==', 'in_review')));

  return {
    publishedQuestions: questionsSnap.size,
    totalStudents: usersSnap.size,
    pendingReview: reviewSnap.size,
    draftCount: draftSnap.size,
    recentAttempts: attemptsSnap.docs.slice(0, 10).map(d => ({ id: d.id, ...d.data() })),
  };
}

