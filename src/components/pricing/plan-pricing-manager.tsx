'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, FilePen, Loader2, Lock, RefreshCw, RotateCcw, Trash2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminLocale } from '@/lib/admin-i18n';
import { cn } from '@/lib/utils';
import {
    PRICING_CATALOG,
    PRICING_INTERVALS,
    type PricingDraft,
    type PricingInterval,
    type SaveResult,
    type StoredSaveResult,
} from '@/lib/plan-pricing-core';
import {
    SHEET_PLAN_PRICES, costTierFor, planEconomics, type CostAssumptions, type PlanPrices, type RunContext,
} from '@/lib/cost-model';
import {
    GENERAL_LABELS, PRICE_FIELD_DOCS, PRODUCT_DOCS, assumptionFieldDoc, priceFieldKey, type CostSection,
} from '@/lib/pricing-field-docs';
import {
    getPricingAction,
    clearStripePlanDraftAction,
    previewPriceChangeAction,
    savePricingAction,
    saveStripePlanDraftAction,
    saveStoredPlanPricingAction,
    type PricingOverview,
    type PricingPreview,
    type ProductPricingView,
} from '@/app/actions/plan-pricing-actions';
import { PlanEconomicsLine, baht } from './economics';
import { CreditPacksCard, EbookCard, InterpreterGpCard, NotLiveBadge } from './one-time-cards';
import { CostAssumptionsEditor } from './cost-assumptions-editor';
import { COST_SECTIONS, CostOverview } from './cost-overview';
import { AffectsSummary, FieldInfo, ProductAbout } from './field-info';
import { PricingGuide } from './pricing-guide';

/**
 * หน้า "ราคาแพ็กเกจ" (Super Admin) — ราคาทุกอย่างในหน้าเดียว + ต้นทุน/กำไรจากสมมติฐาน
 *
 * แท็บบนสุด: "ตั้งราคา" | "ต้นทุนระบบ" (?view=costs&section=...) — ตัวเลือกสถานการณ์, คู่มือ และ
 * กล่องสมมติฐานต้นทุนอยู่นอกแท็บ ใช้ร่วมกันทั้งสองแท็บ (state เดียว แก้แล้วเห็นผลทั้งคู่ทันที)
 *
 *  - แพ็กเกจรายเดือน: CapDeal, ทนาย (ผ่าน Stripe) · Wittaya, ลูกค้า AI Plus (บันทึกราคาไว้ก่อน)
 *  - จ่ายครั้งเดียว (Beam): แพ็กเครดิต AI, E-Book + ค่าส่ง
 *  - GP งานล่าม (มีผลทันที)
 *  - สมมติฐานต้นทุน (พับได้) — แก้แล้วตัวเลขกำไรข้างราคาเปลี่ยนทันที
 *
 * Stripe: แก้ราคา → "ตรวจการเปลี่ยนแปลง" (ดู diff + จำนวนผู้สมัครเดิม) → ติ๊กยืนยัน → บันทึก
 * บันทึกส่วน Stripe ถูกล็อกด้วย env PRICING_WRITE_ENABLED และต้องมี STRIPE_SECRET_KEY (ฝั่ง server ตัดสิน)
 * ระหว่างล็อก CapDeal/ทนาย บันทึกเป็น "ร่าง" ได้ (ฟิลด์ draft — เว็บไม่อ่าน ราคาบนเว็บยังเป็นราคาเดิม)
 * พอเปิดบันทึกผ่าน Stripe แล้ว ช่องราคาเติมจากร่าง กดบันทึกตามปกติ ร่างถูกล้างไปพร้อมกัน
 */

type DraftInputs = Record<string, Record<PricingInterval, string>>;

/** ราคาจริง (ที่เว็บใช้อยู่) เป็นค่าในช่อง */
function toInputs(view: ProductPricingView): DraftInputs {
    const out: DraftInputs = {};
    for (const [planId, e] of Object.entries(view.plans)) {
        out[planId] = { monthly: e.monthly?.toString() ?? '', yearly: e.yearly?.toString() ?? '' };
    }
    return out;
}

/** ค่าเริ่มในช่อง: มีร่างใช้ร่าง ไม่มีใช้ราคาจริง */
function loadedInputs(view: ProductPricingView): DraftInputs {
    const out = toInputs(view);
    if (!view.draft) return out;
    for (const planId of Object.keys(out)) {
        const d = view.draft.plans[planId];
        if (d) out[planId] = { monthly: d.monthly?.toString() ?? '', yearly: d.yearly?.toString() ?? '' };
    }
    return out;
}

/** ช่องว่าง = ไม่ขาย (null) · ค่าอื่นส่งเป็นตัวเลขให้ server ตรวจ (ไม่ผ่านจะได้ข้อความผิดพลาด) */
function toDraft(inputs: DraftInputs, baseUpdatedAt: string | null): PricingDraft {
    const plans: PricingDraft['plans'] = {};
    for (const [planId, row] of Object.entries(inputs)) {
        const parse = (s: string) => (s.trim() === '' ? null : Number(s.trim()));
        plans[planId] = { monthly: parse(row.monthly), yearly: parse(row.yearly) };
    }
    return { plans, baseUpdatedAt };
}

