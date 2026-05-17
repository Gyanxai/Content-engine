const functions = require('firebase-functions');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const ALL_PERMISSIONS = [
  'dashboard',
  'curriculum_builder',
  'existing_curriculum',
  'analytics',
  'bulk_import',
  'review_publish',
  'manage_admins',
  'manage_super_admins'
];

const ADMIN_GRANTABLE = [
  'dashboard',
  'curriculum_builder',
  'existing_curriculum',
  'analytics',
  'bulk_import',
  'review_publish'
];

function normalizePermissions(role, permissions) {
  if (role === 'super_admin') return ALL_PERMISSIONS;
  return (permissions || []).filter(permission => ADMIN_GRANTABLE.includes(permission));
}

function canGrant(requesterClaims, targetRole, targetPermissions) {
  if (requesterClaims.role === 'super_admin') return true;
  if (requesterClaims.role !== 'admin') return false;
  if (targetRole === 'super_admin') return false;
  return targetPermissions.every(permission => ADMIN_GRANTABLE.includes(permission));
}

exports.createAdminUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('permission-denied', 'Authentication required.');
  }

  const { email, password, displayName, role } = data;
  const permissions = normalizePermissions(role, data.permissions);

  if (!canGrant(context.auth.token, role, permissions)) {
    throw new functions.https.HttpsError('permission-denied', 'Insufficient access to grant this role or permissions.');
  }

  if (!email || !password || !role) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: email, password, or role.');
  }

  try {
    const userRecord = await admin.auth().createUser({ email, password, displayName });
    await admin.auth().setCustomUserClaims(userRecord.uid, { role, permissions });
    await admin.firestore().collection('admins').doc(userRecord.uid).set({
      email,
      display_name: displayName || email.split('@')[0],
      role,
      permissions,
      disabled: false,
      created_by: context.auth.uid,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, uid: userRecord.uid };
  } catch (error) {
    console.error('Error creating admin:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
