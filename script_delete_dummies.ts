import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    try {
        console.log("Loading firebase-admin...");
        const admin = require('firebase-admin');
        const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
        
        let app;
        if (admin.apps.length > 0) app = admin.app();
        else {
            app = admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                })
            });
        }
        if (!app) throw new Error("no admin app");
        
        const { getFirestore } = require('firebase-admin/firestore');
        const firestore = getFirestore(app);
        
        const snap = await firestore.collection('lawyerProfiles').get();
        console.log(`Found ${snap.size} overall lawyers.`);
        
        const names = ['ทนายประจักษ์ ยุติธรรม', 'ทนายทดสอบ ระบบ (Test Lawyer)'];
        
        let deletedCount = 0;
        const batch = firestore.batch();
        
        for (const d of snap.docs) {
            const data = d.data();
            if (names.includes(data.name)) {
                console.log('Deleting:', data.name, d.id);
                batch.delete(firestore.collection('lawyerProfiles').doc(d.id));
                if (data.userId) batch.delete(firestore.collection('users').doc(data.userId));
                else batch.delete(firestore.collection('users').doc(d.id)); // fallback
                deletedCount++;
            }
        }
        
        if (deletedCount > 0) {
            await batch.commit();
            console.log('Deleted', deletedCount, 'lawyers.');
        } else {
            console.log('No lawyers found with those exact names.');
        }
    } catch(e) {
        console.error(e);
    }
}
run();
