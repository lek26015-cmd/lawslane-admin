'use client';

import { useState } from 'react';
import { ExternalLink, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAdminLocale } from '@/lib/admin-i18n';
import {
    LIVE_EFFECT_LABELS,
    type FieldDoc,
    type Label,
    type LiveEffect,
    type ProductDoc,
} from '@/lib/pricing-field-docs';

/**
 * ป้าย/ปุ่ม "ⓘ" อธิบายช่อง (ข้อความมาจาก lib/pricing-field-docs.ts ที่เดียว)
 * Popover ของ Radix: กด Tab มาที่ปุ่มแล้ว Enter/Space เปิด · Esc ปิด
 */

export function LiveBadge({ live, className }: { live: LiveEffect; className?: string }) {
    const { tx } = useAdminLocale();
    const style = live === 'live'
        ? 'border-red-300 bg-red-50 text-red-700'
        : live === 'sheet' ? 'border-amber-300 bg-amber-50 text-amber-800'
            : live === 'stored' ? 'border-violet-300 bg-violet-50 text-violet-800' : 'border-slate-300 bg-slate-50 text-slate-600';
    return <Badge variant="outline" className={cn('font-normal', style, className)}>{tx(...LIVE_EFFECT_LABELS[live])}</Badge>;
}

export function AffectsList({ items, className }: { items: Label[]; className?: string }) {
    const { tx } = useAdminLocale();
    return (
        <ul className={cn('list-disc space-y-0.5 pl-4', className)}>
            {items.map((l, i) => <li key={i}>{tx(...l)}</li>)}
        </ul>
    );
}

/** เนื้อหา 4 ส่วน */
export function FieldDocBody({ doc }: { doc: FieldDoc }) {
    const { tx } = useAdminLocale();
    const part = (h: Label, body: React.ReactNode) => (
        <div>
            <div className="font-semibold text-slate-800">{tx(...h)}</div>
            <div className="text-slate-600">{body}</div>
        </div>
    );
    return (
        <div className="space-y-2 text-xs leading-snug">
            <div className="text-sm font-semibold">{tx(...doc.title)}</div>
            {part(['คืออะไร', 'What it is'], tx(...doc.what))}
            {part(['ทำงานยังไง / คำนวณจากอะไร', 'How it works'], tx(...doc.how))}
            {part(['ควรแก้เมื่อไร', 'When to edit'], tx(...doc.when))}
            {part(['แก้แล้วกระทบอะไร', 'What changes'], (
                <>
                    <div className="mt-0.5 text-slate-500">{tx('ตัวเลขในหน้านี้:', 'Numbers on this page:')}</div>
                    <AffectsList items={doc.affects} />
                    <div className="mt-1 text-slate-500">{tx('ผลกับเว็บจริง:', 'Real-world effect:')}</div>
                    <div className="flex flex-wrap items-start gap-1">
                        <LiveBadge live={doc.live} />
                        <span>{tx(...doc.liveDetail)}</span>
                    </div>
                </>
            ))}
        </div>
    );
}

/**
 * ปุ่ม ⓘ — รับ doc ตรง ๆ หรือฟังก์ชันที่คำนวณตอนเปิด (สมมติฐานต้องลองเปลี่ยนค่าในโมเดล จึงคำนวณเมื่อเปิดเท่านั้น)
 */
export function FieldInfo({ doc, label, className }: { doc: FieldDoc | (() => FieldDoc | null) | null; label?: string; className?: string }) {
    const { tx } = useAdminLocale();
    const [open, setOpen] = useState(false);
    const [resolved, setResolved] = useState<FieldDoc | null>(null);
    if (!doc) return null;
    const onOpenChange = (o: boolean) => {
        if (o) setResolved(typeof doc === 'function' ? doc() : doc);
        setOpen(o);
    };
    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label={label ? tx(`คำอธิบาย: ${label}`, `Explain: ${label}`) : tx('คำอธิบาย', 'Explain')}
                    className={cn('inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400', className)}
                >
                    <Info className="h-3.5 w-3.5" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto" align="start">
                {resolved && <FieldDocBody doc={resolved} />}
            </PopoverContent>
        </Popover>
    );
}

/** หัวการ์ดสินค้า: บริการนี้คืออะไร + ราคานี้แสดงที่ไหน (การ์ดที่มีหลายแพลน: about ต่อแพลน + ลิงก์รวม) */
export function ProductAbout({ doc, docs }: { doc?: ProductDoc; docs?: ProductDoc[] }) {
    const { tx } = useAdminLocale();
    const list = (docs ?? (doc ? [doc] : [])).filter(Boolean);
    if (list.length === 0) return null;
    const seen = new Set<string>();
    const shownAt = list.flatMap((d) => d.shownAt).filter((s) => {
        const k = s.url + s.label[0];
        return seen.has(k) ? false : (seen.add(k), true);
    });
    return (
        <div className="mt-2 space-y-1 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
            <div>
                <span className="font-semibold text-slate-700">{tx('บริการนี้คืออะไร', 'What customers get')}: </span>
                {list.length === 1 ? tx(...list[0].about) : (
                    <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
                        {list.map((d) => <li key={d.title[0]}><span className="font-medium">{tx(...d.title)}</span> — {tx(...d.about)}</li>)}
                    </ul>
                )}
            </div>
            <div>
                <span className="font-semibold text-slate-700">{tx('ราคานี้แสดงที่ไหน', 'Where this price shows')}: </span>
                {shownAt.length === 0 ? (
                    <span>{tx('ยังไม่แสดงบนเว็บ', 'Not shown on any site yet')}</span>
                ) : (
                    <ul className="mt-0.5 space-y-0.5">
                        {shownAt.map((s, i) => (
                            <li key={i}>
                                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-700 underline-offset-2 hover:underline">
                                    {tx(...s.label)} <ExternalLink className="h-3 w-3" />
                                </a>
                                {s.note && <span className="text-slate-500"> — {tx(...s.note)}</span>}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

/** สรุปผลกระทบในกล่องยืนยัน */
export function AffectsSummary({ affects, live, liveDetails }: { affects: Label[]; live: LiveEffect[]; liveDetails?: Label[] }) {
    const { tx } = useAdminLocale();
    const uniqLive = [...new Set(live)];
    if (affects.length === 0 && uniqLive.length === 0) return null;
    return (
        <div className="space-y-1 rounded-lg border bg-slate-50 p-3 text-xs">
            <div className="font-semibold">{tx('สิ่งที่จะเปลี่ยนเมื่อบันทึก', 'What saving changes')}</div>
            {affects.length > 0 && (
                <>
                    <div className="text-slate-500">{tx('ตัวเลขในหน้านี้:', 'Numbers on this page:')}</div>
                    <AffectsList items={affects} />
                </>
            )}
            {uniqLive.length > 0 && (
                <>
                    <div className="text-slate-500">{tx('ผลกับเว็บจริง:', 'Real-world effect:')}</div>
                    <div className="flex flex-wrap gap-1">{uniqLive.map((l) => <LiveBadge key={l} live={l} />)}</div>
                    {liveDetails && <AffectsList items={dedupe(liveDetails)} />}
                </>
            )}
        </div>
    );
}

function dedupe(items: Label[]): Label[] {
    const seen = new Set<string>();
    return items.filter((l) => (seen.has(l[0]) ? false : (seen.add(l[0]), true)));
}
