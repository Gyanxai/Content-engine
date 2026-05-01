const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Admin SDK
if (!admin.apps.length) {
  // Try to load from local file first (for dev), or use env var for Vercel
  try {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      const saPath = path.resolve(process.cwd(), 'gx-app-backend-firebase-adminsdk-fbsvc-058119be02.json');
      serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (err) {
    console.error('Firebase Admin Init Error:', err);
  }
}

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, displayName, role, requesterUid } = req.body;

  try {
    // 1. Verify the requester is an admin in Firestore
    const requesterDoc = await admin.firestore().collection('admins').doc(requesterUid).get();
    if (!requesterDoc.exists || requesterDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Only Super Admins can create users.' });
    }

    // 2. Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
    });

    // 3. Set Custom Claims
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });

    // 4. Create record in Firestore
    await admin.firestore().collection('admins').doc(userRecord.uid).set({
      email,
      display_name: displayName,
      role,
      disabled: false,
      created_by: requesterUid,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ success: true, uid: userRecord.uid });
  } catch (error) {
    console.error('Error creating admin:', error);
    return res.status(500).json({ error: error.message });
  }
};
