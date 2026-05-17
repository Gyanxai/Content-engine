import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp, writeBatch, serverTimestamp,
  onSnapshot, type QueryConstraint, type Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import type {
  ContentStatus, ContentLevel, ContentType, ContentItem,
  Curriculum, Chapter, Topic, Subtopic, QuestionLevel, Subject, Board, Medium,
} from '../types/content';
export type * from '../types/content';
import { validateDsl } from './dslValidator';


export type Question = ContentItem;

export interface ContentVersion {
  id?: string;
  content_id: string;
  snapshot: ContentItem;
  changed_by: string;
  change_type: 'created' | 'updated' | 'status';
  created_at?: Timestamp;
}

export interface BulkJsonContentRow {
  chapter_name: string;
  topic_name: string;
  subtopic_name: string;
  level: ContentLevel;
  type: ContentType;
  title: string;
  icon?: string;
  content_text: string;
  options?: string[];
  answer?: string;
  explanation?: string;
  template_json?: Record<string, unknown>;
  media_url?: string;
  lottie_url?: string;
  file_url?: string;
}

const curriculumTitle = (data: Pick<Curriculum, 'board' | 'medium' | 'class' | 'subject'>) =>
  `${data.board} • ${data.medium} • Class ${data.class} • ${data.subject}`;

export async function getCurricula(filters: Partial<Pick<Curriculum, 'board' | 'medium' | 'class' | 'subject' | 'state'>> = {}): Promise<Curriculum[]> {
  const snap = await getDocs(collection(db, 'curricula'));
  let results = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Curriculum);
  results.sort((a, b) => (b.created_at?.toMillis() || 0) - (a.created_at?.toMillis() || 0));
  if (filters.board) results = results.filter(c => c.board === filters.board);
  if (filters.medium) results = results.filter(c => c.medium === filters.medium);
  if (filters.class) results = results.filter(c => c.class === filters.class);
  if (filters.subject) results = results.filter(c => c.subject === filters.subject);
  if (filters.state) results = results.filter(c => c.state === filters.state);
  return results;
}

export async function getCurriculum(id: string): Promise<Curriculum | null> {
  const snap = await getDoc(doc(db, 'curricula', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Curriculum) : null;
}

export async function addCurriculum(data: Omit<Curriculum, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  const ref2 = await addDoc(collection(db, 'curricula'), {
    ...data,
    title: data.title || curriculumTitle(data),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });
  return ref2.id;
}

export async function updateCurriculum(id: string, data: Partial<Curriculum>): Promise<void> {
  await updateDoc(doc(db, 'curricula', id), { ...data, updated_at: serverTimestamp() });
}

export async function deleteCurriculum(id: string): Promise<void> {
  await deleteDoc(doc(db, 'curricula', id));
}

export async function getChapters(curriculumId: string): Promise<Chapter[]> {
  const q = query(
    collection(db, 'chapters'),
    where('curriculum_id', '==', curriculumId)
  );
  const snap = await getDocs(q);
  const results = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Chapter);
  return results.sort((a, b) => a.order - b.order);
}

export async function addChapter(data: Omit<Chapter, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  const ref2 = await addDoc(collection(db, 'chapters'), {
    ...data, created_at: serverTimestamp(), updated_at: serverTimestamp()
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
    where('chapter_id', '==', chapterId)
  );
  const snap = await getDocs(q);
  const results = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Topic);
  return results.sort((a, b) => a.order - b.order);
}

export async function addTopic(data: Omit<Topic, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  const ref2 = await addDoc(collection(db, 'topics'), {
    ...data, created_at: serverTimestamp(), updated_at: serverTimestamp()
  });
  return ref2.id;
}

export async function updateTopic(id: string, data: Partial<Topic>): Promise<void> {
  await updateDoc(doc(db, 'topics', id), { ...data, updated_at: serverTimestamp() });
}

export async function deleteTopic(id: string): Promise<void> {
  await deleteDoc(doc(db, 'topics', id));
}

export async function getSubtopics(topicId: string): Promise<Subtopic[]> {
  const q = query(
    collection(db, 'subtopics'),
    where('topic_id', '==', topicId)
  );
  const snap = await getDocs(q);
  const results = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Subtopic);
  return results.sort((a, b) => a.order - b.order);
}

