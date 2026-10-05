'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listInterpreterBookingsAction } from '@/app/actions/interpreter-admin-actions';
import {
    INTERPRETER_BOOKING_STATUS_LABELS,
    INTERPRETER_LANGUAGE_LABELS,
    INTERPRETER_SERVICE_LABELS,
    formatSatang,
    type AdminInterpreterBooking,
} from '@/lib/interpreter-admin-types';

const FILTERS: { value: string; label: string }[] = [
    { value: 'slip', label: 'สลิปรอตรวจ' },
    { value: 'paid', label: 'รอล่ามรับ' },
    { value: 'accepted', label: 'ล่ามรับแล้ว' },
    { value: 'refund', label: 'รอคืนเงิน' },
    { value: 'completed', label: 'เสร็จสิ้น' },
    { value: 'all', label: 'ทั้งหมด' },
];

export default function AdminInterpreterBookingsPage() {
    const [filter, setFilter] = useState('slip');
    const [rows, setRows] = useState<AdminInterpreterBooking[] | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        setRows(null);
        setError('');
        listInterpreterBookingsAction(filter).then(setRows).catch(() => { setRows([]); setError('ไม่มีสิทธิ์ หรือโหลดข้อมูลไม่สำเร็จ'); });
    }, [filter]);

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
                    {!rows ? (
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
                                        <TableCell>{b.interpreterName}</TableCell>
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
