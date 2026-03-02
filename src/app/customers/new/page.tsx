
'use client'

import * as React from 'react'
import {
  ChevronLeft,
  Upload,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useFirebase } from '@/firebase/provider'
import { addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { uploadToR2 } from '@/app/actions/upload-r2'
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/constants'

export default function AdminCustomerCreatePage() {
  const { toast } = useToast()
  const router = useRouter()
  const { firestore, storage } = useFirebase();

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [type, setType] = React.useState('บุคคลทั่วไป');
  const [status, setStatus] = React.useState('active');
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          variant: "destructive",
          title: "ไฟล์มีขนาดใหญ่เกินไป",
          description: `กรุณาอัปโหลดไฟล์ขนาดไม่เกิน ${MAX_FILE_SIZE_MB}MB`,
        });
        e.target.value = ''; // Reset input
        return;
      }
      setImageFile(file);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setImageUrl(url);
    }
  };

  const handleSaveChanges = async () => {
    if (!firestore || !storage) return;

    if (!name || !email || !password) {
      toast({
        variant: "destructive",
        title: "กรุณากรอกข้อมูล",
        description: "กรุณาระบุชื่อ, อีเมล และรหัสผ่าน",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Check for duplicate email
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "อีเมลซ้ำ",
          description: `อีเมล ${email} มีอยู่ในระบบแล้ว กรุณาใช้อีเมลอื่น`,
        });
        setIsSaving(false);
        return;
      }
      let finalImageUrl = imageUrl || '';

      if (imageFile) {
        toast({
          title: "กำลังอัปโหลดรูปภาพ...",
          description: "Uploading to R2..."
        });

        try {
          const formData = new FormData();
          formData.append('file', imageFile);
          finalImageUrl = await uploadToR2(formData, 'profile-images');
          toast({ title: "รูปภาพพร้อมแล้ว", description: "อัปโหลดสำเร็จ" });
        } catch (uploadError) {
          console.error("Upload failed:", uploadError);
          toast({
            variant: "destructive",
            title: "อัปโหลดรูปภาพไม่สำเร็จ",
            description: "ไม่สามารถอัปโหลดรูปภาพได้"
          });
          setIsSaving(false);
          return;
        }
      }

      const newUser = {
        name,
        email,
        type,
        status,
        avatar: finalImageUrl,
        role: 'user', // Default role for new customers
        createdAt: serverTimestamp(),
        registeredAt: serverTimestamp(),
      };

      console.log("Saving to Firestore...");
      const usersCollection = collection(firestore, 'users');
      await addDoc(usersCollection, newUser);
      console.log("Saved to Firestore");

      toast({
        title: "สร้างลูกค้าสำเร็จ",
        description: `ลูกค้าใหม่ ${name} ได้ถูกเพิ่มเข้าสู่ระบบแล้ว`,
      })
      router.push(`/customers`);

    } catch (error: any) {
      console.error("Error creating customer:", error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถบันทึกข้อมูลได้",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="flex-1 p-4 sm:px-6 sm:py-0 md:p-8">
      <div className="mx-auto grid max-w-2xl flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/customers`}>
            <Button variant="outline" size="icon" className="h-7 w-7">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">กลับ</span>
            </Button>
          </Link>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
            เพิ่มลูกค้าใหม่
          </h1>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Link href={`/customers`}>
              <Button variant="outline" size="sm">
                ยกเลิก
              </Button>
            </Link>
            <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกลูกค้า'}
            </Button>
          </div>
        </div>
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>ข้อมูลโปรไฟล์</CardTitle>
            <CardDescription>
              กรอกข้อมูลส่วนตัวและสถานะบัญชีของลูกค้าใหม่
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="picture">รูปโปรไฟล์</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={imageUrl || ''} />
                    <AvatarFallback>ลค</AvatarFallback>
                  </Avatar>
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Input
                      id="picture"
                      type="file"
                      accept="image/*"
                      className="cursor-pointer"
                      onChange={handleImageChange}
                      ref={fileInputRef}
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="name">ชื่อ-นามสกุล</Label>
                <Input
                  id="name"
                  type="text"
                  className="w-full"
                  placeholder="สมหญิง ใจดี"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="email">อีเมล</Label>
                <Input
                  id="email"
                  type="email"
                  className="w-full"
                  placeholder="somying.j@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="password">รหัสผ่านชั่วคราว</Label>
                <Input
                  id="password"
                  type="text"
                  className="w-full"
                  placeholder="ตั้งรหัสผ่านให้ลูกค้า"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-3">
                  <Label htmlFor="type">ประเภทลูกค้า</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="เลือกประเภท" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="บุคคลทั่วไป">บุคคลทั่วไป</SelectItem>
                      <SelectItem value="SME">SME</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="status">สถานะบัญชี</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="เลือกสถานะ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-end gap-2 md:hidden">
          <Link href={`/customers`}>
            <Button variant="outline" size="sm">
              ยกเลิก
            </Button>
          </Link>
          <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกลูกค้า'}
          </Button>
        </div>
      </div>
    </main>
  )
}
