const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
  let serviceAccount;
  const saPath = path.resolve(__dirname, '../gx-app-backend-firebase-adminsdk-fbsvc-058119be02.json');
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else if (fs.existsSync(saPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  } else {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is missing and service account file not found.');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

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

function canGrant(requester, targetRole, targetPermissions) {
  if (!requester) return false;
  if (requester.role === 'super_admin') return true;
  if (requester.role !== 'admin') return false;
  if (targetRole === 'super_admin') return false;
  return targetPermissions.every(permission => ADMIN_GRANTABLE.includes(permission));
}

async function getRequester(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const requesterUid = decodedToken.uid;
    const requesterDoc = await admin.firestore().collection('admins').doc(requesterUid).get();
    return requesterDoc.exists ? { uid: requesterUid, ...requesterDoc.data() } : null;
  } catch (err) {
    console.error('Token verification failed:', err);
    return null;
  }
}

function sendResponse(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(data));
}

module.exports = async (req, res) => {
  if (!['POST', 'PATCH'].includes(req.method)) {
    return sendResponse(res, 405, { error: 'Method not allowed' });
  }

  try {
    const requester = await getRequester(req);
    const { email, password, displayName, role, uid } = req.body;
    const permissions = normalizePermissions(role, req.body.permissions);

    if (!canGrant(requester, role, permissions)) {
      return sendResponse(res, 403, { error: 'Forbidden: insufficient access to grant this role or permissions.' });
    }

    if (req.method === 'PATCH') {
      if (!uid || !role) return sendResponse(res, 400, { error: 'Missing uid or role.' });
      await admin.auth().setCustomUserClaims(uid, { role, permissions });
      await admin.firestore().collection('admins').doc(uid).update({
        role,
        permissions,
        updated_by: requester.uid,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      return sendResponse(res, 200, { success: true, uid });
    }

    if (!email || !password || !role) {
      return sendResponse(res, 400, { error: 'Missing required fields: email, password, or role.' });
    }

    const userRecord = await admin.auth().createUser({ email, password, displayName });
    await admin.auth().setCustomUserClaims(userRecord.uid, { role, permissions });
    await admin.firestore().collection('admins').doc(userRecord.uid).set({
      email,
      display_name: displayName || email.split('@')[0],
      role,
      permissions,
      disabled: false,
      created_by: requester.uid,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return sendResponse(res, 200, { success: true, uid: userRecord.uid });
  } catch (error) {
    console.error('Admin access API error:', error);
    return sendResponse(res, 500, { error: error.message });
  }
};
