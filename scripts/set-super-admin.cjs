const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const email = process.argv[2] || process.env.SUPER_ADMIN_EMAIL;
if (!email) {
  console.error('Usage: node scripts/set-super-admin.cjs <email>');
  process.exit(1);
}

const serviceAccountPath = path.resolve(process.cwd(), 'gx-app-backend-firebase-adminsdk-fbsvc-058119be02.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const permissions = [
  'dashboard',
  'curriculum_builder',
  'existing_curriculum',
  'analytics',
  'bulk_import',
  'review_publish',
  'manage_admins',
  'manage_super_admins',
];

async function main() {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { role: 'super_admin', permissions });
  await admin.firestore().collection('admins').doc(user.uid).set({
    email: user.email,
    display_name: user.displayName || user.email.split('@')[0],
    role: 'super_admin',
    permissions,
    disabled: false,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log(`Promoted ${email} to super_admin.`);
}

main().then(() => process.exit(0)).catch(error => {
  console.error(error);
  process.exit(1);
});
