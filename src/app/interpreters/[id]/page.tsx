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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getInterpreterDetailAction, setInterpreterStatusAction } from '@/app/actions/interpreter-admin-actions';
import {
    INTERPRETER_LANGUAGE_LABELS,
    INTERPRETER_SERVICE_LABELS,
    INTERPRETER_STATUS_LABELS,
    RATE_UNIT_LABELS,
    type AdminInterpreterDetail,
} from '@/lib/interpreter-admin-types';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-3 gap-2 py-2 border-b last:border-0 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="col-span-2 break-words">{children}</span>
        </div>
    );
}

export default function AdminInterpreterDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { toast } = useToast();
    const [d, setD] = useState<AdminInterpreterDetail | null | undefined>(undefined);
    const [reason, setReason] = useState('');
    const [credentials, setCredentials] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(() => {
        getInterpreterDetailAction(id)
            .then(res => { setD(res); setCredentials((res?.verifiedCredentials || []).join(', ')); })
            .catch(() => setD(null));
    }, [id]);
    useEffect(load, [load]);

    const setStatus = async (status: 'approved' | 'rejected' | 'suspended') => {
        setSaving(true);
        const res = await setInterpreterStatusAction({
            id,
            status,
            reason,
            verifiedCredentials: credentials.split(',').map(s => s.trim()).filter(Boolean),
        });
        setSaving(false);
        if (!res.ok) return toast({ variant: 'destructive', title: res.error });
        toast({ title: 'บันทึกแล้ว' });
        setReason('');
        load();
    };

    if (d === undefined) return <div className="flex justify-center py-24"><Loader2 className="animate-spin" /></div>;
    if (d === null) return <p className="text-muted-foreground">ไม่พบล่าม หรือไม่มีสิทธิ์</p>;

    return (
        <div className="space-y-6 max-w-5xl">
            <Link href="/interpreters" className="text-sm text-muted-foreground inline-flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> ล่ามทั้งหมด</Link>
            <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold font-headline">{d.name}</h1>
                <Badge variant="secondary">{INTERPRETER_STATUS_LABELS[d.status] || d.status}</Badge>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="rounded-xl">
                    <CardHeader><CardTitle>ข้อมูลโปรไฟล์ (สาธารณะ)</CardTitle></CardHeader>
                    <CardContent>
                        <Row label="แนะนำตัว"><span className="whitespace-pre-line">{d.description}</span></Row>
                        <Row label="ภาษา">{d.languages.map(l => `${INTERPRETER_LANGUAGE_LABELS[l.code] || l.code} (${l.level})`).join(', ')}</Row>
                        <Row label="บริการ">{d.services.map(s => INTERPRETER_SERVICE_LABELS[s] || s).join(', ')}</Row>
                        <Row label="จังหวัด">{d.serviceProvinces.join(', ') || '—'}{d.remoteAvailable ? ' · รับงานออนไลน์' : ''}</Row>
                        <Row label="เรทการ์ด">
                            {d.rateCard.length === 0 ? '—' : (
                                <ul className="space-y-1">
                                    {d.rateCard.map(r => (
                                        <li key={r.id}>
                                            <span className="font-medium">{r.name}</span> · {RATE_UNIT_LABELS[r.unit] || r.unit} · ฿{Number(r.price).toLocaleString('th-TH')}
                                            {r.unit === 'session' && ` (${r.sessionHours} ชม./ครั้ง)`}
                                            {(r.unit === 'hour' || r.unit === 'page') && r.minQty > 1 && ` (ขั้นต่ำ ${r.minQty})`}
                                            {r.description && <span className="block text-xs text-muted-foreground">{r.description}</span>}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Row>
                        <Row label="สมัครเมื่อ">{d.createdAt ? new Date(d.createdAt).toLocaleString('th-TH') : '—'}</Row>
                    </CardContent>
                </Card>
                <Card className="rounded-xl">
                    <CardHeader><CardTitle>ข้อมูลส่วนตัวและเอกสาร</CardTitle></CardHeader>
                    <CardContent>
                        <Row label="อีเมล">{d.email || '—'}</Row>
                        <Row label="โทร">{d.phone || '—'}</Row>
                        <Row label="LINE">{d.lineId || '—'}</Row>
                        <Row label="บัญชีรับเงิน">{d.bankName ? `${d.bankName} ${d.bankAccountNumber} (${d.bankAccountName})` : 'ยังไม่ตั้ง'}</Row>
                        <Row label="บัตร/พาสปอร์ต">
                            {d.idCardUrl ? <a href={d.idCardUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 inline-flex items-center gap-1">เปิดดู <ExternalLink className="w-3 h-3" /></a> : '—'}
                        </Row>
                        <Row label="ใบรับรอง">
                            {d.certificateUrls.length === 0 ? '—' : d.certificateUrls.map((u, i) => (
                                <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="text-blue-600 inline-flex items-center gap-1 mr-3">ไฟล์ {i + 1} <ExternalLink className="w-3 h-3" /></a>
                            ))}
                        </Row>
                        <p className="text-xs text-muted-foreground mt-2">ลิงก์เอกสารหมดอายุใน 15 นาที</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="rounded-xl">
                <CardHeader><CardTitle>การอนุมัติ</CardTitle></CardHeader>
                <CardContent className="space-y-4 max-w-xl">
                    <div className="space-y-1">
                        <Label htmlFor="cred">เอกสารที่ตรวจแล้ว (คั่นด้วยจุลภาค)</Label>
                        <Input id="cred" value={credentials} placeholder="เช่น ใบรับรองล่ามศาล, ปริญญาภาษาญี่ปุ่น" onChange={e => setCredentials(e.target.value)} />
                        <p className="text-xs text-muted-foreground">มีค่าอย่างน้อย 1 รายการ = แสดงป้าย &quot;ตรวจสอบเอกสารแล้ว&quot; บนเว็บ ใส่เฉพาะสิ่งที่ตรวจจริง</p>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="reason">เหตุผล (ต้องใส่เมื่อปฏิเสธ/ระงับ — ล่ามเห็นข้อความนี้)</Label>
                        <Textarea id="reason" value={reason} maxLength={500} onChange={e => setReason(e.target.value)} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button disabled={saving} onClick={() => setStatus('approved')}>
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{d.status === 'approved' ? 'บันทึกเอกสารที่ตรวจ' : 'อนุมัติ'}
                        </Button>
                        {d.status !== 'rejected' && d.status !== 'approved' && (
                            <Button disabled={saving} variant="outline" onClick={() => setStatus('rejected')}>ปฏิเสธ</Button>
                        )}
                        {d.status === 'approved' && (
                            <Button disabled={saving} variant="destructive" onClick={() => setStatus('suspended')}>ระงับ</Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
