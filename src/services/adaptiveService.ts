import {
  collection, doc, getDoc, getDocs, setDoc, addDoc,
  query, where, limit, Timestamp, serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ContentItem } from './contentService';

// --- Interfaces ---

export interface UserProgress {
  user_id: string;
  concept_id: string;
  mastery: number;
  attempts: number;
  correct_attempts: number;
  last_updated: Timestamp;
}

export interface UserAttempt {
  id?: string;
  user_id: string;
  content_id: string;
  concept_id: string;
  correct: boolean;
  time_taken: number;
  attempt_number: number;
  timestamp: Timestamp;
}

export interface UserReview {
  user_id: string;
  concept_id: string;
  interval: number;
  ease_factor: number;
  next_review: Timestamp;
}

export interface AnalyticsEvent {
  event_name: string;
  user_id: string;
  content_id?: string;
  concept_id?: string;
  correct?: boolean;
  time_taken?: number;
  timestamp: Timestamp;
  metadata?: Record<string, any>;
}

// --- Algorithms ---

/**
 * Calculates mastery as a simple ratio.
 */
export function calculateMastery(correct: number, total: number): number {
  if (total === 0) return 0;
  return Number((correct / total).toFixed(2));
}

/**
 * Recommends difficulty based on mastery level.
 */
export function getRecommendedDifficulty(mastery: number): 'easy' | 'medium' | 'hard' {
  if (mastery >= 0.8) return 'hard';
  if (mastery <= 0.4) return 'easy';
  return 'medium';
}

/**
 * SM2 Spaced Repetition Algorithm
 * quality: 0-5 (0=total failure, 5=perfect recall)
 */
export function calculateNextReview(prevInterval: number, easeFactor: number, quality: number) {
  if (quality < 3) {
    return { interval: 1, easeFactor };
  }

  const newEase = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * 0.08));
  const newInterval = prevInterval === 0 ? 1 : Math.round(prevInterval * newEase);

  return {
    interval: newInterval,
    easeFactor: Number(newEase.toFixed(2))
  };
}

// --- Firestore Operations ---

/**
 * Records a user attempt and logs it for analytics.
 */
export async function saveAttempt(attempt: Omit<UserAttempt, 'timestamp'>) {
  const attemptData = {
    ...attempt,
    timestamp: serverTimestamp()
  };
  
  const docRef = await addDoc(collection(db, 'user_attempts'), attemptData);
  
  // Also log as analytics event
  await logAnalyticsEvent({
    event_name: 'question_answered',
    user_id: attempt.user_id,
    content_id: attempt.content_id,
    concept_id: attempt.concept_id,
    correct: attempt.correct,
    time_taken: attempt.time_taken,
    timestamp: Timestamp.now()
  });

  return docRef.id;
}

/**
 * Updates user progress for a concept.
 */
export async function updateProgress(userId: string, conceptId: string, isCorrect: boolean) {
  const progressRef = doc(db, 'user_progress', `${userId}_${conceptId}`);
  const snap = await getDoc(progressRef);

  if (snap.exists()) {
    const data = snap.data() as UserProgress;
    const nextAttempts = data.attempts + 1;
    const nextCorrect = isCorrect ? data.correct_attempts + 1 : data.correct_attempts;
    const nextMastery = calculateMastery(nextCorrect, nextAttempts);

    await setDoc(progressRef, {
      mastery: nextMastery,
      attempts: increment(1),
      correct_attempts: isCorrect ? increment(1) : increment(0),
      last_updated: serverTimestamp()
    }, { merge: true });
  } else {
    await setDoc(progressRef, {
      user_id: userId,
      concept_id: conceptId,
      mastery: isCorrect ? 1 : 0,
      attempts: 1,
      correct_attempts: isCorrect ? 1 : 0,
      last_updated: serverTimestamp()
    });
  }
}

/**
 * Updates spaced repetition metadata.
 */
export async function updateSpacedRepetition(userId: string, conceptId: string, quality: number) {
  const reviewRef = doc(db, 'user_reviews', `${userId}_${conceptId}`);
  const snap = await getDoc(reviewRef);

  let prevInterval = 0;
  let prevEase = 2.5;

  if (snap.exists()) {
    const data = snap.data() as UserReview;
    prevInterval = data.interval;
    prevEase = data.ease_factor;
  }

  const { interval, easeFactor } = calculateNextReview(prevInterval, prevEase, quality);
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  await setDoc(reviewRef, {
    user_id: userId,
    concept_id: conceptId,
    interval,
    ease_factor: easeFactor,
    next_review: Timestamp.fromDate(nextReviewDate)
  }, { merge: true });
}

export async function processUserAttempt(userId: string, contentId: string, conceptId: string, correct: boolean, timeTaken: number, quality: number) {
  try {
    // 1. Save raw attempt
    await saveAttempt({
      user_id: userId,
      content_id: contentId,
      concept_id: conceptId,
      correct,
      time_taken: timeTaken,
      attempt_number: 1, 
    });

    // 2. Update overall mastery
    await updateProgress(userId, conceptId, correct);

    // 3. Update spaced repetition
    await updateSpacedRepetition(userId, conceptId, quality);
  } catch (error) {
    console.error('Failed to process user attempt:', error);
    throw error;
  }
}

/**
 * Log unified analytics events.
 */
export async function logAnalyticsEvent(event: AnalyticsEvent) {
  try {
    await addDoc(collection(db, 'analytics_events'), {
      ...event,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log analytics event:', error);
  }
}

/**
 * Selects next content based on user mastery.
 */
export async function selectNextContent(userId: string, conceptId: string): Promise<ContentItem | null> {
  const progressRef = doc(db, 'user_progress', `${userId}_${conceptId}`);
  const snap = await getDoc(progressRef);
  
  let mastery = 0;
  if (snap.exists()) {
    mastery = (snap.data() as UserProgress).mastery;
  }

  const difficulty = getRecommendedDifficulty(mastery);

  const q = query(
    collection(db, 'content_items'),
    where('taxonomy.topic_id', '==', conceptId), // Using topic_id as concept_id for now
    where('meta.difficulty', '==', difficulty),
    limit(10)
  );

  const contentSnap = await getDocs(q);
  if (contentSnap.empty) return null;

  // Simple random selection from the pool
  const docs = contentSnap.docs;
  const randomDoc = docs[Math.floor(Math.random() * docs.length)];
  return { id: randomDoc.id, ...randomDoc.data() } as ContentItem;
}
