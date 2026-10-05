'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, FileSignature, User, CheckCircle2, Clock, Paperclip, Link2, Lock, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAdminLocale } from '@/lib/admin-i18n';
import type { AdminContractDetail, AdminContractParty } from '@/lib/capdeal-contract-view';

const STATUS_LABEL: Record<string, [string, string]> = {
    draft: ['ฉบับร่าง', 'Draft'],
    pending: ['รอลงนาม', 'Pending'],
    signed: ['ลงนามแล้ว', 'Signed'],
    succeeded: ['สำเร็จ', 'Succeeded'],
    completed: ['เสร็จสิ้น', 'Completed'],
    active: ['ใช้งานอยู่', 'Active'],
    canceled: ['ยกเลิกแล้ว', 'Cancelled'],
    cancelled: ['ยกเลิกแล้ว', 'Cancelled'],
    failed: ['ล้มเหลว', 'Failed'],
};

const CATEGORY_LABEL: Record<string, [string, string, string, string]> = {
    // [ชื่อสัญญา TH, EN, ฝ่ายที่ 1, ฝ่ายที่ 2]
    employment: ['สัญญาจ้างงาน', 'Employment', 'ผู้ว่าจ้าง', 'ผู้รับจ้าง'],
    sales: ['สัญญาซื้อขาย', 'Sales', 'ผู้ซื้อ', 'ผู้ขาย'],
    loan: ['สัญญากู้ยืม', 'Loan', 'ผู้ให้กู้', 'ผู้กู้'],
    service: ['สัญญาจ้างทำของ/บริการ', 'Service', 'ผู้ว่าจ้าง', 'ผู้รับจ้าง'],
    nda: ['สัญญารักษาความลับ', 'NDA', 'ฝ่ายเปิดเผย', 'ฝ่ายรับข้อมูล'],
    other: ['สัญญาอื่นๆ', 'Other', 'คู่สัญญาฝ่ายที่ 1', 'คู่สัญญาฝ่ายที่ 2'],
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[140px_1fr] gap-3 py-2.5 border-b border-slate-50 last:border-0 text-sm">
            <dt className="text-slate-500">{label}</dt>
            <dd className="text-slate-900 min-w-0 break-words">{children}</dd>
        </div>
    );
}

