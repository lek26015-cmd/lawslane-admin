'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminLocale } from '@/lib/admin-i18n';
import {
    creditPackEconomics, interpreterEconomics, oneTimeEconomics, unitCosts, type CostAssumptions,
} from '@/lib/cost-model';
import type { CreditPack, EbookPricing, StoredSaveResult } from '@/lib/plan-pricing-core';
import { saveCreditPacksAction, saveEbookAction, setInterpreterGpAction } from '@/app/actions/plan-pricing-actions';
import { ConfirmSaveDialog } from './confirm-save-dialog';
import { OneTimeLine, baht, bahtR, pct } from './economics';
import { AffectsSummary, FieldInfo, ProductAbout } from './field-info';
import { useSheetNotice } from './cost-sheet-sync';
import { PRICE_FIELD_DOCS, PRODUCT_DOCS } from '@/lib/pricing-field-docs';

/**
 * การ์ดส่วนที่ไม่แตะ Stripe: แพ็กเครดิต AI, E-Book + ค่าส่ง (จ่ายครั้งเดียวผ่าน Beam) และ GP ล่าม
 * บันทึกได้แม้ยังไม่เปิด PRICING_WRITE_ENABLED (ไม่สร้างอะไรใน Stripe) — ฝั่ง server ยังเช็ค Super Admin + log
 */

const digits = (s: string) => s.replace(/[^\d]/g, '');

export function NotLiveBadge() {
    const { tx } = useAdminLocale();
    return (
        <Badge variant="outline" className="border-amber-300 bg-amber-50 font-normal text-amber-800">
            {tx('ยังไม่เปิดขายบนเว็บ — บันทึกราคาไว้ก่อน', 'Not on sale yet — price stored only')}
        </Badge>
    );
}

function StoredResultAlert({ r, onReload }: { r: StoredSaveResult | string | null; onReload: () => void }) {
    const { tx } = useAdminLocale();
    if (!r) return null;
    if (typeof r === 'string' || r.status === 'error') {
        const msg = typeof r === 'string' ? r : r.message;
        const conflict = typeof r !== 'string' && r.step === 'conflict';
        return (
            <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                    {msg}
                    {conflict && <Button variant="link" className="h-auto p-0 pl-2" onClick={onReload}>{tx('โหลดใหม่', 'Reload')}</Button>}
                </AlertDescription>
            </Alert>
        );
    }
    return <p className="text-sm text-emerald-700">{tx('บันทึกแล้ว', 'Saved')}</p>;
}

// ---------------------------------------------------------------------------

type PackRow = { id: string; credits: string; price: string };

const toRows = (packs: Record<string, CreditPack>): PackRow[] =>
    Object.entries(packs).map(([id, p]) => ({ id, credits: String(p.credits), price: String(p.price) }));

