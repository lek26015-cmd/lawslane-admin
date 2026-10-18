'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { saveExternalInterpreterAction } from '@/app/actions/external-interpreter-actions';

const LANG_TH: Record<string, string> = {
    th: 'ไทย', en: 'อังกฤษ', zh: 'จีน', ja: 'ญี่ปุ่น', ko: 'เกาหลี', fr: 'ฝรั่งเศส', de: 'เยอรมัน', ru: 'รัสเซีย',
    ar: 'อาหรับ', my: 'เมียนมา', km: 'เขมร', lo: 'ลาว', vi: 'เวียดนาม', hi: 'ฮินดี',
};

const EMPTY = { name: '', realName: '', phone: '', lineId: '', bankName: '', bankAccountNumber: '', bankAccountName: '', note: '' };

/** เพิ่มล่ามนอกระบบ — ใช้ในแผงลิงก์ชำระเงินของตั๋วล่าม */
export function ExternalInterpreterDialog({ open, onOpenChange, onSaved }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: (id: string) => void | Promise<void>;
}) {
    const { toast } = useToast();
    const [form, setForm] = useState(EMPTY);
    const [langs, setLangs] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

    const save = async () => {
        setSaving(true);
        try {
            const res = await saveExternalInterpreterAction({ ...form, languageCodes: langs });
            if (!res.ok) {
                toast({ variant: 'destructive', title: res.error });
                return;
            }
            toast({ title: 'เพิ่มล่ามนอกระบบแล้ว' });
            await onSaved(res.id);
            setForm(EMPTY);
            setLangs([]);
            onOpenChange(false);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>เพิ่มล่ามนอกระบบ</DialogTitle>
                    <DialogDescription>
                        ลูกค้าเห็นแค่ชื่อที่แสดง และเบอร์/LINE หลังชำระเงิน เหมือนล่ามในระบบ ไม่มีอะไรบอกว่าเป็นล่ามนอก
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                    <div className="space-y-1">
                        <Label>ชื่อที่ลูกค้าเห็น *</Label>
                        <Input value={form.name} maxLength={100} placeholder="เช่น คุณหลิน" onChange={set('name')} />
                    </div>
                    <div className="space-y-1">
                        <Label>ชื่อจริง / บริษัท (แอดมินเห็นเท่านั้น)</Label>
                        <Input value={form.realName} maxLength={150} onChange={set('realName')} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label>เบอร์โทร (ลูกค้าเห็นหลังจ่าย)</Label>
                            <Input value={form.phone} maxLength={30} onChange={set('phone')} />
                        </div>
                        <div className="space-y-1">
                            <Label>LINE ID (ลูกค้าเห็นหลังจ่าย)</Label>
                            <Input value={form.lineId} maxLength={60} onChange={set('lineId')} />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">ถ้าไม่อยากให้ลูกค้าติดต่อล่ามตรง เว้นเบอร์/LINE ว่าง หรือใส่ช่องทางของทีมงานแทน</p>
                    <div className="space-y-1">
                        <Label>ภาษา</Label>
                        <div className="flex flex-wrap gap-1">
                            {Object.entries(LANG_TH).map(([k, v]) => {
                                const on = langs.includes(k);
                                return (
                                    <Button key={k} type="button" size="sm" variant={on ? 'default' : 'outline'} className="h-7 px-2 text-xs"
                                        onClick={() => setLangs(on ? langs.filter((x) => x !== k) : [...langs, k])}>
                                        {v}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label>บัญชีรับเงิน (ใช้ตอนโอนค่าจ้าง)</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Input value={form.bankName} maxLength={100} placeholder="ธนาคาร" onChange={set('bankName')} />
                            <Input value={form.bankAccountNumber} maxLength={40} placeholder="เลขบัญชี" onChange={set('bankAccountNumber')} />
                        </div>
                        <Input value={form.bankAccountName} maxLength={150} placeholder="ชื่อบัญชี" onChange={set('bankAccountName')} />
                    </div>
                    <div className="space-y-1">
                        <Label>หมายเหตุ (แอดมินเห็นเท่านั้น)</Label>
                        <Textarea rows={2} value={form.note} maxLength={1000} onChange={set('note')} />
                    </div>
                </div>
                <DialogFooter>
                    <Button disabled={saving || !form.name.trim()} onClick={save}>
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} บันทึก
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
