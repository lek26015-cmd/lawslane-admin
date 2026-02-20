'use server';

import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export async function createAdminUser(prevState: any, formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const role = formData.get('role') as string || 'admin'; // 'admin' or 'super_admin'

    if (!email || !password || !name) {
        return { success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
    }

    // 1. Validate Email Domain
    const allowedDomain = '@lawslane.com';
    const exceptionEmail = 'lek.26015@gmail.com';

    if (!email.endsWith(allowedDomain) && email !== exceptionEmail) {
        return {
            success: false,
            message: `อีเมลต้องลงท้ายด้วย ${allowedDomain} เท่านั้น (ยกเว้น ${exceptionEmail})`
        };
    }

    try {
        const app = await initAdmin();
        if (!app) {
            return { success: false, message: 'Server Configuration Error: Firebase Admin not initialized. Please check environment variables (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).' };
        }

        const auth = getAuth(app);
        const firestore = getFirestore(app);

        // 2. Create User in Firebase Auth
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
            emailVerified: true, // Auto-verify admin emails
        });

        // 3. Set Custom Claims (Role)
        await auth.setCustomUserClaims(userRecord.uid, {
            role: role === 'super_admin' ? 'admin' : 'admin', // Both are admins in claims, but we store specific role in Firestore
            superAdmin: role === 'super_admin'
        });

        // 4. Create User Document in Firestore
        const permissions = formData.get('permissions') ? JSON.parse(formData.get('permissions') as string) : {};
        const adminPermissions = formData.get('adminPermissions') ? JSON.parse(formData.get('adminPermissions') as string) : [];

        await firestore.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            name: name,
            email: email,
            role: 'admin',
            superAdmin: role === 'super_admin',
            permissions: permissions,
            adminPermissions: adminPermissions,
            createdAt: new Date(),
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
        });

        return { success: true, message: 'สร้างผู้ดูแลระบบสำเร็จ' };

    } catch (error: any) {
        console.error('Error creating admin user:', error);
        if (error.code === 'auth/email-already-exists') {
            return { success: false, message: 'อีเมลนี้มีอยู่ในระบบแล้ว' };
        }
        return { success: false, message: error.message || 'เกิดข้อผิดพลาดในการสร้างผู้ใช้' };
    }
}
