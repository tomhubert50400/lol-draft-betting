const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.changeUserPassword = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to call this function.'
    );
  }

  // Check if user is admin
  const adminDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  if (!adminDoc.exists || !adminDoc.data().isAdmin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can change user passwords.'
    );
  }

  const { userId, newPassword } = data;

  if (!userId || !newPassword) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userId and newPassword are required.'
    );
  }

  if (newPassword.length < 6) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Password must be at least 6 characters long.'
    );
  }

  try {
    await admin.auth().updateUser(userId, {
      password: newPassword
    });

    return { success: true, message: 'Password changed successfully' };
  } catch (error) {
    console.error('Error changing password:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to change password: ' + error.message
    );
  }
});

exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to call this function.'
    );
  }

  // Check if user is admin
  const adminDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  if (!adminDoc.exists || !adminDoc.data().isAdmin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can delete user accounts.'
    );
  }

  const { userId } = data;

  if (!userId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userId is required.'
    );
  }

  if (userId === context.auth.uid) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'You cannot delete your own account.'
    );
  }

  try {
    await admin.auth().deleteUser(userId);

    return { success: true, message: 'User account deleted successfully' };
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to delete user account: ' + error.message
    );
  }
});

