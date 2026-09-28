'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Check, ExternalLink, Loader2, Pencil, ShieldAlert, Trash2 } from 'lucide-react';
import { listNeedsReviewAction, resolveReviewAction, type ReviewRow } from '@/app/actions/registry-review-actions';

const LAWYERS_COUNCIL_URL = 'https://www.lawyerscouncil.or.th/';

/**
 * ตรวจเลขใบอนุญาตที่นำเข้าจากรูปโดยยังไม่มีใครเทียบแหล่งจริง (needsReview)
 * ยืนยันไม่ได้ → ลบเลข (ห้ามเดา) · ชื่อยังค้นเจอบนหน้าตรวจสอบทนายได้ตามปกติ
 */
export default function RegistryReviewPage() {
    const { toast } = useToast();
    const [rows, setRows] = useState<ReviewRow[] | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [editing, setEditing] = useState<Record<string, string>>({});

    const load = useCallback(async () => {
        try {
            setRows(await listNeedsReviewAction());
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'โหลดไม่ได้', description: e?.message });
            setRows([]);
        }
    }, [toast]);

    useEffect(() => { load(); }, [load]);

    const resolve = async (row: ReviewRow, decision: 'confirm' | 'correct' | 'remove') => {
        if (decision === 'remove' && !window.confirm(`ลบเลข ${row.licenseNumber} ของ ${row.firstName} ${row.lastName}?\nชื่อยังค้นเจอได้ แต่จะไม่มีเลขใบอนุญาต`)) return;
        setBusyId(row.id);
        try {
            const res = await resolveReviewAction(row.id, decision, editing[row.id]);
            if (!res.ok) {
                toast({ variant: 'destructive', title: res.error });
                return;
            }
            setRows((prev) => (prev || []).filter((r) => r.id !== row.id));
            setEditing(({ [row.id]: _, ...rest }) => rest);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8">
            <Link href="/lawyer-registry" className="inline-flex items-center text-sm text-slate-500 hover:text-[#0B3979] mb-4 font-medium">
                <ArrowLeft className="w-4 h-4 mr-2" />
                ฐานข้อมูลตรวจสอบสถานะทนาย
            </Link>
            <h1 className="text-2xl font-bold text-[#0B3979]">ตรวจเลขใบอนุญาตที่ยังไม่ยืนยัน</h1>
            <p className="text-sm text-slate-500 mt-1 mb-4">
                เลขที่นำเข้าจากรูปเมื่อ ก.ค. 2026 รูปแบบถูกแต่ยังไม่มีใครเทียบกับแหล่งจริง — ตรวจกับสภาทนายความทีละรายการ
            </p>
            <div className="flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 mb-6">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                    <b>ห้ามเดาเลข</b> — ถ้ายืนยันกับแหล่งทางการไม่ได้ ให้กด &quot;ลบเลข&quot; (ชื่อยังค้นเจอได้ตามปกติ) ·{' '}
                    <a href={LAWYERS_COUNCIL_URL} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
                        เว็บสภาทนายความ <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>

            {rows === null ? (
                <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>
            ) : rows.length === 0 ? (
                <Card><CardContent className="p-10 text-center text-slate-500">ไม่มีรายการรอตรวจแล้ว</CardContent></Card>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <div className="px-4 py-3 text-sm text-slate-500 border-b">เหลือ {rows.length} รายการ</div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-left text-slate-600">
                                    <th className="px-4 py-2">ชื่อ-สกุล</th>
                                    <th className="px-4 py-2 w-56">เลขใบอนุญาต</th>
                                    <th className="px-4 py-2 w-24">ประเภท</th>
                                    <th className="px-4 py-2 w-72 text-right">ผลตรวจ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => {
                                    const isEditing = r.id in editing;
                                    const busy = busyId === r.id;
                                    return (
                                        <tr key={r.id} className="border-t">
                                            <td className="px-4 py-2">{r.prefix}{r.firstName} {r.lastName}</td>
                                            <td className="px-4 py-2 font-mono">
                                                {isEditing ? (
                                                    <Input
                                                        autoFocus
                                                        value={editing[r.id]}
                                                        placeholder="เลข/ปี พ.ศ."
                                                        className="h-8 font-mono"
                                                        onChange={(e) => setEditing((p) => ({ ...p, [r.id]: e.target.value }))}
                                                    />
                                                ) : r.licenseNumber}
                                            </td>
                                            <td className="px-4 py-2">{r.licenseType || '-'}</td>
                                            <td className="px-4 py-2">
                                                <div className="flex justify-end gap-1">
                                                    {isEditing ? (
                                                        <>
                                                            <Button size="sm" disabled={busy} onClick={() => resolve(r, 'correct')}>บันทึกเลขที่ถูก</Button>
                                                            <Button size="sm" variant="ghost" onClick={() => setEditing(({ [r.id]: _, ...rest }) => rest)}>ยกเลิก</Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button size="sm" variant="outline" disabled={busy} onClick={() => resolve(r, 'confirm')} className="gap-1 text-emerald-700">
                                                                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} ถูกต้อง
                                                            </Button>
                                                            <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing((p) => ({ ...p, [r.id]: r.licenseNumber }))} className="gap-1">
                                                                <Pencil className="w-3 h-3" /> แก้เลข
                                                            </Button>
                                                            <Button size="sm" variant="outline" disabled={busy} onClick={() => resolve(r, 'remove')} className="gap-1 text-red-600">
                                                                <Trash2 className="w-3 h-3" /> ลบเลข
                                                            </Button>
                                                        </>
                                                    )}
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
