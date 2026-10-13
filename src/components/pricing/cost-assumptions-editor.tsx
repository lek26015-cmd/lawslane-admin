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
    DEFAULT_COST_ASSUMPTIONS, scenarioTotals, unitCosts, type CostAssumptions, type RunContext,
} from '@/lib/cost-model';
import {
    AI_CALL_LABELS, AI_FIELD_LABELS, BEAM_LABELS, BUSINESS_LABELS, GENERAL_LABELS, INFRA_LABELS, QUOTA_LABELS,
    SCENARIO_FIELD_LABELS, SCENARIO_GROUPS, SERVICE_PRICE_INFO,
    aiCallFieldEditable, assumptionFieldDoc, assumptionGroupDoc, assumptionTitle, diffAffects,
} from '@/lib/pricing-field-docs';
import { AffectsSummary, FieldInfo } from './field-info';
import type { StoredSaveResult } from '@/lib/plan-pricing-core';
import { saveCostModelAction } from '@/app/actions/plan-pricing-actions';
import { ConfirmSaveDialog } from './confirm-save-dialog';
import { NoSheetTag, useSheetNotice } from './cost-sheet-sync';
import { bahtR } from './economics';

/**
 * ส่วน "สมมติฐานต้นทุน" (พับได้) — แก้ค่าแล้วตัวเลขกำไรข้างราคาทุกช่องเปลี่ยนทันที (ร่างยังไม่บันทึก)
 * กด "บันทึกสมมติฐาน" เพื่อเก็บที่ {collection}/costModel (Super Admin + ยืนยัน + log)
 * ที่มาของค่าเริ่มต้น: LAWSLANE-ต้นทุน-2026-10.xlsx (ดู lib/cost-model.ts)
 */

type L = [string, string];

const entries = <K extends string>(m: Record<K, L>) => Object.entries(m) as [K, L][];
const GENERAL = entries(GENERAL_LABELS).filter(([k]) => k !== 'marginScenario');
const BEAM = entries(BEAM_LABELS);
const QUOTAS = entries(QUOTA_LABELS);
const BUSINESS = entries(BUSINESS_LABELS);
const INFRA = entries(INFRA_LABELS);
const SERVICE = (Object.keys(SERVICE_PRICE_INFO) as (keyof CostAssumptions['servicePrices'])[])
    .map((k) => [k, assumptionTitle(`servicePrices/${k}`)] as [typeof k, L]);