export async function addSubtopic(data: Omit<Subtopic, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  const ref2 = await addDoc(collection(db, 'subtopics'), {
    ...data, created_at: serverTimestamp(), updated_at: serverTimestamp()
  });
  return ref2.id;
}

export async function updateSubtopic(id: string, data: Partial<Subtopic>): Promise<void> {
  await updateDoc(doc(db, 'subtopics', id), { ...data, updated_at: serverTimestamp() });
}

export async function deleteSubtopic(id: string): Promise<void> {
  await deleteDoc(doc(db, 'subtopics', id));
}

export async function duplicateChapterTree(chapter: Chapter): Promise<string> {
  const topics = await getTopics(chapter.id!);
  const newChapterId = await addChapter({
    curriculum_id: chapter.curriculum_id,
    name: `${chapter.name} Copy`,
    order: chapter.order + 1,
    state: 'draft',
    board: chapter.board,
    medium: chapter.medium,
    subject: chapter.subject,
    class: chapter.class,
  });

  for (const topic of topics) {
    const subtopics = await getSubtopics(topic.id!);
    const newTopicId = await addTopic({
      curriculum_id: topic.curriculum_id,
      chapter_id: newChapterId,
      name: topic.name,
      order: topic.order,
    });

    for (const subtopic of subtopics) {
      const content = await getContentItems(subtopic.id!);
      const newSubtopicId = await addSubtopic({
        curriculum_id: subtopic.curriculum_id,
        chapter_id: newChapterId,
        topic_id: newTopicId,
        name: subtopic.name,
        order: subtopic.order,
        type: subtopic.type,
        state: 'draft',
      });

      for (const item of content) {
          await addContentItem({
            version: 2,
            type: item.type,
            state: 'draft',
            taxonomy: {
              curriculum_id: item.taxonomy.curriculum_id,
              chapter_id: newChapterId,
              topic_id: newTopicId,
              subtopic_id: newSubtopicId,
              board: item.taxonomy.board,
              medium: item.taxonomy.medium,
              subject: item.taxonomy.subject,
              class: item.taxonomy.class,
            },
            meta: {
              ...item.meta,
              level: item.meta.level,
              difficulty: item.meta.difficulty,
            },
            media: { ...item.media },
            scoring: { ...item.scoring },
            behavior: { ...item.behavior },
            content: { ...item.content },
            dsl_params: { ...item.dsl_params },
            tracking: { ...item.tracking },
            created_by: item.created_by,
            reviewed_by: null,
          });
      }
    }
  }

  return newChapterId;
}

export async function duplicateSubtopicTree(subtopic: Subtopic): Promise<string> {
  const content = await getContentItems(subtopic.id!);
  const newSubtopicId = await addSubtopic({
    curriculum_id: subtopic.curriculum_id,
    chapter_id: subtopic.chapter_id,
    topic_id: subtopic.topic_id,
    name: `${subtopic.name} Copy`,
    order: subtopic.order + 1,
    type: subtopic.type,
    state: 'draft',
  });

  for (const item of content) {
    await addContentItem({
      version: 2,
      type: item.type,
      state: 'draft',
      taxonomy: {
        ...item.taxonomy,
        subtopic_id: newSubtopicId,
      },
      meta: { ...item.meta },
      media: { ...item.media },
      scoring: { ...item.scoring },
      behavior: { ...item.behavior },
      content: { ...item.content },
      dsl_params: { ...item.dsl_params },
      tracking: { ...item.tracking },
      created_by: item.created_by,
      reviewed_by: null,
    });
  }

  return newSubtopicId;
}

