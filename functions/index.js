const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Use Application Default Credentials when running in Firebase Cloud Functions
admin.initializeApp();

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

exports.createAdmin = functions.https.onRequest(async (req, res) => {
  // CORS Handling
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST, PATCH');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).send('');
  }

  if (!['POST', 'PATCH'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const requester = await getRequester(req);
    if (!requester) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { email, password, displayName, role, uid } = req.body;

    if (req.method === 'PATCH') {
      if (!uid) return res.status(400).json({ error: 'Missing uid.' });

      if (role) {
        const permissions = normalizePermissions(role, req.body.permissions);
        if (!canGrant(requester, role, permissions)) {
          return res.status(403).json({ error: 'Forbidden: insufficient access to grant this role or permissions.' });
        }
        await admin.auth().setCustomUserClaims(uid, { role, permissions });
        await admin.firestore().collection('admins').doc(uid).update({
          role,
          permissions,
          updated_by: requester.uid,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      if (password) {
        if (requester.uid !== uid && requester.role !== 'super_admin') {
          return res.status(403).json({ error: 'Forbidden: Only super admins can change other users passwords.' });
        }
        await admin.auth().updateUser(uid, { password });
      }

      return res.status(200).json({ success: true, uid });
    }

    const permissions = normalizePermissions(role, req.body.permissions);
    if (!canGrant(requester, role, permissions)) {
      return res.status(403).json({ error: 'Forbidden: insufficient access to grant this role or permissions.' });
    }

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields: email, password, or role.' });
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

    return res.status(200).json({ success: true, uid: userRecord.uid });
  } catch (error) {
    console.error('Admin access API error:', error);
    return res.status(500).json({ error: error.message });
  }
});
