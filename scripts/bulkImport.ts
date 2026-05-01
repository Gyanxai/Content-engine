#!/usr/bin/env ts-node
/**
 * GyanX Bulk Import Script (Firebase Admin SDK)
 * Usage: npx ts-node scripts/bulkImport.ts --file questions.csv
 *
 * CSV columns:
 * subject, class, chapter_id, topic_id, subtopic_id, type, level,
 * difficulty, text_en, option1_en, option2_en, option3_en, option4_en,
 * answer_en, explanation_en, text_hi, answer_hi, lottie_url
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as Papa from 'papaparse';

// ── Init ──────────────────────────────────────────────────────────────────────
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  || path.join(__dirname, '../serviceAccount.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌  Service account key not found at:', serviceAccountPath);
  console.error('    Download from Firebase Console → Project Settings → Service Accounts');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath as admin.ServiceAccount),
});
const db = admin.firestore();

// ── Parse args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const fileIdx = args.indexOf('--file');
if (fileIdx === -1 || !args[fileIdx + 1]) {
  console.error('Usage: npx ts-node scripts/bulkImport.ts --file questions.csv');
  process.exit(1);
}
const csvPath = path.resolve(args[fileIdx + 1]);
if (!fs.existsSync(csvPath)) {
  console.error('❌  File not found:', csvPath);
  process.exit(1);
}

// ── Run ───────────────────────────────────────────────────────────────────────
async function run() {
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const { data, errors } = Papa.parse<Record<string, string>>(fileContent, {
    header: true, skipEmptyLines: true,
  });

  if (errors.length) console.warn('⚠️  CSV parse warnings:', errors);
  console.log(`📄  ${data.length} rows parsed from ${path.basename(csvPath)}`);

  const REQUIRED = ['subject', 'class', 'chapter_id', 'topic_id', 'subtopic_id', 'type', 'level', 'text_en'];
  const valid: Record<string, string>[] = [];
  const invalid: number[] = [];

  data.forEach((row, i) => {
    const missing = REQUIRED.filter(c => !row[c]);
    if (missing.length) { console.warn(`  Row ${i + 2}: missing [${missing.join(', ')}]`); invalid.push(i); }
    else valid.push(row);
  });

  console.log(`✅  ${valid.length} valid rows, ❌  ${invalid.length} skipped`);
  if (!valid.length) { console.error('No valid rows to import.'); process.exit(1); }

  const BATCH_SIZE = 499;
  let imported = 0;

  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = db.batch();
    valid.slice(i, i + BATCH_SIZE).forEach(row => {
      const ref = db.collection('questions').doc();
      batch.set(ref, {
        subject: row.subject,
        class: row.class,
        chapter_id: row.chapter_id,
        topic_id: row.topic_id,
        subtopic_id: row.subtopic_id,
        type: row.type,
        level: row.level,
        difficulty: parseFloat(row.difficulty || '0.5'),
        order: 0,
        status: 'draft',
        lottie_url: row.lottie_url || '',
        media_url: '',
        dsl_params: {},
        content_en: {
          text: row.text_en,
          options: [row.option1_en, row.option2_en, row.option3_en, row.option4_en].filter(Boolean),
          answer: row.answer_en || '',
          explanation: row.explanation_en || '',
        },
        ...(row.text_hi ? { content_hi: { text: row.text_hi, answer: row.answer_hi || '' } } : {}),
        created_by: 'bulk_import_script',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    imported += Math.min(BATCH_SIZE, valid.length - i);
    console.log(`  Committed batch: ${imported}/${valid.length}`);
  }

  console.log(`\n🎉  Done! ${imported} questions imported as Draft to Firestore.`);
  process.exit(0);
}

run().catch(err => { console.error('❌  Fatal error:', err); process.exit(1); });
