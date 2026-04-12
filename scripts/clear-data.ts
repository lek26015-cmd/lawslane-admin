import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { collection, getDocs, deleteDoc, doc, query, writeBatch } from 'firebase/firestore';

async function clearData() {
    console.log("Initializing Firebase...");
    console.log("Project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

    // Dynamic import to ensure env vars are loaded first
    const { initializeFirebase } = await import('../src/firebase');
    const { firestore } = initializeFirebase();
    if (!firestore) throw new Error("Firestore is not initialized.");

    const collections = [
        'users',
        'lawyerProfiles',
        'appointments',
        'tickets',
        'reviews',
        'notifications',
        // 'chats' will be handled separately to delete subcollections
    ];

    console.log("Starting data clearing process...");

    // 1. Clear simple collections
    for (const colName of collections) {
        console.log(`Clearing collection: ${colName}...`);
        const colRef = collection(firestore, colName);
        const snapshot = await getDocs(colRef);

        if (snapshot.empty) {
            console.log(`  - Collection ${colName} is empty.`);
            continue;
        }

        const batchSize = 500;
        let batch = writeBatch(firestore);
        let count = 0;

        for (const d of snapshot.docs) {
            batch.delete(doc(firestore, colName, d.id));
            count++;
            if (count >= batchSize) {
                await batch.commit();
                batch = writeBatch(firestore);
                count = 0;
            }
        }
        if (count > 0) {
            await batch.commit();
        }
        console.log(`  - Deleted ${snapshot.size} documents from ${colName}.`);
    }

    // 2. Clear Chats and Messages
    console.log("Clearing chats and messages...");
    const chatsRef = collection(firestore, 'chats');
    const chatsSnapshot = await getDocs(chatsRef);

    for (const chatDoc of chatsSnapshot.docs) {
        // Delete messages subcollection
        const messagesRef = collection(firestore, 'chats', chatDoc.id, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);

        if (!messagesSnapshot.empty) {
            let msgBatch = writeBatch(firestore);
            let msgCount = 0;
            for (const msgDoc of messagesSnapshot.docs) {
                msgBatch.delete(doc(firestore, 'chats', chatDoc.id, 'messages', msgDoc.id));
                msgCount++;
                if (msgCount >= 500) {
                    await msgBatch.commit();
                    msgBatch = writeBatch(firestore);
                    msgCount = 0;
                }
            }
            if (msgCount > 0) {
                await msgBatch.commit();
            }
            console.log(`  - Deleted ${messagesSnapshot.size} messages from chat ${chatDoc.id}`);
        }

        // Delete chat document
        await deleteDoc(doc(firestore, 'chats', chatDoc.id));
    }
    console.log(`  - Deleted ${chatsSnapshot.size} chats.`);

    console.log("Data clearing complete!");
    process.exit(0);
}

clearData().catch(console.error);
