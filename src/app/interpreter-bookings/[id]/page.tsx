'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
    adminCancelInterpreterBookingAction,
    getInterpreterBookingDetailAction,
    markInterpreterRefundedAction,
    reviewInterpreterSlipAction,
} from '@/app/actions/interpreter-admin-actions';
import {
    INTERPRETER_BOOKING_STATUS_LABELS,
    INTERPRETER_LANGUAGE_LABELS,
    INTERPRETER_SERVICE_LABELS,
    RATE_UNIT_LABELS,
    formatSatang,
} from '@/lib/interpreter-admin-types';

type Detail = NonNullable<Awaited<ReturnType<typeof getInterpreterBookingDetailAction>>>;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-3 gap-2 py-2 border-b last:border-0 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="col-span-2 break-words">{children}</span>
        </div>
    );
}

export default function AdminInterpreterBookingDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { toast } = useToast();
    const [d, setD] = useState<Detail | null | undefined>(undefined);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        getInterpreterBookingDetailAction(id).then(setD).catch(() => setD(null));
    }, [id]);
    useEffect(load, [load]);

    const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, confirmText?: string) => {
        if (confirmText && !window.confirm(confirmText)) return;
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
    const b = d.booking;
    const q = b.quote;

    return (
        <div className="space-y-6 max-w-5xl">
            <Link href="/interpreter-bookings" className="text-sm text-muted-foreground inline-flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> งานล่ามทั้งหมด</Link>
            <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold font-headline">{INTERPRETER_SERVICE_LABELS[b.serviceType] || b.serviceType} · {b.interpreterName}</h1>
                <Badge variant="secondary">{INTERPRETER_BOOKING_STATUS_LABELS[b.status] || b.status}</Badge>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="rounded-xl">
                    <CardHeader><CardTitle>รายละเอียดงาน</CardTitle></CardHeader>
                    <CardContent>
                        <Row label="ล่าม"><Link className="text-blue-600" href={`/interpreters/${b.interpreterId}`}>{b.interpreterName}</Link></Row>
                        <Row label="ลูกค้า (บัญชี)">{d.customer.name || '—'} · {d.customer.email || '—'} · {d.customer.phone || '—'}</Row>
                        <Row label="ติดต่อที่กรอกตอนจอง">{d.bookingContact ? `${d.bookingContact.name} · ${d.bookingContact.phone} · LINE ${d.bookingContact.lineId || '—'}` : '—'}</Row>
                        <Row label="คู่ภาษา">{INTERPRETER_LANGUAGE_LABELS[b.languagePair.from]} → {INTERPRETER_LANGUAGE_LABELS[b.languagePair.to]}</Row>
                        {b.kind === 'interpretation' ? (
                            <>
                                <Row label="วันเวลา">{b.startAt ? `${new Date(b.startAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} (${b.days ? `${b.days} วัน` : `${b.durationHours} ชม.`})` : 'นัดในแชท'}</Row>
                                <Row label="สถานที่">{!b.mode ? 'นัดในแชท' : b.mode === 'remote' ? 'ออนไลน์' : `${b.address} (${b.province})`}</Row>
                            </>
                        ) : (
                            <>
                                <Row label="จำนวนหน้า">{b.pageCount}{b.dueDate ? ` · ต้องการภายใน ${b.dueDate}` : ''}</Row>
                                <Row label="เอกสาร">
                                    {d.documentUrls.map((doc, i) => doc.url
                                        ? <a key={doc.path} href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 inline-flex items-center gap-1 mr-3">ไฟล์ {i + 1} <ExternalLink className="w-3 h-3" /></a>
                                        : <span key={doc.path} className="mr-3">ไฟล์ {i + 1} (เปิดไม่ได้)</span>)}
                                </Row>
                            </>
                        )}
                        {b.lawyerId && <Row label="ผูกกับทนาย">{b.lawyerId}</Row>}
                        {b.notes && <Row label="หมายเหตุลูกค้า"><span className="whitespace-pre-line">{b.notes}</span></Row>}
                        {b.cancelReason && <Row label="เหตุผลยกเลิก/ปฏิเสธ">{b.cancelledBy ? `(${b.cancelledBy}) ` : ''}{b.cancelReason}</Row>}
                    </CardContent>
                </Card>

                <Card className="rounded-xl">
                    <CardHeader><CardTitle>เงิน</CardTitle></CardHeader>
                    <CardContent>
                        <Row label="รายการ">{q.itemName || '—'} ({RATE_UNIT_LABELS[q.unitType] || q.unitType})</Row>
                        <Row label="ราคา">{q.units} × ฿{formatSatang(q.unitRate)}</Row>
                        <Row label="ลูกค้าจ่าย"><span className="font-bold">฿{formatSatang(q.grossAmount)}</span></Row>
                        <Row label={`GP ${q.gpPercent}%`}>฿{formatSatang(q.gpAmount)}</Row>
                        <Row label="ล่ามได้รับ">฿{formatSatang(q.netToInterpreter)}</Row>
                        <Row label="สถานะโอนให้ล่าม">{b.payoutStatus}{b.payoutId ? ` (${b.payoutId})` : ''}</Row>
                        <Row label="สลิป">{b.slipVerified ? 'SlipOK ตรวจผ่าน' : 'ยังไม่ผ่านการตรวจอัตโนมัติ'}</Row>
                        {d.slipImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={d.slipImage} alt="slip" className="mt-3 max-h-96 rounded-lg border object-contain" />
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="rounded-xl">
                <CardHeader><CardTitle>แชทลูกค้า–ล่าม</CardTitle></CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto text-sm">
                    {d.chat.length === 0 && <p className="text-muted-foreground">ยังไม่มีข้อความ</p>}
                    {d.chat.map(m => (
                        <div key={m.id} className="border-b last:border-0 py-2">
                            <p className="text-xs text-muted-foreground">
                                {m.senderRole === 'customer' ? 'ลูกค้า' : m.senderRole === 'interpreter' ? 'ล่าม' : m.senderRole}
                                {m.createdAt ? ` · ${new Date(m.createdAt).toLocaleString('th-TH')}` : ''}
                                {m.offerId ? ' · ใบเสนอราคา' : ''}
                            </p>
                            <p className="whitespace-pre-line">{m.text}</p>
                            {m.originalText && <p className="text-xs text-red-700 whitespace-pre-line">ต้นฉบับก่อนซ่อน: {m.originalText}</p>}
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card className="rounded-xl">
                <CardHeader><CardTitle>จัดการ</CardTitle></CardHeader>
                <CardContent className="space-y-4 max-w-xl">
                    <div className="space-y-1">
                        <Label htmlFor="note">หมายเหตุ / เหตุผล / เลขอ้างอิงการโอนคืน</Label>
                        <Input id="note" value={note} maxLength={500} onChange={e => setNote(e.target.value)} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(b.status === 'pending_payment' || b.status === 'expired') && (
                            <>
                                <Button disabled={busy} onClick={() => run(() => reviewInterpreterSlipAction(b.id, true, note), `ยืนยันว่าได้รับเงิน ฿${formatSatang(q.grossAmount)} จริง?`)}>
                                    ยืนยันสลิป (ได้รับเงินแล้ว)
                                </Button>
                                <Button disabled={busy} variant="outline" onClick={() => run(() => reviewInterpreterSlipAction(b.id, false, note), 'ปฏิเสธสลิปและยกเลิกงานนี้?')}>
                                    สลิปไม่ถูกต้อง
                                </Button>
                            </>
                        )}
                        {['pending_payment', 'paid', 'accepted'].includes(b.status) && (
                            <Button disabled={busy || !note} variant="destructive" onClick={() => run(() => adminCancelInterpreterBookingAction(b.id, note), 'ยกเลิกงานและรอคืนเงินลูกค้า?')}>
                                ยกเลิกงาน (รอคืนเงิน)
                            </Button>
                        )}
                        {b.status === 'refund_pending' && (
                            <Button disabled={busy || !note} onClick={() => run(() => markInterpreterRefundedAction(b.id, note), `ยืนยันว่าโอนคืนลูกค้า ฿${formatSatang(q.grossAmount)} แล้ว?`)}>
                                บันทึกว่าคืนเงินแล้ว
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
