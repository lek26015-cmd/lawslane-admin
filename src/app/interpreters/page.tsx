'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCloudflareVariantUrl } from '@/lib/cloudflare-images';
import { listInterpretersAction } from '@/app/actions/interpreter-admin-actions';
import {
    INTERPRETER_LANGUAGE_LABELS,
    INTERPRETER_SERVICE_LABELS,
    INTERPRETER_STATUS_LABELS,
    type AdminInterpreterRow,
} from '@/lib/interpreter-admin-types';

export default function AdminInterpretersPage() {
    const [status, setStatus] = useState('pending');
    const [rows, setRows] = useState<AdminInterpreterRow[] | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        setRows(null);
        setError('');
        listInterpretersAction(status).then(setRows).catch(() => { setRows([]); setError('ไม่มีสิทธิ์ หรือโหลดข้อมูลไม่สำเร็จ'); });
    }, [status]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold font-headline">ล่าม</h1>
            <Tabs value={status} onValueChange={setStatus}>
                <TabsList>
                    {['pending', 'approved', 'rejected', 'suspended', 'all'].map(s => (
                        <TabsTrigger key={s} value={s}>{s === 'all' ? 'ทั้งหมด' : INTERPRETER_STATUS_LABELS[s]}</TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
            <Card className="rounded-xl">
                <CardHeader><CardTitle>รายชื่อ</CardTitle></CardHeader>
                <CardContent>
                    {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
                    {!rows ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ชื่อ</TableHead>
                                    <TableHead>ภาษา</TableHead>
                                    <TableHead>บริการ</TableHead>
                                    <TableHead>ราคาเริ่มต้น</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead>สมัครเมื่อ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.length === 0 && (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">ไม่มีรายการ</TableCell></TableRow>
                                )}
                                {rows.map(r => (
                                    <TableRow key={r.id}>
                                        <TableCell>
                                            <Link href={`/interpreters/${r.id}`} className="font-medium hover:underline flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    {r.imageUrl && <AvatarImage src={getCloudflareVariantUrl(r.imageUrl, 'avatar')} alt={r.name} className="object-cover" />}
                                                    <AvatarFallback className="text-xs">{r.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                {r.name}{r.verified && <BadgeCheck className="w-4 h-4 text-emerald-600" />}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-sm">{r.languageCodes.map(c => INTERPRETER_LANGUAGE_LABELS[c] || c).join(', ')}</TableCell>
                                        <TableCell className="text-sm">{r.services.map(s => INTERPRETER_SERVICE_LABELS[s] || s).join(', ')}</TableCell>
                                        <TableCell>{r.minPrice === null ? '—' : `฿${r.minPrice.toLocaleString('th-TH')}`}</TableCell>
                                        <TableCell><Badge variant="secondary">{INTERPRETER_STATUS_LABELS[r.status] || r.status}</Badge></TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleDateString('th-TH') : '—'}</TableCell>
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
