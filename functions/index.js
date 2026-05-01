const functions = require('firebase-functions');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

/**
 * Cloud Function to create a new admin user from the frontend.
 * This is required because client-side Firebase SDK cannot create users with passwords
 * while another user is logged in.
 */
exports.createAdminUser = functions.https.onCall(async (data, context) => {
  // 1. Check if the requester is an admin
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only Super Admins can create new admin accounts.'
    );
  }

  const { email, password, displayName, role } = data;

  if (!email || !password || !role) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required fields: email, password, or role.'
    );
  }

  try {
    // 2. Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
    });

    // 3. Set Custom Claims (The "Role")
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });

    // 4. Create record in Firestore '/admins' collection
    // This serves as the "separate authentication table" reference
    await admin.firestore().collection('admins').doc(userRecord.uid).set({
      email,
      display_name: displayName,
      role,
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
