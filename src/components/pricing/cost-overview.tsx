'use client';

import { ArrowRight, ArrowDown, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAdminLocale } from '@/lib/admin-i18n';
import {
    RUN_SITE_LABELS,
    TIER_LABELS,
    aiCallCost,
    costTakeaways,
    freeTierCost,
    interpreterEconomics,
    marginTable,
    monthlyRun,
    scenarioIndex,
    siteSummary,
    unitCosts,
    usageVolumes,
    type CostAssumptions,
    type FreeTier,
    type RunContext,
    type RunSite,
    type UnitCosts,
    type UsageVolumes,
} from '@/lib/cost-model';
import {
    AI_CALL_LABELS,
    COST_SECTION_DOCS,
    FREE_TIER_LABELS,
    MODEL_INFO,
    SCENARIO_LABELS,
    SERVICE_PRICE_INFO,
    UNIT_LABELS,
    VOLUME_LABELS,
    aiCallFieldEditable,
    type CostSection,
    type Label,
} from '@/lib/pricing-field-docs';
import { bahtR, pct } from './economics';
import { FieldInfo } from './field-info';

/**
 * แท็บ "ต้นทุนระบบ" — เนื้อหาทั้งไฟล์ LAWSLANE-ต้นทุน-2026-10.xlsx ในรูปที่อ่านง่าย (อ่านอย่างเดียว)
 * ตัวเลขทั้งหมดมาจาก lib/cost-model.ts ด้วยสมมติฐานร่างปัจจุบัน (แก้ในกล่อง "สมมติฐานต้นทุน" แล้วเปลี่ยนทันที)
 */

export const COST_SECTIONS: CostSection[] = ['overview', 'sites', 'margins', 'run', 'volumes', 'units', 'vendors', 'notes'];

const num = (n: number, d = 2) => n.toLocaleString('th-TH', { maximumFractionDigits: d });
const usd = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

function SectionHeader({ section }: { section: CostSection }) {
    const { tx } = useAdminLocale();
    const d = COST_SECTION_DOCS[section];
    return (
        <CardHeader>
            <CardTitle className="flex items-center gap-1">
                {tx(...d.title)}
                <FieldInfo
                    label={d.title[1]}
                    doc={{
                        title: d.title, what: d.what, how: d.how, when: d.when, affects: d.affects, live: 'estimate',
                        liveDetail: ['ตัวเลขประมาณ ไม่มีผลกับเว็บหรือลูกค้า', 'Estimates only; no effect on sites or customers'],
                    }}
                />
            </CardTitle>
            <CardDescription>{tx(...d.intro)}</CardDescription>
        </CardHeader>
    );
}

/** หัวตาราง 3 สถานการณ์ (ไฮไลต์คอลัมน์ที่เลือก) */
function ScenarioHeads({ selected, prefix }: { selected: 0 | 1 | 2; prefix?: Label }) {
    const { tx } = useAdminLocale();
    return (
        <>
            {SCENARIO_LABELS.map((l, i) => (
                <TableHead key={i} className={cn('text-right', i === selected && 'bg-blue-50 text-blue-900')}>
                    {prefix ? `${tx(...prefix)}: ` : ''}{tx(...l)}
                </TableHead>
            ))}
        </>
    );
}

function Cells({ values, selected, fmt = bahtR, className }: { values: readonly number[]; selected: 0 | 1 | 2; fmt?: (n: number) => string; className?: string }) {
    return (
        <>
            {values.map((v, i) => (
                <TableCell key={i} className={cn('whitespace-nowrap text-right tabular-nums', i === selected && 'bg-blue-50/60', v < 0 && 'text-red-600', className)}>
                    {fmt(v)}
                </TableCell>
            ))}
        </>
    );
}

