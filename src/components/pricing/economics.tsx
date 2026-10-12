'use client';

import { cn } from '@/lib/utils';
import { useAdminLocale } from '@/lib/admin-i18n';
import type { OneTimeEconomics, PlanEconomics } from '@/lib/cost-model';

/** ตัวช่วยแสดงผลต้นทุน/กำไรข้างช่องราคา (คำนวณจาก lib/cost-model.ts) */

export const baht = (n: number) => `฿${n.toLocaleString('th-TH', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
export const bahtR = (n: number) => `฿${(Math.round(n * 100) / 100).toLocaleString('th-TH', { maximumFractionDigits: 2 })}`;
export const pct = (n: number | null) => (n === null ? '-' : `${(n * 100).toFixed(1)}%`);

/** ต่อบัญชีต่อเดือน: ต้นทุนเต็ม/เฉลี่ย, ค่าธรรมเนียม, ส่วนกลาง → กำไร + margin, ราคาต่ำสุดตามเป้า */
export function PlanEconomicsLine({ e, price, interval }: { e: PlanEconomics; price: number | null; interval: 'monthly' | 'yearly' }) {
    const { tx } = useAdminLocale();
    const neg = (v: number) => (v < 0 ? 'font-semibold text-red-600' : 'text-emerald-700');
    const below = price !== null && price > 0 && e.minPrice !== null && price < e.minPrice;
    return (
        <div className="mt-1 space-y-0.5 text-[11px] leading-tight text-slate-500">
            <div>
                {tx('ต้นทุน AI เต็ม/เฉลี่ย', 'AI cost full/avg')} {bahtR(e.fullCost)}/{bahtR(e.avgCost)}
                {' · '}{tx('ค่าธรรมเนียม', 'Fee')} {bahtR(e.fee)}
                {' · '}{tx('ส่วนกลาง', 'Infra')} {bahtR(e.infra)}
                {interval === 'yearly' && <span> ({tx('ต่อเดือน', 'per month')})</span>}
            </div>
            {price !== null && price > 0 ? (
                <div>
                    {tx('กำไรเต็ม', 'Profit full')} <span className={neg(e.profitFull)}>{bahtR(e.profitFull)} ({pct(e.marginFull)})</span>
                    {' · '}{tx('เฉลี่ย', 'avg')} <span className={neg(e.profitAvg)}>{bahtR(e.profitAvg)} ({pct(e.marginAvg)})</span>
                </div>
            ) : (
                <div className="text-red-600">{tx('ยังไม่ตั้งราคา: ขาดทุน', 'No price: loss')} {bahtR(-e.profitFull)}/{tx('เดือน', 'mo')}</div>
            )}
            {e.minPrice !== null && (
                <div className={cn(below && 'text-amber-700')}>
                    {tx('ราคาต่ำสุดตามเป้า', 'Min price for target')} {bahtR(e.minPrice)}
                </div>
            )}
        </div>
    );
}

/** การจ่ายครั้งเดียวผ่าน Beam: ค่าธรรมเนียมบัตร premium vs PromptPay */
export function OneTimeLine({ e, price }: { e: OneTimeEconomics; price: number | null }) {
    const { tx } = useAdminLocale();
    if (!price) return null;
    return (
        <div className="mt-1 space-y-0.5 text-[11px] leading-tight text-slate-500">
            <div>
                {e.cost > 0 && <>{tx('ต้นทุน', 'Cost')} {bahtR(e.cost)} · </>}
                {tx('ค่าธรรมเนียม Beam บัตร', 'Beam card fee')} {bahtR(e.feeCard)} · PromptPay {bahtR(e.feePromptpay)}
            </div>
            <div>
                {tx('กำไร (บัตร)', 'Profit (card)')}{' '}
                <span className={e.profitCard < 0 ? 'font-semibold text-red-600' : 'text-emerald-700'}>{bahtR(e.profitCard)} ({pct(e.marginCard)})</span>
                {' · PromptPay '}{bahtR(e.profitPromptpay)}
            </div>
            {e.minPrice !== null && <div className={cn(price < e.minPrice && 'text-amber-700')}>{tx('ราคาต่ำสุดตามเป้า', 'Min price for target')} {bahtR(e.minPrice)}</div>}
        </div>
    );
}
