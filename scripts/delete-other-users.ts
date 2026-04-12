
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';

const KEEP_UID = 'wS9w7ysNYUajNsBYZ6C7n2Afe9H3';

async function deleteOtherUsers() {
    console.log(`Deleting all users EXCEPT ${KEEP_UID}...`);
    console.log("Project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

    const { initializeFirebase } = await import('../src/firebase');
    const { firestore } = initializeFirebase();
    if (!firestore) throw new Error("Firestore is not initialized.");

    // 1. Delete from 'users'
    const usersRef = collection(firestore, 'users');
    const usersSnap = await getDocs(usersRef);

    let batch = writeBatch(firestore);
    let count = 0;
    let deletedCount = 0;

    for (const userDoc of usersSnap.docs) {
        if (userDoc.id === KEEP_UID) {
            console.log(`Skipping admin user: ${userDoc.id}`);
            continue;
        }

        batch.delete(doc(firestore, 'users', userDoc.id));

        // Also try to delete from lawyerProfiles (assuming docId is same as userId)
        batch.delete(doc(firestore, 'lawyerProfiles', userDoc.id));

        count++;
        deletedCount++;
        if (count >= 200) { // Batch limit is 500, keeping it safe
            await batch.commit();
            batch = writeBatch(firestore);
            count = 0;
            console.log(`Committed batch of deletions...`);
        }
    }

    if (count > 0) {
        await batch.commit();
    }

    console.log(`Success! Deleted ${deletedCount} users and their profiles.`);
    process.exit(0);
}

deleteOtherUsers().catch(console.error);
