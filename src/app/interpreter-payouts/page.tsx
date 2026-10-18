'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
    getInterpreterGpSettingAction,
    listDueInterpreterPayoutsAction,
    markInterpreterPayoutPaidAction,
} from '@/app/actions/interpreter-admin-actions';
import { formatSatang, type InterpreterPayoutGroup } from '@/lib/interpreter-admin-types';

/** ค่า default ต้องตรงกับ DEFAULT_GP_PERCENT ใน Lawslane/src/lib/interpreter-types.ts */
const DEFAULT_GP_PERCENT = 15;

function PayoutRow({ g, onPaid }: { g: InterpreterPayoutGroup; onPaid: () => void }) {
    const { toast } = useToast();
    const [reference, setReference] = useState('');
    const [busy, setBusy] = useState(false);
    const pay = async () => {
        if (!window.confirm(`ยืนยันว่าโอน ฿${formatSatang(g.totalNet)} ให้ ${g.interpreterName} แล้ว?`)) return;
        setBusy(true);
        const res = await markInterpreterPayoutPaidAction({ interpreterId: g.interpreterId, bookingIds: g.bookingIds, reference });
        setBusy(false);
        if (!res.ok) return toast({ variant: 'destructive', title: res.error });
        toast({ title: 'บันทึกการโอนแล้ว' });
        onPaid();
    };
    return (
        <Card className="rounded-xl">
            <CardContent className="pt-6 grid md:grid-cols-4 gap-4 items-end">
                <div>
                    <p className="font-semibold">
                        {g.interpreterName}
                        {g.external && <span className="ml-2 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-xs font-normal text-amber-800">นอกระบบ</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">{g.bookingIds.length} งาน · ลูกค้าจ่าย ฿{formatSatang(g.totalGross)} · GP ฿{formatSatang(g.totalGp)}</p>
                </div>
                <div className="text-sm">
                    {g.bankAccountNumber
                        ? <><p>{g.bankName}</p><p className="font-mono">{g.bankAccountNumber}</p><p className="text-muted-foreground">{g.bankAccountName}</p></>
                        : <p className="text-red-600">ล่ามยังไม่ตั้งบัญชีรับเงิน</p>}
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

export default function AdminInterpreterPayoutsPage() {
    const { toast } = useToast();
    const [groups, setGroups] = useState<InterpreterPayoutGroup[] | null>(null);
    const [gpSaved, setGpSaved] = useState<number | null>(null);
    const [gpLoaded, setGpLoaded] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(() => {
        listDueInterpreterPayoutsAction().then(setGroups).catch(() => { setGroups([]); setError('ไม่มีสิทธิ์ หรือโหลดข้อมูลไม่สำเร็จ'); });
        getInterpreterGpSettingAction().then(s => { setGpSaved(s.gpPercent); setGpLoaded(true); }).catch(() => {});
    }, []);
    useEffect(load, [load]);


    return (
        <div className="space-y-6 max-w-5xl">
            <h1 className="text-3xl font-bold font-headline">จ่ายเงินล่าม</h1>

            <Card className="rounded-xl">
                <CardHeader>
                    <CardTitle>ค่าธรรมเนียมแพลตฟอร์ม (GP) ของล่าม</CardTitle>
                    <CardDescription>
                        หักจากยอดที่ลูกค้าจ่ายทุกงาน · มีผลกับการจองใหม่เท่านั้น (งานเดิมใช้ GP ตอนจอง)
                        {gpSaved === null && ` · ยังไม่เคยตั้ง ระบบใช้ค่าเริ่มต้น ${DEFAULT_GP_PERCENT}%`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                    {/* อ่านอย่างเดียว — แก้ได้ที่หน้า "ราคาแพ็กเกจ" (Super Admin) */}
                    <p className="text-2xl font-bold">{gpLoaded ? `${gpSaved ?? DEFAULT_GP_PERCENT}%` : '…'}</p>
                    <p className="text-sm text-muted-foreground">
                        แก้ GP ได้ที่หน้า &quot;ราคาแพ็กเกจ&quot; (เฉพาะ Super Admin)
                    </p>
                </CardContent>
            </Card>

            <div className="space-y-3">
                <h2 className="text-xl font-bold">ยอดรอโอนให้ล่าม</h2>
                <p className="text-sm text-muted-foreground">งานที่ล่ามปิดงานแล้ว · โอนเข้าบัญชีล่ามนอกระบบ แล้วกรอกเลขอ้างอิงเพื่อบันทึก</p>
                {error && <p className="text-sm text-red-600">{error}</p>}
                {!groups ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
                ) : groups.length === 0 ? (
                    <p className="text-muted-foreground py-6">ไม่มียอดรอโอน</p>
                ) : (
                    groups.map(g => <PayoutRow key={g.interpreterId} g={g} onPaid={load} />)
                )}
            </div>
        </div>
    );
}
