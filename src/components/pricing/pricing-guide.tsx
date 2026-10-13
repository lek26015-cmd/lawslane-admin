'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAdminLocale } from '@/lib/admin-i18n';
import type { Label } from '@/lib/pricing-field-docs';
import { FlowDiagram } from './cost-overview';
import { LiveBadge } from './field-info';

/**
 * "คู่มือหน้านี้" (พับได้) — ใช้ร่วมทั้งแท็บตั้งราคาและต้นทุนระบบ
 * เนื้อหาเดียวกับคู่มือแอดมิน (guide/content/finance.ts) แบบย่อ
 */

const EDIT_WHEN: Label[] = [
    ['อัตราแลกเปลี่ยน: เดือนละครั้ง (สมมติฐานต้นทุน › ค่าทั่วไป)', 'Exchange rate: monthly (Cost assumptions › General)'],
    ['ยอดบิลจริง: ทุกเดือนหลังได้บิล Google Cloud / Cloudflare / Vercel ฯลฯ ใส่ใน "ใช้ยอดจริงแทน" ของสถานการณ์ที่ใกล้ความจริง', 'Real bills: monthly, enter them in "Override with real bill" for the closest scenario'],
    ['จำนวนผู้ใช้ต่อสถานการณ์: ทุกเดือน/ไตรมาส ให้ใกล้ตัวเลขจริงหรือเป้า', 'Users per scenario: monthly/quarterly, toward real numbers or targets'],
    ['เป้ากำไร (target margin): เมื่อเปลี่ยนนโยบายราคา — ใช้คิด "ราคาต่ำสุดตามเป้า"', 'Target margin: when pricing policy changes — drives "min price for target"'],
    ['ราคาบริการ / ราคาโมเดล AI: เมื่อผู้ให้บริการเปลี่ยนราคา หรือแถว ⚠ ได้รับการยืนยัน', 'Vendor / AI model prices: when vendors change prices or a ⚠ row is confirmed'],
    ['ราคาแพ็กเกจ: เมื่อกำไรต่ำกว่าเป้าหรือเปลี่ยนนโยบาย — ตรวจผลกระทบก่อนบันทึกเสมอ', 'Plan prices: when margins miss the target or policy changes — always review the impact before saving'],
];

export function PricingGuide() {
    const { tx } = useAdminLocale();
    const [open, setOpen] = useState(false);
    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <Card className="border-blue-200">
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer py-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ChevronDown className={cn('h-4 w-4 transition-transform', !open && '-rotate-90')} />
                            <BookOpen className="h-4 w-4 text-blue-700" />
                            {tx('คู่มือหน้านี้', 'How this page works')}
                        </CardTitle>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="space-y-4 text-sm">
                        <section className="space-y-1">
                            <h4 className="font-semibold">{tx('หน้านี้คืออะไร', 'What this page is')}</h4>
                            <p>{tx('ที่เดียวสำหรับตั้งราคาทุกแพ็กเกจ (แท็บ "ตั้งราคา") และดูว่าระบบทั้งหมดมีต้นทุนเท่าไร แต่ละแพลนเหลือกำไรแค่ไหน (แท็บ "ต้นทุนระบบ") ตัวเลขต้นทุนเป็นการประมาณจากราคาประกาศ × สมมติฐาน ไม่ใช่บิลจริง',
                                'One place to set every plan price ("Set prices") and see what the whole system costs and how much each plan keeps ("System costs"). Cost figures are list price × assumptions, not real bills.')}</p>
                        </section>
                        <section className="space-y-2">
                            <h4 className="font-semibold">{tx('ตัวเลขไหลยังไง', 'How the numbers flow')}</h4>
                            <FlowDiagram />
                            <p className="text-xs text-slate-500">{tx('ราคาแพ็กเกจจากแท็บ "ตั้งราคา" ใช้คิดรายได้และค่าธรรมเนียม · ตัวเลือกสถานการณ์และกล่อง "สมมติฐานต้นทุน" ใช้ร่วมกันทั้งสองแท็บ แก้แล้วเห็นผลทันที (ยังไม่บันทึก)',
                                'Plan prices from "Set prices" feed revenue and fees · the scenario selector and "Cost assumptions" are shared by both tabs and update live (unsaved)')}</p>
                        </section>
                        <section className="space-y-1">
                            <h4 className="font-semibold">{tx('ควรแก้อะไร เมื่อไร', 'What to edit, and when')}</h4>
                            <ul className="list-disc space-y-0.5 pl-5">{EDIT_WHEN.map((l, i) => <li key={i}>{tx(...l)}</li>)}</ul>
                        </section>
                        <section className="space-y-2">
                            <h4 className="font-semibold">{tx('อะไรแก้ได้ปลอดภัย อะไรมีผลจริง', 'What is safe vs what is live')}</h4>
                            <div className="space-y-1.5">
                                <div className="flex flex-wrap items-start gap-2"><LiveBadge live="estimate" /><span>{tx('สมมติฐานต้นทุนทั้งหมด และตัวเลือกสถานการณ์ — แก้ได้เต็มที่ ไม่มีผลกับเว็บหรือลูกค้า', 'All cost assumptions and the scenario selector — edit freely; no site or customer is affected')}</span></div>
                                <div className="flex flex-wrap items-start gap-2"><LiveBadge live="stored" /><span>{tx('ราคา Wittaya, AI Plus, แพ็กเครดิต AI, E-Book/ค่าส่ง และราคาร่าง CapDeal/ทนาย — เก็บไว้ เว็บยังไม่อ่าน', 'Wittaya, AI Plus, AI credit packs, E-Book/shipping and CapDeal/lawyer drafts — stored only; sites do not read them yet')}</span></div>
                                <div className="flex flex-wrap items-start gap-2"><LiveBadge live="live" /><span>{tx('ราคา CapDeal/ทนายที่บันทึกผ่าน Stripe (คนสมัครใหม่จ่ายราคาใหม่ทันที สมาชิกเดิมจ่ายราคาเดิม) และ GP ล่าม (มีผลกับการจองใหม่ทันที)', 'CapDeal/lawyer prices saved via Stripe (new sign-ups pay the new price immediately; existing subscribers keep theirs) and interpreter GP (applies to new bookings immediately)')}</span></div>
                                <div className="flex flex-wrap items-start gap-2"><LiveBadge live="sheet" /><span>{tx('ปุ่ม "ส่งไป Google Sheet" — คัดลอกค่าที่บันทึกแล้วไป Sheet ต้นทุน (ทางเดียว) Sheet แชร์แบบมีลิงก์ คนนอกทีมที่มีลิงก์เห็นได้', 'The "ส่งไป Google Sheet" button — copies saved values to the cost Sheet (one-way); the Sheet is link-shared, so anyone with the link can see it')}</span></div>
                            </div>
                            <p className="text-xs text-slate-500">{tx('กดปุ่ม ⓘ ข้างทุกช่องเพื่อดู คืออะไร / ทำงานยังไง / ควรแก้เมื่อไร / แก้แล้วกระทบอะไร · กล่องยืนยันก่อนบันทึกจะสรุปผลกระทบของช่องที่แก้ให้อีกครั้ง',
                                'Press ⓘ next to any field for what / how / when / what changes · the confirm dialog summarises the impact of the edited fields again')}</p>
                        </section>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}
