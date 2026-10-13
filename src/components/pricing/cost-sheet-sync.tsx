'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAdminLocale } from '@/lib/admin-i18n';
import { COST_SHEET_DOC, type Label } from '@/lib/pricing-field-docs';
import { noSheetReason } from '@/lib/cost-sheet-map';
import { exportCostSheetAction, getCostSheetStatusAction } from '@/app/actions/cost-sheet-actions';
import type { CostSheetStatus } from '@/lib/cost-sheet-export';
import { FieldInfo, LiveBadge } from './field-info';

/**
 * แถบ "ส่งไป Google Sheet" บนหัวหน้าราคาแพ็กเกจ (ส่งทางเดียว admin → Sheet)
 * ลิงก์ Sheet มาจากผลของ server action (env COST_SHEET_ID ฝั่ง server) ไม่ได้ฝังในโค้ดฝั่ง client
 */

/** toast ผลส่ง Sheet อัตโนมัติหลังบันทึก (sheet = null/undefined → ไม่ได้ส่ง ไม่ขึ้นอะไร) */
export function useSheetNotice() {
    const { toast } = useToast();
    return useCallback((sheet: { ok: boolean; message: string } | null | undefined) => {
        if (!sheet) return;
        toast(sheet.ok
            ? { title: 'Google Sheet', description: sheet.message }
            : { variant: 'destructive', title: 'Google Sheet', description: sheet.message });
    }, [toast]);
}

/** ป้ายเล็ก "ไม่มีช่องใน Sheet" ข้างช่องสมมติฐานที่ส่งไป Sheet ไม่ได้ */
export function NoSheetTag({ path }: { path: string }) {
    const { tx } = useAdminLocale();
    const reason: Label | null = noSheetReason(path);
    if (!reason) return null;
    return (
        <span title={tx(...reason)} className="whitespace-nowrap rounded border border-slate-200 bg-slate-50 px-1 text-[10px] font-normal text-slate-500">
            {tx('ไม่มีช่องใน Sheet', 'Not in Sheet')}
        </span>
    );
}

const fmt = (iso: string, locale: string) => new Date(iso).toLocaleString(locale === 'th' ? 'th-TH' : 'en-GB');

export function CostSheetSyncBar({ refreshKey, unsaved }: {
    /** เปลี่ยนเมื่อข้อมูลในหน้าโหลดใหม่ (หลังบันทึก) → อ่านสถานะใหม่ (อาจส่งอัตโนมัติไปแล้ว) */
    refreshKey: unknown;
    /** มีสมมติฐานที่ยังไม่บันทึก (ไม่ถูกส่ง) */
    unsaved: boolean;
}) {
    const { tx, locale } = useAdminLocale();
    const { toast } = useToast();
    const [status, setStatus] = useState<CostSheetStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        const r = await getCostSheetStatusAction();
        if (r.ok) { setStatus(r.data); setError(null); } else setError(r.error);
    }, []);
    useEffect(() => { void load(); }, [load, refreshKey]);

    const send = async () => {
        setBusy(true);
        const r = await exportCostSheetAction();
        setBusy(false);
        if (!r.ok) { toast({ variant: 'destructive', title: 'Google Sheet', description: r.error }); return; }
        if (!r.data.ok) { toast({ variant: 'destructive', title: tx('ส่งไป Google Sheet ไม่สำเร็จ', 'Send to Google Sheet failed'), description: r.data.error }); }
        else toast({ title: 'Google Sheet', description: tx(`ส่งแล้ว ${r.data.cellCount} ช่อง`, `Sent ${r.data.cellCount} cells`) });
        await load();
    };

    if (error) return <p className="text-xs text-red-600">Google Sheet: {error}</p>;
    if (!status) return null;

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs text-slate-600">
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            <Button size="sm" variant="outline" className="h-8" onClick={send} disabled={!status.configured || busy}>
                {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                {tx('ส่งไป Google Sheet', 'Send to Google Sheet')}
            </Button>
            <FieldInfo doc={COST_SHEET_DOC} label="Send to Google Sheet" />
            {status.sheetUrl && (
                <a href={status.sheetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-700 underline-offset-2 hover:underline">
                    {tx('เปิด Google Sheet', 'Open Google Sheet')} <ExternalLink className="h-3 w-3" />
                </a>
            )}
            <LiveBadge live="sheet" />
            {status.autoExport && status.configured && (
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-800">{tx('ส่งอัตโนมัติหลังบันทึก', 'Auto-sends after save')}</span>
            )}
            <span className="ml-auto">
                {status.lastExport
                    ? tx(
                        `ส่งล่าสุด ${fmt(status.lastExport.at, locale)} · ${status.lastExport.cellCount} ช่อง · โดย uid ${status.lastExport.actorUid.slice(0, 8)}…`,
                        `Last sent ${fmt(status.lastExport.at, locale)} · ${status.lastExport.cellCount} cells · by uid ${status.lastExport.actorUid.slice(0, 8)}…`,
                    )
                    : tx('ยังไม่เคยส่ง', 'Never sent')}
            </span>
            {!status.configured && (
                <p className="w-full text-amber-700">
                    {tx('ปุ่มยังใช้ไม่ได้: ตั้ง env ใน Vercel ให้ครบก่อน — ', 'Disabled until these Vercel envs are set: ')}
                    {status.missing.join(', ')}
                    {tx(' (ขั้นตอนอยู่ในคู่มือแอดมิน › การเงิน › ราคาแพ็กเกจ)', ' (steps in the admin guide › Finance › Plan pricing)')}
                </p>
            )}
            {status.lastError && (
                <p className="w-full text-red-600">{tx('ส่งครั้งล่าสุดไม่สำเร็จ', 'Last send failed')} ({fmt(status.lastError.at, locale)}): {status.lastError.message}</p>
            )}
            {unsaved && status.configured && (
                <p className="w-full text-slate-500">{tx('ส่งเฉพาะค่าที่บันทึกแล้ว — สมมติฐานที่ยังไม่บันทึกจะไม่ถูกส่ง', 'Only saved values are sent; unsaved assumption edits are not')}</p>
            )}
        </div>
    );
}
