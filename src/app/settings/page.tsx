
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export default function AdminSettingsPage() {

  const handleSaveChanges = () => {
    toast({
      title: 'บันทึกการตั้งค่าสำเร็จ',
      description: 'ระบบได้บันทึกการเปลี่ยนแปลงของคุณแล้ว'
    });
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
          <Link href="/settings" className="font-semibold text-primary">
            ทั่วไป
          </Link>
          <Link href="/settings/financials">การเงิน</Link>
          <Link href="/settings/administrators">ผู้ดูแลระบบ</Link>
          <Link href="/settings/notifications">การแจ้งเตือน</Link>
        </nav>
        <div className="grid gap-6">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>การตั้งค่าทั่วไป</CardTitle>
              <CardDescription>
                ชื่อเว็บไซต์, ภาษา, และโซนเวลา
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4">
                <Input placeholder="ชื่อเว็บไซต์" defaultValue="Lawslane" />
                <Select defaultValue="th">
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกภาษา" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="th">ภาษาไทย</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>การบำรุงรักษาระบบ</CardTitle>
              <CardDescription>เปิดโหมดบำรุงรักษาเพื่อปิดการเข้าถึงเว็บไซต์ชั่วคราว</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="maintenance-mode" className="font-medium">โหมดบำรุงรักษา</Label>
                  <p className="text-sm text-muted-foreground">เมื่อเปิดใช้งาน ผู้ใช้ทั่วไปจะไม่สามารถเข้าสู่เว็บไซต์ได้</p>
                </div>
                <Switch id="maintenance-mode" />
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
