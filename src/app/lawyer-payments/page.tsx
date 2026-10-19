'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listLawyerPaymentsAction, type AdminLawyerPayment } from '@/app/actions/lawyer-payment-admin-actions';
import { formatSatang } from '@/lib/interpreter-admin-types';
import { lawyerPaymentStatusLabel } from '@/lib/lawyer-payment-labels';

const FILTERS: { value: string; label: string }[] = [
    { value: 'review', label: 'สลิปรอตรวจ' },
    { value: 'held', label: 'รอปิดเคส' },
    { value: 'due', label: 'รอโอนให้ทนาย' },
    { value: 'refund', label: 'รอคืนเงิน' },
    { value: 'all', label: 'ทั้งหมด' },
];

/** ค่าทนายที่ลูกความชำระเข้าบัญชีระบบ (PLAN-10) */
export default function AdminLawyerPaymentsPage() {
    return <Suspense fallback={null}><LawyerPaymentsList /></Suspense>;
}

function LawyerPaymentsList() {
    const params = useSearchParams();
    const initial = params.get('tab');
    const [filter, setFilter] = useState(FILTERS.some(f => f.value === initial) ? initial! : 'review');
    const [rows, setRows] = useState<AdminLawyerPayment[] | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        setRows(null);
        setError('');
        listLawyerPaymentsAction(filter).then(setRows).catch(() => { setRows([]); setError('ไม่มีสิทธิ์ หรือโหลดข้อมูลไม่สำเร็จ'); });
    }, [filter]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">ค่าทนาย</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    ลูกความโอนค่าทนายเข้าบัญชีระบบ · Lawslane หัก GP แล้วโอนยอดสุทธิให้ทนายหลังปิดเคส · โอนให้ทนายที่เมนู &quot;จ่ายเงินทนาย&quot;
                </p>
            </div>
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
                                    <TableHead>ชำระเมื่อ</TableHead>
                                    <TableHead>เคส / รายการ</TableHead>
                                    <TableHead>ทนาย</TableHead>
                                    <TableHead className="text-right">ยอดเต็ม</TableHead>
                                    <TableHead className="text-right">ทนายได้</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.length === 0 && (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">ไม่มีรายการ</TableCell></TableRow>
                                )}
                                {rows.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="text-sm">
                                            <Link href={`/lawyer-payments/${p.id}`} className="hover:underline">
                                                {p.createdAt ? new Date(p.createdAt).toLocaleString('th-TH') : '—'}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {p.caseTitle || '—'}
                                            <span className="block text-muted-foreground">{p.description}</span>
                                        </TableCell>
                                        <TableCell className="text-sm">{p.lawyerName || '—'}</TableCell>
                                        <TableCell className="text-right">฿{formatSatang(p.grossAmount)}</TableCell>
                                        <TableCell className="text-right text-sm">฿{formatSatang(p.netToLawyer)}<span className="block text-xs text-muted-foreground">GP {p.gpPercent}%</span></TableCell>
                                        <TableCell><Badge variant="secondary">{lawyerPaymentStatusLabel(p)}</Badge></TableCell>
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
