'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, User, Lock, Bell, ShieldAlert, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { THAI_PROVINCES } from '@/lib/thai-provinces';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, updateProfile } from 'firebase/auth';
import { uploadToR2 } from '../actions/upload-r2';
import { useToast } from '@/hooks/use-toast';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/constants';
import { formatPhoneNumber, formatBankAccount } from '@/lib/utils';
import Image from 'next/image';

import bblLogo from '@/pic/logo-bank/กรุงเทพ.png';
import kbankLogo from '@/pic/logo-bank/กสิกร.png';
import ktbLogo from '@/pic/logo-bank/กรุงไทย.png';
import scbLogo from '@/pic/logo-bank/ไทยพาณิช.png';
import bayLogo from '@/pic/logo-bank/กรุงศรี.png';
import ttbLogo from '@/pic/logo-bank/ttb.png';
import gsbLogo from '@/pic/logo-bank/ออมสิน.png';
import baacLogo from '@/pic/logo-bank/ธนาคาร ธกส.png';
import cimbLogo from '@/pic/logo-bank/Cimb.png';
import uobLogo from '@/pic/logo-bank/UOB.png';
import tiscoLogo from '@/pic/logo-bank/ทิสโก้.png';
import ibankLogo from '@/pic/logo-bank/ธนาคารอิสลาม.png';
import ghbLogo from '@/pic/logo-bank/ธอส.png';
import kkpLogo from '@/pic/logo-bank/เกียรตินาคิน.png';
import lhLogo from '@/pic/logo-bank/แลนด์แลนด์เฮ้าท์ .png';
import icbcLogo from '@/pic/logo-bank/ICBC.png';
import bocLogo from '@/pic/logo-bank/ธนาคารแห่งประเทศจีน.png';


