import { PlanEntitlementsManager } from '@/components/plans/plan-entitlements-manager';

// แพลนและสิทธิ์ทนาย — สิทธิ์ของแต่ละแพลน + มอบแพลนให้ทนายรายคน (ดู lib/plan-entitlements.ts)
export default function Page() {
    return <PlanEntitlementsManager product="lawyer" />;
}
