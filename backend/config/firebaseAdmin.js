// Initializes Firebase Admin so the backend can read/write Firestore
// with full trusted-server privileges (bypasses Firestore security rules,
// which is exactly why this file only ever runs on the server, never
// in the browser).

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let app;

function initFirebase() {
  if (app) return app;

  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './config/serviceAccountKey.json';
  const resolvedPath = path.resolve(keyPath);

  if (!fs.existsSync(resolvedPath)) {
    console.warn(
      `[firebaseAdmin] No service account file found at ${resolvedPath}.\n` +
      `Download it from Firebase Console > Project Settings > Service Accounts,\n` +
      `save it as backend/config/serviceAccountKey.json, and keep it out of git.`
    );
    // Don't crash the whole server if Firebase isn't configured yet —
    // routes that need it will fail gracefully instead.
    return null;
  }

  const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });

  console.log('[firebaseAdmin] Firebase Admin initialized.');
  return app;
}

function getDb() {
  const firebaseApp = initFirebase();
  if (!firebaseApp) return null;
  return admin.firestore();
}

module.exports = { initFirebase, getDb, admin };