export function CreditPacksCard({ packs, updatedAt, model, onSaved }: {
    packs: Record<string, CreditPack>; updatedAt: string | null; model: CostAssumptions; onSaved: () => Promise<void>;
}) {
    const { tx } = useAdminLocale();
    const [rows, setRows] = useState<PackRow[]>(() => toRows(packs));
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<StoredSaveResult | string | null>(null);
    const serverKey = JSON.stringify(packs) + updatedAt;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { setRows(toRows(packs)); }, [serverKey]);

    const dirty = JSON.stringify(rows) !== JSON.stringify(toRows(packs));
    const creditCost = unitCosts(model).lawCreditMax;

    const changes = useMemo(() => {
        const out: string[] = [];
        const next = new Map(rows.map((r) => [r.id, r]));
        for (const [id, p] of Object.entries(packs)) {
            const n = next.get(id);
            if (!n) out.push(tx(`ลบแพ็ก ${id}`, `Remove pack ${id}`));
            else if (n.credits !== String(p.credits) || n.price !== String(p.price)) {
                out.push(`${id}: ${p.credits} ${tx('เครดิต', 'credits')} ${baht(p.price)} → ${n.credits} ${tx('เครดิต', 'credits')} ${baht(Number(n.price || 0))}`);
            }
        }
        for (const r of rows) if (!(r.id in packs)) out.push(tx(`เพิ่มแพ็ก ${r.id}: ${r.credits} เครดิต ${baht(Number(r.price || 0))}`, `Add pack ${r.id}: ${r.credits} credits ${baht(Number(r.price || 0))}`));
        return out;
    }, [rows, packs, tx]);

    const save = async () => {
        setBusy(true);
        const draft = {
            packs: Object.fromEntries(rows.map((r) => [r.id.trim(), { credits: Number(r.credits), price: Number(r.price) }])),
            baseUpdatedAt: updatedAt,
        };
        const res = await saveCreditPacksAction(draft);
        setBusy(false);
        setOpen(false);
        setResult(res.ok ? res.data : res.error);
        if (res.ok && res.data.status === 'ok') await onSaved();
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                    {tx('แพ็กเครดิต AI', 'AI credit packs')} <FieldInfo doc={PRICE_FIELD_DOCS.creditPacks} label="AI credit packs" /> <NotLiveBadge />
                </CardTitle>
                <CardDescription>
                    {tx(`จ่ายครั้งเดียวผ่าน Beam · ต้นทุนคิดจากเครดิตทนายที่แพงสุด (${bahtR(creditCost)}/เครดิต) · ยังไม่มีแพ็กเริ่มต้น`,
                        `One-time via Beam · cost uses the most expensive lawyer credit (${bahtR(creditCost)}/credit) · no packs by default`)}
                </CardDescription>
                <ProductAbout doc={PRODUCT_DOCS.aiCredits} />
            </CardHeader>
            <CardContent className="space-y-3">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{tx('รหัสแพ็ก', 'Pack ID')}</TableHead>
                            <TableHead>{tx('เครดิต', 'Credits')}</TableHead>
                            <TableHead>{tx('ราคา (บาท)', 'Price (THB)')}</TableHead>
                            <TableHead className="w-10" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 && (
                            <TableRow><TableCell colSpan={4} className="text-slate-500">{tx('ยังไม่มีแพ็ก', 'No packs yet')}</TableCell></TableRow>
                        )}
                        {rows.map((r, i) => {
                            const credits = Number(r.credits || 0);
                            const price = Number(r.price || 0);
                            return (
                                <TableRow key={i}>
                                    <TableCell className="align-top">
                                        <Input value={r.id} className="w-32 font-mono" placeholder="pack_100"
                                            onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, id: e.target.value.toLowerCase() } : x)))} />
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <Input inputMode="numeric" value={r.credits} className="w-28"
                                            onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, credits: digits(e.target.value) } : x)))} />
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <Input inputMode="numeric" value={r.price} className="w-32"
                                            onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, price: digits(e.target.value) } : x)))} />
                                        <OneTimeLine e={creditPackEconomics(model, credits, price)} price={price || null} />
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <Button variant="ghost" size="icon" aria-label={tx('ลบแพ็ก', 'Remove pack')} onClick={() => setRows((p) => p.filter((_, j) => j !== i))}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setRows((p) => [...p, { id: `pack_${p.length + 1}`, credits: '', price: '' }])}>
                        <Plus className="mr-2 h-4 w-4" /> {tx('เพิ่มแพ็ก', 'Add pack')}
                    </Button>
                    <Button onClick={() => { setResult(null); setOpen(true); }} disabled={!dirty}>
                        <Save className="mr-2 h-4 w-4" /> {tx('ตรวจและบันทึก', 'Review & save')}
                    </Button>
                </div>
                <StoredResultAlert r={result} onReload={() => void onSaved()} />
            </CardContent>
            <ConfirmSaveDialog
                open={open} onOpenChange={setOpen} busy={busy} onConfirm={save}
                title={tx('ยืนยันแก้แพ็กเครดิต AI', 'Confirm AI credit packs')}
                changes={changes}
                summary={<AffectsSummary affects={PRICE_FIELD_DOCS.creditPacks.affects} live={[PRICE_FIELD_DOCS.creditPacks.live]} liveDetails={[PRICE_FIELD_DOCS.creditPacks.liveDetail]} />}
                warning={tx('บันทึกลง Firestore เท่านั้น เว็บยังไม่อ่านค่านี้ (ยังไม่เปิดขาย) ไม่มีผลกับลูกค้าตอนนี้',
                    'Stored in Firestore only. Sites do not read it yet (not on sale), so no customer is affected now.')}
                confirmLabel={tx('ฉันตรวจจำนวนเครดิตและราคาแล้ว', 'I have checked credits and prices')}
            />
        </Card>
    );
}

// ---------------------------------------------------------------------------

const ebookDoc = (k: string) => (k === 'standardPrice' ? PRICE_FIELD_DOCS['ebook.standardPrice'] : PRICE_FIELD_DOCS['ebook.shipping']);

type EbookInputs = { standardPrice: string; baseFee: string; perExtraItem: string; freeOver: string };
const toEbookInputs = (v: EbookPricing): EbookInputs => ({
    standardPrice: String(v.standardPrice),
    baseFee: String(v.shipping.baseFee),
    perExtraItem: String(v.shipping.perExtraItem),
    freeOver: String(v.shipping.freeOver),
});