const banks = [
  { name: "ธนาคารกรุงเทพ", logo: bblLogo, color: "#1e4598" },
  { name: "ธนาคารกสิกรไทย", logo: kbankLogo, color: "#138f2d" },
  { name: "ธนาคารกรุงไทย", logo: ktbLogo, color: "#1ba5e1" },
  { name: "ธนาคารไทยพาณิชย์", logo: scbLogo, color: "#4e2e7f" },
  { name: "ธนาคารกรุงศรีอยุธยา", logo: bayLogo, color: "#fec43b" },
  { name: "ธนาคารทหารไทยธนชาต", logo: ttbLogo, color: "#102a4d" },
  { name: "ธนาคารออมสิน", logo: gsbLogo, color: "#eb198d" },
  { name: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร", logo: baacLogo, color: "#4b9b1d" },
  { name: "ธนาคารซีไอเอ็มบี ไทย", logo: cimbLogo, color: "#7e2f36" },
  { name: "ธนาคารยูโอบี", logo: uobLogo, color: "#0b3979" },
  { name: "ธนาคารทิสโก้", logo: tiscoLogo, color: "#1a4d8d" },
  { name: "ธนาคารอิสลามแห่งประเทศไทย", logo: ibankLogo, color: "#164134" },
  { name: "ธนาคารอาคารสงเคราะห์", logo: ghbLogo, color: "#f58523" },
  { name: "ธนาคารเกียรตินาคินภัทร", logo: kkpLogo, color: "#6e5a9c" },
  { name: "ธนาคารแลนด์ แอนด์ เฮ้าส์", logo: lhLogo, color: "#6d6e71" },
  { name: "ธนาคารไอซีบีซี (ไทย)", logo: icbcLogo, color: "#c4161c" },
  { name: "ธนาคารแห่งประเทศจีน (ไทย)", logo: bocLogo, color: "#b40026" },
];

export default function AccountPage() {
  const { firestore, storage, auth } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    photoURL: '',
  });

  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // Lawyer specific state
  const [isLawyer, setIsLawyer] = useState(false);
  const [lawyerData, setLawyerData] = useState({
    phone: '',
    licenseNumber: '',
    address: '',
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    serviceProvinces: '',
    specialty: '',
    description: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchUserData() {
      if (!firestore || !user) {
        if (!user) setIsLoading(false);
        return;
      }

      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfileData({
            name: data.name || user.displayName || '',
            email: user.email || '',
            photoURL: data.avatar || user.photoURL || '',
          });
        } else {
          setProfileData({
            name: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || '',
          });
        }

        // Check for lawyer profile
        const lawyerDocRef = doc(firestore, 'lawyerProfiles', user.uid);
        const lawyerDoc = await getDoc(lawyerDocRef);
        if (lawyerDoc.exists()) {
          setIsLawyer(true);
          const lData = lawyerDoc.data();
          setLawyerData({
            phone: lData.phone || '',
            licenseNumber: lData.licenseNumber || '',
            address: lData.address || '',
            bankName: lData.bankName || '',
            bankAccountName: lData.bankAccountName || '',
            bankAccountNumber: lData.bankAccountNumber || '',
            serviceProvinces: Array.isArray(lData.serviceProvinces) ? lData.serviceProvinces.join(', ') : lData.serviceProvinces || '',
            specialty: Array.isArray(lData.specialty) ? lData.specialty.join(', ') : lData.specialty || '',
            description: lData.description || '',
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          variant: "destructive",
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถดึงข้อมูลผู้ใช้ได้"
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, [firestore, user, toast]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          variant: "destructive",
          title: "ไฟล์มีขนาดใหญ่เกินไป",
          description: `กรุณาอัปโหลดไฟล์ขนาดไม่เกิน ${MAX_FILE_SIZE_MB}MB`
        });
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setImageFile(file);
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setProfileData(prev => ({ ...prev, photoURL: previewUrl }));
    }
  };

  const handleSaveProfile = async () => {
    if (!firestore || !user) return;
    setIsSaving(true);
    try {
      let newPhotoURL = profileData.photoURL;

      // 1. Upload Image if changed
      if (imageFile) {
        try {
          const formData = new FormData();
          formData.append('file', imageFile);

          // Upload to R2 via Server Action
          newPhotoURL = await uploadToR2(formData, 'profile-images');

        } catch (uploadError) {
          console.error("Error uploading image:", uploadError);
          toast({
            variant: "destructive",
            title: "อัปโหลดรูปภาพไม่สำเร็จ",
            description: "โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือลองใหม่อีกครั้ง"
          });
          // Don't stop saving profile, just keep old photo or skip update
          newPhotoURL = profileData.photoURL.startsWith('blob:') ? user.photoURL || '' : profileData.photoURL;
        }
      }

      // Ensure we don't save blob URLs to Firestore/Auth
      if (newPhotoURL && newPhotoURL.startsWith('blob:')) {
        newPhotoURL = user.photoURL || '';
      }

      // 2. Update Auth Profile
      if (auth && auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, {
            displayName: profileData.name,
            photoURL: newPhotoURL
          });
        } catch (authError) {
          console.error("Error updating auth profile:", authError);
          // Continue to update Firestore even if Auth update fails (e.g. rate limit)
        }
      }

      // 3. Update Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      const updateData: any = {
        name: profileData.name,
        updatedAt: new Date()
      };
      if (newPhotoURL) updateData.avatar = newPhotoURL;

      if (userDoc.exists()) {
        await updateDoc(userDocRef, updateData);
      } else {
        await setDoc(userDocRef, {
          ...updateData,
          email: user.email,
          role: 'customer',
          createdAt: new Date(),
        });
      }

      // 4. Update Lawyer Profile if applicable
      if (isLawyer) {
        const lawyerDocRef = doc(firestore, 'lawyerProfiles', user.uid);
        await updateDoc(lawyerDocRef, {
          name: profileData.name, // Sync name
          phone: lawyerData.phone,
          licenseNumber: lawyerData.licenseNumber,
          address: lawyerData.address,
          bankName: lawyerData.bankName,
          bankAccountName: lawyerData.bankAccountName,
          bankAccountNumber: lawyerData.bankAccountNumber,
          serviceProvinces: lawyerData.serviceProvinces.split(',').map(s => s.trim()).filter(s => s),
          specialty: lawyerData.specialty.split(',').map(s => s.trim()).filter(s => s),
          description: lawyerData.description,
          updatedAt: new Date()
        });

        // Also update image if changed
        if (newPhotoURL) {
          await updateDoc(lawyerDocRef, { imageUrl: newPhotoURL });
        }
      }

      toast({
        title: "บันทึกสำเร็จ",
        description: "ข้อมูลโปรไฟล์ของคุณได้รับการอัปเดตแล้ว"
      });
      setIsEditingProfile(false);
      setImageFile(null);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "บันทึกไม่สำเร็จ",
        description: error.message || "กรุณาลองใหม่อีกครั้ง"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!user || !auth || !auth.currentUser) return;

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({
        variant: "destructive",
        title: "รหัสผ่านไม่ตรงกัน",
        description: "กรุณากรอกรหัสผ่านใหม่ให้ตรงกันทั้งสองช่อง"
      });
      return;
    }

    if (passwords.newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "รหัสผ่านสั้นเกินไป",
        description: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร"
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      await updatePassword(auth.currentUser, passwords.newPassword);
      toast({
        title: "เปลี่ยนรหัสผ่านสำเร็จ",
        description: "รหัสผ่านของคุณถูกเปลี่ยนเรียบร้อยแล้ว"
      });
      setPasswords({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error("Error changing password:", error);
      if (error.code === 'auth/requires-recent-login') {
        toast({
          variant: "destructive",
          title: "ยืนยันตัวตนไม่สำเร็จ",
          description: "กรุณาออกจากระบบและเข้าสู่ระบบใหม่ก่อนเปลี่ยนรหัสผ่าน"
        });
      } else {
        toast({
          variant: "destructive",
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถเปลี่ยนรหัสผ่านได้: " + error.message
        });
      }
    } finally {
      setIsChangingPassword(false);
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p>กรุณาเข้าสู่ระบบเพื่อจัดการบัญชี</p>
        <Button asChild><Link href="/login">เข้าสู่ระบบ</Link></Button>
      </div>
    )
  }

  return (
    <div className="bg-gray-100/50">
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              กลับไปที่แดชบอร์ด
            </Link>
            <h1 className="text-3xl font-bold font-headline">จัดการบัญชี</h1>
            <p className="text-muted-foreground">อัปเดตข้อมูลโปรไฟล์และตั้งค่าบัญชีของคุณ</p>
          </div>

          {/* Profile Information */}
          <Card className="rounded-3xl shadow-sm border-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <User className="w-6 h-6" />
                <div>
                  <CardTitle>ข้อมูลโปรไฟล์</CardTitle>
                  <CardDescription>นี่คือข้อมูลสาธารณะของคุณ</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(!isEditingProfile)} disabled={isSaving} className="rounded-full">
                {isEditingProfile ? 'ยกเลิก' : 'แก้ไข'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profileData.photoURL} />
                  <AvatarFallback>{profileData.name ? profileData.name.charAt(0) : 'U'}</AvatarFallback>
                </Avatar>
                {isEditingProfile && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-full">เปลี่ยนรูปภาพ</Button>
                  </>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">ชื่อ-นามสกุล</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    disabled={!isEditingProfile || isSaving}
                    className="rounded-full px-4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">อีเมล</Label>
                  <Input id="email" type="email" value={profileData.email} disabled className="rounded-full px-4" />
                </div>
              </div>

              {isLawyer && (
                <>
                  <Separator className="my-4" />
                  <h3 className="text-lg font-semibold mb-4">ข้อมูลทนายความ</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                      <Input
                        id="phone"
                        value={lawyerData.phone}
                        onChange={(e) => setLawyerData({ ...lawyerData, phone: formatPhoneNumber(e.target.value) })}
                        disabled={!isEditingProfile || isSaving}
                        maxLength={12}
                        className="rounded-full px-4"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="license">เลขที่ใบอนุญาต</Label>
                      <Input
                        id="license"
                        value={lawyerData.licenseNumber}
                        onChange={(e) => setLawyerData({ ...lawyerData, licenseNumber: e.target.value })}
                        disabled={!isEditingProfile || isSaving}
                        className="rounded-full px-4"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">ที่อยู่สำนักงาน</Label>
                      <Input
                        id="address"
                        value={lawyerData.address}
                        onChange={(e) => setLawyerData({ ...lawyerData, address: e.target.value })}
                        disabled={!isEditingProfile || isSaving}
                        className="rounded-full px-4"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="description">คำแนะนำตัว / ประวัติย่อ</Label>
                      <Input
                        id="description"
                        value={lawyerData.description}
                        onChange={(e) => setLawyerData({ ...lawyerData, description: e.target.value })}
                        disabled={!isEditingProfile || isSaving}
                        className="rounded-full px-4"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="provinces">จังหวัดที่ให้บริการ (เลือกได้มากกว่า 1 จังหวัด)</Label>
                      <div className="space-y-3">
                        <Select
                          onValueChange={(value) => {
                            const currentProvinces = lawyerData.serviceProvinces ? lawyerData.serviceProvinces.split(',').map(s => s.trim()).filter(s => s) : [];
                            if (!currentProvinces.includes(value)) {
                              const newProvinces = [...currentProvinces, value];
                              setLawyerData({ ...lawyerData, serviceProvinces: newProvinces.join(',') });
                            }
                          }}
                          disabled={!isEditingProfile || isSaving}
                        >
                          <SelectTrigger className="rounded-full px-4">
                            <SelectValue placeholder="เลือกจังหวัดที่ให้บริการ" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {THAI_PROVINCES.map((region) => (
                              <SelectGroup key={region.region}>
                                <SelectLabel>{region.region}</SelectLabel>
                                {region.provinces.map((province) => (
                                  <SelectItem key={province} value={province}>
                                    {province}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="flex flex-wrap gap-2">
                          {lawyerData.serviceProvinces ? lawyerData.serviceProvinces.split(',').map(s => s.trim()).filter(s => s).map((province) => (
                            <Badge key={province} variant="secondary" className="flex items-center gap-1">
                              {province}
                              {isEditingProfile && !isSaving && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentProvinces = lawyerData.serviceProvinces.split(',').map(s => s.trim()).filter(s => s);
                                    const newProvinces = currentProvinces.filter(p => p !== province);
                                    setLawyerData({ ...lawyerData, serviceProvinces: newProvinces.join(',') });
                                  }}
                                  className="hover:bg-muted rounded-full p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                  <span className="sr-only">ลบ {province}</span>
                                </button>
                              )}
                            </Badge>
                          )) : (
                            <span className="text-sm text-muted-foreground">ยังไม่ได้เลือกจังหวัด</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="specialty">ความเชี่ยวชาญ (คั่นด้วยจุลภาค)</Label>
                      <Input
                        id="specialty"
                        value={lawyerData.specialty}
                        onChange={(e) => setLawyerData({ ...lawyerData, specialty: e.target.value })}
                        disabled={!isEditingProfile || isSaving}
                        placeholder="กฎหมายแพ่ง, กฎหมายอาญา"
                        className="rounded-full px-4"
                      />
                    </div>
                  </div>

                  <Separator className="my-4" />
                  <h3 className="text-lg font-semibold mb-4">ข้อมูลบัญชีธนาคาร (สำหรับรับเงิน)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankName">ธนาคาร</Label>
                      <Label htmlFor="bankName">ธนาคาร</Label>
                      <Select
                        value={lawyerData.bankName}
                        onValueChange={(value) => setLawyerData({ ...lawyerData, bankName: value })}
                        disabled={!isEditingProfile || isSaving}
                      >
                        <SelectTrigger className="rounded-full px-4">
                          <SelectValue placeholder="เลือกธนาคาร" />
                        </SelectTrigger>
                        <SelectContent>
                          {banks.map(bank => (
                            <SelectItem key={bank.name} value={bank.name}>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 relative rounded-full overflow-hidden border bg-white flex items-center justify-center">
                                  <Image
                                    src={bank.logo}
                                    alt={bank.name}
                                    className="object-contain p-0.5"
                                    fill
                                  />
                                </div>
                                <span>{bank.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bankAccountName">ชื่อบัญชี</Label>
                      <Input
                        id="bankAccountName"
                        value={lawyerData.bankAccountName}
                        onChange={(e) => setLawyerData({ ...lawyerData, bankAccountName: e.target.value })}
                        disabled={!isEditingProfile || isSaving}
                        placeholder="ต้องตรงกับชื่อผู้สมัคร"
                        className="rounded-full px-4"
                      />
                      {lawyerData.bankAccountName && lawyerData.bankAccountName !== profileData.name && (
                        <p className="text-xs text-red-500">ชื่อบัญชีต้องตรงกับชื่อ-นามสกุลของคุณ</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bankAccount">เลขที่บัญชี</Label>
                      <Input
                        id="bankAccount"
                        value={lawyerData.bankAccountNumber}
                        onChange={(e) => setLawyerData({ ...lawyerData, bankAccountNumber: formatBankAccount(e.target.value) })}
                        disabled={!isEditingProfile || isSaving}
                        placeholder="xxx-x-xxxxx-x"
                        maxLength={14}
                        className="rounded-full px-4"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            {isEditingProfile && (
              <CardFooter>
                <Button onClick={handleSaveProfile} disabled={isSaving} className="rounded-full">
                  {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังบันทึก...</> : 'บันทึกการเปลี่ยนแปลง'}
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Password Settings */}
          <Card className="rounded-3xl shadow-sm border-none">
            <CardHeader className="flex items-center gap-4">
              <Lock className="w-6 h-6" />
              <div>
                <CardTitle>ความปลอดภัย</CardTitle>
                <CardDescription>เปลี่ยนรหัสผ่านของคุณ</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    className="rounded-full px-4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    className="rounded-full px-4"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handlePasswordChange} disabled={isChangingPassword || !passwords.newPassword} className="rounded-full">
                {isChangingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังเปลี่ยน...</> : 'เปลี่ยนรหัสผ่าน'}
              </Button>
            </CardFooter>
          </Card>

          {/* Notifications */}
          <Card className="rounded-3xl shadow-sm border-none">
            <CardHeader className="flex items-center gap-4">
              <Bell className="w-6 h-6" />
              <div>
                <CardTitle>การแจ้งเตือน</CardTitle>
                <CardDescription>จัดการการตั้งค่าการแจ้งเตือนของคุณ</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-3xl">
                <div>
                  <Label htmlFor="newsletter" className="font-medium">การแจ้งเตือนทางอีเมล</Label>
                  <p className="text-sm text-muted-foreground">รับข่าวสาร, อัปเดต และเคล็ดลับทางกฎหมาย</p>
                </div>
                <Switch id="newsletter" defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="rounded-3xl shadow-sm border-destructive">
            <CardHeader className="flex items-center gap-4">
              <ShieldAlert className="w-6 h-6 text-destructive" />
              <div>
                <CardTitle className="text-destructive">โซนอันตราย</CardTitle>
                <CardDescription>การดำเนินการเหล่านี้ไม่สามารถย้อนกลับได้</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-3xl bg-destructive/5">
                <div>
                  <p className="font-semibold">ลบบัญชี</p>
                  <p className="text-sm text-muted-foreground">ข้อมูลทั้งหมดของคุณจะถูกลบอย่างถาวร</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="rounded-full">ลบบัญชีของฉัน</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
                      <AlertDialogDescription>
                        การกระทำนี้ไม่สามารถย้อนกลับได้ บัญชีและข้อมูลทั้งหมดของคุณจะถูกลบอย่างถาวร
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">ยืนยันการลบ</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div >
  );
}
