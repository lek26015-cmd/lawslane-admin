'use server';

import { getFirestore } from 'firebase-admin/firestore';
import { AuthError, isSuperAdminToken, requireAdmin } from '@/lib/auth-guard';
import { defaultLayout, normalizeLayout, type DashboardLayout } from '@/lib/dashboard-layout';
import { DASHBOARD_LAYOUT_COLLECTION as COLLECTION } from '@/lib/dashboard-layout-server';

/**
 * เลย์เอาต์แดชบอร์ดส่วนตัวของแอดมินแต่ละคน เก็บที่ adminDashboardLayouts/{uid}
 * อ่าน/เขียนผ่าน firebase-admin เท่านั้น (ไม่แตะ firestore.rules ที่แชร์ข้าม repo)
 * (ฟังก์ชันอ่านอยู่ใน lib/dashboard-layout-server.ts — ห้าม export ฟังก์ชันรับ uid ในไฟล์ 'use server' นี้
 * เพราะทุก export เป็น endpoint ที่ client เรียกได้)
 * uid มาจาก session ที่ตรวจแล้ว ไม่รับจากผู้เรียก — แอดมินคนหนึ่งจึงแก้ของอีกคนไม่ได้
 */
export async function saveMyDashboardLayout(
  layout: DashboardLayout | null,
): Promise<{ success: true; layout: DashboardLayout } | { success: false; error: string }> {
  try {
    const { uid, token, adminApp } = await requireAdmin();
    const isSuper = isSuperAdminToken(token);
    const ref = getFirestore(adminApp).collection(COLLECTION).doc(uid);

    // null = รีเซ็ตกลับค่าเริ่มต้น
    if (layout === null) {
      await ref.delete();
      return { success: true, layout: defaultLayout(isSuper) };
    }

    const clean = normalizeLayout(layout, isSuper);
    await ref.set({ layout: clean, updatedAt: new Date() });
    return { success: true, layout: clean };
  } catch (error) {
    if (error instanceof AuthError) return { success: false, error: error.message };
    console.error('saveMyDashboardLayout failed:', error);
    return { success: false, error: 'บันทึกเลย์เอาต์ไม่สำเร็จ' };
  }
}
