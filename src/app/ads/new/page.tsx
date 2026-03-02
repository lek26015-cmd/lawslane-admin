
'use client'

import * as React from 'react'
import {
  ChevronLeft,
  Upload,
} from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
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
import { Textarea } from '@/components/ui/textarea'
import Image from 'next/image'
import { useFirebase } from '@/firebase'
import { addDoc, collection, serverTimestamp, doc, getDoc } from 'firebase/firestore'
import { errorEmitter, FirestorePermissionError } from '@/firebase'

import { uploadToR2 } from '@/app/actions/upload-r2';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/constants';

export default function AdminAdCreatePage() {
  const router = useRouter()
  const params = useParams();
  const { toast } = useToast()
  const { firestore, storage, user } = useFirebase();

  const [isAdmin, setIsAdmin] = React.useState(true); // Default to true to avoid flash

  React.useEffect(() => {
    const checkUserRole = async () => {
      if (user && firestore) {
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role !== 'admin') {
              setIsAdmin(false);
              toast({
                variant: "destructive",
                title: "Warning: Not an Admin",
                description: `Current role is '${userData.role}'. You need 'admin' role to create ads.`,
              });
            } else {
              setIsAdmin(true);
            }
          }
        } catch (e) {
          console.error("Error checking role:", e);
        }
      }
    };
    checkUserRole();
  }, [user, firestore]);

  const handleFixAdminRole = async () => {
    if (!user || !firestore) return;
    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      // Update the user's role to admin (allowed by rules for own doc)
      await import('firebase/firestore').then(({ setDoc }) =>
        setDoc(userDocRef, { role: 'admin' }, { merge: true })
      );

      setIsAdmin(true);
      toast({
        title: "Success",
        description: "You are now an Admin! You can create ads.",
      });
    } catch (error: any) {
      console.error("Error fixing admin role:", error);
      toast({
        variant: "destructive",
        title: "Failed to update role",
        description: error.message,
      });
    }
  };

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [href, setHref] = React.useState(''); // New state for link
  const [placement, setPlacement] = React.useState('Homepage Carousel');
  const [status, setStatus] = React.useState('active');
  const [isSaving, setIsSaving] = React.useState(false);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const adminAdsPath = `/admin/ads`;

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
    }
  };

  const handleSaveChanges = async () => {
    if (!firestore || !storage) return;

    if (!title) {
      toast({
        variant: "destructive",
        title: "กรุณากรอกข้อมูล",
        description: "กรุณาระบุหัวข้อโฆษณา",
      });
      return;
    }

    setIsSaving(true);

    try {
      let finalImageUrl = imageUrl || 'https://picsum.photos/seed/new-ad/600/400';

      if (imageFile) {
        toast({
          title: "กำลังอัปโหลดรูปภาพ...",
          description: "Uploading image to R2..."
        });

        try {
          const formData = new FormData();
          formData.append('file', imageFile);
          finalImageUrl = await uploadToR2(formData, 'ads');
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

      const newAd = {
        title,
        description,
        href, // Save the link
        placement,
        status,
        imageUrl: finalImageUrl,
        imageHint: 'advertisement banner',
        createdAt: serverTimestamp(),
      };

      console.log("Saving to Firestore...");
      const adsCollection = collection(firestore, 'ads');
      await addDoc(adsCollection, newAd);
      console.log("Saved to Firestore");

      toast({
        title: "สร้างโฆษณาสำเร็จ",
        description: `โฆษณาใหม่ "${title}" ได้ถูกเพิ่มเข้าสู่ระบบแล้ว`,
      });
      router.push(adminAdsPath);

    } catch (error: any) {
      console.error("Error creating ad:", error);

      // Check if it's a storage error
      if (error.code === 'storage/object-not-found' || error.code === 'storage/unauthorized' || error.message?.includes('Storage')) {
        toast({
          variant: "destructive",
          title: "อัปโหลดรูปภาพไม่สำเร็จ",
          description: "กรุณาตรวจสอบว่าได้เปิดใช้งาน Firebase Storage แล้ว",
        });
      } else if (error.code === 'permission-denied') {
        toast({
          variant: "destructive",
          title: "Permission Denied (สิทธิ์ถูกปฏิเสธ)",
          description: `Code: ${error.code} - กรุณาตรวจสอบว่า User ID ของคุณมี role: 'admin' ใน Firestore`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error Occurred",
          description: `Code: ${error.code} | Message: ${error.message}`,
        });
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="flex-1 p-4 sm:px-6 sm:py-0 md:p-8">
      {!isAdmin && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-red-800">
          <div>
            <h3 className="font-bold">Access Denied: You are not an Admin</h3>
            <p className="text-sm">You need admin permissions to create ads.</p>
          </div>
          <Button variant="destructive" onClick={handleFixAdminRole}>
            Fix Admin Role (Dev Only)
          </Button>
        </div>
      )}
      <div className="mx-auto grid max-w-2xl flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
          <Link href={adminAdsPath}>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={isSaving}>
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">กลับ</span>
            </Button>
          </Link>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
            เพิ่มโฆษณาใหม่
          </h1>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Link href={adminAdsPath}>
              <Button variant="outline" size="sm" disabled={isSaving}>
                ยกเลิก
              </Button>
            </Link>
            <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกโฆษณา'}
            </Button>
          </div>
        </div>
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>รายละเอียดโฆษณา</CardTitle>
            <CardDescription>
              กรอกเนื้อหา, รูปภาพ, และสถานะของโฆษณาใหม่
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="picture">รูปภาพ</Label>
                <div className="flex items-center gap-4">
                  <div className="aspect-video w-48 rounded-md object-contain bg-muted border flex items-center justify-center overflow-hidden relative">
                    {imageFile || imageUrl ? (
                      <Image
                        src={imageFile ? URL.createObjectURL(imageFile) : (imageUrl || '')}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs">Preview</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Input
                      id="picture"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      อัปโหลดรูป
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      ขนาดไฟล์ไม่เกิน {MAX_FILE_SIZE_MB}MB
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="title">หัวข้อโฆษณา</Label>
                <Input
                  id="title"
                  type="text"
                  className="w-full"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น โปรโมชั่นพิเศษ..."
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="description">คำอธิบาย</Label>
                <Textarea
                  id="description"
                  placeholder="คำอธิบายสั้นๆ เกี่ยวกับโฆษณา"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="href">ลิงก์ (URL) - ไม่บังคับ</Label>
                <Input
                  id="href"
                  type="url"
                  className="w-full"
                  value={href}
                  onChange={(e) => setHref(e.target.value)}
                  placeholder="เช่น https://www.example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-3">
                  <Label htmlFor="placement">ตำแหน่ง</Label>
                  <Select value={placement} onValueChange={setPlacement}>
                    <SelectTrigger id="placement">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Homepage Carousel">แบนเนอร์หน้าแรก</SelectItem>
                      <SelectItem value="Lawyer Page Sidebar">ไซด์บาร์หน้าทนาย</SelectItem>
                      <SelectItem value="Legal Forms Sidebar">ไซด์บาร์หน้าแบบฟอร์ม</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="status">สถานะ</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-end gap-2 md:hidden">
          <Link href={adminAdsPath}>
            <Button variant="outline" size="sm" disabled={isSaving}>
              ยกเลิก
            </Button>
          </Link>
          <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกโฆษณา'}
          </Button>
        </div>
      </div>
    </main>
  )
}
