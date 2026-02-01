
import { initializeApp, getApps, getApp, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig as devFirebaseConfig } from '@/firebase/config';

// Function to construct Firebase config from environment variables
const getFirebaseConfigFromEnv = (): FirebaseOptions | null => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

  // Check if all required environment variables are set
  if (
    apiKey &&
    authDomain &&
    projectId &&
    storageBucket &&
    messagingSenderId &&
    appId
  ) {
    return {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
      measurementId,
    };
  }
  return null;
};


// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (getApps().length) {
    return getSdks(getApp());
  }

  let firebaseApp: FirebaseApp;

  // For production, always prioritize environment variables
  if (process.env.NODE_ENV === 'production') {
    const prodConfig = getFirebaseConfigFromEnv();
    if (prodConfig) {
      firebaseApp = initializeApp(prodConfig);
    } else {
      // Fallback for environments like Firebase App Hosting which inject config automatically
      try {
        firebaseApp = initializeApp();
      } catch (e) {
        console.error(
          "Firebase initialization failed. Ensure environment variables (NEXT_PUBLIC_FIREBASE_*) are set in your production environment."
        );
        // In a real-world scenario, you might want to throw an error
        // or handle this case more gracefully.
        // For now, we'll fall back to the dev config, but this is not recommended for production.
        firebaseApp = initializeApp(devFirebaseConfig);
      }
    }
  } else {
    // For development, use the hardcoded config file
    try {
      firebaseApp = initializeApp(devFirebaseConfig);
    } catch (e) {
      // But we can prevent the white screen by returning nulls for services.
      return {
        firebaseApp: null,
        auth: null,
        firestore: null,
        storage: null
      };
    }
  }

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  let auth;
  try {
    auth = getAuth(firebaseApp);
  } catch (e) {
    // Auth might fail on server side, which is fine if we only need Firestore
    console.warn("Firebase Auth initialization failed:", e);
  }

  let storage;
  try {
    storage = getStorage(firebaseApp);
  } catch (e) {
    console.warn("Firebase Storage initialization failed:", e);
  }

  return {
    firebaseApp,
    auth: auth as any, // Cast to any to avoid type issues for now, or update return type
    firestore: getFirestore(firebaseApp),
    storage: storage as any // Cast to any or handle null
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
// export * from './auth/use-user'; // Removed to avoid conflict with provider's useUser
export * from './errors';
export * from './error-emitter';
