#!/usr/bin/env ts-node
/**
 * GyanX Set Admin Claims Script
 * Usage: npx ts-node scripts/setAdminClaims.ts --uid <USER_UID> --role <admin|editor|creator|reviewer>
 */

import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// ── Init ──────────────────────────────────────────────────────────────────────
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  || path.join(__dirname, '../serviceAccount.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌  Service account key not found at:', serviceAccountPath);
  console.error('    Download from Firebase Console → Project Settings → Service Accounts');
  console.error('    Save it as serviceAccount.json in the project root.');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ── Parse args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const uidIdx = args.indexOf('--uid');
const roleIdx = args.indexOf('--role');

if (uidIdx === -1 || !args[uidIdx + 1] || roleIdx === -1 || !args[roleIdx + 1]) {
  console.error('Usage: npx ts-node scripts/setAdminClaims.ts --uid <USER_UID> --role <admin|editor|creator|reviewer>');
  process.exit(1);
}

const uid = args[uidIdx + 1];
const role = args[roleIdx + 1];

const VALID_ROLES = ['admin', 'editor', 'creator', 'reviewer'];
if (!VALID_ROLES.includes(role)) {
  console.error(`❌  Invalid role: ${role}. Valid roles are: ${VALID_ROLES.join(', ')}`);
  process.exit(1);
}

// ── Run ───────────────────────────────────────────────────────────────────────
async function run() {
  try {
    // 1. Verify user exists
    const user = await admin.auth().getUser(uid);
    console.log(`👤  Setting claim for: ${user.email} (${uid})`);

    // 2. Set custom claims
    await admin.auth().setCustomUserClaims(uid, { role });
    console.log(`✅  Successfully set custom claim: { role: "${role}" }`);

    // 3. Update Firestore admin record if it exists
    const db = admin.firestore();
    const adminRef = db.collection('admins').doc(uid);
    const adminDoc = await adminRef.get();
    
    if (adminDoc.exists) {
      await adminRef.update({ role });
      console.log('📝  Updated Firestore admin record.');
    } else {
      // Create it if it doesn't exist
      await adminRef.set({
        email: user.email,
        display_name: user.displayName || user.email?.split('@')[0] || 'Admin',
        role,
        disabled: false,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('📝  Created new Firestore admin record.');
    }

    console.log('\n✨  Done! The user needs to re-login or refresh their token to see the changes.');
    process.exit(0);
  } catch (err) {
    console.error('❌  Error:', err);
    process.exit(1);
  }
}

run();