export type PricingView = 'prices' | 'costs';

/** ราคาต่อเดือนที่บันทึกแล้ว (ใช้คิดรายได้/ค่าธรรมเนียมในต้นทุนระบบ) · ยังไม่ขาย = 0 */
function runContextFrom(overview: PricingOverview): RunContext {
    const monthly = (product: string, plan: string, fallback: number) => {
        const v = overview.products.find((p) => p.product === product)?.plans[plan]?.monthly;
        return v === undefined ? fallback : v ?? 0;
    };
    const prices: PlanPrices = {
        lawPro: monthly('lawyer', 'pro', SHEET_PLAN_PRICES.lawPro),
        lawFirm: monthly('lawyer', 'top', SHEET_PLAN_PRICES.lawFirm),
        custPlus: monthly('lawslane', 'plus', SHEET_PLAN_PRICES.custPlus),
        cdLite: monthly('capdeal', 'lite', SHEET_PLAN_PRICES.cdLite),
        cdPro: monthly('capdeal', 'pro', SHEET_PLAN_PRICES.cdPro),
        cdScale: monthly('capdeal', 'scale', SHEET_PLAN_PRICES.cdScale),
        witPremium: monthly('wittaya', 'premium', SHEET_PLAN_PRICES.witPremium),
        witPro: monthly('wittaya', 'pro', SHEET_PLAN_PRICES.witPro),
    };
    return { prices, gpPercent: overview.gp.effective };
}

/** เก็บแท็บที่เปิดไว้ใน URL (ไม่โหลดหน้าใหม่) ให้รีเฟรชแล้วกลับมาที่เดิม */
function syncUrl(view: PricingView, section: CostSection) {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (view === 'costs') {
        url.searchParams.set('view', 'costs');
        if (section === 'overview') url.searchParams.delete('section');
        else url.searchParams.set('section', section);
    } else {
        url.searchParams.delete('view');
        url.searchParams.delete('section');
    }
    window.history.replaceState(window.history.state, '', url.toString());
}

