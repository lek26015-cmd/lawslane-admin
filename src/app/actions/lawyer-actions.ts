'use server';

import { initAdmin } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function addToVerifiedRegistry(data: {
    licenseNumber: string;
    firstName: string;
    lastName: string;
    province: string;
}) {
    try {
        const app = await initAdmin();
        if (!app) {
            return { success: false, error: 'Firebase Admin initialization failed' };
        }
        const db = getFirestore();

        // Sanitize ID
        const docId = data.licenseNumber.replace(/\//g, '-');

        await db.collection('verifiedLawyers').doc(docId).set({
            licenseNumber: data.licenseNumber,
            firstName: data.firstName,
            lastName: data.lastName,
            province: data.province,
            status: 'pending',
            registeredDate: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error adding to verified registry:", error);
        return { success: false, error: error.message };
    }
}