export function EbookCard({ value, updatedAt, model, onSaved }: {
    value: EbookPricing; updatedAt: string | null; model: CostAssumptions; onSaved: () => Promise<void>;
}) {
    const { tx } = useAdminLocale();
    const [inp, setInp] = useState<EbookInputs>(() => toEbookInputs(value));
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<StoredSaveResult | string | null>(null);
    const serverKey = JSON.stringify(value) + updatedAt;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { setInp(toEbookInputs(value)); }, [serverKey]);
    const base = toEbookInputs(value);
    const dirty = JSON.stringify(inp) !== JSON.stringify(base);

    const labels: Record<keyof EbookInputs, [string, string]> = {
        standardPrice: ['ราคา E-Book มาตรฐาน', 'Standard E-Book price'],
        baseFee: ['ค่าส่งหนังสือเล่มแรก', 'Shipping: first item'],
        perExtraItem: ['ค่าส่งเล่มถัดไป (ต่อเล่ม)', 'Shipping: each extra item'],
        freeOver: ['ส่งฟรีเมื่อยอดถึง', 'Free shipping over'],
    };
    const changedKeys = (Object.keys(labels) as (keyof EbookInputs)[]).filter((k) => inp[k] !== base[k]);
    const changedDocs = [...new Set(changedKeys.map(ebookDoc))];
    const changes = changedKeys
        .map((k) => `${tx(...labels[k])}: ${baht(Number(base[k] || 0))} → ${baht(Number(inp[k] || 0))}`);

    const save = async () => {
        setBusy(true);
        const res = await saveEbookAction({
            standardPrice: Number(inp.standardPrice),
            shipping: { baseFee: Number(inp.baseFee || 0), perExtraItem: Number(inp.perExtraItem || 0), freeOver: Number(inp.freeOver || 0) },
            baseUpdatedAt: updatedAt,
        });
        setBusy(false);
        setOpen(false);
        setResult(res.ok ? res.data : res.error);
        if (res.ok && res.data.status === 'ok') await onSaved();
    };

    const price = Number(inp.standardPrice || 0);
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">{tx('E-Book และค่าส่งหนังสือ', 'E-Book & book shipping')} <NotLiveBadge /></CardTitle>
                <CardDescription>
                    {tx('จ่ายครั้งเดียวผ่าน Beam · ค่าส่ง 0 = ไม่เก็บ · ค่าส่งไม่ใช่รายได้ แต่ค่าธรรมเนียมคิดจากยอดรวมค่าส่งด้วย · Wittaya ยังใช้ราคาในโค้ด (฿199)',
                        'One-time via Beam · shipping 0 = not charged · shipping is not revenue but fees apply to the total · Wittaya still uses the hardcoded price (฿199)')}
                </CardDescription>
                <ProductAbout doc={PRODUCT_DOCS.ebook} />
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                    {(Object.keys(labels) as (keyof EbookInputs)[]).map((k) => (
                        <div key={k} className="space-y-1">
                            <div className="flex items-center gap-1">
                                <Label htmlFor={`ebook-${k}`}>{tx(...labels[k])} ({tx('บาท', 'THB')})</Label>
                                <FieldInfo doc={ebookDoc(k)} label={labels[k][1]} />
                            </div>
                            <Input id={`ebook-${k}`} inputMode="numeric" value={inp[k]} className="w-40"
                                onChange={(e) => setInp((p) => ({ ...p, [k]: digits(e.target.value) }))} />
                            {k === 'standardPrice' && <OneTimeLine e={oneTimeEconomics(model, price)} price={price || null} />}
                        </div>
                    ))}
                </div>
                <Button onClick={() => { setResult(null); setOpen(true); }} disabled={!dirty}>
                    <Save className="mr-2 h-4 w-4" /> {tx('ตรวจและบันทึก', 'Review & save')}
                </Button>
                <StoredResultAlert r={result} onReload={() => void onSaved()} />
            </CardContent>
            <ConfirmSaveDialog
                open={open} onOpenChange={setOpen} busy={busy} onConfirm={save}
                title={tx('ยืนยันแก้ราคา E-Book / ค่าส่ง', 'Confirm E-Book / shipping')}
                changes={changes}
                summary={<AffectsSummary affects={changedDocs.flatMap((d) => d.affects)} live={changedDocs.map((d) => d.live)} liveDetails={changedDocs.map((d) => d.liveDetail)} />}
                warning={tx('บันทึกลง Firestore เท่านั้น Wittaya ยังไม่อ่านค่านี้ ไม่มีผลกับลูกค้าตอนนี้',
                    'Stored in Firestore only. Wittaya does not read it yet, so no customer is affected now.')}
                confirmLabel={tx('ฉันตรวจราคาแล้ว', 'I have checked the prices')}
            />
        </Card>
    );
}

// ---------------------------------------------------------------------------