export function PlanPricingManager({ initialView = 'prices', initialSection = 'overview' }: {
    initialView?: PricingView; initialSection?: CostSection;
}) {
    const { tx } = useAdminLocale();
    const [overview, setOverview] = useState<PricingOverview | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    // ร่างสมมติฐานต้นทุน — ตัวเลขกำไรทุกช่อง (ทั้งสองแท็บ) คำนวณจากร่างนี้ (ยังไม่บันทึกก็เห็นผล)
    const [model, setModel] = useState<CostAssumptions | null>(null);
    const [view, setView] = useState<PricingView>(initialView);
    const [section, setSection] = useState<CostSection>(COST_SECTIONS.includes(initialSection) ? initialSection : 'overview');

    const load = useCallback(async () => {
        setLoadError(null);
        const res = await getPricingAction();
        if (res.ok) setOverview(res.data);
        else setLoadError(res.error);
    }, []);

    useEffect(() => { void load(); }, [load]);
    const costVersion = overview ? `${overview.costModel.updatedAt}` : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { if (overview) setModel(overview.costModel.assumptions); }, [costVersion]);
    useEffect(() => { syncUrl(view, section); }, [view, section]);

    const setScenario = (v: string) => setModel((m) => (m ? { ...m, general: { ...m.general, marginScenario: Number(v) } } : m));
    const run = useMemo(() => (overview ? runContextFrom(overview) : null), [overview]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">{tx('ราคาแพ็กเกจ', 'Plan Pricing')}</h2>
                <p className="text-slate-500">
                    {tx(
                        'ตั้งราคาทุกแพ็กเกจ และดูต้นทุนระบบ/กำไรโดยประมาณจากสมมติฐาน ในหน้าเดียว (Super Admin เท่านั้น) · ราคาที่ขายผ่าน Stripe เปลี่ยนแล้วใช้กับคนที่สมัครใหม่เท่านั้น',
                        'Set every plan price and see estimated system costs and margins in one place (Super Admin only). Stripe price changes apply to new sign-ups only.',
                    )}
                </p>
            </div>

            {loadError && (
                <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>{tx('โหลดข้อมูลไม่สำเร็จ', 'Failed to load')}</AlertTitle>
                    <AlertDescription>{loadError}</AlertDescription>
                </Alert>
            )}

            {(!overview || !model) && !loadError && (
                <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> {tx('กำลังโหลด...', 'Loading...')}
                </div>
            )}

            {overview && model && run && (
                <>
                    <PricingGuide />

                    {/* หัวร่วม: แท็บบนสุด + ตัวเลือกสถานการณ์ (ใช้ทั้งสองแท็บ) */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div role="tablist" aria-label={tx('ส่วนของหน้า', 'Page section')} className="inline-flex rounded-lg border bg-slate-100 p-1">
                            {([['prices', ['ตั้งราคา', 'Set prices']], ['costs', ['ต้นทุนระบบ', 'System costs']]] as [PricingView, [string, string]][]).map(([v, l]) => (
                                <button
                                    key={v}
                                    type="button"
                                    role="tab"
                                    aria-selected={view === v}
                                    onClick={() => setView(v)}
                                    className={cn('rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
                                        view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}
                                >
                                    {tx(...l)}
                                </button>
                            ))}
                        </div>
                        <span className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                            {tx('สถานการณ์', 'Scenario')}
                            <FieldInfo doc={() => assumptionFieldDoc('general/marginScenario', model, run)} label={GENERAL_LABELS.marginScenario[1]} />
                            <Select value={String(model.general.marginScenario)} onValueChange={setScenario}>
                                <SelectTrigger className="h-8 w-36" aria-label={tx('สถานการณ์', 'Scenario')}><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">{tx('เริ่มต้น', 'Start')}</SelectItem>
                                    <SelectItem value="2">{tx('เติบโต', 'Growth')}</SelectItem>
                                    <SelectItem value="3">{tx('ขยาย', 'Scale')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </span>
                    </div>

                    {view === 'prices' ? (
                        <>
                            {!overview.writeEnabled && (
                                <Alert className="border-amber-300 bg-amber-50 text-amber-900">
                                    <Lock className="h-4 w-4" />
                                    <AlertTitle>{tx('ราคาที่ขายผ่าน Stripe: ดูได้อย่างเดียว', 'Stripe prices: view-only')}</AlertTitle>
                                    <AlertDescription>
                                        {overview.writeBlockedReason}
                                        <span className="block">{tx('ส่วนที่ไม่แตะ Stripe (Wittaya, AI Plus, จ่ายครั้งเดียว, GP ล่าม, สมมติฐาน) ยังบันทึกได้', 'Non-Stripe sections (Wittaya, AI Plus, one-time, interpreter GP, assumptions) can still be saved.')}</span>
                                        <span className="block">{tx('CapDeal/ทนาย บันทึกเป็นร่างได้ (ยังไม่ใช้จริง เว็บยังใช้ราคาเดิม)', 'CapDeal/Lawyer can be saved as a draft (not live; the site keeps the current price).')}</span>
                                    </AlertDescription>
                                </Alert>
                            )}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <Badge variant="outline" className="font-mono">collection: {overview.collection}</Badge>
                                <Badge variant="outline" className={overview.stripeMode === 'live' ? 'border-red-300 text-red-700' : ''}>
                                    Stripe: {overview.stripeMode}
                                </Badge>
                            </div>

                            <Tabs defaultValue="subscriptions">
                                <TabsList className="flex-wrap">
                                    <TabsTrigger value="subscriptions">{tx('แพ็กเกจรายเดือน', 'Subscriptions')}</TabsTrigger>
                                    <TabsTrigger value="one-time">{tx('จ่ายครั้งเดียว', 'One-time')}</TabsTrigger>
                                    <TabsTrigger value="interpreter">{tx('GP ล่าม', 'Interpreter GP')}</TabsTrigger>
                                </TabsList>
                                <TabsContent value="subscriptions" className="mt-4 space-y-6">
                                    {overview.products.map((pv) => (
                                        <ProductCard key={pv.product} view={pv} writeEnabled={overview.writeEnabled} model={model} onSaved={load} />
                                    ))}
                                </TabsContent>
                                <TabsContent value="one-time" className="mt-4 space-y-6">
                                    <CreditPacksCard packs={overview.aiCredits.packs} updatedAt={overview.aiCredits.updatedAt} model={model} onSaved={load} />
                                    <EbookCard value={overview.ebook.value} updatedAt={overview.ebook.updatedAt} model={model} onSaved={load} />
                                </TabsContent>
                                <TabsContent value="interpreter" className="mt-4 space-y-6">
                                    <InterpreterGpCard
                                        gpPercent={overview.gp.gpPercent} effective={overview.gp.effective} updatedAt={overview.gp.updatedAt}
                                        model={model} onSaved={load}
                                    />
                                </TabsContent>
                            </Tabs>
                        </>
                    ) : (
                        <CostOverview model={model} run={run} section={section} onSection={setSection} onGoToPrices={() => setView('prices')} />
                    )}

                    <CostAssumptionsEditor
                        draft={model}
                        setDraft={(fn) => setModel((m) => (m ? fn(m) : m))}
                        saved={overview.costModel.assumptions}
                        updatedAt={overview.costModel.updatedAt}
                        isDefault={overview.costModel.isDefault}
                        onSaved={load}
                        run={run}
                    />
                </>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------

function ProductCard({ view, writeEnabled, model, onSaved }: {
    view: ProductPricingView; writeEnabled: boolean; model: CostAssumptions; onSaved: () => Promise<void>;
}) {
    const stored = view.mode === 'stored';
    // บันทึกส่วนที่ไม่แตะ Stripe ได้เสมอ (ฝั่ง server ไม่ล็อกด้วย PRICING_WRITE_ENABLED)
    const canSave = stored || writeEnabled;
    // CapDeal/ทนาย ตอนบันทึกผ่าน Stripe ยังไม่ได้ → บันทึกเป็นร่างแทน (ไม่มีผลกับเว็บ)
    const draftMode = !stored && !writeEnabled;
    const hasDraft = !stored && !!view.draft;
    const [storedResult, setStoredResult] = useState<StoredSaveResult | null>(null);
    const [draftOpen, setDraftOpen] = useState(false);
    const [draftSaved, setDraftSaved] = useState<'saved' | 'cleared' | null>(null);
    const { tx, locale } = useAdminLocale();
    const catalog = PRICING_CATALOG[view.product];
    const [inputs, setInputs] = useState<DraftInputs>(() => loadedInputs(view));
    const [preview, setPreview] = useState<PricingPreview | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [busy, setBusy] = useState<'preview' | 'save' | 'draft' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const [result, setResult] = useState<SaveResult | null>(null);
    // ร่างที่ยืนยันแล้ว เก็บไว้ใช้กับปุ่ม "ลองใหม่"
    const [lastDraft, setLastDraft] = useState<PricingDraft | null>(null);

    // ข้อมูลจาก server เปลี่ยน (บันทึกสำเร็จ) → ล้างร่างกลับเป็นค่าที่บันทึกไว้
    // ใช้เนื้อหาเป็น key ไม่ใช่ object เพื่อไม่ให้การโหลดใหม่หลังบันทึกการ์ดอื่นล้างร่างของการ์ดนี้
    const viewKey = JSON.stringify(view.plans) + view.updatedAt + (view.draft?.updatedAt ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { setInputs(loadedInputs(view)); }, [viewKey]);

    // dirty = ต่างจากที่โหลดมา (ร่างหรือราคาจริง)
    const dirty = useMemo(() => JSON.stringify(inputs) !== JSON.stringify(loadedInputs(view)), [inputs, view]);

    const setCell = (planId: string, interval: PricingInterval, value: string) => {
        setInputs((prev) => ({ ...prev, [planId]: { ...prev[planId], [interval]: value.replace(/[^\d]/g, '') } }));
    };

    const openPreview = async () => {
        setError(null);
        setBusy('preview');
        const res = await previewPriceChangeAction(view.product, toDraft(inputs, view.updatedAt));
        setBusy(null);
        if (!res.ok) { setError(res.error); return; }
        setPreview(res.data);
        setConfirmed(false);
        setPreviewOpen(true);
    };

    const runSave = async (draft: PricingDraft) => {
        setBusy('save');
        setError(null);
        setLastDraft(draft);
        if (stored) {
            const r = await saveStoredPlanPricingAction(view.product, draft);
            setBusy(null);
            setPreviewOpen(false);
            if (!r.ok) { setError(r.error); return; }
            if (r.data.status === 'error') { setError(r.data.message); return; }
            setStoredResult(r.data);
            await onSaved();
            return;
        }
        const res = await savePricingAction(view.product, draft);
        setBusy(null);
        setPreviewOpen(false);
        if (!res.ok) { setError(res.error); return; }
        setResult(res.data);
        if (res.data.status !== 'error') await onSaved();
    };

    const saveDraft = async () => {
        setBusy('draft');
        setError(null);
        setDraftSaved(null);
        const r = await saveStripePlanDraftAction(
            view.product as 'capdeal' | 'lawyer', { plans: toDraft(inputs, null).plans }, view.draft?.updatedAt ?? null,
        );
        setBusy(null);
        setDraftOpen(false);
        if (!r.ok) { setError(r.error); return; }
        if (r.data.status === 'error') { setError(r.data.message); return; }
        setDraftSaved('saved');
        await onSaved();
    };

    const clearDraft = async () => {
        if (!view.draft) return;
        if (!window.confirm(tx('ล้างราคาร่าง? ช่องจะกลับเป็นราคาที่เว็บใช้อยู่ (ไม่มีผลกับเว็บ)', 'Clear the draft? Fields go back to the live prices (no effect on the site).'))) return;
        setBusy('draft');
        setError(null);
        setDraftSaved(null);
        const r = await clearStripePlanDraftAction(view.product as 'capdeal' | 'lawyer', view.draft.updatedAt);
        setBusy(null);
        if (!r.ok) { setError(r.error); return; }
        if (r.data.status === 'error') { setError(r.data.message); return; }
        setDraftSaved('cleared');
        await onSaved();
    };

    const retry = async () => {
        if (!lastDraft || !result) return;
        // หลังเขียน Firestore แล้วเวอร์ชันเอกสารเปลี่ยน — ใช้เวอร์ชันใหม่ ร่างเดิม (ไม่สร้าง Price ซ้ำ)
        const base = result.status === 'partial' ? result.updatedAt : lastDraft.baseUpdatedAt;
        await runSave({ ...lastDraft, baseUpdatedAt: base });
    };

    const countFor = (planId: string) => preview?.subscriberCounts.filter((c) => c.planId === planId) ?? [];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                    {tx(catalog.name[0], catalog.name[1])}
                    {view.isDefault && <Badge variant="secondary">{tx('ค่าเริ่มต้น (ยังไม่เคยบันทึก)', 'Defaults (never saved)')}</Badge>}
                    {stored ? <NotLiveBadge /> : <Badge variant="outline" className="font-normal">Stripe</Badge>}
                    {hasDraft && (
                        <Badge variant="outline" className="border-violet-300 bg-violet-50 font-normal text-violet-800">
                            {tx('ร่าง — ยังไม่ใช้จริง', 'Draft — not live')}
                        </Badge>
                    )}
                </CardTitle>
                <CardDescription>
                    {tx('ช่องว่าง = ไม่ขาย · จำนวนเต็มบาท 1–1,000,000 · ตัวเลขใต้ช่องคือต่อบัญชีต่อเดือน: ค่าธรรมเนียม Stripe (บัตรในประเทศ + Billing รวม VAT) ต้นทุน AI ค่าส่วนกลาง กำไร',
                        'Blank = not sold · whole baht 1–1,000,000 · figures below each field are per account per month: Stripe fee (domestic card + Billing incl. VAT), AI cost, infra share, profit')}
                    {stored && (
                        <span className="block text-xs text-amber-700">
                            {tx('บันทึกลง Firestore เท่านั้น ไม่สร้างของใน Stripe (เปิดขายในเฟส 4)', 'Stored in Firestore only; no Stripe objects yet (phase 4)')}
                        </span>
                    )}
                    {view.updatedAt && (
                        <span className="block text-xs">
                            {tx('แก้ล่าสุด', 'Last updated')}: {new Date(view.updatedAt).toLocaleString(locale === 'th' ? 'th-TH' : 'en-GB')}
                        </span>
                    )}
                    {draftMode && (
                        <span className="block text-xs text-violet-700">
                            {tx('ยังบันทึกผ่าน Stripe ไม่ได้ — บันทึกเป็นร่างไว้ก่อนได้ เว็บยังแสดงและเก็บเงินราคาเดิมจนกว่าจะตั้ง Stripe แล้วบันทึกจริง',
                                'Stripe saving is locked — you can save a draft. The site keeps showing and charging the current price until Stripe is set up and you save for real.')}
                        </span>
                    )}
                    {hasDraft && view.draft && (
                        <span className="block text-xs text-violet-700">
                            {writeEnabled
                                ? tx('มีราคาร่างค้างอยู่ — ช่องราคาเติมจากร่างแล้ว ตรวจแล้วบันทึกตามปกติ ร่างจะถูกล้างเมื่อบันทึกสำเร็จ',
                                    'A draft is pending — fields are prefilled from it. Review and save as usual; the draft is cleared on success.')
                                : tx('ช่องราคาแสดงร่าง', 'Fields show the draft')}
                            {' · '}{tx('ร่างแก้ล่าสุด', 'Draft updated')}: {new Date(view.draft.updatedAt).toLocaleString(locale === 'th' ? 'th-TH' : 'en-GB')}
                        </span>
                    )}
                </CardDescription>
                <ProductAbout docs={catalog.plans.map((p) => PRODUCT_DOCS[`${view.product}.${p.id}`]).filter(Boolean)} />
            </CardHeader>
            <CardContent className="space-y-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-32">{tx('แพ็กเกจ', 'Plan')}</TableHead>
                            <TableHead>{tx('รายเดือน (บาท)', 'Monthly (THB)')}</TableHead>
                            <TableHead>{tx('รายปี (บาท)', 'Yearly (THB)')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {catalog.plans.map((plan) => {
                            const stripe = view.plans[plan.id]?.stripe;
                            return (
                                <TableRow key={plan.id}>
                                    <TableCell className="align-top font-medium">
                                        <span className="flex items-center gap-1">
                                            {plan.name}
                                            <FieldInfo doc={PRICE_FIELD_DOCS[priceFieldKey(view.product, plan.id)] ?? null} label={plan.name} />
                                        </span>
                                        <div className="font-mono text-[10px] text-slate-400">{plan.id}</div>
                                    </TableCell>
                                    {PRICING_INTERVALS.map((interval) => {
                                        const raw = inputs[plan.id]?.[interval] ?? '';
                                        const amount = raw === '' ? null : Number(raw);
                                        const tier = costTierFor(view.product, plan.id);
                                        const econ = tier ? planEconomics(model, tier, amount, interval) : null;
                                        const priceId = interval === 'monthly' ? stripe?.monthlyPriceId : stripe?.yearlyPriceId;
                                        const live = view.plans[plan.id]?.[interval] ?? null;
                                        return (
                                            <TableCell key={interval} className="align-top">
                                                <Input
                                                    inputMode="numeric"
                                                    value={raw}
                                                    placeholder={tx('ไม่ขาย', 'Not sold')}
                                                    onChange={(e) => setCell(plan.id, interval, e.target.value)}
                                                    className="w-36"
                                                    aria-label={`${plan.name} ${interval}`}
                                                />
                                                {(hasDraft || draftMode) && (
                                                    <div className="mt-0.5 text-[11px] text-slate-500">
                                                        {tx('บนเว็บตอนนี้', 'Live now')}: {live === null ? tx('ไม่ขาย', 'Not sold') : baht(live)}
                                                    </div>
                                                )}
                                                {econ && (amount !== null || interval === 'monthly') && (
                                                    <PlanEconomicsLine e={econ} price={amount} interval={interval} />
                                                )}
                                                {!stored && (
                                                    <div className="mt-0.5 break-all font-mono text-[10px] text-slate-400">
                                                        {priceId ?? tx('Price: ใช้ค่าใน env ของเว็บ', 'Price: from site env')}
                                                    </div>
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>

                {error && (
                    <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                            {error}
                            {error.includes('โหลดใหม่') && (
                                <Button variant="link" className="h-auto p-0 pl-2" onClick={() => { setError(null); void onSaved(); }}>
                                    {tx('โหลดใหม่', 'Reload')}
                                </Button>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex flex-wrap gap-2">
                    {draftMode ? (
                        <span className="flex items-center gap-1">
                        <Button onClick={() => { setError(null); setDraftOpen(true); }} disabled={!dirty || busy !== null}>
                            {busy === 'draft' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePen className="mr-2 h-4 w-4" />}
                            {tx('บันทึกเป็นร่าง (ยังไม่ใช้จริง)', 'Save as draft (not live)')}
                        </Button>
                        <FieldInfo doc={PRICE_FIELD_DOCS[`draft.${view.product}`] ?? null} label="Draft" />
                        </span>
                    ) : (
                        // มีร่างค้าง: ช่องเติมจากร่างแล้ว จึงตรวจ/บันทึกได้โดยไม่ต้องพิมพ์เพิ่ม
                        <Button onClick={openPreview} disabled={!(dirty || hasDraft) || busy !== null}>
                            {busy === 'preview' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                            {tx('ตรวจการเปลี่ยนแปลง', 'Preview changes')}
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => setInputs(loadedInputs(view))} disabled={!dirty || busy !== null}>
                        <RotateCcw className="mr-2 h-4 w-4" /> {tx('คืนค่า', 'Reset')}
                    </Button>
                    {hasDraft && (
                        <Button variant="ghost" size="sm" className="self-center text-slate-500" onClick={clearDraft} disabled={busy !== null}>
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> {tx('ล้างร่าง', 'Clear draft')}
                        </Button>
                    )}
                </div>
                {draftSaved && (
                    <p className="text-sm text-violet-700">
                        {draftSaved === 'saved'
                            ? tx('บันทึกร่างแล้ว — ยังไม่ใช้จริง เว็บยังใช้ราคาเดิม', 'Draft saved — not live; the site keeps the current price')
                            : tx('ล้างร่างแล้ว', 'Draft cleared')}
                    </p>
                )}

                {result && <ResultPanel result={result} busy={busy === 'save'} onRetry={retry} onReload={onSaved} />}
                {storedResult?.status === 'ok' && <p className="text-sm text-emerald-700">{tx('บันทึกแล้ว (Firestore)', 'Saved (Firestore)')}</p>}
            </CardContent>

            <Dialog open={previewOpen} onOpenChange={(o) => busy !== 'save' && setPreviewOpen(o)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{tx(`ยืนยันเปลี่ยนราคา ${catalog.name[0]}`, `Confirm ${catalog.name[1]} price change`)}</DialogTitle>
                        <DialogDescription>
                            {stored
                                ? tx('ตรวจรายการด้านล่างก่อนบันทึก บันทึกลง Firestore เท่านั้น', 'Review before saving. Stored in Firestore only.')
                                : tx('ตรวจรายการด้านล่างก่อนบันทึก ราคาใหม่จะสร้างเป็น Price ใหม่ใน Stripe', 'Review before saving. New amounts become new Stripe Prices.')}
                        </DialogDescription>
                    </DialogHeader>
                    {preview && (
                        <div className="space-y-4 text-sm">
                            {preview.stale && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>{tx('มีคนแก้ราคาไปแล้วหลังคุณเปิดหน้านี้ โหลดใหม่ก่อนบันทึก', 'Someone changed prices since you opened this page. Reload first.')}</AlertDescription>
                                </Alert>
                            )}
                            {preview.changes.length === 0 ? (
                                <p className="text-slate-500">{tx('ไม่มีราคาที่เปลี่ยน', 'No price changes')}</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{tx('แพ็กเกจ', 'Plan')}</TableHead>
                                            <TableHead>{tx('รอบ', 'Interval')}</TableHead>
                                            <TableHead>{tx('เดิม → ใหม่', 'Old → New')}</TableHead>
                                            <TableHead>{tx('ใน Stripe', 'In Stripe')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {preview.changes.map((c) => (
                                            <TableRow key={`${c.planId}-${c.interval}`}>
                                                <TableCell>{catalog.plans.find((p) => p.id === c.planId)?.name ?? c.planId}</TableCell>
                                                <TableCell>{c.interval === 'monthly' ? tx('รายเดือน', 'Monthly') : tx('รายปี', 'Yearly')}</TableCell>
                                                <TableCell>
                                                    {c.from === null ? tx('ไม่ขาย', 'Not sold') : baht(c.from)} → <strong>{c.to === null ? tx('ไม่ขาย', 'Not sold') : baht(c.to)}</strong>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {stored ? tx('บันทึกไว้ก่อน', 'Stored only') : c.createsPrice ? tx('สร้าง Price ใหม่', 'Create new Price') : tx('หยุดขาย', 'Stop selling')}
                                                    {c.currentPriceId && (
                                                        <div className="font-mono text-[10px] text-slate-400">{tx('ปิดขาย', 'Archive')} {c.currentPriceId}</div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}

                            {!stored && <div className="rounded-lg border bg-slate-50 p-3">
                                <div className="mb-1 font-medium">{tx('ผู้สมัครเดิมบนราคาปัจจุบัน (active + trialing)', 'Existing subscribers on current prices (active + trialing)')}</div>
                                {preview.subscriberCounts.length === 0 && !preview.countNote && <div className="text-slate-500">-</div>}
                                {[...new Set(preview.changes.map((c) => c.planId))].map((planId) => {
                                    const rows = countFor(planId);
                                    if (rows.length === 0) return null;
                                    return (
                                        <div key={planId}>
                                            {catalog.plans.find((p) => p.id === planId)?.name ?? planId}:{' '}
                                            {rows.map((r) => `${r.interval === 'monthly' ? tx('รายเดือน', 'monthly') : tx('รายปี', 'yearly')} ${r.count === null ? '?' : r.capped ? '100+' : r.count}`).join(' · ')}
                                        </div>
                                    );
                                })}
                                {preview.countNote && <div className="text-xs text-slate-500">{preview.countNote}</div>}
                            </div>}

                            {preview.changes.length > 0 && (() => {
                                const docs = [...new Set(preview.changes.map((c) => c.planId))]
                                    .map((planId) => PRICE_FIELD_DOCS[priceFieldKey(view.product, planId)]).filter(Boolean);
                                return <AffectsSummary affects={docs[0]?.affects ?? []} live={docs.map((d) => d.live)} liveDetails={docs.map((d) => d.liveDetail)} />;
                            })()}
                            <Alert className="border-amber-300 bg-amber-50 text-amber-900">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    {stored ? tx(
                                        'ยังไม่เปิดขายบนเว็บ บันทึกราคาไว้ก่อน ไม่มีผลกับลูกค้าตอนนี้ จะใช้เมื่อเปิดขายผ่าน Stripe (เฟส 4)',
                                        'Not on sale yet; the price is only stored and affects no customer now. Used once sales open via Stripe (phase 4).',
                                    ) : tx(
                                        'ผู้สมัครเดิมจ่ายราคาเดิมต่อไป (ระบบไม่ย้ายและไม่ส่งอีเมล) ราคาใหม่มีผลกับคนที่สมัครใหม่เท่านั้น Price เดิมจะถูกปิดขายแต่ยังเรียกเก็บผู้สมัครเดิมได้ตามปกติ',
                                        'Existing subscribers keep their old price (no migration, no emails). Only new sign-ups get the new price. Old Prices are archived but keep billing existing subscribers.',
                                    )}
                                </AlertDescription>
                            </Alert>

                            {!canSave ? (
                                <p className="flex items-center gap-2 text-amber-700"><Lock className="h-4 w-4" /> {tx('โหมดดูอย่างเดียว บันทึกไม่ได้', 'View-only, saving is locked')}</p>
                            ) : (
                                <div className="flex items-start gap-2">
                                    <Checkbox id={`confirm-${view.product}`} checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />
                                    <Label htmlFor={`confirm-${view.product}`} className="text-sm font-normal leading-snug">
                                        {stored
                                            ? tx('ฉันตรวจราคาแล้ว', 'I have checked the prices')
                                            : tx('ฉันตรวจราคาแล้ว และเข้าใจว่าผู้สมัครเดิมยังจ่ายราคาเดิม ราคาใหม่ใช้กับคนสมัครใหม่เท่านั้น',
                                                'I have checked the prices and understand existing subscribers keep their old price; only new sign-ups get the new price.')}
                                    </Label>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPreviewOpen(false)} disabled={busy === 'save'}>{tx('ยกเลิก', 'Cancel')}</Button>
                        <Button
                            onClick={() => runSave(toDraft(inputs, view.updatedAt))}
                            disabled={!canSave || !confirmed || !preview || (preview.changes.length === 0 && !hasDraft) || preview.stale || busy !== null}
                        >
                            {busy === 'save' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {tx('บันทึกราคา', 'Save prices')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {draftMode && (
                <Dialog open={draftOpen} onOpenChange={(o) => busy !== 'draft' && setDraftOpen(o)}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{tx(`บันทึกราคาร่าง ${catalog.name[0]}`, `Save ${catalog.name[1]} price draft`)}</DialogTitle>
                            <DialogDescription>
                                {tx('ร่างนี้ยังไม่ใช้จริง: เว็บยังแสดงและเก็บเงินราคาปัจจุบันต่อไปจนกว่าจะตั้ง Stripe เสร็จ แล้วกดบันทึกราคาจริงจากหน้านี้ ไม่มีการสร้างอะไรใน Stripe และลูกค้าไม่เห็นร่าง',
                                    'This draft is not live: the site keeps showing and charging the current price until Stripe is set up and you save the real price from this page. Nothing is created in Stripe and customers never see the draft.')}
                            </DialogDescription>
                        </DialogHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{tx('แพ็กเกจ', 'Plan')}</TableHead>
                                    <TableHead>{tx('บนเว็บตอนนี้', 'Live now')}</TableHead>
                                    <TableHead>{tx('ร่าง', 'Draft')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {catalog.plans.flatMap((plan) => PRICING_INTERVALS.map((interval) => {
                                    const live = view.plans[plan.id]?.[interval] ?? null;
                                    const raw = inputs[plan.id]?.[interval] ?? '';
                                    const fmt = (v: number | null) => (v === null ? tx('ไม่ขาย', 'Not sold') : baht(v));
                                    return (
                                        <TableRow key={`${plan.id}-${interval}`}>
                                            <TableCell>{plan.name} · {interval === 'monthly' ? tx('รายเดือน', 'Monthly') : tx('รายปี', 'Yearly')}</TableCell>
                                            <TableCell>{fmt(live)}</TableCell>
                                            <TableCell className={String(live ?? '') !== raw ? 'font-semibold' : ''}>{fmt(raw === '' ? null : Number(raw))}</TableCell>
                                        </TableRow>
                                    );
                                }))}
                            </TableBody>
                        </Table>
                        {PRICE_FIELD_DOCS[`draft.${view.product}`] && (
                            <AffectsSummary
                                affects={PRICE_FIELD_DOCS[`draft.${view.product}`].affects}
                                live={['stored']}
                                liveDetails={[PRICE_FIELD_DOCS[`draft.${view.product}`].liveDetail]}
                            />
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDraftOpen(false)} disabled={busy === 'draft'}>{tx('ยกเลิก', 'Cancel')}</Button>
                            <Button onClick={saveDraft} disabled={busy !== null}>
                                {busy === 'draft' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {tx('บันทึกเป็นร่าง (ยังไม่ใช้จริง)', 'Save as draft (not live)')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </Card>
    );
}

// ---------------------------------------------------------------------------

function ResultPanel({ result, busy, onRetry, onReload }: {
    result: SaveResult; busy: boolean; onRetry: () => void; onReload: () => Promise<void>;
}) {
    const { tx } = useAdminLocale();
    if (result.status === 'ok') {
        return (
            <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>{tx('บันทึกแล้ว', 'Saved')}</AlertTitle>
                <AlertDescription className="space-y-1 text-xs">
                    <div>{tx('Price ใหม่', 'New prices')}: <span className="font-mono">{result.createdPriceIds.join(', ') || '-'}</span></div>
                    <div>{tx('ปิดขาย', 'Archived')}: <span className="font-mono">{result.archivedPriceIds.join(', ') || '-'}</span></div>
                    <div>Billing Portal: <span className="font-mono">{result.portalConfigId ?? '-'}</span></div>
                </AlertDescription>
            </Alert>
        );
    }
    const conflict = result.status === 'error' && result.step === 'conflict';
    return (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
                {result.status === 'partial'
                    ? tx('บันทึกราคาแล้ว แต่บางขั้นยังไม่เสร็จ', 'Prices saved, but some steps did not finish')
                    : tx('บันทึกไม่สำเร็จ', 'Save failed')}
            </AlertTitle>
            <AlertDescription className="space-y-2">
                {result.status === 'error'
                    ? <div className="text-xs">{result.message}</div>
                    : result.failed.map((f, i) => <div key={i} className="text-xs">{f.message}</div>)}
                {result.createdPriceIds.length > 0 && (
                    <div className="font-mono text-[10px]">Price: {result.createdPriceIds.join(', ')}</div>
                )}
                {conflict ? (
                    <Button size="sm" variant="outline" onClick={() => void onReload()}>
                        <RefreshCw className="mr-2 h-3 w-3" /> {tx('โหลดใหม่', 'Reload')}
                    </Button>
                ) : (
                    <Button size="sm" variant="outline" onClick={onRetry} disabled={busy}>
                        {busy ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
                        {tx('ลองใหม่', 'Retry')}
                    </Button>
                )}
            </AlertDescription>
        </Alert>
    );
}
