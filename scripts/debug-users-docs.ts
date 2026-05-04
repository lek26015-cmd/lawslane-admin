
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function debugUsers() {
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    if (!getApps().length) {
        initializeApp({
            credential: cert({
                clientEmail,
                privateKey,
                projectId,
            })
        });
    }

    const db = getFirestore();
    const usersSnap = await db.collection('users').limit(20).get();
    
    console.log(`Found ${usersSnap.size} users`);
    usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.role === 'lawyer') {
            console.log(`User ID: ${doc.id}`);
            console.log(`Name: ${data.name}`);
            console.log(`Docs:`, data.docs || 'None');
            console.log(`Attachments:`, data.attachments || 'None');
            console.log(`License URL (User):`, data.licenseUrl || 'None');
            console.log('---');
        }
    });
}

debugUsers().catch(console.error);