const AI_CALLS = entries(AI_CALL_LABELS);
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
function NumField({ value, onValue, nullable, className, ariaLabel }: {
    value: number | null; onValue: (v: number | null) => void; nullable?: boolean; className?: string; ariaLabel?: string;
}) {
    const [text, setText] = useState<string | null>(null);
    const shown = text ?? (value === null ? '' : String(value));
    const bad = text !== null && !(nullable && text.trim() === '') && !(Number.isFinite(Number(text)) && Number(text) >= 0 && text.trim() !== '');
    return (
        <Input
            inputMode="decimal"
            aria-label={ariaLabel}
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

export function CostAssumptionsEditor({ draft, setDraft, saved, updatedAt, isDefault, onSaved, run }: {
    draft: CostAssumptions;
    setDraft: (fn: (d: CostAssumptions) => CostAssumptions) => void;
    saved: CostAssumptions;
    updatedAt: string | null;
    isDefault: boolean;
    onSaved: () => Promise<void>;
    /** ราคา/GP ที่ใช้คิดผลกระทบ (จากหน้าตั้งราคา) */
    run: RunContext;
}) {
    const { tx } = useAdminLocale();
    const notifySheet = useSheetNotice();
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
    // ⓘ ของแต่ละช่อง: คำนวณผลกระทบจากโมเดลตอนเปิด (ใช้ค่าในร่างปัจจุบัน)
    const info = (path: string) => () => assumptionFieldDoc(path, draft, run);
    const groupInfo = (group: string, title: L) => () => {
        const d = assumptionGroupDoc(group);
        return d ? { ...d, title } : null;
    };

    // รายการที่เปลี่ยน (แสดงในกล่องยืนยัน) — ใช้ชื่อช่องภาษาคน
    const changes: string[] = [];
    const walk = (a: any, b: any, path: string) => {
        if (a !== null && typeof a === 'object') {
            for (const k of Object.keys(a)) walk(a[k], b?.[k], path ? `${path}/${k}` : k);
        } else if (a !== b) changes.push(`${tx(...assumptionTitle(path))}: ${b ?? '-'} → ${a ?? '-'}`);
    };
    walk(draft, saved, '');

    const save = async () => {
        setBusy(true);
        const res = await saveCostModelAction({ assumptions: draft, baseUpdatedAt: updatedAt });
        setBusy(false);
        setConfirmOpen(false);
        setResult(res.ok ? res.data : res.error);
        if (res.ok) notifySheet(res.sheet);
        if (res.ok && res.data.status === 'ok') await onSaved();
    };

    const heading = (title: L, group: string) => (
        <h4 className="flex items-center gap-1 text-sm font-semibold">
            {tx(...title)} <FieldInfo doc={groupInfo(group, title)} label={title[1]} />
        </h4>
    );

    const simpleGroup = <K extends keyof CostAssumptions>(group: K, rows: [string, L][], title: L) => (
        <div className="space-y-2">
            {heading(title, group)}
            <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                {rows.map(([k, label]) => (
                    <div key={k} className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-1 text-slate-600">
                            {tx(...label)} <FieldInfo doc={info(`${group}/${k}`)} label={label[1]} />
                            <NoSheetTag path={`${group}/${k}`} />
                        </span>
                        <NumField value={getAt(draft, [group, k])} onValue={set([group, k])} ariaLabel={label[1]} />
                    </div>
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
                            {tx('ใช้ร่วมกันทั้งแท็บ "ตั้งราคา" และ "ต้นทุนระบบ" · แก้แล้วตัวเลขทั้งสองแท็บเปลี่ยนทันที (ยังไม่บันทึก) · กด ⓘ ข้างช่องเพื่อดูว่ากระทบอะไร · ส่วนกลาง/บัญชีที่จ่ายเงิน:',
                                'Shared by "Set prices" and "System costs" · edits update both tabs live (unsaved) · press ⓘ next to a field to see what it affects · infra per paying account:')}{' '}
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
                        {simpleGroup('business', BUSINESS, ['แพลน Business (ร่าง)', 'Business plans (draft)'])}
                        <div className="space-y-2">
                            {heading(['งานล่าม', 'Interpreter jobs'], 'interpreter')}
                            <div className="flex items-center gap-2 text-xs">
                                <span className="flex items-center gap-1 text-slate-600">
                                    {tx('มูลค่างานเฉลี่ยต่อครั้ง (บาท)', 'Average job value (THB)')}
                                    <FieldInfo doc={info('interpreter/bookingValue')} label="Average job value" />
                                </span>
                                <NumField value={draft.interpreter.bookingValue} onValue={set(['interpreter', 'bookingValue'])} ariaLabel="Average job value" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            {heading(['สถานการณ์จำนวนผู้ใช้ / ปริมาณต่อเดือน', 'Scenarios (users / monthly volume)'], 'scenarios')}
                            <div className="overflow-x-auto">
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
                                        {SCENARIO_GROUPS.map((g) => [
                                            <TableRow key={g.title[0]} className="bg-slate-50">
                                                <TableCell colSpan={4} className="py-1 text-xs font-semibold">{tx(...g.title)}</TableCell>
                                            </TableRow>,
                                            ...g.keys.map((k) => (
                                                <TableRow key={k}>
                                                    <TableCell className="py-1 text-xs">
                                                        <span className="flex items-center gap-1">
                                                            {tx(...SCENARIO_FIELD_LABELS[k])}
                                                            <FieldInfo doc={info(`scenarios/${k}`)} label={SCENARIO_FIELD_LABELS[k][1]} />
                                                        </span>
                                                    </TableCell>
                                                    {[0, 1, 2].map((i) => (
                                                        <TableCell key={i} className="py-1">
                                                            <NumField value={draft.scenarios[k][i]} onValue={set(['scenarios', k, i])} ariaLabel={`${SCENARIO_FIELD_LABELS[k][1]} ${i + 1}`} />
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            )),
                                        ])}
                                        <TableRow>
                                            <TableCell className="py-1 text-xs font-medium">{tx('ค่าส่วนกลางที่คำนวณได้ (บาท/เดือน)', 'Computed shared infra (THB/mo)')}</TableCell>
                                            {totals.map((t, i) => <TableCell key={i} className="py-1 text-xs">{bahtR(t.sharedComputed)}</TableCell>)}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="py-1 text-xs font-medium">
                                                <span className="flex items-center gap-1">
                                                    {tx('ใช้ยอดจริงแทน (บาท/เดือน, เว้นว่าง = ใช้ค่าที่คำนวณ)', 'Override with real bill (THB/mo, blank = computed)')}
                                                    <FieldInfo doc={info('sharedOverride/1')} label="Real bill override" />
                                                    <NoSheetTag path="sharedOverride/1" />
                                                </span>
                                            </TableCell>
                                            {[0, 1, 2].map((i) => (
                                                <TableCell key={i} className="py-1">
                                                    <NumField nullable value={draft.sharedOverride[i]} onValue={set(['sharedOverride', i])} ariaLabel={`Override ${i + 1}`} />
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
                        </div>

                        {simpleGroup('infra', INFRA, ['สมมติฐานโครงสร้าง (เว็บ/ฐานข้อมูล/AI ฝั่งระบบ)', 'Infrastructure assumptions'])}
                        {simpleGroup('servicePrices', SERVICE, ['ราคาบริการ (list price)', 'Service list prices'])}

                        <div className="space-y-2">
                            {heading(['ราคาโมเดล AI (USD / ล้าน token)', 'AI model prices (USD / M tokens)'], 'models')}
                            <div className="overflow-x-auto">
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
                                                <TableCell className="py-1 font-mono text-xs">
                                                    <span className="flex items-center gap-1">{m} <NoSheetTag path={`models/${m}/input`} /></span>
                                                </TableCell>
                                                {(['input', 'cached', 'output'] as const).map((f) => (
                                                    <TableCell key={f} className="py-1">
                                                        <span className="flex items-center gap-1">
                                                            <NumField value={draft.models[m]?.[f] ?? 0} onValue={set(['models', m, f])} ariaLabel={`${m} ${f}`} />
                                                            <FieldInfo doc={info(`models/${m}/${f}`)} label={`${m} ${f}`} />
                                                        </span>
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold">{tx('การเรียก AI 1 ครั้ง (token ประมาณ)', 'One AI call (estimated tokens)')}</h4>
                            <p className="text-xs text-slate-500">{tx('ช่อง "-" = ไม่ใช้กับงานนั้น (เครดิตคิดเฉพาะงานทนาย/ลูกค้า · mix คิดเฉพาะงานทนาย)', '"-" = not used for that task (credits only for lawyer/customer tasks · mix only for lawyer tasks)')}</p>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{tx('รายการ', 'Call')}</TableHead>
                                            {(['model', ...AI_FIELDS] as const).map((f) => (
                                                <TableHead key={f}>
                                                    <span className="flex items-center gap-1">
                                                        {tx(...AI_FIELD_LABELS[f])}
                                                        <FieldInfo doc={info(`aiCalls/lawAsk/${f}`)} label={AI_FIELD_LABELS[f][1]} />
                                                    </span>
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {AI_CALLS.map(([k, label]) => (
                                            <TableRow key={k}>
                                                <TableCell className="py-1 text-xs">{tx(...label)}</TableCell>
                                                <TableCell className="py-1">
                                                    <span className="flex items-center gap-1">
                                                        <select
                                                            aria-label={`${label[1]} model`}
                                                            className="h-8 rounded-md border bg-white px-1 text-xs"
                                                            value={draft.aiCalls[k].model}
                                                            onChange={(e) => setDraft((d) => setAt(d, ['aiCalls', k, 'model'], e.target.value))}
                                                        >
                                                            {Object.keys(draft.models).map((m) => <option key={m} value={m}>{m}</option>)}
                                                        </select>
                                                        <FieldInfo doc={info(`aiCalls/${k}/model`)} label={`${label[1]} model`} />
                                                    </span>
                                                </TableCell>
                                                {AI_FIELDS.map((f) => (
                                                    <TableCell key={f} className="py-1">
                                                        {aiCallFieldEditable(k, f) ? (
                                                            <span className="flex items-center gap-1">
                                                                <NumField className="w-20" value={draft.aiCalls[k][f]} onValue={set(['aiCalls', k, f])} ariaLabel={`${label[1]} ${f}`} />
                                                                <FieldInfo doc={info(`aiCalls/${k}/${f}`)} label={`${label[1]} ${f}`} />
                                                            </span>
                                                        ) : <span className="text-xs text-slate-400">-</span>}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
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
                summary={confirmOpen ? <AffectsSummary affects={diffAffects(saved, draft, run)} live={['estimate']} /> : null}
                warning={tx('ใช้คำนวณต้นทุน/กำไรในหน้านี้เท่านั้น ไม่เปลี่ยนราคาและไม่มีผลกับลูกค้า', 'Only used for the cost/margin estimates on this page. No prices change and no customer is affected.')}
                confirmLabel={tx('ฉันตรวจค่าที่แก้แล้ว', 'I have checked the edited values')}
            />
        </Collapsible>
    );
}
