import { notFound, redirect } from 'next/navigation';
import { AuthError, isSuperAdminToken, requireUser } from '@/lib/auth-guard';
import { PlanPricingManager } from '@/components/pricing/plan-pricing-manager';

// ราคาแพ็กเกจ (PLAN-08 เฟส 3) — Super Admin เท่านั้น คนอื่นได้ 404 เหมือนไม่มีหน้านี้
// action ทุกตัวเช็ค requireSuperAdmin() ซ้ำอีกชั้น (หน้านี้เป็นแค่ด่านแสดงผล)
export const dynamic = 'force-dynamic';

export default async function PricingPage() {
    let token;
    try {
        ({ token } = await requireUser());
    } catch (error) {
        if (error instanceof AuthError) redirect('/login');
        throw error;
    }
    if (!isSuperAdminToken(token)) notFound();
    return <PlanPricingManager />;
}
