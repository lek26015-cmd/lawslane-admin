
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const TARGET_UID = 'wS9w7ysNYUajNsBYZ6C7n2Afe9H3';

async function setAdmin() {
    console.log(`Promoting user ${TARGET_UID} to admin...`);
    console.log("Project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

    // Dynamic import to ensure env vars are loaded first
    const { initializeFirebase } = await import('../src/firebase');
    const { firestore } = initializeFirebase();
    if (!firestore) throw new Error("Firestore is not initialized.");

    const userRef = doc(firestore, 'users', TARGET_UID);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        await setDoc(userRef, { role: 'admin' }, { merge: true });
        console.log("Success! User is now an admin.");
    } else {
        console.log("User document not found. Creating new admin user...");
        await setDoc(userRef, {
            uid: TARGET_UID,
            email: 'admin@lawslane.com', // Placeholder, will be updated on login
            role: 'admin',
            createdAt: serverTimestamp(),
            name: 'Admin User'
        });
        console.log("Success! Created new admin user.");
    }
    process.exit(0);
}

setAdmin().catch(console.error);
