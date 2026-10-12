'use client';

import { useState } from 'react';
import { ChevronDown, RotateCcw, Save } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAdminLocale } from '@/lib/admin-i18n';
import {
    DEFAULT_COST_ASSUMPTIONS, scenarioTotals, unitCosts, type CostAssumptions,
} from '@/lib/cost-model';
import type { StoredSaveResult } from '@/lib/plan-pricing-core';
import { saveCostModelAction } from '@/app/actions/plan-pricing-actions';
import { ConfirmSaveDialog } from './confirm-save-dialog';
import { bahtR } from './economics';

/**
 * ส่วน "สมมติฐานต้นทุน" (พับได้) — แก้ค่าแล้วตัวเลขกำไรข้างราคาทุกช่องเปลี่ยนทันที (ร่างยังไม่บันทึก)
 * กด "บันทึกสมมติฐาน" เพื่อเก็บที่ {collection}/costModel (Super Admin + ยืนยัน + log)
 * ที่มาของค่าเริ่มต้น: LAWSLANE-ต้นทุน-2026-10.xlsx (ดู lib/cost-model.ts)
 */

type L = [string, string];

const GENERAL: [keyof CostAssumptions['general'], L][] = [
    ['fx', ['อัตราแลกเปลี่ยน (บาท/USD)', 'FX (THB/USD)']],
    ['targetMargin', ['เป้า gross margin (0–1)', 'Target gross margin (0–1)']],
    ['avgUsage', ['สัดส่วนใช้โควตาเฉลี่ยของผู้จ่ายเงิน (0–1)', 'Average quota usage (0–1)']],
    ['cardPct', ['Stripe บัตรในประเทศ (สัดส่วน)', 'Stripe domestic card rate']],
    ['cardFixed', ['Stripe ค่าคงที่ต่อรายการ (บาท)', 'Stripe fixed fee (THB)']],
    ['billingPct', ['Stripe Billing (สัดส่วน)', 'Stripe Billing rate']],
    ['vatOnFees', ['VAT บนค่าธรรมเนียม (0 = ตรงกับไฟล์ Excel)', 'VAT on fees (0 = match the Excel file)']],
];
const BEAM: [keyof CostAssumptions['beam'], L][] = [
    ['cardPct', ['Beam บัตรทั่วไป', 'Beam card']],
    ['premiumPct', ['Beam บัตร premium (ใช้คิดกำไร)', 'Beam premium card (used for profit)']],
    ['intlPct', ['Beam บัตรต่างประเทศ', 'Beam international card']],
    ['amexPct', ['Beam Amex', 'Beam Amex']],
    ['ewalletPct', ['Beam e-wallet', 'Beam e-wallet']],
    ['promptpayPct', ['Beam PromptPay', 'Beam PromptPay']],
];
const QUOTAS: [keyof CostAssumptions['quotas'], L][] = [
    ['lawPro', ['เครดิต AI ทนาย Pro / เดือน', 'Lawyer Pro AI credits / mo']],
    ['lawFirm', ['เครดิต AI ทนาย บริษัท (Firm) / เดือน', 'Lawyer Firm AI credits / mo']],
    ['custFree', ['เครดิต AI ลูกค้า Free / เดือน', 'Customer Free credits / mo']],
    ['custPlus', ['เครดิต AI ลูกค้า Plus / เดือน', 'Customer Plus credits / mo']],
    ['cdFree', ['CapDeal Free สัญญา / เดือน', 'CapDeal Free contracts / mo']],
    ['cdLite', ['CapDeal Lite สัญญา / เดือน', 'CapDeal Lite contracts / mo']],
    ['cdPro', ['CapDeal Pro สัญญา / เดือน', 'CapDeal Pro contracts / mo']],
    ['cdScale', ['CapDeal Scale สัญญา / เดือน', 'CapDeal Scale contracts / mo']],
    ['cdScanX', ['CapDeal AI สแกน = กี่เท่าของสัญญา (ขั้นต่ำ 10)', 'CapDeal scans per contract quota (min 10)']],
    ['witHeavy', ['Wittaya ไม่จำกัด: ใช้หนักสุดที่สมมติ (ชุด/เดือน)', 'Wittaya unlimited: assumed heavy use (sets/mo)']],
    ['witEssayPerSet', ['ข้อเขียนที่ AI ตรวจต่อชุด', 'AI-graded essays per set']],
];
const INFRA: [keyof CostAssumptions['infra'], L][] = [
    ['pagesPerVisit', ['หน้าต่อการเข้าชม', 'Pages per visit']],
    ['fsReadsPerVisit', ['Firestore reads ต่อการเข้าชม', 'Firestore reads per visit']],
    ['fsWritesPerVisit', ['Firestore writes ต่อการเข้าชม', 'Firestore writes per visit']],
    ['reqSec', ['วินาทีต่อ request (SSR)', 'Seconds per request']],
    ['reqConcurrency', ['request พร้อมกันต่อ instance', 'Concurrent requests per instance']],
    ['instVcpu', ['vCPU ต่อ instance', 'vCPU per instance']],
    ['instGib', ['หน่วยความจำต่อ instance (GiB)', 'Memory per instance (GiB)']],
    ['mbPerPage', ['ข้อมูลส่งออกต่อหน้า (MB)', 'Egress per page (MB)']],
    ['vectors', ['จำนวน vector ในคลังกฎหมาย', 'Vectors in law index']],
    ['vecDims', ['มิติ vector', 'Vector dimensions']],
    ['embedTokens', ['token ที่ embed ต่อคำถาม', 'Embedded tokens per query']],
    ['emailsPerUser', ['อีเมลต่อผู้ใช้ active / เดือน', 'Emails per active user / mo']],
    ['vercelSeats', ['ที่นั่ง Vercel Pro', 'Vercel Pro seats']],
    ['domains', ['โดเมนที่จ่ายเอง', 'Paid domains']],
];
const SCENARIOS: [keyof CostAssumptions['scenarios'], L][] = [
    ['lawFree', ['ทนาย Free', 'Lawyers Free']],
    ['lawPro', ['ทนาย Pro', 'Lawyers Pro']],
    ['lawFirm', ['ทนาย บริษัท (Firm)', 'Lawyers Firm']],
    ['custMau', ['ลูกค้า active / เดือน (รวม Plus)', 'Customers active / mo']],
    ['custPlus', ['ลูกค้า Plus', 'Customers Plus']],
    ['custFreeCredits', ['เครดิตเฉลี่ยที่ลูกค้า Free ใช้', 'Avg credits used by Free']],
    ['usage', ['สัดส่วนใช้โควตาของผู้จ่ายเงิน', 'Paid quota usage share']],
    ['vMain', ['การเข้าชม lawslane.com', 'lawslane.com visits']],
    ['cdFree', ['CapDeal Free', 'CapDeal Free']],
    ['cdLite', ['CapDeal Lite', 'CapDeal Lite']],
    ['cdPro', ['CapDeal Pro', 'CapDeal Pro']],
    ['cdScale', ['CapDeal Scale', 'CapDeal Scale']],
    ['cdScansPerContract', ['AI สแกน/แชทต่อสัญญา', 'Scans per contract']],
    ['vCd', ['การเข้าชม CapDeal', 'CapDeal visits']],
    ['witFree', ['Wittaya Free active', 'Wittaya Free active']],
    ['witPremium', ['Wittaya Premium', 'Wittaya Premium']],
    ['witPro', ['Wittaya Pro', 'Wittaya Pro']],
    ['vWit', ['การเข้าชม Wittaya', 'Wittaya visits']],
    ['bizStarter', ['Business Starter (ร่าง · นับในส่วนกลาง)', 'Business Starter (draft)']],
    ['bizPro', ['Business Pro (ร่าง · นับในส่วนกลาง)', 'Business Pro (draft)']],
    ['bizReviews', ['AI รีวิว / องค์กร (ร่าง)', 'AI reviews / org (draft)']],
    ['vBiz', ['การเข้าชม business + landing', 'Business + landing visits']],
    ['vAdmin', ['การเข้าชม admin', 'Admin visits']],
    ['fsGb', ['ขนาด Firestore (GiB)', 'Firestore size (GiB)']],
    ['gcsGb', ['Firebase Storage (GB)', 'Firebase Storage (GB)']],
    ['r2Gb', ['Cloudflare R2 (GB)', 'Cloudflare R2 (GB)']],
    ['imgStored', ['รูปใน Cloudflare Images', 'Cloudflare Images stored']],
];
const SERVICE: [keyof CostAssumptions['servicePrices'], L][] = [
    ['crCpu', ['App Hosting CPU (USD/vCPU-วินาที)', 'App Hosting CPU (USD/vCPU-s)']],
    ['crMem', ['App Hosting หน่วยความจำ (USD/GiB-วินาที)', 'App Hosting memory (USD/GiB-s)']],
    ['crReq', ['App Hosting request (USD/ล้าน)', 'App Hosting requests (USD/M)']],
    ['egress', ['ข้อมูลส่งออก (USD/GiB)', 'Egress (USD/GiB)']],
    ['fsRead', ['Firestore อ่าน (USD/100k)', 'Firestore reads (USD/100k)']],
    ['fsWrite', ['Firestore เขียน (USD/100k)', 'Firestore writes (USD/100k)']],
    ['fsGb', ['Firestore พื้นที่ (USD/GiB-เดือน)', 'Firestore storage (USD/GiB-mo)']],
    ['gcs', ['Firebase Storage (USD/GB-เดือน)', 'Firebase Storage (USD/GB-mo)']],
    ['cfBase', ['Cloudflare Workers Paid (USD/เดือน)', 'Cloudflare Workers Paid (USD/mo)']],
    ['vecQ', ['Vectorize queried (USD/ล้าน dims)', 'Vectorize queried (USD/M dims)']],
    ['vecS', ['Vectorize stored (USD/100 ล้าน dims)', 'Vectorize stored (USD/100M dims)']],
    ['neuron', ['Workers AI (USD/1,000 neurons)', 'Workers AI (USD/1k neurons)']],
    ['bgeNeurons', ['bge-m3 neurons ต่อล้าน token', 'bge-m3 neurons per M tokens']],
    ['r2', ['R2 (USD/GB-เดือน)', 'R2 (USD/GB-mo)']],
    ['imgStored', ['Images เก็บ (USD/100k รูป)', 'Images stored (USD/100k)']],
    ['imgDeliv', ['Images ส่ง (USD/100k ครั้ง)', 'Images delivered (USD/100k)']],
    ['vercel', ['Vercel Pro (USD/ที่นั่ง/เดือน)', 'Vercel Pro (USD/seat/mo)']],
    ['resendPro', ['Resend Pro (USD/เดือน)', 'Resend Pro (USD/mo)']],
    ['resendOver', ['Resend เกินโควตา (USD/1,000)', 'Resend overage (USD/1k)']],
    ['upstash', ['Upstash (USD/100k คำสั่ง)', 'Upstash (USD/100k cmds)']],
    ['domainThb', ['โดเมน (บาท/ปี)', 'Domain (THB/yr)']],
];
const AI_CALLS: [keyof CostAssumptions['aiCalls'], L][] = [
    ['lawAsk', ['ทนาย: ถามกฎหมาย', 'Lawyer: ask']],
    ['lawStatute', ['ทนาย: ค้นตัวบท', 'Lawyer: statute']],
    ['lawJudgment', ['ทนาย: ค้นฎีกา', 'Lawyer: judgment']],
    ['lawAttach', ['ทนาย: วิเคราะห์ไฟล์แนบ', 'Lawyer: attachment']],
    ['lawDraft', ['ทนาย: ร่างเอกสาร', 'Lawyer: draft']],
    ['lawContract', ['ทนาย: ตรวจสัญญา', 'Lawyer: contract']],
    ['cust', ['ลูกค้า: ถาม AI', 'Customer: ask']],
    ['cdScan', ['CapDeal: AI สแกน/แชท', 'CapDeal: scan/chat']],
    ['cdDraft', ['CapDeal: ร่าง/วิเคราะห์สัญญา', 'CapDeal: draft contract']],
    ['witEssay', ['Wittaya: ตรวจข้อเขียน 1 ข้อ', 'Wittaya: grade 1 essay']],
];
const AI_FIELDS = ['inputTokens', 'cachedShare', 'outputTokens', 'credits', 'mix'] as const;

