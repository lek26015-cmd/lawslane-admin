import { PlanEntitlementsManager } from '@/components/plans/plan-entitlements-manager';

// แพ็กเกจ Lawslane AI ของลูกค้า — เครดิตรายเดือน Free/Plus + มอบ Plus รายคน (ดู lib/plan-entitlements.ts)
export default function Page() {
    return <PlanEntitlementsManager product="lawslane" />;
}
