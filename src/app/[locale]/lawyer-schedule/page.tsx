
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Clock, Calendar as CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

import { useSearchParams } from 'next/navigation';

export default function LawyerSchedulePage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const isAdminView = searchParams.get('view') === 'admin';
  const dashboardLink = isAdminView ? '/lawyer-dashboard?view=admin' : '/lawyer-dashboard';

  const [workingHours, setWorkingHours] = useState({ start: '09:00', end: '18:00' });
  const [availableDays, setAvailableDays] = useState({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  });
  const [overrideDate, setOverrideDate] = useState<Date | undefined>();
  const [overrideReason, setOverrideReason] = useState('');
  const [overrides, setOverrides] = useState<{ date: Date; reason: string }[]>([]);

  const dayLabels: { [key in DayOfWeek]: string } = {
    monday: 'วันจันทร์',
    tuesday: 'วันอังคาร',
    wednesday: 'วันพุธ',
    thursday: 'วันพฤหัสบดี',
    friday: 'วันศุกร์',
    saturday: 'วันเสาร์',
    sunday: 'วันอาทิตย์',
  };

  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return [`${hour}:00`, `${hour}:30`];
  }).flat();

  const handleDayToggle = (day: DayOfWeek) => {
    setAvailableDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const handleAddOverride = () => {
    if (overrideDate && overrideReason) {
      if (overrides.find(ov => ov.date.toDateString() === overrideDate.toDateString())) {
        toast({ variant: 'destructive', title: "วันที่นี้ถูกเพิ่มไปแล้ว" });
        return;
      }
      setOverrides([...overrides, { date: overrideDate, reason: overrideReason }]);
      setOverrideDate(undefined);
      setOverrideReason('');
    } else {
      toast({ variant: 'destructive', title: "ข้อมูลไม่ครบถ้วน", description: "กรุณาเลือกวันที่และใส่เหตุผล" });
    }
  }

  const handleSaveChanges = () => {
    console.log({ workingHours, availableDays, overrides });
    toast({
      title: "บันทึกข้อมูลสำเร็จ",
      description: "ตารางเวลาของคุณได้รับการอัปเดตแล้ว",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Gradient Header */}
      <div className="w-full bg-gradient-to-r from-[#0f172a] to-[#1e293b] text-white py-12 md:py-16 rounded-b-[3rem] shadow-lg mb-8">
        <div className="container mx-auto px-4 md:px-6">
          <Link href={dashboardLink} className="text-blue-200 hover:text-white mb-6 inline-flex items-center gap-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            กลับไปที่แดชบอร์ด
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
              <CalendarIcon className="w-8 h-8 text-blue-200" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-headline">จัดการตารางนัดหมาย</h1>
              <p className="text-blue-200 mt-2">ตั้งค่าเวลาทำงาน วันหยุด และจัดการการนัดหมายของคุณ</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 pb-20">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Working Hours Card */}
          <Card className="rounded-[2.5rem] shadow-xl border-none overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50/50 px-8 py-6">
              <CardTitle className="flex items-center gap-3 text-xl text-[#0B3979]">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                เวลาทำงานปกติ
              </CardTitle>
              <CardDescription className="text-base">กำหนดช่วงเวลาที่คุณรับนัดหมายในแต่ละวัน</CardDescription>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div className="space-y-3">
                <Label htmlFor="start-time" className="text-base">เวลาเริ่มต้น</Label>
                <Select value={workingHours.start} onValueChange={(value) => setWorkingHours(prev => ({ ...prev, start: value }))}>
                  <SelectTrigger id="start-time" className="h-12 rounded-2xl border-gray-200 shadow-sm focus:ring-blue-500"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">{timeOptions.map(t => <SelectItem key={t} value={t} className="rounded-lg cursor-pointer">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label htmlFor="end-time" className="text-base">เวลาสิ้นสุด</Label>
                <Select value={workingHours.end} onValueChange={(value) => setWorkingHours(prev => ({ ...prev, end: value }))}>
                  <SelectTrigger id="end-time" className="h-12 rounded-2xl border-gray-200 shadow-sm focus:ring-blue-500"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">{timeOptions.map(t => <SelectItem key={t} value={t} className="rounded-lg cursor-pointer">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Available Days Card */}
          <Card className="rounded-[2.5rem] shadow-xl border-none overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50/50 px-8 py-6">
              <CardTitle className="flex items-center gap-3 text-xl text-[#0B3979]">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                </div>
                วันที่เปิดรับงาน
              </CardTitle>
              <CardDescription className="text-base">เลือกวันที่คุณต้องการเปิดรับการนัดหมายในสัปดาห์</CardDescription>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.keys(availableDays).map((day) => (
                <div key={day} className={`flex items-center justify-between p-4 border rounded-2xl transition-all duration-200 ${availableDays[day as DayOfWeek] ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-gray-50 border-transparent opacity-70 hover:opacity-100'}`}>
                  <Label htmlFor={day} className="font-medium text-base cursor-pointer">{dayLabels[day as DayOfWeek]}</Label>
                  <Switch id={day} checked={availableDays[day as DayOfWeek]} onCheckedChange={() => handleDayToggle(day as DayOfWeek)} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Overrides Card */}
          <Card className="rounded-[2.5rem] shadow-xl border-none overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50/50 px-8 py-6">
              <CardTitle className="flex items-center gap-3 text-xl text-[#0B3979]">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <PlusCircle className="w-5 h-5 text-blue-600" />
                </div>
                เพิ่มวันหยุดพิเศษ
              </CardTitle>
              <CardDescription className="text-base">ระบุวันที่คุณไม่สะดวกรับงานเพิ่มเติม เช่น วันหยุดพักผ่อน หรือไปทำธุระ</CardDescription>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="flex flex-col gap-4">
                <div className="p-4 bg-white rounded-3xl shadow-sm border mx-auto w-full max-w-sm">
                  <Calendar
                    mode="single"
                    selected={overrideDate}
                    onSelect={setOverrideDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-xl"
                  />
                </div>
                <Input
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="เหตุผล (เช่น ลาพักร้อน, มีงานนอกแพลตฟอร์ม)"
                  className="h-12 rounded-2xl border-gray-200 shadow-sm"
                />
                <Button onClick={handleAddOverride} className="h-12 rounded-full text-base shadow-lg hover:shadow-xl transition-all">
                  <PlusCircle className="mr-2 w-5 h-5" /> เพิ่มวันหยุด
                </Button>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium text-lg flex items-center gap-2">
                  <span className="w-2 h-8 bg-blue-500 rounded-full inline-block"></span>
                  รายการวันหยุดที่เพิ่ม
                </h4>
                <div className="space-y-3 p-4 rounded-3xl bg-gray-50/80 min-h-[300px] border border-dashed border-gray-200">
                  {overrides.length > 0 ? overrides.map(ov => (
                    <div key={ov.date.toString()} className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                      <div>
                        <p className="font-semibold text-[#0B3979]">{ov.date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p className="text-sm text-muted-foreground">{ov.reason}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setOverrides(overrides.filter(o => o.date !== ov.date))} className="hover:bg-red-50 hover:text-red-600 rounded-full h-10 w-10">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  )) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 pt-12">
                      <CalendarIcon className="w-12 h-12 mb-2" />
                      <p>ยังไม่มีวันหยุดพิเศษ</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4">
            <Button size="lg" onClick={handleSaveChanges} className="h-14 px-8 rounded-full text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all bg-gradient-to-r from-[#0B3979] to-[#1e40af]">
              บันทึกการเปลี่ยนแปลงทั้งหมด
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