export function CostOverview({ model, run, section, onSection, onGoToPrices }: {
    model: CostAssumptions;
    run: RunContext;
    section: CostSection;
    onSection: (s: CostSection) => void;
    onGoToPrices: () => void;
}) {
    const { tx } = useAdminLocale();
    const sel = scenarioIndex(model.general.marginScenario);
    const m = monthlyRun(model, run);
    const s = siteSummary(model, run, m);
    const u = unitCosts(model);
    const vols = ([0, 1, 2] as const).map((i) => usageVolumes(model, i, u));
    const t = costTakeaways(model, run);
    const interp = m.rows.find((r) => r.key === 'interpreterFees');
    const diffNote = (
        <p className="text-xs text-slate-500">
            {tx(`ต่างจากไฟล์ Excel: ค่าธรรมเนียม Stripe รวม VAT ${pct(model.general.vatOnFees)} และงานล่ามคิดค่าธรรมเนียม Beam (บัตร premium) แทน Stripe + Connect + ฿10 — ตั้ง VAT = 0 ตัวเลขจะตรงไฟล์ ยกเว้นแถวงานล่าม`,
                `Differs from the Excel file: Stripe fees include ${pct(model.general.vatOnFees)} VAT and interpreter jobs use the Beam premium-card fee instead of Stripe + Connect + ฿10 — with VAT = 0 the figures match the file except the interpreter row`)}
        </p>
    );

    return (
        <Tabs value={section} onValueChange={(v) => onSection(v as CostSection)}>
            <div className="overflow-x-auto pb-1">
                <TabsList className="inline-flex w-max">
                    {COST_SECTIONS.map((k) => <TabsTrigger key={k} value={k}>{tx(...COST_SECTION_DOCS[k].title)}</TabsTrigger>)}
                </TabsList>
            </div>

            {/* 1. ภาพรวม */}
            <TabsContent value="overview" className="mt-4">
                <Card>
                    <SectionHeader section="overview" />
                    <CardContent className="space-y-6">
                        <FlowDiagram />
                        <div>
                            <h4 className="mb-2 text-sm font-semibold">
                                {tx(`ข้อสังเกต (สถานการณ์${SCENARIO_LABELS[sel][0]})`, `Takeaways (${SCENARIO_LABELS[sel][1]} scenario)`)}
                            </h4>
                            <ul className="list-disc space-y-1 pl-5 text-sm">
                                <li>{tx(`ค่าส่วนกลาง (Firebase, Cloudflare, Vercel, อีเมล ฯลฯ) ประมาณ ${bahtR(t.shared)}/เดือน จากค่ารันรวม ${bahtR(t.total)}`,
                                    `Shared infra (Firebase, Cloudflare, Vercel, email…) is about ${bahtR(t.shared)}/mo of ${bahtR(t.total)} total`)}</li>
                                <li>{tx(`ปันให้บัญชีที่จ่ายเงิน ${num(t.paying, 0)} บัญชี = ${bahtR(t.infraPerPaying)} ต่อบัญชีต่อเดือน (ตัวเลข "ส่วนกลาง" ใต้ช่องราคา)`,
                                    `Shared across ${num(t.paying, 0)} paying accounts = ${bahtR(t.infraPerPaying)} per account per month (the "infra" figure under prices)`)}</li>
                                {t.lowestMargin && (
                                    <li>{tx(`แพลนที่กำไรต่ำสุดเมื่อลูกค้าใช้เต็มโควตา: ${TIER_LABELS[t.lowestMargin.tier][0]} (${pct(t.lowestMargin.margin)})`,
                                        `Lowest full-quota margin: ${TIER_LABELS[t.lowestMargin.tier][1]} (${pct(t.lowestMargin.margin)})`)}
                                    {t.lowestMargin.margin < model.general.targetMargin && (
                                        <span className="text-amber-700">{tx(` — ต่ำกว่าเป้า ${pct(model.general.targetMargin)}`, ` — below the ${pct(model.general.targetMargin)} target`)}</span>
                                    )}</li>
                                )}
                                <li>{tx(`ค่า AI คิดเป็น ${pct(t.aiShare)} ของค่ารันรวม`, `AI is ${pct(t.aiShare)} of the total run cost`)}</li>
                            </ul>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{tx('ต่อเดือน', 'Per month')}</TableHead>
                                    <ScenarioHeads selected={sel} />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow><TableCell>{tx('ผู้ใช้ active รวม', 'Active users')}</TableCell><Cells values={s.users} selected={sel} fmt={(n) => num(n, 0)} /></TableRow>
                                <TableRow><TableCell>{tx('บัญชีที่จ่ายเงิน', 'Paying accounts')}</TableCell><Cells values={s.paying} selected={sel} fmt={(n) => num(n, 0)} /></TableRow>
                                <TableRow><TableCell>{tx('ค่าส่วนกลาง', 'Shared infra')}</TableCell><Cells values={m.shared} selected={sel} /></TableRow>
                                <TableRow className="font-semibold"><TableCell>{tx('ค่ารันรวม', 'Total run cost')}</TableCell><Cells values={m.total} selected={sel} /></TableRow>
                                <TableRow><TableCell>{tx('รายได้ประมาณ', 'Estimated revenue')}</TableCell><Cells values={s.revenue} selected={sel} /></TableRow>
                                <TableRow className="font-semibold"><TableCell>{tx('กำไรขั้นต้น', 'Gross profit')}</TableCell><Cells values={s.profit} selected={sel} /></TableRow>
                                <TableRow>
                                    <TableCell>{tx('กำไรขั้นต้น %', 'Gross margin %')}</TableCell>
                                    {s.grossMargin.map((g, i) => <TableCell key={i} className={cn('text-right', i === sel && 'bg-blue-50/60')}>{pct(g)}</TableCell>)}
                                </TableRow>
                                <TableRow><TableCell>{tx('ต้นทุนต่อผู้ใช้ active', 'Cost per active user')}</TableCell><Cells values={s.costPerUser} selected={sel} /></TableRow>
                                <TableRow><TableCell>{tx('ต้นทุนต่อบัญชีที่จ่ายเงิน', 'Cost per paying account')}</TableCell><Cells values={s.costPerPaying} selected={sel} /></TableRow>
                            </TableBody>
                        </Table>
                        <p className="text-xs text-slate-500">
                            {tx('เริ่มต้น ≈ ทนายจ่ายเงิน 6 ราย ลูกค้า 1,000 คน/เดือน · เติบโต ≈ ทนายจ่ายเงิน 48 ราย ลูกค้า 10,000 · ขยาย ≈ ทนายจ่ายเงิน 240 ราย ลูกค้า 50,000 (ตามค่าเริ่มต้น แก้ได้ในสมมติฐาน)',
                                'Start ≈ 6 paying lawyers, 1,000 customers/mo · Growth ≈ 48 lawyers, 10,000 · Scale ≈ 240 lawyers, 50,000 (defaults; editable)')}
                        </p>
                        {diffNote}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* 2. สรุปต่อเว็บ */}
            <TabsContent value="sites" className="mt-4">
                <Card>
                    <SectionHeader section="sites" />
                    <CardContent className="space-y-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{tx('เว็บ', 'Site')}</TableHead>
                                    <ScenarioHeads selected={sel} prefix={['ตรง', 'Direct']} />
                                    <TableHead className="text-right">{tx('สัดส่วนปัน', 'Share')}</TableHead>
                                    <ScenarioHeads selected={sel} prefix={['รวมปันส่วนกลาง', 'Incl. shared']} />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {s.sites.map((r) => (
                                    <TableRow key={r.site}>
                                        <TableCell className="whitespace-nowrap font-medium">{tx(...RUN_SITE_LABELS[r.site])}</TableCell>
                                        <Cells values={r.direct} selected={sel} />
                                        <TableCell className="text-right text-xs text-slate-500">{r.share[sel] > 0 ? pct(r.share[sel]) : '-'}</TableCell>
                                        <Cells values={r.withShared} selected={sel} />
                                    </TableRow>
                                ))}
                                <TableRow>
                                    <TableCell className="text-slate-500">{tx('ส่วนกลาง (ก่อนปัน)', 'Shared (before allocation)')}</TableCell>
                                    <Cells values={s.shared} selected={sel} className="text-slate-500" />
                                    <TableCell />
                                    <TableCell colSpan={3} />
                                </TableRow>
                                <TableRow className="font-semibold">
                                    <TableCell>{tx('รวมทั้งหมด', 'Total')}</TableCell>
                                    <Cells values={m.total} selected={sel} />
                                    <TableCell />
                                    <Cells values={s.total} selected={sel} />
                                </TableRow>
                            </TableBody>
                        </Table>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{tx('เว็บ', 'Site')}</TableHead>
                                    <ScenarioHeads selected={sel} prefix={['รายได้', 'Revenue']} />
                                    <ScenarioHeads selected={sel} prefix={['กำไรขั้นต้น', 'Gross profit']} />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {s.sites.map((r) => (
                                    <TableRow key={r.site}>
                                        <TableCell className="whitespace-nowrap font-medium">{tx(...RUN_SITE_LABELS[r.site])}</TableCell>
                                        <Cells values={r.revenue} selected={sel} />
                                        <Cells values={r.profit} selected={sel} />
                                    </TableRow>
                                ))}
                                <TableRow className="font-semibold">
                                    <TableCell>{tx('รวม', 'Total')}</TableCell>
                                    <Cells values={s.revenue} selected={sel} />
                                    <Cells values={s.profit} selected={sel} />
                                </TableRow>
                            </TableBody>
                        </Table>

                        <div>
                            <h4 className="mb-2 text-sm font-semibold">{tx('ตัวชี้วัดสำคัญ', 'Key metrics')}</h4>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                                {([
                                    [['ผู้ใช้ active', 'Active users'], num(s.users[sel], 0)],
                                    [['บัญชีจ่ายเงิน', 'Paying'], num(s.paying[sel], 0)],
                                    [['ต้นทุน/ผู้ใช้', 'Cost/user'], bahtR(s.costPerUser[sel])],
                                    [['ต้นทุน/บัญชีจ่ายเงิน', 'Cost/paying'], bahtR(s.costPerPaying[sel])],
                                    [['รายได้/เดือน', 'Revenue/mo'], bahtR(s.revenue[sel])],
                                    [['กำไรขั้นต้น %', 'Gross margin'], pct(s.grossMargin[sel])],
                                ] as [Label, string][]).map(([l, v]) => (
                                    <div key={l[0]} className="rounded-lg border p-2">
                                        <div className="text-[11px] text-slate-500">{tx(...l)}</div>
                                        <div className="text-base font-semibold tabular-nums">{v}</div>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">{tx(`สถานการณ์${SCENARIO_LABELS[sel][0]} (เปลี่ยนได้ที่ตัวเลือกด้านบน)`, `${SCENARIO_LABELS[sel][1]} scenario (change it at the top)`)}</p>
                        </div>
                        <p className="text-xs text-slate-500">
                            {tx('รายได้ใช้ราคาที่บันทึกในแท็บ "ตั้งราคา" (Business ใช้ราคาร่างในสมมติฐาน) · lawslane.com รวม GP งานล่าม',
                                'Revenue uses the prices saved in "Set prices" (Business uses the draft prices in assumptions) · lawslane.com includes interpreter GP')}
                        </p>
                        {diffNote}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* 3. Margin ต่อแพลน */}
            <TabsContent value="margins" className="mt-4">
                <Card>
                    <SectionHeader section="margins" />
                    <CardContent className="space-y-4">
                        <MarginTableView model={model} run={run} u={u} />
                        <div className="rounded-lg border bg-slate-50 p-3 text-xs text-slate-600">
                            {(() => {
                                const e = interpreterEconomics(model, run.gpPercent);
                                return tx(
                                    `งานล่าม (มูลค่าเฉลี่ย ${bahtR(e.bookingValue)}, GP ${run.gpPercent}%): GP ${bahtR(e.gp)} − ค่าธรรมเนียม Beam บัตร premium ${bahtR(e.feeCard)} = เหลือ ${bahtR(e.netCard)} (${pct(e.netCardPctOfJob)} ของยอดงาน) · PromptPay เหลือ ${bahtR(e.netPromptpay)}`,
                                    `Interpreter job (avg ${bahtR(e.bookingValue)}, GP ${run.gpPercent}%): GP ${bahtR(e.gp)} − Beam premium fee ${bahtR(e.feeCard)} = ${bahtR(e.netCard)} net (${pct(e.netCardPctOfJob)} of job) · PromptPay ${bahtR(e.netPromptpay)}`,
                                );
                            })()}
                            <div className="mt-1">
                                {tx(`เครดิต AI ทนาย: เฉลี่ย ${bahtR(u.lawCredit)} · แพงสุด ${bahtR(u.lawCreditMax)} · ลูกค้า ${bahtR(u.custCredit)} ต่อเครดิต · ราคาขายเครดิตเสริมขั้นต่ำตามเป้า ≈ ${bahtR(u.lawCreditMax / Math.max(0.0001, 1 - model.general.targetMargin - model.beam.premiumPct * (1 + model.general.vatOnFees)))}/เครดิต (Beam บัตร premium)`,
                                    `Lawyer AI credit: avg ${bahtR(u.lawCredit)} · max ${bahtR(u.lawCreditMax)} · customer ${bahtR(u.custCredit)} per credit · min extra-credit price for target ≈ ${bahtR(u.lawCreditMax / Math.max(0.0001, 1 - model.general.targetMargin - model.beam.premiumPct * (1 + model.general.vatOnFees)))}/credit (Beam premium card)`)}
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={onGoToPrices}>{tx('ไปแก้ราคาที่แท็บ "ตั้งราคา"', 'Edit prices in "Set prices"')}</Button>
                        <p className="text-xs text-slate-500">{tx('ไฟล์ Excel คิดงานล่ามด้วย Stripe + Connect + ฿10 — ระบบใช้ Beam ตามการรับเงินจริง', 'The Excel file uses Stripe + Connect + ฿10 for interpreter jobs; the system uses Beam as actually charged')}</p>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* 4. ค่ารันรายเดือน */}
            <TabsContent value="run" className="mt-4">
                <Card>
                    <SectionHeader section="run" />
                    <CardContent className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{tx('เว็บ', 'Site')}</TableHead>
                                    <TableHead>{tx('บริการ', 'Service')}</TableHead>
                                    <TableHead>{tx('ประเภท', 'Type')}</TableHead>
                                    <TableHead className="min-w-48">{tx('วิธีคิด', 'Method')}</TableHead>
                                    <ScenarioHeads selected={sel} />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {m.rows.map((r, idx) => {
                                    const first = idx === 0 || m.rows[idx - 1].site !== r.site;
                                    return (
                                        <TableRow key={r.key} className={cn(first && 'border-t-2')}>
                                            <TableCell className="whitespace-nowrap text-xs font-medium">{first ? tx(...RUN_SITE_LABELS[r.site as RunSite]) : ''}</TableCell>
                                            <TableCell className="text-xs">
                                                {tx(...r.service)}
                                                {r.diff && <div className="text-[11px] text-amber-700">⚠ {tx(...r.diff)}</div>}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-xs">
                                                {r.kind === 'fixed' ? tx('คงที่', 'Fixed') : r.kind === 'tiered' ? tx('ขั้นบันได', 'Tiered') : tx('ผันแปร', 'Variable')}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500">{tx(...r.method)}</TableCell>
                                            <Cells values={r.amounts} selected={sel} className="text-xs" />
                                        </TableRow>
                                    );
                                })}
                                {model.sharedOverride.some((o) => o !== null) && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-xs">{tx('ส่วนกลาง: ใช้ยอดจริงแทนค่าที่คำนวณ', 'Shared: real bill replaces the estimate')}</TableCell>
                                        <Cells values={m.shared} selected={sel} className="text-xs" />
                                    </TableRow>
                                )}
                                <TableRow className="border-t-2 font-semibold">
                                    <TableCell colSpan={4}>{tx('รวมทั้งหมด', 'Total')}</TableCell>
                                    <Cells values={m.total} selected={sel} />
                                </TableRow>
                                <TableRow><TableCell colSpan={4} className="text-xs">{tx('ในนี้เป็นค่าคงที่ / ขั้นบันได', 'of which fixed / tiered')}</TableCell><Cells values={m.fixedTiered} selected={sel} className="text-xs" /></TableRow>
                                <TableRow><TableCell colSpan={4} className="text-xs">{tx('ในนี้เป็นค่าธรรมเนียมรับเงิน', 'of which payment fees')}</TableCell><Cells values={m.fees} selected={sel} className="text-xs" /></TableRow>
                                <TableRow><TableCell colSpan={4} className="text-xs">{tx('ในนี้เป็นค่า AI', 'of which AI')}</TableCell><Cells values={m.ai} selected={sel} className="text-xs" /></TableRow>
                                <TableRow><TableCell colSpan={4} className="text-xs">{tx('เทียบเป็น USD', 'In USD')}</TableCell><Cells values={m.totalUsd} selected={sel} fmt={usd} className="text-xs" /></TableRow>
                            </TableBody>
                        </Table>
                        {interp && (
                            <p className="text-xs text-slate-500">
                                {tx(`แถวงานล่าม (เติบโต) ${bahtR(interp.amounts[1])} — ไฟล์ Excel คิด Stripe + Connect + ฿10 ต่องาน จึงสูงกว่า`, `Interpreter row (growth) ${bahtR(interp.amounts[1])} — the Excel file uses Stripe + Connect + ฿10 per job, so it is higher`)}
                            </p>
                        )}
                        {diffNote}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* 5. ปริมาณใช้งาน */}
            <TabsContent value="volumes" className="mt-4">
                <Card>
                    <SectionHeader section="volumes" />
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{tx('ตัวขับต้นทุน', 'Cost driver')}</TableHead>
                                    <ScenarioHeads selected={sel} />
                                    <TableHead className="min-w-48">{tx('สูตร', 'Formula')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(Object.keys(VOLUME_LABELS) as (keyof UsageVolumes)[]).map((k) => (
                                    <TableRow key={k}>
                                        <TableCell className="text-xs">{tx(...VOLUME_LABELS[k].label)}</TableCell>
                                        <Cells values={vols.map((v) => v[k])} selected={sel} fmt={(n) => num(n)} className="text-xs" />
                                        <TableCell className="text-xs text-slate-500">{tx(...VOLUME_LABELS[k].formula)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* 6. ต้นทุนต่อหน่วย */}
            <TabsContent value="units" className="mt-4">
                <Card>
                    <SectionHeader section="units" />
                    <CardContent className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{tx('การเรียก AI 1 ครั้ง', 'One AI call')}</TableHead>
                                    <TableHead>{tx('โมเดล', 'Model')}</TableHead>
                                    <TableHead className="text-right">input</TableHead>
                                    <TableHead className="text-right">cached</TableHead>
                                    <TableHead className="text-right">output</TableHead>
                                    <TableHead className="text-right">{tx('เครดิต', 'Credits')}</TableHead>
                                    <TableHead className="text-right">USD</TableHead>
                                    <TableHead className="text-right">{tx('บาท/ครั้ง', 'THB/call')}</TableHead>
                                    <TableHead className="text-right">{tx('บาท/เครดิต', 'THB/credit')}</TableHead>
                                    <TableHead className="text-right">mix</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(Object.keys(AI_CALL_LABELS) as (keyof CostAssumptions['aiCalls'])[]).map((k) => {
                                    const c = model.aiCalls[k];
                                    const thb = aiCallCost(model, c);
                                    const credits = aiCallFieldEditable(k, 'credits') && c.credits > 0;
                                    return (
                                        <TableRow key={k}>
                                            <TableCell className="text-xs">{tx(...AI_CALL_LABELS[k])}</TableCell>
                                            <TableCell className="font-mono text-[11px]">{c.model}</TableCell>
                                            <TableCell className="text-right text-xs">{num(c.inputTokens, 0)}</TableCell>
                                            <TableCell className="text-right text-xs">{pct(c.cachedShare)}</TableCell>
                                            <TableCell className="text-right text-xs">{num(c.outputTokens, 0)}</TableCell>
                                            <TableCell className="text-right text-xs">{credits ? c.credits : '-'}</TableCell>
                                            <TableCell className="text-right text-xs">{(thb / model.general.fx).toFixed(5)}</TableCell>
                                            <TableCell className="text-right text-xs">{thb.toFixed(4)}</TableCell>
                                            <TableCell className="text-right text-xs">{credits ? (thb / c.credits).toFixed(4) : '-'}</TableCell>
                                            <TableCell className="text-right text-xs">{aiCallFieldEditable(k, 'mix') ? pct(c.mix) : '-'}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{tx('สรุปต้นทุนต่อหน่วย', 'Unit cost summary')}</TableHead>
                                    <TableHead className="text-right">{tx('บาท', 'THB')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(['lawCredit', 'lawCreditMax', 'lawCreditsPerCall', 'custCredit', 'rag', 'witSet', 'sms', 'invoice', 'examOcrSet', 'pay100'] as (keyof UnitCosts)[]).map((k) => (
                                    <TableRow key={k}>
                                        <TableCell className="text-xs">{tx(...UNIT_LABELS[k])}</TableCell>
                                        <TableCell className="text-right text-xs tabular-nums">
                                            {k === 'lawCreditsPerCall' ? `${u[k].toFixed(2)} ${tx('เครดิต', 'credits')}` : u[k] < 0.01 ? u[k].toFixed(6) : u[k].toFixed(4)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <p className="text-xs text-slate-500">
                            {tx('token ต่อครั้งเป็นค่าประมาณจากขนาด prompt จริง (prompts.ts ~14k ตัวอักษร, RAG ตัดที่ 6–8k, ไฟล์แนบสูงสุด 60k) แก้ได้ใน "สมมติฐานต้นทุน" › การเรียก AI 1 ครั้ง',
                                'Tokens per call are estimates from real prompt sizes (prompts.ts ~14k chars, RAG cut at 6–8k, attachments up to 60k); edit them in "Cost assumptions" › One AI call')}
                        </p>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* 7. ราคาบริการ */}
            <TabsContent value="vendors" className="mt-4">
                <Card>
                    <SectionHeader section="vendors" />
                    <CardContent className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{tx('บริการ', 'Service')}</TableHead>
                                    <TableHead>{tx('รายการ', 'Item')}</TableHead>
                                    <TableHead className="text-right">{tx('ราคา', 'Price')}</TableHead>
                                    <TableHead>{tx('หน่วย', 'Unit')}</TableHead>
                                    <TableHead>{tx('แหล่งที่มา', 'Source')}</TableHead>
                                    <TableHead className="min-w-48">{tx('หมายเหตุ', 'Notes')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(Object.keys(SERVICE_PRICE_INFO) as (keyof CostAssumptions['servicePrices'])[]).map((k) => {
                                    const info = SERVICE_PRICE_INFO[k];
                                    return (
                                        <TableRow key={k} className={cn(info.unconfirmed && 'bg-amber-50')}>
                                            <TableCell className="whitespace-nowrap text-xs">{info.vendor}</TableCell>
                                            <TableCell className="text-xs">{info.unconfirmed && <AlertTriangle className="mr-1 inline h-3 w-3 text-amber-600" />}{tx(...info.label)}</TableCell>
                                            <TableCell className="text-right text-xs tabular-nums">{num(model.servicePrices[k], 7)}</TableCell>
                                            <TableCell className="whitespace-nowrap text-xs">{tx(...info.unit)}</TableCell>
                                            <TableCell className="break-all text-[11px] text-slate-500">{info.source}</TableCell>
                                            <TableCell className="text-xs text-slate-500">{info.note ? tx(...info.note) : ''}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{tx('โมเดล AI', 'AI model')}</TableHead>
                                    <TableHead className="text-right">input</TableHead>
                                    <TableHead className="text-right">cached</TableHead>
                                    <TableHead className="text-right">output</TableHead>
                                    <TableHead>{tx('ใช้ที่ไหน', 'Used for')}</TableHead>
                                    <TableHead>{tx('แหล่งที่มา', 'Source')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(model.models).map(([name, p]) => {
                                    const info = MODEL_INFO[name];
                                    return (
                                        <TableRow key={name} className={cn(info?.unconfirmed && 'bg-amber-50')}>
                                            <TableCell className="font-mono text-[11px]">{info?.unconfirmed && <AlertTriangle className="mr-1 inline h-3 w-3 text-amber-600" />}{name}</TableCell>
                                            <TableCell className="text-right text-xs">{p.input}</TableCell>
                                            <TableCell className="text-right text-xs">{p.cached}</TableCell>
                                            <TableCell className="text-right text-xs">{p.output}</TableCell>
                                            <TableCell className="text-xs">{info ? tx(...info.usedFor) : '-'}</TableCell>
                                            <TableCell className="break-all text-[11px] text-slate-500">{info?.source ?? '-'}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        <p className="text-xs text-slate-500">
                            {tx('USD ต่อล้าน token · ราคาทั้งหมดแก้ได้ใน "สมมติฐานต้นทุน" › ราคาบริการ / ราคาโมเดล AI · แถวสีเหลือง ⚠ = ยังไม่ยืนยัน (ตรวจเมื่อ 2026-10-11)',
                                'USD per M tokens · edit all prices in "Cost assumptions" › vendor / AI model prices · yellow ⚠ rows = unconfirmed (checked 2026-10-11)')}
                        </p>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* 8. หมายเหตุ */}
            <TabsContent value="notes" className="mt-4">
                <Card>
                    <SectionHeader section="notes" />
                    <CardContent>
                        <ol className="list-decimal space-y-2 pl-5 text-sm">
                            {NOTES.map((n, i) => <li key={i}>{tx(...n)}</li>)}
                        </ol>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}

export function FlowDiagram() {
    const { tx } = useAdminLocale();
    const steps: Label[] = [
        ['สมมติฐาน + ราคาบริการ', 'Assumptions + vendor prices'],
        ['ต้นทุนต่อหน่วย', 'Unit costs'],
        ['ปริมาณใช้งาน', 'Usage volumes'],
        ['ค่ารันรายเดือน', 'Monthly run cost'],
        ['สรุปต่อเว็บ / Margin ต่อแพลน', 'Per site / Plan margins'],
    ];
    return (
        <div role="img" aria-label={steps.map((s) => s[1]).join(' → ')} className="flex flex-col items-stretch gap-1 sm:flex-row sm:items-center">
            {steps.map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-1 sm:flex-row">
                    <div className="w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-medium text-blue-900 sm:w-auto">{tx(...s)}</div>
                    {i < steps.length - 1 && (
                        <>
                            <ArrowDown className="h-4 w-4 text-slate-400 sm:hidden" />
                            <ArrowRight className="hidden h-4 w-4 text-slate-400 sm:block" />
                        </>
                    )}
                </div>
            ))}
        </div>
    );
}

function MarginTableView({ model, run, u }: { model: CostAssumptions; run: RunContext; u: UnitCosts }) {
    const { tx } = useAdminLocale();
    const rows = marginTable(model, run);
    const low = (v: number | null) => v !== null && v < model.general.targetMargin;
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{tx('แพลน', 'Plan')}</TableHead>
                    <TableHead className="text-right">{tx('ราคา/เดือน', 'Price/mo')}</TableHead>
                    <TableHead className="text-right">{tx('ต้นทุนเต็มโควตา', 'Full-quota cost')}</TableHead>
                    <TableHead className="text-right">{tx('ต้นทุนใช้เฉลี่ย', 'Avg-use cost')}</TableHead>
                    <TableHead className="text-right">{tx('ค่าธรรมเนียม', 'Fee')}</TableHead>
                    <TableHead className="text-right">{tx('ส่วนกลาง/บัญชี', 'Infra/acct')}</TableHead>
                    <TableHead className="text-right">{tx('กำไร (เต็ม)', 'Profit (full)')}</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">{tx('กำไร (เฉลี่ย)', 'Profit (avg)')}</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">{tx('ราคาต่ำสุดตามเป้า', 'Min price')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map(({ tier, price, e }) => (
                    <TableRow key={tier}>
                        <TableCell className="whitespace-nowrap text-xs font-medium">
                            {tx(...TIER_LABELS[tier])}
                            {tier.startsWith('business.') && <Badge variant="outline" className="ml-1 font-normal">{tx('ร่าง', 'draft')}</Badge>}
                        </TableCell>
                        <TableCell className="text-right text-xs">{price > 0 ? bahtR(price) : tx('ยังไม่ตั้ง', 'not set')}</TableCell>
                        <TableCell className="text-right text-xs">{bahtR(e.fullCost)}</TableCell>
                        <TableCell className="text-right text-xs">{bahtR(e.avgCost)}</TableCell>
                        <TableCell className="text-right text-xs">{bahtR(e.fee)}</TableCell>
                        <TableCell className="text-right text-xs">{bahtR(e.infra)}</TableCell>
                        <TableCell className={cn('text-right text-xs', e.profitFull < 0 && 'text-red-600')}>{bahtR(e.profitFull)}</TableCell>
                        <TableCell className={cn('text-right text-xs', low(e.marginFull) && 'text-amber-700')}>{pct(e.marginFull)}</TableCell>
                        <TableCell className={cn('text-right text-xs', e.profitAvg < 0 && 'text-red-600')}>{bahtR(e.profitAvg)}</TableCell>
                        <TableCell className="text-right text-xs">{pct(e.marginAvg)}</TableCell>
                        <TableCell className={cn('text-right text-xs', price > 0 && e.minPrice !== null && price < e.minPrice && 'text-amber-700')}>
                            {e.minPrice !== null ? bahtR(e.minPrice) : '-'}
                        </TableCell>
                    </TableRow>
                ))}
                {(Object.keys(FREE_TIER_LABELS) as FreeTier[]).map((t) => (
                    <TableRow key={t} className="text-slate-500">
                        <TableCell className="text-xs">{tx(...FREE_TIER_LABELS[t])}</TableCell>
                        <TableCell className="text-right text-xs">{tx('ฟรี', 'free')}</TableCell>
                        <TableCell className="text-right text-xs">{bahtR(freeTierCost(model, t, u))}</TableCell>
                        <TableCell className="text-right text-xs">{bahtR(freeTierCost(model, t, u) * model.general.avgUsage)}</TableCell>
                        <TableCell colSpan={7} className="text-xs">{tx('ไม่มีรายได้ ไม่ปันส่วนกลาง (ต้นทุนเมื่อใช้เต็มโควตาฟรี)', 'No revenue, no infra share (cost at full free quota)')}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

/** 13 ข้อในหน้า "หมายเหตุ" ของไฟล์ เขียนใหม่ให้อ่านง่าย */
const NOTES: Label[] = [
    ['ตัวเลขทั้งหมดเป็นการประมาณจากราคาประกาศ × สมมติฐาน ไม่ได้ดึงบิลจริง — เมื่อได้บิล Google Cloud / Cloudflare / Google AI Studio ให้เทียบแล้วปรับสมมติฐาน หรือใส่ "ใช้ยอดจริงแทน"',
        'Everything is list price × assumptions, not real bills — compare with Google Cloud / Cloudflare / Google AI Studio bills and adjust, or use the real-bill override'],
    ['จำนวน token ต่อการเรียก AI เป็นค่าประมาณ — เมื่อระบบเก็บ aiUsageLogs แล้ว ให้เอาค่าเฉลี่ยจริงมาใส่ในการเรียก AI 1 ครั้ง',
        'Tokens per AI call are estimates — once aiUsageLogs exist, enter real averages under "One AI call"'],
    ['Typhoon (แชท + OCR) ถือว่าฟรีตอนนี้ เพราะไม่พบหน้าราคาทางการ — ถ้าเริ่มเก็บเงิน ให้ใส่ราคาในตารางราคาโมเดล',
        'Typhoon (chat + OCR) is treated as free (no official pricing found) — enter a price if it starts charging'],
    ['ราคา SMS OTP ไทยของ Firebase ยังไม่ยืนยัน (ใช้ $0.08) — ตรวจจาก Cloud Console > Metrics "Sent SMS" ภูมิภาค TH',
        'Firebase Thai SMS OTP price is unconfirmed ($0.08) — check Cloud Console > Metrics "Sent SMS" for TH'],
    ['Wittaya ยังใช้ gemini-2.0-flash ที่ปลดระวางแล้ว คิดราคาเท่า 2.5-flash-lite — ควรย้ายโมเดล',
        'Wittaya still uses the retired gemini-2.0-flash, priced as 2.5-flash-lite — it should migrate'],
    ['App Hosting ทุก backend ตั้งไว้ 1 instance — ถูกแต่รับโหลดไม่ไหวเมื่อโต ถ้าเพิ่ม instance ค่า compute จะขยับ',
        'Every App Hosting backend is capped at 1 instance — cheap but will not scale; more instances raise compute cost'],
    ['admin มีทั้ง apphosting.yaml และ vercel.json — ในโมเดลถือว่าอยู่บน Vercel (มี Vercel cron)',
        'admin has both apphosting.yaml and vercel.json — the model assumes Vercel (it has a Vercel cron)'],
    ['chat-server (Durable Objects) น่าจะยังไม่ deploy จึงไม่ได้คิด', 'The chat-server worker (Durable Objects) is probably not deployed, so it is not counted'],
    ['docs.lawslane.com และสิทธิคนทำงาน ถือว่าใช้แพลนฟรี (ไม่มีค่าโฮสต์)', 'docs.lawslane.com and Sitthi are assumed to be on free plans'],
    ['ค่าใช้ครั้งเดียวไม่รวมในรายเดือน: นำกฎหมายเข้า Vectorize (ถูกมาก ≈ $0.012/ล้าน token) และ OCR ข้อสอบ 58 ชุด (ดู "OCR ข้อสอบ 1 ชุด" × 58 ในต้นทุนต่อหน่วย)',
        'One-off costs are excluded: ingesting laws into Vectorize (≈ $0.012/M tokens) and OCR of 58 exam sets (see "Exam OCR, 1 set" × 58 in unit costs)'],
    ['ไม่รวม: เงินเดือน/ค่าแรง, Google Workspace, ภาษี, VAT ของ LINE OA, การตลาด, ค่าบัญชี/จดทะเบียน',
        'Excluded: salaries, Google Workspace, taxes, LINE OA VAT, marketing, accounting/registration'],
    ['ค่าธรรมเนียม Stripe คิดแบบบัตรในประเทศ 3.65% + ฿10 (+ Billing 0.7% สำหรับแพลนรายเดือน) ระบบนี้บวก VAT 7% ด้วย · งานล่าม/จ่ายครั้งเดียวคิด Beam',
        'Stripe fees use domestic card 3.65% + ฿10 (+ 0.7% Billing for subscriptions), plus 7% VAT here · interpreter/one-time payments use Beam'],
    ['โควตาฟรีของ Cloud Run และ Firestore ใช้ร่วมกันทั้งบัญชี/โปรเจกต์ ไม่ได้ได้แยกต่อเว็บ', 'Cloud Run and Firestore free tiers are shared across the billing account/project, not per site'],
];
