import { notFound, redirect } from 'next/navigation';
import { AuthError, isSuperAdminToken, requireUser } from '@/lib/auth-guard';

// ทางลัด /pricing/costs → แท็บ "ต้นทุนระบบ" ในหน้าราคาแพ็กเกจ (Super Admin เท่านั้น คนอื่น 404)
export const dynamic = 'force-dynamic';

export default async function PricingCostsRedirect() {
    let token;
    try {
        ({ token } = await requireUser());
    } catch (error) {
        if (error instanceof AuthError) redirect('/login');
        throw error;
    }
    if (!isSuperAdminToken(token)) notFound();
    redirect('/pricing?view=costs');
}