export async function getContentItems(subtopicId: string, level?: ContentLevel): Promise<ContentItem[]> {
  const constraints = [
    where('taxonomy.subtopic_id', '==', subtopicId)
  ];
  if (level) constraints.unshift(where('meta.level', '==', level));
  const q = query(collection(db, 'content_items'), ...constraints, orderBy('created_at', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ContentItem);
}

export async function getQuestions(subtopicId: string, level?: QuestionLevel): Promise<Question[]> {
  return getContentItems(subtopicId, level);
}

export async function getAllContentItems(filters: {
  curriculum_id?: string; board?: Board; medium?: Medium; subject?: Subject; class?: string; chapter_id?: string; state?: ContentStatus; level?: ContentLevel; type?: ContentType;
}): Promise<ContentItem[]> {
  const constraints: QueryConstraint[] = [];

  // Primary partition filter (required for index to kick in)
  if (filters.curriculum_id) constraints.push(where('taxonomy.curriculum_id', '==', filters.curriculum_id));
  else if (filters.board) constraints.push(where('taxonomy.board', '==', filters.board));

  // Server-side indexed filters
  if (filters.chapter_id) constraints.push(where('taxonomy.chapter_id', '==', filters.chapter_id));
  if (filters.state) constraints.push(where('state', '==', filters.state));
  if (filters.level) constraints.push(where('meta.level', '==', filters.level));
  if (filters.type) constraints.push(where('type', '==', filters.type));

  constraints.push(orderBy('created_at', 'desc'));

  const snap = await getDocs(query(collection(db, 'content_items'), ...constraints));
  let results = snap.docs.map(d => ({ id: d.id, ...d.data() }) as ContentItem);

  // Client-side for nested fields without dedicated indexes
  if (filters.medium) results = results.filter(q => q.taxonomy.medium === filters.medium);
  if (filters.subject) results = results.filter(q => q.taxonomy.subject === filters.subject);
  if (filters.class) results = results.filter(q => q.taxonomy.class === filters.class);

  return results;
}

export async function getAllQuestions(filters: {
  subject?: Subject; class?: string; chapter_id?: string; status?: ContentStatus; level?: QuestionLevel;
}): Promise<Question[]> {
  return getAllContentItems(filters);
}

export async function addContentItem(data: Omit<ContentItem, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  const validation = validateDsl(data.type, data.dsl_params);
  if (!validation.success) throw new Error(`Invalid DSL: ${validation.error}`);

  const ref2 = await addDoc(collection(db, 'content_items'), {
    ...data, created_at: serverTimestamp(), updated_at: serverTimestamp()
  });
  await addDoc(collection(db, 'content_versions'), {
    content_id: ref2.id,
    snapshot: { ...data, id: ref2.id },
    changed_by: data.created_by,
    change_type: 'created',
    created_at: serverTimestamp(),
  });
  return ref2.id;
}

export async function addQuestion(data: Omit<Question, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  return addContentItem(data);
}

export async function updateContentItem(id: string, data: Partial<ContentItem>): Promise<void> {
  if (data.type && data.dsl_params) {
    const validation = validateDsl(data.type, data.dsl_params);
    if (!validation.success) throw new Error(`Invalid DSL: ${validation.error}`);
  }

  const before = await getDoc(doc(db, 'content_items', id));
  await updateDoc(doc(db, 'content_items', id), { ...data, updated_at: serverTimestamp() });
  const nextSnapshot = before.exists()
    ? ({ id: before.id, ...before.data(), ...data } as ContentItem)
    : ({ id, ...data } as ContentItem);
  await addDoc(collection(db, 'content_versions'), {
    content_id: id,
    snapshot: nextSnapshot,
    changed_by: data.created_by ?? nextSnapshot.created_by ?? 'unknown',
    change_type: 'updated',
    created_at: serverTimestamp(),
  });
}

export async function updateQuestion(id: string, data: Partial<Question>): Promise<void> {
  return updateContentItem(id, data);
}

export async function deleteContentItem(id: string): Promise<void> {
  await deleteDoc(doc(db, 'content_items', id));
}

export async function deleteQuestion(id: string): Promise<void> {
  return deleteContentItem(id);
}

export async function updateContentStatus(
  id: string, state: ContentStatus, uid: string
): Promise<void> {
  const before = await getDoc(doc(db, 'content_items', id));
  await updateDoc(doc(db, 'content_items', id), {
    state,
    reviewed_by: state === 'published' ? uid : null,
    updated_at: serverTimestamp()
  });
  if (before.exists()) {
    const snapshot = {
      id: before.id,
      ...before.data(),
      state,
      reviewed_by: state === 'published' ? uid : null,
    } as ContentItem;
    await addDoc(collection(db, 'content_versions'), {
      content_id: id,
      snapshot,
      changed_by: uid,
      change_type: 'status',
      created_at: serverTimestamp(),
    });
  }
}

export async function updateQuestionStatus(id: string, status: ContentStatus, uid: string): Promise<void> {
  return updateContentStatus(id, status, uid);
}

async function commitWithRetry(
  batch: ReturnType<typeof writeBatch>,
  attempt = 0,
): Promise<void> {
  const MAX_RETRIES = 3;
  const BACKOFF_MS = 500;
  try {
    await batch.commit();
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw err;
    await new Promise(r => setTimeout(r, BACKOFF_MS * 2 ** attempt));
    await commitWithRetry(batch, attempt + 1);
  }
}

export async function bulkWriteContentItems(items: Omit<ContentItem, 'id'>[]): Promise<void> {
  const BATCH_SIZE = 499;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    items.slice(i, i + BATCH_SIZE).forEach(item => {
      const ref2 = doc(collection(db, 'content_items'));
      batch.set(ref2, { ...item, created_at: serverTimestamp(), updated_at: serverTimestamp() });
    });
    await commitWithRetry(batch);
  }
}

