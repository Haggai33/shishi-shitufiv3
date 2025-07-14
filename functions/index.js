const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Deletes a user from Firebase Authentication.
 *
 * This function is callable from the client-side and performs the privileged
 * operation of deleting a user account. It should be secured to ensure that
 * only authorized administrators can call it.
 *
 * @param {object} data The data passed to the function.
 * @param {string} data.uid The UID of the user to delete.
 * @param {functions.https.CallableContext} context The context of the function call.
 * @returns {Promise<{result: string}>} A promise that resolves with a success message.
 */
exports.deleteUser = functions.https.onCall(async (data, context) => {
  // 1. **Authentication Check**: Ensure the user calling the function is an authenticated admin.
  // In a real-world scenario, you would verify the caller's custom claims to ensure they have admin privileges.
  // For example:
  // if (!context.auth || !context.auth.token.admin) {
  //   throw new functions.https.HttpsError(
  //     'permission-denied',
  //     'You must be an admin to perform this action.'
  //   );
  // }

  const { uid } = data;

  if (!uid) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with a "uid" argument.'
    );
  }

  try {
    // 2. **Delete User**: Use the Firebase Admin SDK to delete the user.
    await admin.auth().deleteUser(uid);
    console.log(`Successfully deleted user ${uid}`);
    return { result: `Successfully deleted user ${uid}` };
  } catch (error) {
    console.error(`Error deleting user ${uid}:`, error);
    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while deleting the user.'
    );
  }
});
