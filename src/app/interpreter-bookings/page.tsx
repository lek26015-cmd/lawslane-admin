'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listInterpreterBookingsAction } from '@/app/actions/interpreter-admin-actions';
import { listInterpreterRequestsAction, type InterpreterRequestRow } from '@/app/actions/interpreter-payment-link-actions';
import {
    INTERPRETER_BOOKING_STATUS_LABELS,
    INTERPRETER_LANGUAGE_LABELS,
    INTERPRETER_SERVICE_LABELS,
    formatSatang,
    type AdminInterpreterBooking,
} from '@/lib/interpreter-admin-types';

// ลิงก์ชำระเงินล่าสุดของตั๋ว (ตรงกับแผงลิงก์ในหน้าตั๋ว)
const LINK_STATUS_LABELS: Record<string, string> = {
    open: 'ส่งลิงก์แล้ว รอชำระ',
    pending_review: 'แนบสลิปแล้ว รอตรวจ',
    paid: 'ชำระแล้ว',
    cancelled: 'ลิงก์ถูกยกเลิก',
    expired: 'ลิงก์หมดอายุ',
};

const FILTERS: { value: string; label: string }[] = [
    { value: 'requests', label: 'คำขอจากลูกค้า' },
    { value: 'slip', label: 'สลิปรอตรวจ' },
    { value: 'paid', label: 'รอล่ามรับ' },
    { value: 'accepted', label: 'ล่ามรับแล้ว' },
    { value: 'refund', label: 'รอคืนเงิน' },
    { value: 'completed', label: 'เสร็จสิ้น' },
    { value: 'all', label: 'ทั้งหมด' },
];

export default function AdminInterpreterBookingsPage() {
    const [filter, setFilter] = useState('requests');
    const [rows, setRows] = useState<AdminInterpreterBooking[] | null>(null);
    const [requests, setRequests] = useState<InterpreterRequestRow[] | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        setError('');
        const onError = () => setError('ไม่มีสิทธิ์ หรือโหลดข้อมูลไม่สำเร็จ');
        if (filter === 'requests') {
            setRequests(null);
            listInterpreterRequestsAction().then(setRequests).catch(() => { setRequests([]); onError(); });
            return;
        }
        setRows(null);
        listInterpreterBookingsAction(filter).then(setRows).catch(() => { setRows([]); onError(); });
    }, [filter]);

    // ยังไม่ปิดตั๋วขึ้นก่อน แล้วใหม่สุดก่อน (action เรียงตามเวลามาแล้ว)
    const sortedRequests = requests && [...requests].sort((a, b) => Number(a.status === 'resolved') - Number(b.status === 'resolved'));

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold font-headline">งานล่าม</h1>
            <Tabs value={filter} onValueChange={setFilter}>
                <TabsList className="flex flex-wrap h-auto">
                    {FILTERS.map(f => <TabsTrigger key={f.value} value={f.value}>{f.label}</TabsTrigger>)}
                </TabsList>
            </Tabs>
            <Card className="rounded-xl">
                <CardContent className="pt-6">
                    {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
                    {filter === 'requests' ? (
                        !sortedRequests ? (
                            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground mb-4">
                                    คำขอจากหน้าล่ามของเว็บหลัก กดเพื่อเปิดแชทกับลูกค้าและสร้างลิงก์ชำระเงิน เมื่อลูกค้าแนบสลิปแล้วงานจะไปอยู่แท็บ "สลิปรอตรวจ"
                                </p>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ขอเมื่อ</TableHead>
                                            <TableHead>ลูกค้า</TableHead>
                                            <TableHead>บริการ</TableHead>
                                            <TableHead>วันที่ต้องการ / รูปแบบ</TableHead>
                                            <TableHead>ลิงก์ชำระเงิน</TableHead>
                                            <TableHead>ตั๋ว</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedRequests.length === 0 && (
                                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">ไม่มีรายการ</TableCell></TableRow>
                                        )}
                                        {sortedRequests.map(r => (
                                            <TableRow key={r.ticketId} className={r.status === 'resolved' ? 'opacity-60' : undefined}>
                                                <TableCell className="text-sm">
                                                    <Link href={`/tickets/${r.ticketId}`} className="hover:underline">
                                                        {r.reportedAt ? new Date(r.reportedAt).toLocaleString('th-TH') : '—'}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>{r.clientName || '—'}</TableCell>
                                                <TableCell className="text-sm">
                                                    {INTERPRETER_SERVICE_LABELS[r.service] || r.service || '—'}
                                                    {r.languageFrom && (
                                                        <span className="text-muted-foreground"> · {INTERPRETER_LANGUAGE_LABELS[r.languageFrom] || r.languageFrom}→{INTERPRETER_LANGUAGE_LABELS[r.languageTo] || r.languageTo}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {r.date || 'ยังไม่แน่นอน'}
                                                    <span className="text-muted-foreground"> · {r.mode === 'remote' ? 'ออนไลน์' : 'ไปที่สถานที่'}{r.location ? ` · ${r.location}` : ''}</span>
                                                </TableCell>
                                                <TableCell>
                                                    {r.linkStatus
                                                        ? <Badge variant="secondary">{LINK_STATUS_LABELS[r.linkStatus] || r.linkStatus}</Badge>
                                                        : <Badge>ยังไม่ส่งลิงก์</Badge>}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{r.status === 'resolved' ? 'ปิดแล้ว' : 'เปิดอยู่'}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </>
                        )
                    ) : !rows ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>จองเมื่อ</TableHead>
                                    <TableHead>ล่าม</TableHead>
                                    <TableHead>บริการ</TableHead>
                                    <TableHead>วันงาน / จำนวน</TableHead>
                                    <TableHead className="text-right">ยอด</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.length === 0 && (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">ไม่มีรายการ</TableCell></TableRow>
                                )}
                                {rows.map(b => (
                                    <TableRow key={b.id}>
                                        <TableCell className="text-sm">
                                            <Link href={`/interpreter-bookings/${b.id}`} className="hover:underline">
                                                {b.createdAt ? new Date(b.createdAt).toLocaleString('th-TH') : '—'}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            {b.interpreterName}
                                            {b.external && <Badge variant="outline" className="ml-2 border-amber-300 bg-amber-50 text-amber-800">นอกระบบ</Badge>}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {INTERPRETER_SERVICE_LABELS[b.serviceType] || b.serviceType}
                                            <span className="text-muted-foreground"> · {INTERPRETER_LANGUAGE_LABELS[b.languagePair.from]}→{INTERPRETER_LANGUAGE_LABELS[b.languagePair.to]}</span>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {b.startAt
                                                ? `${new Date(b.startAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} (${b.days ? `${b.days} วัน` : `${b.durationHours} ชม.`})`
                                                : b.pageCount ? `${b.pageCount} หน้า` : (b.quote.itemName || 'นัดในแชท')}
                                        </TableCell>
                                        <TableCell className="text-right">฿{formatSatang(b.quote.grossAmount)}</TableCell>
                                        <TableCell><Badge variant="secondary">{INTERPRETER_BOOKING_STATUS_LABELS[b.status] || b.status}</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