// Real-time listener — returns unsubscribe function
export function subscribeToContentItems(
  subtopicId: string,
  onChange: (items: ContentItem[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'content_items'),
    where('taxonomy.subtopic_id', '==', subtopicId),
    orderBy('created_at', 'asc'),
  );
  return onSnapshot(q, snap => {
    onChange(snap.docs.map(d => ({ id: d.id, ...d.data() }) as ContentItem));
  });
}

export async function bulkWriteQuestions(questions: Omit<Question, 'id'>[]): Promise<void> {
  return bulkWriteContentItems(questions);
}

export async function uploadMedia(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function importBulkJsonContent(
  curriculum: Curriculum,
  rows: BulkJsonContentRow[],
  uid: string
): Promise<{ imported: number; chaptersCreated: number; topicsCreated: number; subtopicsCreated: number }> {
  const chapters = await getChapters(curriculum.id!);
  const chapterMap = new Map(chapters.map(chapter => [chapter.name.trim().toLowerCase(), chapter]));
  const topicMap = new Map<string, Topic[]>();
  const subtopicMap = new Map<string, Subtopic[]>();
  let chaptersCreated = 0;
  let topicsCreated = 0;
  let subtopicsCreated = 0;
  let imported = 0;

  for (const row of rows) {
    if (!row.chapter_name || !row.topic_name || !row.subtopic_name || !row.title || !row.content_text) {
      throw new Error('Every JSON item needs chapter_name, topic_name, subtopic_name, title, and content_text.');
    }

    const chapterKey = row.chapter_name.trim().toLowerCase();
    let chapter = chapterMap.get(chapterKey);
    if (!chapter) {
      const id = await addChapter({
        curriculum_id: curriculum.id!,
        name: row.chapter_name.trim(),
        order: chapterMap.size,
        state: 'draft',
        board: curriculum.board,
        medium: curriculum.medium,
        class: curriculum.class,
        subject: curriculum.subject,
      });
      chapter = { id, curriculum_id: curriculum.id!, name: row.chapter_name.trim(), order: chapterMap.size, state: 'draft' };
      chapterMap.set(chapterKey, chapter);
      chaptersCreated += 1;
    }

    if (!topicMap.has(chapter.id!)) topicMap.set(chapter.id!, await getTopics(chapter.id!));
    const topics = topicMap.get(chapter.id!)!;
    const topicKey = row.topic_name.trim().toLowerCase();
    let topic = topics.find(item => item.name.trim().toLowerCase() === topicKey);
    if (!topic) {
      const id = await addTopic({
        curriculum_id: curriculum.id!,
        chapter_id: chapter.id!,
        name: row.topic_name.trim(),
        order: topics.length,
      });
      topic = { id, curriculum_id: curriculum.id!, chapter_id: chapter.id!, name: row.topic_name.trim(), order: topics.length };
      topics.push(topic);
      topicsCreated += 1;
    }

    if (!subtopicMap.has(topic.id!)) subtopicMap.set(topic.id!, await getSubtopics(topic.id!));
    const subtopics = subtopicMap.get(topic.id!)!;
    const subtopicKey = row.subtopic_name.trim().toLowerCase();
    let subtopic = subtopics.find(item => item.name.trim().toLowerCase() === subtopicKey);
    if (!subtopic) {
      const id = await addSubtopic({
        curriculum_id: curriculum.id!,
        chapter_id: chapter.id!,
        topic_id: topic.id!,
        name: row.subtopic_name.trim(),
        order: subtopics.length,
        type: 'lesson',
        state: 'draft',
      });
      subtopic = { id, curriculum_id: curriculum.id!, chapter_id: chapter.id!, topic_id: topic.id!, name: row.subtopic_name.trim(), order: subtopics.length, type: 'lesson', state: 'draft' };
      subtopics.push(subtopic);
      subtopicsCreated += 1;
    }

    await addContentItem({
      version: 2,
      type: row.type as ContentType,
      state: 'draft',
      taxonomy: {
        curriculum_id: curriculum.id!,
        chapter_id: chapter.id!,
        topic_id: topic.id!,
        subtopic_id: subtopic.id!,
        board: curriculum.board,
        medium: curriculum.medium,
        subject: curriculum.subject,
        class: curriculum.class,
      },
      meta: {
        title: row.title,
        instruction: '',
        difficulty: row.level === 'lv0' ? 'easy' : row.level === 'lv1' ? 'medium' : 'hard',
        level: row.level,
        tags: [],
        skills: [],
        time_estimate_sec: 120,
        icon: row.icon || 'BookOpen',
        lottie_url: row.lottie_url,
      },
      media: {
        type: row.type === 'video' ? 'video' : null,
        url: row.media_url,
      },
      scoring: {
        marks: 1,
      },
      behavior: {},
      content: {
        body: row.content_text,
      },
      dsl_params: row.template_json || {},
      tracking: {},
      created_by: uid,
    });
    imported += 1;
  }

  return { imported, chaptersCreated, topicsCreated, subtopicsCreated };
}

export async function getContentVersions(contentId: string): Promise<ContentVersion[]> {
  const q = query(
    collection(db, 'content_versions'),
    where('content_id', '==', contentId)
  );
  const snap = await getDocs(q);
  const results = snap.docs.map(d => ({ id: d.id, ...d.data() }) as ContentVersion);
  return results.sort((a, b) => (b.created_at?.toMillis() || 0) - (a.created_at?.toMillis() || 0));
}

export async function getDashboardStats() {
  const [publishedSnap, usersSnap, reviewSnap, draftSnap, curriculumSnap, allContentSnap, attemptsSnap, issueSnap] = await Promise.all([
    getDocs(query(collection(db, 'content_items'), where('state', '==', 'published'))),
    getDocs(collection(db, 'users')),
    getDocs(query(collection(db, 'content_items'), where('state', '==', 'review'))),
    getDocs(query(collection(db, 'content_items'), where('state', '==', 'draft'))),
    getDocs(collection(db, 'curricula')),
    getDocs(collection(db, 'content_items')),
    getDocs(query(collection(db, 'quiz_attempts'), orderBy('submitted_at', 'desc'))),
    getDocs(collection(db, 'content_issues')),
  ]);

  const contentItems = allContentSnap.docs.map(d => d.data() as ContentItem);
  const contentTypes = new Set(contentItems.map(item => item.type)).size;
  const attempts = attemptsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Record<string, unknown>[];
  const avgMs = attempts.length
    ? attempts.reduce((sum, a) => sum + Number(a.time_ms ?? 0), 0) / attempts.length
    : 0;
  const completed = attempts.filter(a => Number(a.score ?? 0) >= 80).length;

  return {
    publishedContent: publishedSnap.size,
    publishedQuestions: publishedSnap.size,
    totalStudents: usersSnap.size,
    pendingReview: reviewSnap.size,
    draftCount: draftSnap.size,
    curricula: curriculumSnap.size,
    totalContent: allContentSnap.size,
    contentTypes,
    contentIssues: issueSnap.size,
    completionRate: attempts.length ? Math.round((completed / attempts.length) * 100) : 0,
    averageLearningTime: Math.round(avgMs / 1000),
    testsAttempted: attempts.length,
    recentAttempts: attempts.slice(0, 10),
  };
}
