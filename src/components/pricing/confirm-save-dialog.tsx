'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAdminLocale } from '@/lib/admin-i18n';

/**
 * กล่องยืนยันก่อนบันทึก (ส่วนที่ไม่แตะ Stripe): รายการที่เปลี่ยน + สิ่งที่กระทบ (summary) + คำเตือน + ติ๊กยืนยัน
 */
export function ConfirmSaveDialog({
    open, onOpenChange, title, changes, summary, warning, confirmLabel, busy, onConfirm,
}: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    title: string;
    changes: ReactNode[];
    /** สรุปผลกระทบของช่องที่เปลี่ยน (AffectsSummary) */
    summary?: ReactNode;
    warning: string;
    confirmLabel: string;
    busy: boolean;
    onConfirm: () => void;
}) {
    const { tx } = useAdminLocale();
    const [checked, setChecked] = useState(false);
    useEffect(() => { if (open) setChecked(false); }, [open]);
    return (
        <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
            <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{tx('ตรวจรายการก่อนบันทึก', 'Review before saving')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                    {changes.length === 0 ? (
                        <p className="text-slate-500">{tx('ไม่มีอะไรเปลี่ยน', 'No changes')}</p>
                    ) : (
                        <ul className="list-disc space-y-1 pl-5">{changes.map((c, i) => <li key={i}>{c}</li>)}</ul>
                    )}
                    {changes.length > 0 && summary}
                    <Alert className="border-amber-300 bg-amber-50 text-amber-900">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{warning}</AlertDescription>
                    </Alert>
                    <div className="flex items-start gap-2">
                        <Checkbox id="confirm-save" checked={checked} onCheckedChange={(v) => setChecked(v === true)} />
                        <Label htmlFor="confirm-save" className="text-sm font-normal leading-snug">{confirmLabel}</Label>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>{tx('ยกเลิก', 'Cancel')}</Button>
                    <Button onClick={onConfirm} disabled={!checked || busy || changes.length === 0}>
                        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {tx('บันทึก', 'Save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
