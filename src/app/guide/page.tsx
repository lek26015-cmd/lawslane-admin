'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, BookOpen, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAdminLocale } from '@/lib/admin-i18n';
import { guideGroups, type GuideBody } from './content';

/**
 * คู่มือแอดมิน — อยู่ในหลังบ้านเท่านั้น (docs.lawslane.com ตั้งใจไม่รวมส่วนแอดมิน)
 * เนื้อหาอยู่ใน ./content แยกไฟล์ตามหมวดเมนู แก้ระบบหน้าไหนให้แก้คู่มือหมวดนั้นคู่กัน
 */
function bodyText(body: GuideBody): string {
    return [
        body.title,
        body.summary,
        ...body.blocks.flatMap(b => [b.heading, ...b.items]),
        ...(body.warnings ?? []),
    ].join(' ').toLowerCase();
}

export default function AdminGuidePage() {
    const { locale, tx } = useAdminLocale();
    const [query, setQuery] = React.useState('');
    const q = query.trim().toLowerCase();

    const groups = React.useMemo(() => {
        if (!q) return guideGroups;
        return guideGroups
            .map(g => ({ ...g, sections: g.sections.filter(s => bodyText(s[locale]).includes(q)) }))
            .filter(g => g.sections.length > 0);
    }, [q, locale]);

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <div>
                <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
                    <BookOpen className="h-6 w-6 text-[#0B3979]" />
                    {tx('คู่มือแอดมิน', 'Admin guide')}
                </h2>
                <p className="mt-1 text-slate-500">
                    {tx(
                        'วิธีใช้หลังบ้าน Lawslane ทีละเมนู พร้อมข้อควรระวัง ป้ายสิทธิ์บอกว่าต้องได้รับสิทธิ์อะไรจึงจะเห็นเมนูนั้น',
                        'How to use each Lawslane back-office menu, with cautions. The permission badge shows what access each menu needs.'
                    )}
                </p>
            </div>

            <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={tx('ค้นหาในคู่มือ เช่น สลิป, คืนเงิน, ข้อสอบ', 'Search the guide, e.g. slip, refund, exam')}
                    className="bg-white pl-9"
                />
            </div>

            <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
                <nav className="hidden lg:block">
                    <div className="sticky top-0 space-y-4 text-sm">
                        {groups.map(g => (
                            <div key={g.id}>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    {g.title[locale]}
                                </p>
                                <ul className="space-y-0.5">
                                    {g.sections.map(s => (
                                        <li key={s.id}>
                                            <a
                                                href={`#${s.id}`}
                                                className="block rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100 hover:text-[#0B3979]"
                                            >
                                                {s[locale].title}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </nav>

                <div className="min-w-0 space-y-10">
                    {groups.length === 0 && (
                        <p className="rounded-xl border bg-white p-6 text-center text-slate-500">
                            {tx('ไม่พบหัวข้อที่ตรงกับคำค้น', 'No topics match your search')}
                        </p>
                    )}
                    {groups.map(g => (
                        <section key={g.id} className="space-y-4">
                            <h3 className="border-b pb-2 text-lg font-semibold text-slate-800">{g.title[locale]}</h3>
                            {g.sections.map(s => {
                                const body = s[locale];
                                return (
                                    <article
                                        key={s.id}
                                        id={s.id}
                                        className="scroll-mt-4 space-y-4 rounded-2xl border bg-white p-5 shadow-sm sm:p-6"
                                    >
                                        <header className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0 space-y-1">
                                                <h4 className="text-base font-semibold text-slate-900">{body.title}</h4>
                                                <p className="text-sm text-slate-600">{body.summary}</p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2">
                                                {s.permission && (
                                                    <Badge variant="outline" className="font-mono text-[11px] text-slate-500">
                                                        {s.permission}
                                                    </Badge>
                                                )}
                                                {s.href && (
                                                    <Link
                                                        href={s.href}
                                                        className="inline-flex items-center gap-1 rounded-full bg-[#0B3979]/10 px-3 py-1 text-xs font-medium text-[#0B3979] hover:bg-[#0B3979]/20"
                                                    >
                                                        {tx('เปิดหน้านี้', 'Open page')}
                                                        <ArrowUpRight className="h-3 w-3" />
                                                    </Link>
                                                )}
                                            </div>
                                        </header>

                                        {body.blocks.map(b => (
                                            <div key={b.heading}>
                                                <p className="mb-1.5 text-sm font-semibold text-slate-800">{b.heading}</p>
                                                <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700 marker:text-slate-400">
                                                    {b.items.map(item => <li key={item}>{item}</li>)}
                                                </ul>
                                            </div>
                                        ))}

                                        {body.warnings && body.warnings.length > 0 && (
                                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                                <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-amber-800">
                                                    <AlertTriangle className="h-4 w-4" />
                                                    {tx('ข้อควรระวัง', 'Watch out')}
                                                </p>
                                                <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-amber-900 marker:text-amber-500">
                                                    {body.warnings.map(w => <li key={w}>{w}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
