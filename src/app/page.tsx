import { redirect } from 'next/navigation';
import { FileSignature, FileText, Gavel, Landmark, ShieldCheck, Ticket, Users2 } from 'lucide-react';
import { AuthError, requireUser, isSuperAdminToken } from '@/lib/auth-guard';
import { getAdminDashboardData } from '@/lib/dashboard-data';
import { StatCard } from '@/components/dashboard/StatCard';
import { RevenueCard } from '@/components/dashboard/RevenueCard';
import { PendingLawyersTable } from '@/components/dashboard/PendingLawyersTable';
import { RecentTicketsList } from '@/components/dashboard/RecentTicketsList';

export default async function AdminDashboard() {
  let token;
  try {
    ({ token } = await requireUser());
  } catch (error) {
    if (error instanceof AuthError) {
      // middleware.ts เช็คแค่ว่ามี cookie ชื่อ session ไหม (ปลอมได้) — เผื่อ cookie
      // หมดอายุ/ไม่ถูกต้องหลุดมาถึงตรงนี้ ให้เด้งไปหน้า login แทนที่จะโชว์หน้า error
      redirect('/login');
    }
    throw error;
  }

  const { stats, pendingLawyers, tickets } = await getAdminDashboardData();
  const isSuperAdmin = isSuperAdminToken(token);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-8 lg:p-8">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:gap-8 lg:grid-cols-4">
        {isSuperAdmin && <RevenueCard />}
        <StatCard
          title="ผู้ใช้งานทั้งหมด"
          value={stats.totalUsers}
          caption={`+${stats.newUsersThisWeek} ใน 7 วันล่าสุด`}
          icon={Users2}
          href="/customers"
        />
        <StatCard
          title="Ticket ที่เปิดอยู่"
          value={stats.activeTicketsCount}
          caption={stats.activeTicketsCount > 0 ? `${stats.activeTicketsCount} เรื่องรอการแก้ไข` : 'ไม่มีเรื่องค้าง'}
          icon={Ticket}
          href="/tickets"
        />
        <StatCard
          title="ทนายรออนุมัติ"
          value={stats.pendingLawyersCount}
          caption="รอการตรวจสอบคุณสมบัติ"
          icon={ShieldCheck}
          href="/lawyers?tab=pending"
        />
        <StatCard
          title="ทนายที่ Active"
          value={stats.approvedLawyersCount}
          caption="ทนายความพร้อมให้บริการ"
          icon={Gavel}
          href="/lawyers?tab=active"
        />
        <StatCard
          title="คำขอที่รอดำเนินการ"
          value={stats.pendingRequestsCount}
          caption="รวมคำขอลงทะเบียน + สัญญา + SME"
          icon={FileText}
          href="/registration-requests"
        />
        {/* ยุบมาจากแดชบอร์ดของ capdeal (Module 7) — เดิมต้องเปิด console แยก */}
        <StatCard
          title="สัญญา CapDeal"
          value={stats.capdealContractsCount}
          caption="สัญญาทั้งหมดในระบบ CapDeal"
          icon={FileSignature}
          href="/capdeal/contracts"
        />
        <StatCard
          title="สลิป CapDeal รอตรวจ"
          value={stats.capdealPendingSlipsCount}
          caption={stats.capdealPendingSlipsCount > 0 ? 'มีดีลรอยืนยันการชำระเงิน' : 'ไม่มีรายการรอตรวจ'}
          icon={Landmark}
          href="/capdeal/finance"
        />
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <PendingLawyersTable lawyers={pendingLawyers} />
        <RecentTicketsList tickets={tickets} />
      </div>
    </main>
  );
}
