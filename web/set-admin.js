import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Read JSON key
const serviceAccount = JSON.parse(
  readFileSync('./serviceAccountKey.json', 'utf8')
);

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount)
});

const auth = getAuth(app);
const db = getFirestore(app);

async function grantAdmin(uid) {
  try {
    // 1. Set custom auth claim used by Firestore security rules.
    await auth.setCustomUserClaims(uid, { admin: true });

    // 2. Update the Firestore user document role field used by the admin login check.
    await db.collection('users').doc(uid).set({
      role: 'admin'
    }, { merge: true });

    console.log(`\n✅ Successfully granted admin privileges to UID: ${uid}\n`);
  } catch (err) {
    console.error('❌ Error setting admin role:', err);
  }
}

// ⚠️ Replace with your target user's UID from Firebase Console
grantAdmin('tSlM7V9AGxdalRHHIwwM7xothYM2');