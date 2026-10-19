'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
    getLawyerGpSettingAction,
    listDueLawyerPayoutsAction,
    markLawyerPayoutPaidAction,
    type LawyerPayoutGroup,
} from '@/app/actions/lawyer-payment-admin-actions';
import { setLawyerGpAction } from '@/app/actions/plan-pricing-actions';
import { formatSatang } from '@/lib/interpreter-admin-types';

function PayoutRow({ g, onPaid }: { g: LawyerPayoutGroup; onPaid: () => void }) {
    const { toast } = useToast();
    const [reference, setReference] = useState('');
    const [busy, setBusy] = useState(false);
    const pay = async () => {
        if (!window.confirm(`ยืนยันว่าโอน ฿${formatSatang(g.totalNet)} ให้ ${g.lawyerName} แล้ว?`)) return;
        setBusy(true);
        const res = await markLawyerPayoutPaidAction({ lawyerProfileId: g.lawyerProfileId, paymentIds: g.paymentIds, reference });
        setBusy(false);
        if (!res.ok) return toast({ variant: 'destructive', title: res.error });
        toast({ title: 'บันทึกการโอนแล้ว' });
        onPaid();
    };
    return (
        <Card className="rounded-xl">
            <CardContent className="pt-6 grid md:grid-cols-4 gap-4 items-end">
                <div>
                    <p className="font-semibold">{g.lawyerName || g.lawyerProfileId}</p>
                    <p className="text-sm text-muted-foreground">{g.paymentIds.length} รายการ · ลูกความจ่าย ฿{formatSatang(g.totalGross)} · GP ฿{formatSatang(g.totalGp)}</p>
                </div>
                <div className="text-sm">
                    {g.bankAccountNumber
                        ? <><p>{g.bankName}</p><p className="font-mono">{g.bankAccountNumber}</p><p className="text-muted-foreground">{g.bankAccountName}</p></>
                        : <p className="text-red-600">ทนายยังไม่ตั้งบัญชีรับเงิน</p>}
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">ต้องโอน</p>
                    <p className="text-2xl font-bold text-emerald-700">฿{formatSatang(g.totalNet)}</p>
                </div>
                <div className="space-y-2">
                    <Input placeholder="เลขอ้างอิงการโอน" value={reference} maxLength={200} onChange={e => setReference(e.target.value)} />
                    <Button className="w-full" disabled={busy || !reference || !g.bankAccountNumber} onClick={pay}>
                        {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}บันทึกว่าโอนแล้ว
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function LawyerGpCard() {
    const { toast } = useToast();
    const [setting, setSetting] = useState<{ gpPercent: number | null; effective: number; updatedAt: string | null } | null>(null);
    const [gp, setGp] = useState('');
    const [busy, setBusy] = useState(false);
    const load = useCallback(() => {
        getLawyerGpSettingAction().then(s => { setSetting(s); setGp(String(s.effective)); }).catch(() => {});
    }, []);
    useEffect(load, [load]);

    const value = Number(gp);
    const valid = gp.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= 50;
    const save = async () => {
        if (!setting || !window.confirm(`เปลี่ยน GP ทนาย ${setting.effective}% → ${value}%?\nมีผลทันทีกับค่าทนายที่ลูกความชำระใหม่ รายการที่ชำระแล้วไม่เปลี่ยน`)) return;
        setBusy(true);
        const res = await setLawyerGpAction(value);
        setBusy(false);
        if (!res.ok) return toast({ variant: 'destructive', title: res.error });
        toast({ title: `บันทึกแล้ว GP ทนาย ${res.data.gpPercent}%` });
        load();
    };

    return (
        <Card className="rounded-xl">
            <CardHeader>
                <CardTitle>GP ค่าทนาย</CardTitle>
                <CardDescription>
                    แยกจาก GP ล่าม · มีผลทันทีกับค่าทนายที่ลูกความชำระใหม่ รายการที่ชำระแล้วใช้ GP ตอนชำระ · แก้ได้เฉพาะ Super Admin
                    {setting?.gpPercent === null && <span className="block text-xs">ยังไม่เคยตั้ง ระบบใช้ค่าเริ่มต้น {setting.effective}%</span>}
                    {setting?.updatedAt && <span className="block text-xs">แก้ล่าสุด {new Date(setting.updatedAt).toLocaleString('th-TH')}</span>}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-end gap-3">
                    <div className="space-y-1">
                        <Label htmlFor="lawyer-gp">GP (%)</Label>
                        <Input id="lawyer-gp" type="number" min={0} max={50} step={0.5} value={gp} className="w-28" onChange={e => setGp(e.target.value)} />
                    </div>
                    <Button onClick={save} disabled={busy || !setting || !valid || value === setting.effective}>
                        {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}บันทึก
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

/** โอนค่าบริการให้ทนาย — ยอดสุทธิหลังหัก GP ของเคสที่ปิดแล้ว (PLAN-10) */
export default function AdminLawyerPayoutsPage() {
    const [groups, setGroups] = useState<LawyerPayoutGroup[] | null>(null);
    const [error, setError] = useState('');
    const load = useCallback(() => {
        listDueLawyerPayoutsAction().then(setGroups).catch(() => { setGroups([]); setError('ไม่มีสิทธิ์ หรือโหลดข้อมูลไม่สำเร็จ'); });
    }, []);
    useEffect(load, [load]);

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h1 className="text-3xl font-bold font-headline">จ่ายเงินทนาย</h1>
                <p className="text-sm text-muted-foreground mt-1">ยอดสุทธิของเคสที่ทนายปิดแล้ว โอนเข้าบัญชีรับเงินของทนายนอกระบบ แล้วกรอกเลขอ้างอิง ทนายจะได้แจ้งเตือน</p>
            </div>
            <LawyerGpCard />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {!groups ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
            ) : groups.length === 0 ? (
                <p className="text-muted-foreground">ไม่มียอดที่ต้องโอน</p>
            ) : (
                groups.map(g => <PayoutRow key={g.lawyerProfileId} g={g} onPaid={load} />)
            )}
        </div>
    );
}
