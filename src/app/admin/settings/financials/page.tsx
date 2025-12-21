
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, DollarSign } from 'lucide-react';

export default function AdminFinancialSettingsPage() {
  const { firestore, user } = useFirebase();

  const [platformFeeRate, setPlatformFeeRate] = useState<string>('15');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!firestore) return;

    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(firestore, 'settings', 'platform'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setPlatformFeeRate((data.platformFeeRate * 100).toString());
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [firestore]);

  const handleSaveChanges = async () => {
    if (!firestore || !user) return;

    const rate = parseFloat(platformFeeRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast({ variant: 'destructive', title: 'ค่าไม่ถูกต้อง', description: 'กรุณาใส่ค่าระหว่าง 0-100%' });
      return;
    }

    setIsSaving(true);
    try {
      await setDoc(doc(firestore, 'settings', 'platform'), {
        platformFeeRate: rate / 100,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      });

      toast({ title: 'บันทึกการตั้งค่าสำเร็จ', description: 'ระบบได้บันทึกการเปลี่ยนแปลงของคุณแล้ว' });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถบันทึกได้' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="mx-auto grid w-full max-w-4xl gap-2">
        <h1 className="text-3xl font-semibold">ตั้งค่าระบบ</h1>
        <p className="text-muted-foreground">จัดการการตั้งค่าทั่วไปของแพลตฟอร์ม Lawslane</p>
      </div>
      <div className="mx-auto grid w-full max-w-4xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
        <nav
          className="grid gap-4 text-sm text-muted-foreground"
        >
          <Link href="/admin/settings">
            ทั่วไป
          </Link>
          <Link href="/admin/settings/financials" className="font-semibold text-primary">
            การเงิน
          </Link>
          <Link href="/admin/settings/administrators">ผู้ดูแลระบบ</Link>
          <Link href="/admin/settings/notifications">การแจ้งเตือน</Link>
        </nav>
        <div className="grid gap-6">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>ค่าธรรมเนียมแพลตฟอร์ม</CardTitle>
              <CardDescription>
                กำหนดเปอร์เซ็นต์ส่วนแบ่งรายได้ที่แพลตฟอร์มจะได้รับจากค่าบริการ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className='relative'>
                  <Input
                    placeholder="15"
                    type="number"
                    value={platformFeeRate}
                    onChange={(e) => setPlatformFeeRate(e.target.value)}
                    className="pr-8 rounded-2xl"
                    min="0"
                    max="100"
                    step="0.1"
                    disabled={isLoading}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-medium text-blue-800">ตัวอย่างการคำนวณ</p>
                  </div>
                  <div className="space-y-1 text-sm text-blue-700">
                    <div className="flex justify-between">
                      <span>ค่านัดหมาย ฿3,500</span>
                      <span className="font-bold">→ ทนายได้รับ ฿{(3500 * (1 - parseFloat(platformFeeRate || '0') / 100)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ค่าแชท ฿500</span>
                      <span className="font-bold">→ ทนายได้รับ ฿{(500 * (1 - parseFloat(platformFeeRate || '0') / 100)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button onClick={handleSaveChanges} disabled={isSaving || isLoading} className="rounded-full">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                บันทึกการเปลี่ยนแปลง
              </Button>
            </CardFooter>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>รอบการจ่ายเงิน</CardTitle>
              <CardDescription>ตั้งค่ารอบการจ่ายเงินส่วนแบ่งให้ทนายความ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>ความถี่ในการจ่ายเงิน</Label>
                  <Select defaultValue="monthly">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">ทุกสัปดาห์</SelectItem>
                      <SelectItem value="bi-weekly">ทุก 2 สัปดาห์</SelectItem>
                      <SelectItem value="monthly">ทุกเดือน</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>วันที่จ่ายเงิน (สำหรับรายเดือน)</Label>
                  <Input type="number" defaultValue="25" placeholder="เช่น 25 หมายถึงวันที่ 25 ของทุกเดือน" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button onClick={handleSaveChanges}>บันทึกการเปลี่ยนแปลง</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
}
