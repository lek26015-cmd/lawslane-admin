'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
    getLawyerPaymentDetailAction,
    markLawyerPaymentRefundedAction,
    reviewLawyerSlipAction,
} from '@/app/actions/lawyer-payment-admin-actions';
import { formatSatang } from '@/lib/interpreter-admin-types';
import { lawyerPaymentStatusLabel } from '@/lib/lawyer-payment-labels';

type Detail = NonNullable<Awaited<ReturnType<typeof getLawyerPaymentDetailAction>>>;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex justify-between gap-4 py-1.5 text-sm border-b last:border-0">
            <span className="text-muted-foreground shrink-0">{label}</span>
            <span className="text-right">{children}</span>
        </div>
    );
}

export default function AdminLawyerPaymentDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { toast } = useToast();
    const [d, setD] = useState<Detail | null | undefined>(undefined);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        getLawyerPaymentDetailAction(id).then(setD).catch(() => setD(null));
    }, [id]);
    useEffect(load, [load]);

    const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, confirmText: string) => {
        if (!window.confirm(confirmText)) return;
        setBusy(true);
        const res = await fn();
        setBusy(false);
        if (!res.ok) return toast({ variant: 'destructive', title: (res as any).error });
        toast({ title: 'บันทึกแล้ว' });
        setNote('');
        load();
    };

    if (d === undefined) return <div className="flex justify-center py-24"><Loader2 className="animate-spin" /></div>;
    if (d === null) return <p className="text-muted-foreground">ไม่พบรายการ หรือไม่มีสิทธิ์</p>;
    const p = d.payment;

    return (
        <div className="space-y-6 max-w-5xl">
            <Link href="/lawyer-payments" className="text-sm text-muted-foreground inline-flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> ค่าทนายทั้งหมด</Link>
            <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold font-headline">{p.caseTitle || 'เคส'} · {p.description}</h1>
                <Badge variant="secondary">{lawyerPaymentStatusLabel(p)}</Badge>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="rounded-xl">
                    <CardHeader><CardTitle>เงิน</CardTitle></CardHeader>
                    <CardContent>
                        <Row label="ลูกความจ่าย"><span className="font-bold">฿{formatSatang(p.grossAmount)}</span></Row>
                        <Row label={`GP ${p.gpPercent}%`}>฿{formatSatang(p.gpAmount)}</Row>
                        <Row label="ทนายได้รับ">฿{formatSatang(p.netToLawyer)}</Row>
                        <Row label="สลิป">{p.slipVerified ? 'SlipOK ตรวจผ่าน' : 'ยังไม่ผ่านการตรวจอัตโนมัติ'}</Row>
                        <Row label="โอนให้ทนาย">{p.payoutId ? `โอนแล้ว (${p.payoutId})` : lawyerPaymentStatusLabel(p)}</Row>
                        {p.reviewNote && <Row label="หมายเหตุตรวจสลิป">{p.reviewNote}</Row>}
                        {p.refundReference && <Row label="อ้างอิงการคืนเงิน">{p.refundReference}</Row>}
                        {d.slipImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={d.slipImage} alt="slip" className="mt-3 max-h-96 rounded-lg border object-contain" />
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-xl">
                    <CardHeader><CardTitle>รายละเอียด</CardTitle></CardHeader>
                    <CardContent>
                        <Row label="เคส"><Link className="text-blue-600" href={`/chats/${p.chatId}`}>{p.caseTitle || p.chatId}</Link></Row>
                        <Row label="สถานะเคส">{d.chatStatus === 'closed' ? 'ปิดเคสแล้ว' : d.chatStatus === 'cancelled' ? 'ยกเลิกแล้ว' : 'กำลังดำเนินการ'}</Row>
                        <Row label="รายการ">{p.description}</Row>
                        <Row label="ทนาย"><Link className="text-blue-600" href={`/lawyers/${p.lawyerProfileId}`}>{p.lawyerName || p.lawyerProfileId}</Link></Row>
                        <Row label="ลูกความ">{d.client.name || '—'} · {d.client.email || '—'} · {d.client.phone || '—'}</Row>
                        <Row label="ชำระเมื่อ">{p.createdAt ? new Date(p.createdAt).toLocaleString('th-TH') : '—'}</Row>
                    </CardContent>
                </Card>
            </div>

            {(p.status === 'pending_review' || p.status === 'refund_pending') && (
                <Card className="rounded-xl">
                    <CardHeader><CardTitle>จัดการ</CardTitle></CardHeader>
                    <CardContent className="space-y-4 max-w-xl">
                        <div className="space-y-1">
                            <Label htmlFor="note">{p.status === 'refund_pending' ? 'เลขอ้างอิงการโอนคืน' : 'หมายเหตุ (ลูกความเห็นถ้าสลิปไม่ผ่าน)'}</Label>
                            <Input id="note" value={note} maxLength={500} onChange={e => setNote(e.target.value)} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {p.status === 'pending_review' && (
                                <>
                                    <Button disabled={busy} onClick={() => run(() => reviewLawyerSlipAction(p.id, true, note), `ยืนยันว่าได้รับเงิน ฿${formatSatang(p.grossAmount)} เข้าบัญชีระบบจริง?`)}>
                                        ยืนยันสลิป (ได้รับเงินแล้ว)
                                    </Button>
                                    <Button disabled={busy} variant="outline" onClick={() => run(() => reviewLawyerSlipAction(p.id, false, note), 'ปฏิเสธสลิปนี้? ลูกความจะแนบสลิปใหม่ได้')}>
                                        สลิปไม่ถูกต้อง
                                    </Button>
                                </>
                            )}
                            {p.status === 'refund_pending' && (
                                <Button disabled={busy || !note} onClick={() => run(() => markLawyerPaymentRefundedAction(p.id, note), `ยืนยันว่าโอนคืนลูกความ ฿${formatSatang(p.grossAmount)} แล้ว?`)}>
                                    บันทึกว่าคืนเงินแล้ว
                                </Button>
                            )}
                        </div>
                        {p.status === 'refund_pending' && (
                            <p className="text-xs text-muted-foreground">โอนคืนลูกความนอกระบบเต็มจำนวน แล้วกรอกเลขอ้างอิง (ต้องมีสิทธิ์ &quot;จ่ายเงินทนาย&quot;)</p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