export default function AdminContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { tx, locale } = useAdminLocale();
    const [contract, setContract] = useState<AdminContractDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);

    const dateLocale = locale === 'en' ? 'en-US' : 'th-TH';
    const fmtDate = (iso: string | null, withTime = false) =>
        iso ? new Date(iso).toLocaleString(dateLocale, withTime
            ? { dateStyle: 'medium', timeStyle: 'short' }
            : { dateStyle: 'medium' }) : '-';
    const fmtMoney = (n: number) => `฿${n.toLocaleString(dateLocale)}`;

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/capdeal/contracts/${encodeURIComponent(id)}`, { cache: 'no-store' });
                const body = await res.json().catch(() => ({}));
                if (cancelled) return;
                if (!res.ok) {
                    setError(res.status === 404 ? tx('ไม่พบสัญญานี้', 'Contract not found') : body?.error || tx('โหลดสัญญาไม่สำเร็จ', 'Failed to load contract'));
                } else {
                    setContract(body.contract);
                }
            } catch {
                if (!cancelled) setError(tx('โหลดสัญญาไม่สำเร็จ', 'Failed to load contract'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, reloadKey]);

    const back = (
        <Link href="/capdeal/contracts" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> {tx('กลับไปรายการสัญญา', 'Back to contracts')}
        </Link>
    );

    if (loading) {
        return (
            <div className="space-y-6">
                {back}
                <div className="p-20 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
            </div>
        );
    }

    if (error || !contract) {
        return (
            <div className="space-y-6">
                {back}
                <Card className="border-none shadow-sm rounded-3xl">
                    <CardContent className="p-12 flex flex-col items-center text-center gap-3">
                        <AlertCircle className="w-10 h-10 text-rose-400" />
                        <p className="text-slate-700 font-medium">{error}</p>
                        <p className="text-xs text-slate-400 font-mono">{id}</p>
                        <Button variant="outline" className="rounded-xl" onClick={() => setReloadKey((k) => k + 1)}>
                            <RefreshCw className="w-4 h-4 mr-2" /> {tx('ลองใหม่', 'Retry')}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const cat = CATEGORY_LABEL[contract.category ?? ''] ?? null;
    const p1 = contract.source === 'lawyer' ? tx('ลูกความ', 'Client') : cat ? cat[2] : tx('ผู้ว่าจ้าง', 'Employer');
    const p2 = contract.source === 'lawyer' ? tx('ทนายความ', 'Lawyer') : cat ? cat[3] : tx('ผู้รับจ้าง', 'Contractor');
    const statusLabel = STATUS_LABEL[contract.status];

    const partyCard = (role: string, p: AdminContractParty) => (
        <Card className="border-none shadow-sm rounded-3xl">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /> {role}</span>
                    {p.signed ? (
                        <Badge className="rounded-full bg-emerald-50 text-emerald-600 border-none"><CheckCircle2 className="w-3 h-3 mr-1" />{tx('ลงนามแล้ว', 'Signed')}</Badge>
                    ) : (
                        <Badge className="rounded-full bg-slate-100 text-slate-500 border-none"><Clock className="w-3 h-3 mr-1" />{tx('ยังไม่ลงนาม', 'Not signed')}</Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <dl>
                    <Row label={tx('ชื่อ', 'Name')}>{p.name || '-'}</Row>
                    <Row label={tx('อีเมล', 'Email')}>{p.email || '-'}</Row>
                    <Row label={tx('เลขบัตรประชาชน', 'National ID')}>{p.idCardLast4 ? `•••••••••${p.idCardLast4}` : '-'}</Row>
                    <Row label={tx('ที่อยู่', 'Address')}>{p.address || '-'}</Row>
                    <Row label={tx('เบอร์ยืนยัน OTP', 'OTP phone')}>{p.phoneLast4 ? `••••••${p.phoneLast4}` : '-'}</Row>
                    <Row label={tx('เวลาลงนาม', 'Signed at')}>{fmtDate(p.signedAt, true)}</Row>
                </dl>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6 max-w-5xl">
            {back}

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                        <FileSignature className="w-4 h-4" />
                        {contract.source === 'lawyer'
                            ? tx('สัญญาจ้างทนาย (เว็บหลัก)', 'Lawyer engagement (main site)')
                            : cat ? tx(cat[0], cat[1]) : tx('สัญญา CapDeal', 'CapDeal contract')}
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 break-words">{contract.title || tx('ไม่มีชื่อ', 'Untitled')}</h2>
                    <p className="text-xs text-slate-400 font-mono mt-1">{contract.id}</p>
                </div>
                <Badge className={cn(
                    'self-start rounded-full px-3 py-1 text-xs font-bold border-none',
                    ['signed', 'succeeded', 'completed'].includes(contract.status) ? 'bg-emerald-50 text-emerald-600'
                        : contract.status === 'draft' ? 'bg-amber-50 text-amber-600'
                            : ['canceled', 'cancelled', 'failed'].includes(contract.status) ? 'bg-rose-50 text-rose-600'
                                : 'bg-slate-100 text-slate-600',
                )}>
                    {statusLabel ? tx(...statusLabel) : contract.status.toUpperCase()}
                </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-none shadow-sm rounded-3xl md:col-span-2">
                    <CardHeader className="pb-2"><CardTitle className="text-base">{tx('รายละเอียดงานและค่าตอบแทน', 'Scope & payment')}</CardTitle></CardHeader>
                    <CardContent>
                        <dl>
                            <Row label={tx('งานที่ตกลง', 'Task')}><span className="whitespace-pre-wrap">{contract.task || '-'}</span></Row>
                            <Row label={tx('ค่าตอบแทน', 'Price')}><span className="font-bold">{fmtMoney(contract.price)}</span></Row>
                            <Row label={tx('มัดจำ', 'Deposit')}>{contract.deposit ? fmtMoney(contract.deposit) : '-'}</Row>
                            <Row label={tx('เงื่อนไขการชำระ', 'Payment terms')}><span className="whitespace-pre-wrap">{contract.paymentTerms || '-'}</span></Row>
                            <Row label={tx('กำหนดส่งมอบ', 'Deadline')}>{contract.deadline || '-'}</Row>
                            {contract.content && (
                                <Row label={tx('เนื้อหาเพิ่มเติม', 'Content')}><span className="whitespace-pre-wrap">{contract.content}</span></Row>
                            )}
                            <Row label={tx('หมายเหตุ', 'Notes')}><span className="whitespace-pre-wrap">{contract.notes || '-'}</span></Row>
                        </dl>
                    </CardContent>
                </Card>

                {partyCard(p1, contract.employer)}
                {partyCard(p2, contract.contractor)}

                <Card className="border-none shadow-sm rounded-3xl">
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Paperclip className="w-4 h-4 text-slate-400" /> {tx('เอกสารแนบ', 'Attachments')}</CardTitle></CardHeader>
                    <CardContent>
                        {contract.attachments.length === 0 ? (
                            <p className="text-sm text-slate-400">{tx('ไม่มีเอกสารแนบ', 'No attachments')}</p>
                        ) : (
                            <ul className="space-y-2">
                                {contract.attachments.map((a, i) => (
                                    <li key={i}>
                                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 hover:underline break-all">
                                            {a.name}
                                        </a>
                                        {a.type && <span className="ml-2 text-xs text-slate-400">{a.type}</span>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm rounded-3xl">
                    <CardHeader className="pb-2"><CardTitle className="text-base">{tx('ข้อมูลระบบ', 'System')}</CardTitle></CardHeader>
                    <CardContent>
                        <dl>
                            <Row label={tx('ผู้สร้าง (UID)', 'Owner UID')}><span className="font-mono text-xs">{contract.ownerId || '-'}</span></Row>
                            {contract.companyId && <Row label={tx('บริษัท', 'Company')}><span className="font-mono text-xs">{contract.companyId}</span></Row>}
                            <Row label={tx('สร้างเมื่อ', 'Created')}>{fmtDate(contract.createdAt, true)}</Row>
                            <Row label={tx('แก้ไขล่าสุด', 'Updated')}>{fmtDate(contract.updatedAt, true)}</Row>
                            <Row label={tx('ลิงก์แชร์', 'Share link')}>
                                <span className="inline-flex items-center gap-1.5">
                                    <Link2 className="w-3.5 h-3.5 text-slate-400" />
                                    {contract.hasShareLink ? tx('สร้างแล้ว', 'Created') : tx('ยังไม่สร้าง', 'None')}
                                    {contract.isPinProtected && (
                                        <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Lock className="w-3 h-3" />PIN</span>
                                    )}
                                </span>
                            </Row>
                            {contract.signedTermsHash && (
                                <Row label={tx('แฮชข้อตกลงที่ลงนาม', 'Signed terms hash')}><span className="font-mono text-xs break-all">{contract.signedTermsHash}</span></Row>
                            )}
                        </dl>
                        <p className="mt-3 text-[11px] text-slate-400">
                            {tx('เลขบัตรและเบอร์โทรแสดง 4 ตัวท้าย · ไม่แสดงภาพลายเซ็นและรหัสลิงก์แชร์', 'ID and phone show last 4 digits only · signatures and share codes are not shown')}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
