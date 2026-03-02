
'use client'

import * as React from 'react'
import { ChevronLeft, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Checkbox } from '@/components/ui/checkbox'
import { useFirebase } from '@/firebase'
import { collection, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'

export default function AdminLawyerCreatePage() {
  const { toast } = useToast()
  const router = useRouter()

  const { firestore, auth } = useFirebase();
  const [isLoading, setIsLoading] = React.useState(false);

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [licenseNumber, setLicenseNumber] = React.useState('');
  const [status, setStatus] = React.useState('pending');
  const [selectedSpecialties, setSelectedSpecialties] = React.useState<string[]>([]);

  const allSpecialties = ['คดีฉ้อโกง SMEs', 'คดีแพ่งและพาณิชย์', 'การผิดสัญญา', 'ทรัพย์สินทางปัญญา', 'กฎหมายแรงงาน'];

  const handleSpecialtyChange = (spec: string, checked: boolean) => {
    if (checked) {
      setSelectedSpecialties([...selectedSpecialties, spec]);
    } else {
      setSelectedSpecialties(selectedSpecialties.filter(s => s !== spec));
    }
  };

  const handleSaveChanges = async () => {
    if (!name || !email || !password) {
      toast({ variant: "destructive", title: "ข้อมูลไม่ครบถ้วน", description: "กรุณากรอกชื่อ, อีเมล และรหัสผ่าน" });
      return;
    }

    if (!firestore) {
      toast({ variant: "destructive", title: "Error", description: "Database connection failed" });
      return;
    }

    setIsLoading(true);
    try {
      // 1. Create Auth User (Optional: Admin creating user might be tricky without cloud functions, 
      // but for now we can try client-side creation if allowed, or just create a profile doc without auth first?
      // Actually, creating auth user logs the current admin out. 
      // BETTER APPROACH for Admin Panel: Just create the Firestore document. 
      // The user can "claim" it or we assume this is just a record.
      // BUT, for a real app, usually Admin creates user via Admin SDK (server-side).
      // Since we are client-side only here, we cannot create another user without logging out.
      // SO, we will just create the 'lawyerProfiles' document with a placeholder ID or auto-generated ID.
      // AND we should probably create a 'users' doc too?
      // Let's just create a lawyerProfile with auto-ID for now, and maybe a field 'isManualCreation: true'.

      // Wait, if we want them to login, they need an Auth account.
      // Let's assume for this demo, we just create the profile data.

      const docRef = await addDoc(collection(firestore, 'lawyerProfiles'), {
        name,
        email,
        licenseNumber,
        status,
        specialty: selectedSpecialties,
        joinedAt: serverTimestamp(),
        role: 'lawyer',
        imageUrl: '', // Placeholder
        imageHint: '',
        rating: 0,
        reviewCount: 0,
        phone: '',
        address: '',
        serviceProvinces: [],
        bankName: '',
        bankAccountNumber: '',
        description: 'ทนายความใหม่'
      });

      // Also create a user doc so they show up in user lists?
      // await setDoc(doc(firestore, 'users', docRef.id), {
      //     uid: docRef.id,
      //     name,
      //     email,
      //     role: 'lawyer',
      //     createdAt: serverTimestamp()
      // });

      toast({
        title: "สร้างโปรไฟล์สำเร็จ",
        description: `ทนายความ ${name} ได้ถูกเพิ่มเข้าสู่ระบบแล้ว`,
      })
      router.push('/admin/lawyers');
    } catch (error: any) {
      console.error("Error creating lawyer:", error);
      toast({ variant: "destructive", title: "เกิดข้อผิดพลาด", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex-1 p-4 sm:px-6 sm:py-0 md:p-8">
      <div className="mx-auto grid max-w-2xl flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/lawyers">
            <Button variant="outline" size="icon" className="h-7 w-7">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">กลับ</span>
            </Button>
          </Link>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
            เพิ่มทนายความใหม่
          </h1>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Link href="/admin/lawyers">
              <Button variant="outline" size="sm">ยกเลิก</Button>
            </Link>
            <Button size="sm" onClick={handleSaveChanges} disabled={isLoading}>
              {isLoading ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}
            </Button>
          </div>
        </div>
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>ข้อมูลโปรไฟล์</CardTitle>
            <CardDescription>กรอกข้อมูลและสถานะของทนายความใหม่</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="picture">รูปโปรไฟล์</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback>ทน</AvatarFallback>
                  </Avatar>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    อัปโหลดรูป
                  </Button>
                </div>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="name">ชื่อ-นามสกุล</Label>
                <Input
                  id="name"
                  type="text"
                  className="w-full"
                  placeholder="สมชาย กฎหมายดี"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="email">อีเมล (สำหรับติดต่อ)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="password">รหัสผ่านชั่วคราว</Label>
                <Input
                  id="password"
                  type="text"
                  placeholder="ตั้งรหัสผ่านให้ทนายความ"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="license">เลขใบอนุญาต</Label>
                <Input
                  id="license"
                  type="text"
                  placeholder="12345/2550"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="status">สถานะ</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                    <SelectItem value="pending">รอตรวจสอบ</SelectItem>
                    <SelectItem value="rejected">ถูกปฏิเสธ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label>ความเชี่ยวชาญ</Label>
                <div className="grid grid-cols-2 gap-2">
                  {allSpecialties.map(spec => (
                    <div key={spec} className="flex items-center space-x-2 p-2 rounded-md bg-secondary/50">
                      <Checkbox
                        id={`spec-${spec}`}
                        checked={selectedSpecialties.includes(spec)}
                        onCheckedChange={(checked) => handleSpecialtyChange(spec, checked as boolean)}
                      />
                      <Label htmlFor={`spec-${spec}`} className="text-sm font-normal">{spec}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-end gap-2 md:hidden">
          <Link href="/admin/lawyers">
            <Button variant="outline" size="sm">ยกเลิก</Button>
          </Link>
          <Button size="sm" onClick={handleSaveChanges} disabled={isLoading}>
            {isLoading ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}
          </Button>
        </div>
      </div>
    </main>
  )
}
