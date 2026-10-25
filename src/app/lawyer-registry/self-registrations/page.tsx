'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Check, ExternalLink, Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import {
    approveSelfRegistrationAction,
    listSelfRegistrationsAction,
    rejectSelfRegistrationAction,
    type ApproveEdits,
    type SelfRegistrationRow,
} from '@/app/actions/registry-self-registration-actions';

const LAWYERS_COUNCIL_URL = 'https://www.lawyerscouncil.or.th/';

/**
 * ทนายลงทะเบียนชื่อเองจากหน้า /verify-lawyer/register ของเว็บหลัก
 * ตรวจกับสภาทนายความ → แก้ชื่อ/เลขให้ตรงได้ → อนุมัติ (ขึ้นหน้าตรวจสอบทนาย) หรือ ปฏิเสธ (ลบทิ้ง)
 */
export default function SelfRegistrationsPage() {
    const { toast } = useToast();
    const [rows, setRows] = useState<SelfRegistrationRow[] | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [edits, setEdits] = useState<Record<string, ApproveEdits>>({});

    const load = useCallback(async () => {
        try {
            const list = await listSelfRegistrationsAction();
            setRows(list);
            setEdits(Object.fromEntries(list.map((r) => [r.id, { prefix: r.prefix, firstName: r.firstName, lastName: r.lastName, licenseNumber: r.licenseNumber }])));
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'โหลดไม่ได้', description: e?.message });
            setRows([]);
        }
    }, [toast]);

    useEffect(() => { load(); }, [load]);

    const setField = (id: string, key: keyof ApproveEdits, value: string) =>
        setEdits((p) => ({ ...p, [id]: { ...p[id], [key]: value } }));

    const finish = (id: string) => setRows((prev) => (prev || []).filter((r) => r.id !== id));

    const approve = async (row: SelfRegistrationRow) => {
        setBusyId(row.id);
        try {
            const res = await approveSelfRegistrationAction(row.id, edits[row.id]);
            if (!res.ok) {
                toast({ variant: 'destructive', title: res.error });
                return;
            }
            toast({ title: 'อนุมัติแล้ว', description: 'ค้นชื่อนี้เจอบนหน้าตรวจสอบทนายแล้ว' });
            finish(row.id);
        } finally {
            setBusyId(null);
        }
    };

    const reject = async (row: SelfRegistrationRow) => {
        if (!window.confirm(`ปฏิเสธและลบรายการของ ${row.firstName} ${row.lastName} (${row.licenseNumber})?`)) return;
        setBusyId(row.id);
        try {
            const res = await rejectSelfRegistrationAction(row.id);
            if (!res.ok) {
                toast({ variant: 'destructive', title: res.error });
                return;
            }
            finish(row.id);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="container mx-auto max-w-6xl px-4 py-8">
            <Link href="/lawyer-registry" className="inline-flex items-center text-sm text-slate-500 hover:text-[#0B3979] mb-4 font-medium">
                <ArrowLeft className="w-4 h-4 mr-2" />
                ฐานข้อมูลตรวจสอบสถานะทนาย
            </Link>
            <h1 className="text-2xl font-bold text-[#0B3979]">ทนายลงทะเบียนชื่อ</h1>
            <p className="text-sm text-slate-500 mt-1 mb-4">
                ทนายกรอกชื่อและเลขใบอนุญาตเองจากหน้า /verify-lawyer/register — อนุมัติแล้วลูกความค้นเจอในหน้าตรวจสอบทนาย
            </p>
            <div className="flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 mb-6">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                    <b>เทียบกับสภาทนายความก่อนอนุมัติทุกครั้ง</b> — ชื่อกับเลขต้องตรงกัน ถ้าตรวจไม่ได้ให้โทรถามทนายตามเบอร์ที่ให้ไว้ หรือปฏิเสธ ·{' '}
                    <a href={LAWYERS_COUNCIL_URL} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
                        เว็บสภาทนายความ <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    · สายด่วน 1167 · อนุมัติแล้วระบบลบเบอร์และอีเมลทิ้ง
                </div>
            </div>

            {rows === null ? (
                <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>
            ) : rows.length === 0 ? (
                <Card><CardContent className="p-10 text-center text-slate-500">ไม่มีรายการรออนุมัติ</CardContent></Card>
            ) : (
                <Card>
                    <CardContent className="p-0 overflow-x-auto">
                        <div className="px-4 py-3 text-sm text-slate-500 border-b">รออนุมัติ {rows.length} รายการ</div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-left text-slate-600">
                                    <th className="px-3 py-2 w-28">คำนำหน้า</th>
                                    <th className="px-3 py-2">ชื่อ</th>
                                    <th className="px-3 py-2">นามสกุล</th>
                                    <th className="px-3 py-2 w-36">เลขใบอนุญาต</th>
                                    <th className="px-3 py-2">จังหวัด / ติดต่อ</th>
                                    <th className="px-3 py-2 w-52 text-right">ผลตรวจ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => {
                                    const e = edits[r.id];
                                    const busy = busyId === r.id;
                                    return (
                                        <tr key={r.id} className="border-t align-top">
                                            <td className="px-3 py-2"><Input value={e?.prefix || ''} onChange={(ev) => setField(r.id, 'prefix', ev.target.value)} className="h-8" /></td>
                                            <td className="px-3 py-2"><Input value={e?.firstName || ''} onChange={(ev) => setField(r.id, 'firstName', ev.target.value)} className="h-8" /></td>
                                            <td className="px-3 py-2"><Input value={e?.lastName || ''} onChange={(ev) => setField(r.id, 'lastName', ev.target.value)} className="h-8" /></td>
                                            <td className="px-3 py-2"><Input value={e?.licenseNumber || ''} onChange={(ev) => setField(r.id, 'licenseNumber', ev.target.value)} className="h-8 font-mono" /></td>
                                            <td className="px-3 py-2 text-xs text-slate-600 space-y-0.5">
                                                <div>{r.province || '-'}</div>
                                                <div className="font-mono">{r.phone}</div>
                                                {r.email && <div className="break-all">{r.email}</div>}
                                                {r.createdAt && <div className="text-slate-400">ส่งเมื่อ {new Date(r.createdAt).toLocaleString('th-TH')}</div>}
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex justify-end gap-1">
                                                    <Button size="sm" variant="outline" disabled={busy} onClick={() => approve(r)} className="gap-1 text-emerald-700">
                                                        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} อนุมัติ
                                                    </Button>
                                                    <Button size="sm" variant="outline" disabled={busy} onClick={() => reject(r)} className="gap-1 text-red-600">
                                                        <Trash2 className="w-3 h-3" /> ปฏิเสธ
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
