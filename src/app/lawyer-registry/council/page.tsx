'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
    ArrowLeft, Loader2, RefreshCw, ScanLine, ExternalLink, Download, ChevronDown, ChevronUp, AlertCircle, FileText,
} from 'lucide-react';
import {
    getCouncilRowsAction,
    importCouncilSourceAction,
    listCouncilSourcesAction,
    processCouncilImageAction,
    syncCouncilAnnouncementsAction,
    updateCouncilRowAction,
    type CouncilSource,
    type SourceRow,
} from '@/app/actions/council-registry-actions';

const STATUS_LABEL: Record<CouncilSource['status'], { label: string; className: string }> = {
    new: { label: 'ยังไม่อ่าน', className: 'bg-slate-100 text-slate-600 border-slate-200' },
    extracting: { label: 'อ่านไม่ครบ', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    ready: { label: 'รอตรวจ', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    imported: { label: 'นำเข้าแล้ว', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

/**
 * ประกาศรับใบอนุญาตทนายความใหม่จากสภาทนายความ → ตรวจ → นำเข้า verifiedLawyers
 * cron อ่านรูปให้วันละ 12 ใบ · หน้านี้อ่านต่อทันทีได้ และต้องกดนำเข้าเองหลังตรวจเสมอ
 * ประกาศไม่มีเลขใบอนุญาต — รายชื่อที่นำเข้าจึงไม่มีเลข (ห้ามเติมเอง)
 */
export default function CouncilRegistryPage() {
    const { toast } = useToast();
    const [sources, setSources] = useState<CouncilSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [working, setWorking] = useState<{ postId: string; done: number; total: number } | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);
    const [rows, setRows] = useState<SourceRow[]>([]);
    const [rowsLoading, setRowsLoading] = useState(false);
    const [importingId, setImportingId] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            setSources(await listCouncilSourcesAction());
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'โหลดรายการไม่ได้', description: e?.message });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { refresh(); }, [refresh]);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const r = await syncCouncilAnnouncementsAction();
            toast({ title: `พบประกาศ ${r.total} ฉบับ`, description: `เพิ่มใหม่ ${r.added} ฉบับ` });
            await refresh();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'ดึงประกาศไม่ได้', description: e?.message });
        } finally {
            setSyncing(false);
        }
    };

    /** อ่านรูปที่ค้างของประกาศหนึ่ง (หรือทุกประกาศ) ทีละใบ — กันเกินเวลาของ server */
    const processPending = async (targets: CouncilSource[]) => {
        for (const s of targets) {
            const pending = s.images.map((img, i) => ({ img, i })).filter(({ img }) => img.status !== 'done');
            if (!pending.length) continue;
            setWorking({ postId: s.postId, done: 0, total: pending.length });
            for (let k = 0; k < pending.length; k++) {
                try {
                    await processCouncilImageAction(s.postId, pending[k].i);
                } catch (e: any) {
                    toast({ variant: 'destructive', title: 'อ่านรูปไม่ได้', description: e?.message });
                }
                setWorking({ postId: s.postId, done: k + 1, total: pending.length });
            }
        }
        setWorking(null);
        await refresh();
    };

    const toggleRows = async (postId: string) => {
        if (openId === postId) {
            setOpenId(null);
            return;
        }
        setOpenId(postId);
        setRowsLoading(true);
        try {
            setRows(await getCouncilRowsAction(postId));
        } finally {
            setRowsLoading(false);
        }
    };

    const saveRow = async (postId: string, row: SourceRow, patch: Partial<SourceRow>) => {
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
        try {
            await updateCouncilRowAction(postId, row.id, patch);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'บันทึกไม่ได้', description: e?.message });
        }
    };

    const handleImport = async (s: CouncilSource) => {
        const count = openId === s.postId ? rows.filter((r) => !r.excluded).length : s.rowCount;
        if (!window.confirm(`นำเข้า ${count} รายชื่อจากประกาศนี้ลงฐานข้อมูลตรวจสอบทนาย?\n(ตรวจรายชื่อเทียบกับรูปต้นฉบับแล้ว)`)) return;
        setImportingId(s.postId);
        try {
            const r = await importCouncilSourceAction(s.postId);
            toast({
                title: 'นำเข้าแล้ว',
                description: `ใหม่ ${r.success} · เติมที่มาให้ของเดิม ${r.enriched} · ซ้ำ ${r.duplicates} · ผิดพลาด ${r.errors}`,
            });
            await refresh();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'นำเข้าไม่ได้', description: e?.message });
        } finally {
            setImportingId(null);
        }
    };

    const pendingSources = sources.filter((s) => s.status === 'new' || s.status === 'extracting');
    const pendingImages = pendingSources.reduce((n, s) => n + s.images.filter((i) => i.status !== 'done').length, 0);

    return (
        <div className="container mx-auto max-w-6xl px-4 py-8">
            <Link href="/lawyer-registry" className="inline-flex items-center text-sm text-slate-500 hover:text-[#0B3979] mb-4 font-medium">
                <ArrowLeft className="w-4 h-4 mr-2" />
                ฐานข้อมูลตรวจสอบสถานะทนาย
            </Link>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#0B3979]">ประกาศรับใบอนุญาตจากสภาทนายความ</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        ดึงประกาศ → AI อ่านรายชื่อจากรูป → ตรวจเทียบรูปต้นฉบับ → กดนำเข้า (ระบบไม่นำเข้าเอง)
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSync} disabled={syncing || !!working} className="gap-2">
                        {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        ดึงประกาศล่าสุด
                    </Button>
                    <Button
                        onClick={() => processPending(pendingSources)}
                        disabled={!pendingImages || !!working}
                        className="gap-2 bg-[#0B3979] hover:bg-[#082a5a]"
                    >
                        <ScanLine className="w-4 h-4" />
                        อ่านรูปที่ค้างทั้งหมด ({pendingImages})
                    </Button>
                </div>
            </div>

            <div className="flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 mb-6">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                    ประกาศพวกนี้ <b>ไม่มีเลขใบอนุญาต</b> — รายชื่อจะเข้าระบบเป็นสถานะ &quot;พบชื่อในประกาศรับใบอนุญาต&quot; พร้อมลิงก์ประกาศต้นฉบับ
                    ห้ามเติมเลขใบอนุญาตเอง · ชื่อที่มีอยู่แล้วจะไม่ซ้ำ ระบบจะเติมที่มาให้แทน
                </div>
            </div>

            {working && (
                <div className="mb-4 text-sm text-slate-600 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังอ่านรูป {working.done}/{working.total} ของ {sources.find((s) => s.postId === working.postId)?.title}
                </div>
            )}

            {loading ? (
                <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>
            ) : sources.length === 0 ? (
                <Card><CardContent className="p-10 text-center text-slate-500">ยังไม่มีประกาศ — กด &quot;ดึงประกาศล่าสุด&quot;</CardContent></Card>
            ) : (
                <div className="space-y-3">
                    {sources.map((s) => {
                        const done = s.images.filter((i) => i.status === 'done').length;
                        const failed = s.images.filter((i) => i.status === 'failed').length;
                        const pending = s.images.length - done - failed;
                        const st = STATUS_LABEL[s.status];
                        const isOpen = openId === s.postId;
                        return (
                            <Card key={s.postId} className="border-slate-200">
                                <CardHeader className="p-4">
                                    <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                                        <div className="min-w-0">
                                            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2 flex-wrap">
                                                <Badge variant="outline" className={st.className}>{st.label}</Badge>
                                                <span className="truncate">{s.title}</span>
                                            </CardTitle>
                                            <CardDescription className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                                <span>{new Date(s.publishedAt).toLocaleDateString('th-TH', { dateStyle: 'medium' })}</span>
                                                <span>รูป {done}/{s.images.length}{failed ? ` · อ่านไม่ได้ ${failed}` : ''}</span>
                                                <span>{s.rowCount} รายชื่อ</span>
                                                {s.pdfCount > 0 && <span className="text-amber-700 flex items-center gap-1"><FileText className="w-3 h-3" />มี PDF {s.pdfCount} ไฟล์ (ต้องทำมือ)</span>}
                                                {s.importResult && (
                                                    <span className="text-emerald-700">
                                                        นำเข้า: ใหม่ {s.importResult.success} · เติมที่มา {s.importResult.enriched ?? 0} · ซ้ำ {s.importResult.duplicates}
                                                    </span>
                                                )}
                                                <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-[#0B3979] inline-flex items-center gap-1 hover:underline">
                                                    ประกาศต้นฉบับ <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </CardDescription>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            {s.status !== 'imported' && pending > 0 && (
                                                <Button size="sm" variant="outline" disabled={!!working} onClick={() => processPending([s])} className="gap-1">
                                                    <ScanLine className="w-4 h-4" /> อ่านรูป
                                                </Button>
                                            )}
                                            {s.status !== 'imported' && failed > 0 && (
                                                <Button size="sm" variant="outline" disabled={!!working} onClick={() => processPending([s])} className="gap-1">
                                                    <RefreshCw className="w-4 h-4" /> อ่านใหม่ใบที่พลาด
                                                </Button>
                                            )}
                                            {s.rowCount > 0 && (
                                                <Button size="sm" variant="outline" onClick={() => toggleRows(s.postId)} className="gap-1">
                                                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} ตรวจรายชื่อ
                                                </Button>
                                            )}
                                            {s.status === 'ready' && s.rowCount > 0 && (
                                                <Button
                                                    size="sm"
                                                    disabled={importingId === s.postId || !!working}
                                                    onClick={() => handleImport(s)}
                                                    className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                                                >
                                                    {importingId === s.postId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                                    นำเข้า
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>

                                {isOpen && (
                                    <CardContent className="p-0 border-t border-slate-100">
                                        {rowsLoading ? (
                                            <div className="p-6 flex justify-center"><Loader2 className="animate-spin" /></div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-slate-50 text-slate-600 text-left">
                                                            <th className="px-3 py-2 w-16">รูป</th>
                                                            <th className="px-3 py-2 w-28">คำนำหน้า</th>
                                                            <th className="px-3 py-2">ชื่อ</th>
                                                            <th className="px-3 py-2">สกุล</th>
                                                            <th className="px-3 py-2 w-28">ประเภท</th>
                                                            <th className="px-3 py-2 w-40">วันที่ประกาศ</th>
                                                            <th className="px-3 py-2 w-24 text-center">ไม่นำเข้า</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {rows.map((r) => (
                                                            <tr key={r.id} className={`border-t border-slate-100 ${r.excluded ? 'opacity-40' : ''}`}>
                                                                <td className="px-3 py-1.5">
                                                                    <a href={s.images[r.imageIndex]?.url} target="_blank" rel="noopener noreferrer" className="text-[#0B3979] hover:underline">
                                                                        #{r.imageIndex + 1}
                                                                    </a>
                                                                </td>
                                                                {(['prefix', 'firstName', 'lastName', 'licenseType', 'announcementDate'] as const).map((f) => (
                                                                    <td key={f} className="px-2 py-1.5">
                                                                        <Input
                                                                            defaultValue={r[f]}
                                                                            disabled={s.status === 'imported'}
                                                                            onBlur={(e) => e.target.value !== r[f] && saveRow(s.postId, r, { [f]: e.target.value })}
                                                                            className="h-8 text-sm"
                                                                        />
                                                                    </td>
                                                                ))}
                                                                <td className="px-3 py-1.5 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={r.excluded}
                                                                        disabled={s.status === 'imported'}
                                                                        onChange={(e) => saveRow(s.postId, r, { excluded: e.target.checked })}
                                                                    />
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
