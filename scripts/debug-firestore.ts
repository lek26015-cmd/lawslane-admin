
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import * as admin from 'firebase-admin';

async function debugWithAdmin() {
    console.log("--- Debugging with Admin SDK ---");

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    }

    const db = admin.firestore();

    try {
        console.log("Searching for user 'Tawan BerkFah'...");
        const usersSnap = await db.collection('users').where('name', '==', 'Tawan BerkFah').get();
        
        if (usersSnap.empty) {
            console.log("User 'Tawan BerkFah' not found. Listing all users...");
            const allUsers = await db.collection('users').limit(10).get();
            allUsers.forEach(doc => {
                console.log(`- ID: ${doc.id}, Name: ${doc.data().name}, Role: ${doc.data().role}, SuperAdmin: ${doc.data().superAdmin}`);
            });
        } else {
            usersSnap.forEach(doc => {
                const data = doc.data();
                console.log("Found User:");
                console.log(`  ID (UID): ${doc.id}`);
                console.log(`  Name: ${data.name}`);
                console.log(`  Email: ${data.email}`);
                console.log(`  Role: ${data.role}`);
                console.log(`  SuperAdmin: ${data.superAdmin} (Type: ${typeof data.superAdmin})`);
                console.log(`  UID Field: ${data.uid}`);
            });
        }

        console.log("\nChecking Invoices collection access via Admin SDK...");
        const invoicesSnap = await db.collection('invoices').limit(1).get();
        console.log(`  - Invoices found: ${invoicesSnap.size}`);

    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

debugWithAdmin().catch(console.error);