export function InterpreterGpCard({ gpPercent, effective, updatedAt, model, onSaved }: {
    gpPercent: number | null; effective: number; updatedAt: string | null; model: CostAssumptions; onSaved: () => Promise<void>;
}) {
    const { tx, locale } = useAdminLocale();
    const notifySheet = useSheetNotice();
    const [gp, setGp] = useState(String(effective));
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [ok, setOk] = useState(false);
    useEffect(() => { setGp(String(effective)); }, [effective, updatedAt]);

    const value = Number(gp);
    const valid = gp.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= 50;
    const e = interpreterEconomics(model, valid ? value : 0);

    const save = async () => {
        setBusy(true);
        const res = await setInterpreterGpAction(value);
        setBusy(false);
        setOpen(false);
        if (!res.ok) { setOk(false); setResult(res.error); return; }
        notifySheet(res.sheet);
        setOk(true);
        setResult(tx(`บันทึกแล้ว GP ${res.data.gpPercent}%`, `Saved: GP ${res.data.gpPercent}%`));
        await onSaved();
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                    {tx('GP งานล่าม', 'Interpreter GP')}
                    <FieldInfo doc={PRICE_FIELD_DOCS['interpreter.gpPercent']} label="Interpreter GP" />
                    <Badge className="bg-red-600 font-normal">{tx('มีผลทันที', 'Live immediately')}</Badge>
                </CardTitle>
                <CardDescription>
                    {tx('แพลตฟอร์มเก็บเงินลูกค้าผ่าน Beam แล้วหัก GP ก่อนโอนให้ล่าม · มีผลกับการจองใหม่ทันที งานที่จองแล้วใช้ GP ตอนจอง',
                        'The platform collects via Beam and keeps the GP before paying the interpreter · applies to new bookings immediately; existing bookings keep their GP')}
                    {gpPercent === null && <span className="block text-xs">{tx(`ยังไม่เคยตั้ง ระบบใช้ค่าเริ่มต้น ${effective}%`, `Never set; system default ${effective}%`)}</span>}
                    {updatedAt && <span className="block text-xs">{tx('แก้ล่าสุด', 'Last updated')}: {new Date(updatedAt).toLocaleString(locale === 'th' ? 'th-TH' : 'en-GB')}</span>}
                </CardDescription>
                <ProductAbout doc={PRODUCT_DOCS.interpreterGp} />
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-end gap-3">
                    <div className="space-y-1">
                        <Label htmlFor="gp-percent">GP (%)</Label>
                        <Input id="gp-percent" type="number" min={0} max={50} step={0.5} value={gp} className="w-28" onChange={(ev) => setGp(ev.target.value)} />
                    </div>
                    <Button onClick={() => { setResult(null); setOpen(true); }} disabled={!valid || value === effective}>
                        <Save className="mr-2 h-4 w-4" /> {tx('ตรวจและบันทึก', 'Review & save')}
                    </Button>
                </div>
                <div className="text-xs text-slate-500">
                    {tx(`งานเฉลี่ย ${baht(e.bookingValue)}: GP ${bahtR(e.gp)} − ค่าธรรมเนียม Beam บัตร premium ${bahtR(e.feeCard)} = `,
                        `Average job ${baht(e.bookingValue)}: GP ${bahtR(e.gp)} − Beam premium-card fee ${bahtR(e.feeCard)} = `)}
                    <span className={e.netCard < 0 ? 'font-semibold text-red-600' : 'text-emerald-700'}>{bahtR(e.netCard)} ({pct(e.netCardPctOfJob)} {tx('ของยอดงาน', 'of job')})</span>
                    {' · PromptPay '}{bahtR(e.netPromptpay)}
                </div>
                {result && <p className={ok ? 'text-sm text-emerald-700' : 'text-sm text-red-600'}>{result}</p>}
            </CardContent>
            <ConfirmSaveDialog
                open={open} onOpenChange={setOpen} busy={busy} onConfirm={save}
                title={tx('ยืนยันเปลี่ยน GP ล่าม', 'Confirm interpreter GP change')}
                changes={[`GP: ${effective}% → ${valid ? value : '-'}%`]}
                summary={<AffectsSummary affects={PRICE_FIELD_DOCS['interpreter.gpPercent'].affects} live={['live']} liveDetails={[PRICE_FIELD_DOCS['interpreter.gpPercent'].liveDetail]} />}
                warning={tx('มีผลทันทีกับการจองล่ามใหม่ทุกงานบนเว็บจริง (ระบบจองอ่านค่านี้ตรง) งานที่จองไปแล้วไม่เปลี่ยน',
                    'Takes effect immediately for every new interpreter booking on the live site. Existing bookings do not change.')}
                confirmLabel={tx('ฉันเข้าใจว่าค่านี้มีผลทันทีกับการจองใหม่', 'I understand this applies to new bookings immediately')}
            />
        </Card>
    );
}