function getAt(obj: any, path: (string | number)[]): any {
    return path.reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setAt<T>(obj: T, path: (string | number)[], value: unknown): T {
    const clone: any = Array.isArray(obj) ? [...(obj as any)] : { ...(obj as any) };
    const [head, ...rest] = path;
    clone[head] = rest.length ? setAt(clone[head], rest, value) : value;
    return clone;
}

/** ช่องตัวเลข: เก็บข้อความที่พิมพ์ไว้ในตัว ใส่ค่าเข้าโมเดลเมื่อเป็นตัวเลขที่ใช้ได้ */
function NumField({ value, onValue, nullable, className }: {
    value: number | null; onValue: (v: number | null) => void; nullable?: boolean; className?: string;
}) {
    const [text, setText] = useState<string | null>(null);
    const shown = text ?? (value === null ? '' : String(value));
    const bad = text !== null && !(nullable && text.trim() === '') && !(Number.isFinite(Number(text)) && Number(text) >= 0 && text.trim() !== '');
    return (
        <Input
            inputMode="decimal"
            value={shown}
            className={cn('h-8 w-28 px-2 text-xs', bad && 'border-red-500', className)}
            onChange={(e) => {
                const t = e.target.value;
                setText(t);
                if (nullable && t.trim() === '') onValue(null);
                else if (t.trim() !== '' && Number.isFinite(Number(t)) && Number(t) >= 0) onValue(Number(t));
            }}
            onBlur={() => { if (!bad) setText(null); }}
        />
    );
}

export function CostAssumptionsEditor({ draft, setDraft, saved, updatedAt, isDefault, onSaved }: {
    draft: CostAssumptions;
    setDraft: (fn: (d: CostAssumptions) => CostAssumptions) => void;
    saved: CostAssumptions;
    updatedAt: string | null;
    isDefault: boolean;
    onSaved: () => Promise<void>;
}) {
    const { tx } = useAdminLocale();
    const [openPanel, setOpenPanel] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<StoredSaveResult | string | null>(null);
    // เปลี่ยนเลข key เพื่อล้างข้อความที่พิมพ์ค้างในช่องเมื่อคืนค่า
    const [resetKey, setResetKey] = useState(0);

    const set = (path: (string | number)[]) => (v: number | null) => setDraft((d) => setAt(d, path, v));
    const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
    const u = unitCosts(draft);
    const totals = ([0, 1, 2] as const).map((i) => scenarioTotals(draft, i));

    // รายการที่เปลี่ยน (แสดงในกล่องยืนยัน)
    const changes: string[] = [];
    const walk = (a: any, b: any, path: string) => {
        if (a !== null && typeof a === 'object') {
            for (const k of Object.keys(a)) walk(a[k], b?.[k], path ? `${path}.${k}` : k);
        } else if (a !== b) changes.push(`${path}: ${b ?? '-'} → ${a ?? '-'}`);
    };
    walk(draft, saved, '');

    const save = async () => {
        setBusy(true);
        const res = await saveCostModelAction({ assumptions: draft, baseUpdatedAt: updatedAt });
        setBusy(false);
        setConfirmOpen(false);
        setResult(res.ok ? res.data : res.error);
        if (res.ok && res.data.status === 'ok') await onSaved();
    };

    const simpleGroup = <K extends keyof CostAssumptions>(group: K, rows: [string, L][], title: L) => (
        <div className="space-y-2">
            <h4 className="text-sm font-semibold">{tx(...title)}</h4>
            <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                {rows.map(([k, label]) => (
                    <label key={k} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-600">{tx(...label)}</span>
                        <NumField value={getAt(draft, [group, k])} onValue={set([group, k])} />
                    </label>
                ))}
            </div>
        </div>
    );

    return (
        <Collapsible open={openPanel} onOpenChange={setOpenPanel}>
            <Card>
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer">
                        <CardTitle className="flex flex-wrap items-center gap-2">
                            <ChevronDown className={cn('h-4 w-4 transition-transform', !openPanel && '-rotate-90')} />
                            {tx('สมมติฐานต้นทุน', 'Cost assumptions')}
                            {isDefault && <Badge variant="secondary">{tx('ค่าจากไฟล์ Excel (ยังไม่เคยบันทึก)', 'Excel defaults (never saved)')}</Badge>}
                            {dirty && <Badge className="bg-amber-500">{tx('มีร่างที่ยังไม่บันทึก', 'Unsaved draft')}</Badge>}
                        </CardTitle>
                        <CardDescription>
                            {tx('ค่าเริ่มต้นจาก LAWSLANE-ต้นทุน-2026-10.xlsx · แก้แล้วตัวเลขกำไรข้างราคาเปลี่ยนทันที · ส่วนกลาง/บัญชีที่จ่ายเงิน:',
                                'Defaults from LAWSLANE-ต้นทุน-2026-10.xlsx · edits update the margins next to each price live · infra per paying account:')}{' '}
                            {totals.map((t, i) => `${[tx('เริ่มต้น', 'Start'), tx('เติบโต', 'Growth'), tx('ขยาย', 'Scale')][i]} ${bahtR(t.infraPerPaying)}`).join(' · ')}
                        </CardDescription>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent key={resetKey} className="space-y-6">
                        <div className="rounded-lg border bg-slate-50 p-3 text-xs text-slate-600">
                            <div className="mb-1 font-semibold">{tx('ต้นทุนต่อหน่วยที่คำนวณได้', 'Computed unit costs')}</div>
                            {tx('เครดิตทนายเฉลี่ย', 'Lawyer credit avg')} {bahtR(u.lawCredit)} · {tx('สูงสุด', 'max')} {bahtR(u.lawCreditMax)}
                            {' · '}{tx('เครดิตลูกค้า', 'Customer credit')} {bahtR(u.custCredit)}
                            {' · '}RAG {u.rag.toFixed(5)}
                            {' · '}CapDeal {tx('สแกน', 'scan')} {bahtR(u.cdScan)} / {tx('ร่าง', 'draft')} {bahtR(u.cdDraft)}
                            {' · '}Wittaya {tx('ชุด', 'set')} {bahtR(u.witSet)}
                        </div>

                        {simpleGroup('general', GENERAL, ['ค่าทั่วไปและค่าธรรมเนียม Stripe', 'General & Stripe fees'])}
                        {simpleGroup('beam', BEAM, ['ค่าธรรมเนียม Beam (ก่อน VAT)', 'Beam fees (before VAT)'])}
                        {simpleGroup('quotas', QUOTAS, ['โควตาต่อแพ็กเกจ', 'Plan quotas'])}
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold">{tx('งานล่าม', 'Interpreter jobs')}</h4>
                            <label className="flex items-center gap-2 text-xs">
                                <span className="text-slate-600">{tx('มูลค่างานเฉลี่ยต่อครั้ง (บาท)', 'Average job value (THB)')}</span>
                                <NumField value={draft.interpreter.bookingValue} onValue={set(['interpreter', 'bookingValue'])} />
                            </label>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold">{tx('สถานการณ์จำนวนผู้ใช้ / ปริมาณต่อเดือน', 'Scenarios (users / monthly volume)')}</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{tx('ตัวแปร', 'Variable')}</TableHead>
                                        <TableHead>{tx('เริ่มต้น', 'Start')}</TableHead>
                                        <TableHead>{tx('เติบโต', 'Growth')}</TableHead>
                                        <TableHead>{tx('ขยาย', 'Scale')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {SCENARIOS.map(([k, label]) => (
                                        <TableRow key={k}>
                                            <TableCell className="py-1 text-xs">{tx(...label)}</TableCell>
                                            {[0, 1, 2].map((i) => (
                                                <TableCell key={i} className="py-1">
                                                    <NumField value={draft.scenarios[k][i]} onValue={set(['scenarios', k, i])} />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell className="py-1 text-xs font-medium">{tx('ค่าส่วนกลางที่คำนวณได้ (บาท/เดือน)', 'Computed shared infra (THB/mo)')}</TableCell>
                                        {totals.map((t, i) => <TableCell key={i} className="py-1 text-xs">{bahtR(t.sharedComputed)}</TableCell>)}
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="py-1 text-xs font-medium">
                                            {tx('ใช้ยอดจริงแทน (บาท/เดือน, เว้นว่าง = ใช้ค่าที่คำนวณ)', 'Override with real bill (THB/mo, blank = computed)')}
                                        </TableCell>
                                        {[0, 1, 2].map((i) => (
                                            <TableCell key={i} className="py-1">
                                                <NumField nullable value={draft.sharedOverride[i]} onValue={set(['sharedOverride', i])} />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="py-1 text-xs font-medium">{tx('บัญชีที่จ่ายเงิน · ส่วนกลางต่อบัญชี', 'Paying accounts · infra per account')}</TableCell>
                                        {totals.map((t, i) => <TableCell key={i} className="py-1 text-xs">{t.paying} · {bahtR(t.infraPerPaying)}</TableCell>)}
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        {simpleGroup('infra', INFRA, ['สมมติฐานโครงสร้าง (เว็บ/ฐานข้อมูล)', 'Infrastructure assumptions'])}
                        {simpleGroup('servicePrices', SERVICE, ['ราคาบริการ (list price)', 'Service list prices'])}

                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold">{tx('ราคาโมเดล AI (USD / ล้าน token)', 'AI model prices (USD / M tokens)')}</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{tx('โมเดล', 'Model')}</TableHead>
                                        <TableHead>input</TableHead>
                                        <TableHead>cached</TableHead>
                                        <TableHead>output</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.keys(DEFAULT_COST_ASSUMPTIONS.models).map((m) => (
                                        <TableRow key={m}>
                                            <TableCell className="py-1 font-mono text-xs">{m}</TableCell>
                                            {(['input', 'cached', 'output'] as const).map((f) => (
                                                <TableCell key={f} className="py-1">
                                                    <NumField value={draft.models[m]?.[f] ?? 0} onValue={set(['models', m, f])} />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold">{tx('การเรียก AI 1 ครั้ง (token ประมาณ)', 'One AI call (estimated tokens)')}</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{tx('รายการ', 'Call')}</TableHead>
                                        <TableHead>{tx('โมเดล', 'Model')}</TableHead>
                                        <TableHead>input</TableHead>
                                        <TableHead>{tx('สัดส่วน cached', 'cached share')}</TableHead>
                                        <TableHead>output</TableHead>
                                        <TableHead>{tx('เครดิต', 'credits')}</TableHead>
                                        <TableHead>mix</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {AI_CALLS.map(([k, label]) => (
                                        <TableRow key={k}>
                                            <TableCell className="py-1 text-xs">{tx(...label)}</TableCell>
                                            <TableCell className="py-1">
                                                <select
                                                    className="h-8 rounded-md border bg-white px-1 text-xs"
                                                    value={draft.aiCalls[k].model}
                                                    onChange={(e) => setDraft((d) => setAt(d, ['aiCalls', k, 'model'], e.target.value))}
                                                >
                                                    {Object.keys(draft.models).map((m) => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </TableCell>
                                            {AI_FIELDS.map((f) => (
                                                <TableCell key={f} className="py-1">
                                                    <NumField className="w-20" value={draft.aiCalls[k][f]} onValue={set(['aiCalls', k, f])} />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => { setResult(null); setConfirmOpen(true); }} disabled={!dirty}>
                                <Save className="mr-2 h-4 w-4" /> {tx('บันทึกสมมติฐาน', 'Save assumptions')}
                            </Button>
                            <Button variant="outline" disabled={!dirty} onClick={() => { setDraft(() => saved); setResetKey((n) => n + 1); }}>
                                <RotateCcw className="mr-2 h-4 w-4" /> {tx('คืนค่าที่บันทึกไว้', 'Revert to saved')}
                            </Button>
                            <Button variant="ghost" onClick={() => { setDraft(() => DEFAULT_COST_ASSUMPTIONS); setResetKey((n) => n + 1); }}>
                                {tx('ใช้ค่าจากไฟล์ Excel', 'Use Excel defaults')}
                            </Button>
                        </div>
                        {result && (
                            <p className={cn('text-sm', typeof result !== 'string' && result.status === 'ok' ? 'text-emerald-700' : 'text-red-600')}>
                                {typeof result === 'string' ? result : result.status === 'ok' ? tx('บันทึกแล้ว', 'Saved') : result.message}
                            </p>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Card>
            <ConfirmSaveDialog
                open={confirmOpen} onOpenChange={setConfirmOpen} busy={busy} onConfirm={save}
                title={tx('ยืนยันบันทึกสมมติฐานต้นทุน', 'Confirm cost assumptions')}
                changes={changes.slice(0, 40).concat(changes.length > 40 ? [tx(`และอีก ${changes.length - 40} ช่อง`, `and ${changes.length - 40} more`)] : [])}
                warning={tx('ใช้คำนวณต้นทุน/กำไรในหน้านี้เท่านั้น ไม่เปลี่ยนราคาและไม่มีผลกับลูกค้า', 'Only used for the cost/margin estimates on this page. No prices change and no customer is affected.')}
                confirmLabel={tx('ฉันตรวจค่าที่แก้แล้ว', 'I have checked the edited values')}
            />
        </Collapsible>
    );
}
