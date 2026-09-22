import 'server-only';
import { initAdmin } from './firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * ข้อมูลสำหรับหน้า Dashboard (src/app/page.tsx) — ดึงทั้งหมดในคำขอเดียวฝั่ง server
 * ด้วย firebase-admin แทนที่เดิมที่หน้า client ยิง Firestore แยกกัน 4 รอบตอนโหลดหน้า
 * (getAdminStats + getDoc role + 2 query ตาราง preview)
 */

export interface AdminDashboardStats {
  totalUsers: number;
  newUsersThisWeek: number;
  activeTicketsCount: number;
  pendingLawyersCount: number;
  approvedLawyersCount: number;
  /** รวม registrationRequests + contractRequests + smeRequests ที่ยังไม่ถูกดำเนินการ */
  pendingRequestsCount: number;
  /** ยุบมาจากแดชบอร์ดของ capdeal ตอนรวมหลังบ้าน (Module 7) */
  capdealContractsCount: number;
  /** ดีลที่อัปสลิปแล้วรอแอดมินตรวจ — เดิมต้องเปิด console ของ capdeal ถึงจะเห็น */
  capdealPendingSlipsCount: number;
}

export interface PendingLawyerPreview {
  id: string;
  userId: string;
  name: string;
  specialty: string[];
  /** จัดรูปแบบเป็น th-TH ไว้แล้วฝั่ง server — ไม่ต้องส่ง Timestamp ดิบข้ามไปฝั่ง client */
  joinedAtLabel: string;
}

export interface TicketPreview {
  id: string;
  userId: string;
  problemType: string;
}

export interface AdminDashboardData {
  stats: AdminDashboardStats;
  pendingLawyers: PendingLawyerPreview[];
  tickets: TicketPreview[];
}

const EMPTY_DASHBOARD_DATA: AdminDashboardData = {
  stats: {
    totalUsers: 0,
    newUsersThisWeek: 0,
    activeTicketsCount: 0,
    pendingLawyersCount: 0,
    approvedLawyersCount: 0,
    pendingRequestsCount: 0,
    capdealContractsCount: 0,
    capdealPendingSlipsCount: 0,
  },
  pendingLawyers: [],
  tickets: [],
};

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const app = await initAdmin();
  if (!app) return EMPTY_DASHBOARD_DATA;

  const db = getFirestore(app);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [
      totalUsersSnap,
      newUsersSnap,
      activeTicketsSnap,
      pendingLawyersSnap,
      approvedLawyersSnap,
      pendingRegistrationSnap,
      pendingContractSnap,
      newSmeSnap,
      pendingLawyersPreviewSnap,
      ticketsPreviewSnap,
      capdealContractsSnap,
      capdealPendingSlipsSnap,
    ] = await Promise.all([
      db.collection('users').count().get(),
      db.collection('users').where('registeredAt', '>=', sevenDaysAgo).count().get(),
      db.collection('tickets').where('status', '==', 'pending').count().get(),
      db.collection('lawyerProfiles').where('status', '==', 'pending').count().get(),
      db.collection('lawyerProfiles').where('status', '==', 'approved').count().get(),
      db.collection('registrationRequests').where('status', '==', 'pending').count().get(),
      db.collection('contractRequests').where('status', '==', 'pending').count().get(),
      // sme-requests ใช้ enum คนละชุด ('new' | 'contacted' | 'completed') ไม่มี 'pending' —
      // 'new' คือสถานะที่ยังไม่ถูกดำเนินการ (ดู src/app/sme-requests/page.tsx)
      db.collection('smeRequests').where('status', '==', 'new').count().get(),
      db.collection('lawyerProfiles').where('status', '==', 'pending').limit(5).get(),
      db.collection('tickets').where('status', '==', 'pending').limit(5).get(),
      db.collection('contracts').count().get(),
      db.collection('cap-deals').where('hasNewPayment', '==', true).count().get(),
    ]);

    const pendingLawyers: PendingLawyerPreview[] = pendingLawyersPreviewSnap.docs.map((doc) => {
      const data = doc.data();
      const joinedAtDate = data.joinedAt?.toDate?.();
      return {
        id: doc.id,
        userId: data.userId ?? '',
        name: data.name ?? 'ไม่ทราบชื่อ',
        specialty: Array.isArray(data.specialty) ? data.specialty : [],
        joinedAtLabel: joinedAtDate ? joinedAtDate.toLocaleDateString('th-TH') : 'N/A',
      };
    });

    const tickets: TicketPreview[] = ticketsPreviewSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId ?? '',
        problemType: data.problemType ?? '',
      };
    });

    return {
      stats: {
        totalUsers: totalUsersSnap.data().count,
        newUsersThisWeek: newUsersSnap.data().count,
        activeTicketsCount: activeTicketsSnap.data().count,
        pendingLawyersCount: pendingLawyersSnap.data().count,
        approvedLawyersCount: approvedLawyersSnap.data().count,
        pendingRequestsCount:
          pendingRegistrationSnap.data().count +
          pendingContractSnap.data().count +
          newSmeSnap.data().count,
        capdealContractsCount: capdealContractsSnap.data().count,
        capdealPendingSlipsCount: capdealPendingSlipsSnap.data().count,
      },
      pendingLawyers,
      tickets,
    };
  } catch (error) {
    console.error('getAdminDashboardData failed:', error);
    return EMPTY_DASHBOARD_DATA;
  }
}
