import 'server-only';
import { getFirestore } from 'firebase-admin/firestore';
import type { App } from 'firebase-admin/app';
import { defaultLayout, normalizeLayout, type DashboardLayout } from './dashboard-layout';

export const DASHBOARD_LAYOUT_COLLECTION = 'adminDashboardLayouts';

/** อ่านเลย์เอาต์ของแอดมินคนนี้ — พังเมื่อไรก็ตกกลับค่าเริ่มต้น ไม่ให้หน้าแดชบอร์ดล่ม */
export async function getDashboardLayout(uid: string, isSuperAdmin: boolean, app: App): Promise<DashboardLayout> {
  try {
    const snap = await getFirestore(app).collection(DASHBOARD_LAYOUT_COLLECTION).doc(uid).get();
    return normalizeLayout(snap.exists ? snap.data()?.layout : null, isSuperAdmin);
  } catch (error) {
    console.error('getDashboardLayout failed:', error);
    return defaultLayout(isSuperAdmin);
  }
}
