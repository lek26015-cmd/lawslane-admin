import { notFound, redirect } from 'next/navigation';
import { AuthError, isSuperAdminToken, requireUser } from '@/lib/auth-guard';
import { PlanPricingManager } from '@/components/pricing/plan-pricing-manager';
import type { CostSection } from '@/lib/pricing-field-docs';

// ราคาแพ็กเกจ (PLAN-08 เฟส 3) — Super Admin เท่านั้น คนอื่นได้ 404 เหมือนไม่มีหน้านี้
// action ทุกตัวเช็ค requireSuperAdmin() ซ้ำอีกชั้น (หน้านี้เป็นแค่ด่านแสดงผล)
// ?view=costs = แท็บ "ต้นทุนระบบ" · &section=<แท็บย่อย> (จำไว้ใน URL ให้รีเฟรชแล้วอยู่ที่เดิม)
export const dynamic = 'force-dynamic';

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ view?: string; section?: string }> }) {
    let token;
    try {
        ({ token } = await requireUser());
    } catch (error) {
        if (error instanceof AuthError) redirect('/login');
        throw error;
    }
    if (!isSuperAdminToken(token)) notFound();
    const sp = await searchParams;
    return (
        <PlanPricingManager
            initialView={sp.view === 'costs' ? 'costs' : 'prices'}
            initialSection={(sp.section ?? 'overview') as CostSection}
        />
    );
}
