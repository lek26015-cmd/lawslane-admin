'use server';

import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { requireSuperAdmin, AuthError } from '@/lib/auth-guard';
import { DESIGNATED_SUPER_ADMIN_EMAILS } from '@/lib/super-admin';

export async function createAdminUser(prevState: any, formData: FormData) {
    // ด่านแรก: ผู้เรียกต้องเป็น super admin
    // เดิม action นี้ไม่ตรวจผู้เรียกเลย ทำให้ใครก็ยิงเข้ามาสร้างบัญชี admin
    // พร้อม custom claim ได้ (server action = POST endpoint จริง)
    // ต้องเป็น requireSuperAdmin ไม่ใช่ requireAdmin เฉยๆ — action นี้สร้างบัญชีที่มีสิทธิ์
    // ได้ถึงระดับ super_admin เอง แอดมินสิทธิ์จำกัดไม่ควรยกระดับใครได้ถึงขนาดนั้น
    try {
        await requireSuperAdmin();
    } catch (e) {
        if (e instanceof AuthError) {
            return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ — ต้องเป็น Super Admin เท่านั้น' };
        }
        throw e;
    }

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const role = formData.get('role') as string || 'admin'; // 'admin' or 'super_admin'

    if (!email || !password || !name) {
        return { success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
    }

    // 1. Validate Email Domain
    const allowedDomain = '@lawslane.com';

    if (!email.endsWith(allowedDomain) && !DESIGNATED_SUPER_ADMIN_EMAILS.includes(email)) {
        return {
            success: false,
            message: `อีเมลต้องลงท้ายด้วย ${allowedDomain} เท่านั้น (ยกเว้น ${DESIGNATED_SUPER_ADMIN_EMAILS[0]})`
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

        const adminPermissions: string[] = formData.get('adminPermissions')
            ? JSON.parse(formData.get('adminPermissions') as string)
            : [];
        const isSuper = role === 'super_admin';

        // 3. Set Custom Claims — แหล่งความจริงของสิทธิ์
        //
        // custom claim เท่านั้นที่เชื่อถือได้: firestore.rules ให้ผู้ใช้เขียน users/{uid}
        // ของตัวเองได้ ดังนั้น role/adminPermissions ใน Firestore เป็นแค่ข้อมูลแสดงผล
        // ดู src/lib/auth-guard.ts และ src/lib/permissions.ts
        //
        // หมายเหตุ: setCustomUserClaims เขียนทับ claim ทั้งก้อนเสมอ ที่นี่เป็นผู้ใช้
        // ที่เพิ่ง createUser จึงยังไม่มี claim เดิม แต่คงรูปแบบ merge ไว้กันพลาด
        // ถ้าภายหลังนำ action นี้ไปใช้กับบัญชีที่มีอยู่แล้ว
        const existingClaims = (await auth.getUser(userRecord.uid)).customClaims ?? {};
        await auth.setCustomUserClaims(userRecord.uid, {
            ...existingClaims,
            admin: true,
            role: 'admin',      // คงไว้เพื่อความเข้ากันได้กับโค้ดเดิมที่อ่าน role
            superAdmin: isSuper, // เดิม
            su: isSuper,         // ใหม่ — ตัวที่ auth-guard อ่าน
            // super admin ไม่ต้องแบก array (ข้ามทุกด่านอยู่แล้ว) ช่วยให้ claim ไม่ชนเพดาน 1000 bytes
            ...(isSuper ? { p: undefined } : { p: adminPermissions }),
        });

        // 4. Create User Document in Firestore

        await firestore.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            name: name,
            email: email,
            role: 'admin',
            superAdmin: role === 'super_admin',
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
