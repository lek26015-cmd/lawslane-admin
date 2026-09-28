'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Copy, Link2, Loader2, XCircle } from 'lucide-react';
import {
    cancelInterpreterPaymentLinkAction,
    createInterpreterPaymentLinkAction,
    listApprovedInterpreterOptionsAction,
    listTicketPaymentLinksAction,
    type ApprovedInterpreterOption,
    type PaymentLinkRow,
} from '@/app/actions/interpreter-payment-link-actions';

const SERVICE_TH: Record<string, string> = {
    court: 'ล่ามศาล', police: 'ล่ามสถานีตำรวจ', lawyer_meeting: 'ล่ามคุยกับทนาย',
    business_meeting: 'ล่ามประชุมธุรกิจ', doc_translation: 'แปลเอกสาร', certified_translation: 'แปลเอกสารพร้อมรับรอง',
};
const LANG_TH: Record<string, string> = {
    th: 'ไทย', en: 'อังกฤษ', zh: 'จีน', ja: 'ญี่ปุ่น', ko: 'เกาหลี', fr: 'ฝรั่งเศส', de: 'เยอรมัน', ru: 'รัสเซีย',
    ar: 'อาหรับ', my: 'เมียนมา', km: 'เขมร', lo: 'ลาว', vi: 'เวียดนาม', hi: 'ฮินดี',
};
const STATUS: Record<string, { label: string; className: string }> = {
    open: { label: 'รอชำระ', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    pending_review: { label: 'แนบสลิปแล้ว รอตรวจ', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    paid: { label: 'ชำระแล้ว', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    cancelled: { label: 'ยกเลิก', className: 'bg-slate-100 text-slate-500 border-slate-200' },
    expired: { label: 'หมดอายุ', className: 'bg-slate-100 text-slate-500 border-slate-200' },
};

type Request = { service?: string; languageFrom?: string; languageTo?: string; date?: string; lawyerId?: string };

/**
 * ตั๋ว "ขอใช้บริการล่าม" — แอดมินเลือกล่าม ตั้งยอด แล้วสร้างลิงก์ชำระเงิน
 * ระบบส่งลิงก์ในแชทให้ลูกค้าเอง · ลูกค้าจ่ายแล้วกลายเป็นงานใน /interpreter-bookings
 */
export function InterpreterPaymentLinkPanel({ ticketId, request, disabled }: { ticketId: string; request?: Request; disabled?: boolean }) {
    const { toast } = useToast();
    const [interpreters, setInterpreters] = useState<ApprovedInterpreterOption[]>([]);
    const [links, setLinks] = useState<PaymentLinkRow[]>([]);
    const [interpreterId, setInterpreterId] = useState('');
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [service, setService] = useState(request?.service || '');
    const [languageFrom, setLanguageFrom] = useState(request?.languageFrom || '');
    const [languageTo, setLanguageTo] = useState(request?.languageTo || 'th');
    const [date, setDate] = useState(request?.date || '');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const refresh = useCallback(async () => {
        setLinks(await listTicketPaymentLinksAction(ticketId));
    }, [ticketId]);

    useEffect(() => {
        listApprovedInterpreterOptionsAction().then(setInterpreters).catch(() => setInterpreters([]));
        refresh().catch(() => undefined);
    }, [refresh]);

    // ล่ามที่รองรับคู่ภาษา+บริการขึ้นก่อน
    const matches = (i: ApprovedInterpreterOption) =>
        (!service || i.services.includes(service))
        && (!languageFrom || i.languageCodes.includes(languageFrom))
        && (!languageTo || i.languageCodes.includes(languageTo));
    const sorted = [...interpreters].sort((a, b) => Number(matches(b)) - Number(matches(a)));

    const create = async () => {
        setSaving(true);
        try {
            const res = await createInterpreterPaymentLinkAction({
                ticketId, interpreterId, title, amountBaht: Number(amount), service, languageFrom, languageTo, date, notes,
            });
            if (!res.ok) {
                toast({ variant: 'destructive', title: res.error });
                return;
            }
            toast({ title: 'ส่งลิงก์ชำระเงินในแชทแล้ว', description: res.url });
            setTitle(''); setAmount(''); setNotes('');
            await refresh();
        } finally {
            setSaving(false);
        }
    };

    const cancel = async (id: string) => {
        if (!window.confirm('ยกเลิกลิงก์นี้? ลูกค้าจะจ่ายผ่านลิงก์นี้ไม่ได้อีก')) return;
        const res = await cancelInterpreterPaymentLinkAction(id);
        if (!res.ok) toast({ variant: 'destructive', title: res.error });
        await refresh();
    };

    return (
        <Card className="rounded-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Link2 className="w-4 h-4" /> ลิงก์ชำระเงินค่าล่าม</CardTitle>
                <CardDescription>
                    เลือกล่ามและตั้งยอดที่ตกลงกับลูกค้า ระบบจะส่งลิงก์ในแชทให้ · หัก GP ตามที่ตั้งไว้ในหน้าตั้งค่าล่าม
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                {request?.lawyerId && (
                    <p className="text-xs text-blue-800 bg-blue-50 rounded-lg p-2">คำขอนี้มาจากหน้าทนาย ID {request.lawyerId}</p>
                )}
                {!disabled && (
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label>ล่าม</Label>
                            <Select value={interpreterId} onValueChange={setInterpreterId}>
                                <SelectTrigger><SelectValue placeholder="เลือกล่ามที่อนุมัติแล้ว" /></SelectTrigger>
                                <SelectContent>
                                    {sorted.map((i) => (
                                        <SelectItem key={i.id} value={i.id}>
                                            {i.name}{matches(i) ? ' ✓' : ''} · {i.languageCodes.map((c) => LANG_TH[c] || c).join('/')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1 col-span-2">
                                <Label>บริการ</Label>
                                <Select value={service} onValueChange={setService}>
                                    <SelectTrigger><SelectValue placeholder="เลือก" /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(SERVICE_TH).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {([['จากภาษา', languageFrom, setLanguageFrom], ['เป็นภาษา', languageTo, setLanguageTo]] as const).map(([label, value, set]) => (
                                <div key={label} className="space-y-1">
                                    <Label>{label}</Label>
                                    <Select value={value} onValueChange={set}>
                                        <SelectTrigger><SelectValue placeholder="เลือก" /></SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(LANG_TH).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-1">
                            <Label>ชื่อรายการ (ลูกค้าเห็น)</Label>
                            <Input value={title} maxLength={120} placeholder="เช่น ล่ามศาล อังกฤษ-ไทย 4 ชม. 15 ต.ค." onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label>ยอด (บาท)</Label>
                                <Input type="number" min={100} step="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label>วันที่งาน</Label>
                                <Input value={date} maxLength={40} placeholder="เช่น 2026-10-15 09:00" onChange={(e) => setDate(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>หมายเหตุ (ลูกค้าเห็น)</Label>
                            <Textarea rows={2} value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
                        </div>
                        <Button className="w-full" disabled={saving || !interpreterId || !title || !amount} onClick={create}>
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                            สร้างลิงก์และส่งในแชท
                        </Button>
                    </div>
                )}

                {links.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                        {links.map((lk) => {
                            const st = STATUS[lk.status] || STATUS.open;
                            return (
                                <div key={lk.id} className="rounded-lg border p-3 space-y-1">
                                    <div className="flex justify-between gap-2">
                                        <span className="font-medium">{lk.title}</span>
                                        <Badge variant="outline" className={st.className}>{st.label}</Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {lk.amountBaht.toLocaleString('th-TH')} บาท · {lk.interpreterName}
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(lk.url); toast({ title: 'คัดลอกลิงก์แล้ว' }); }}>
                                            <Copy className="w-3 h-3 mr-1" /> คัดลอก
                                        </Button>
                                        {lk.bookingId && (
                                            <Button size="sm" variant="outline" asChild>
                                                <Link href={`/interpreter-bookings/${lk.bookingId}`}>ดูงาน</Link>
                                            </Button>
                                        )}
                                        {lk.status === 'open' && (
                                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => cancel(lk.id)}>
                                                <XCircle className="w-3 h-3 mr-1" /> ยกเลิก
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
