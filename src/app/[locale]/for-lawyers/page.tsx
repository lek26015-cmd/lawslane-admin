'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { uploadToR2 } from '@/app/actions/upload-r2';

import { TurnstileWidget } from '@/components/turnstile-widget';
import { validateTurnstile } from '@/app/actions/turnstile';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, ArrowLeft, Check, User } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { THAI_PROVINCES } from '@/lib/thai-provinces';
import { X } from 'lucide-react';
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
import lawyerCoverImg from '@/pic/lawyer-cover.jpg';

const specialties = [
  'คดีฉ้อโกง SMEs',
  'คดีแพ่งและพาณิชย์',
  'การผิดสัญญา',
  'ทรัพย์สินทางปัญญา',
  'กฎหมายแรงงาน',
  'อสังหาริมทรัพย์',
];

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

const formSchema = z.object({
  name: z.string().min(2, { message: 'ชื่อ-นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร' }),
  email: z.string().email({ message: 'รูปแบบอีเมลไม่ถูกต้อง' }),
  password: z.string().min(6, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }),
  phone: z.string().min(9, { message: 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง' }),
  dob: z.date({ required_error: 'กรุณาเลือกวันเกิด' }),
  gender: z.string({ required_error: 'กรุณาเลือกเพศ' }),
  licenseNumber: z.string().min(1, { message: 'กรุณากรอกเลขใบอนุญาต' }),
  education: z.string().min(1, { message: 'กรุณากรอกข้อมูลการศึกษา' }),
  experience: z.string().min(1, { message: 'กรุณากรอกประสบการณ์ทำงาน' }),
  address: z.string().min(1, { message: 'กรุณากรอกที่อยู่' }),
  serviceProvinces: z.string().min(1, { message: 'กรุณากรอกจังหวัดที่ให้บริการ' }),
  bankName: z.string({ required_error: 'กรุณาเลือกธนาคาร' }),
  bankAccountName: z.string().min(1, { message: 'กรุณากรอกชื่อบัญชี' }),
  bankAccountNumber: z.string().min(1, { message: 'กรุณากรอกเลขบัญชีธนาคาร' }),
  lineId: z.string().optional(),
  specialties: z.array(z.string()).refine(value => value.some(item => item), {
    message: 'กรุณาเลือกความเชี่ยวชาญอย่างน้อย 1 อย่าง',
  }),
  terms: z.boolean().refine(val => val === true, {
    message: 'กรุณายอมรับนโยบายความเป็นส่วนตัว',
  }),
}).refine((data) => data.bankAccountName === data.name, {
  message: "ชื่อบัญชีธนาคารต้องตรงกับชื่อ-นามสกุลผู้สมัคร",
  path: ["bankAccountName"],
});

import { useRef } from 'react';

export default function ForLawyersPage() {
  const router = useRouter();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [customOptions, setCustomOptions] = useState<string[]>([]);
  const isSubmittingRef = useRef(false);

  const handleAddCustomSpecialty = (field: any) => {
    if (!customSpecialty.trim()) return;
    if (specialties.includes(customSpecialty) || customOptions.includes(customSpecialty)) {
      toast({
        title: "มีข้อมูลนี้อยู่แล้ว",
        description: "ความเชี่ยวชาญนี้มีอยู่ในรายการแล้ว",
        variant: "destructive"
      });
      return;
    }

    setCustomOptions([...customOptions, customSpecialty]);
    field.onChange([...(field.value || []), customSpecialty]);
    setCustomSpecialty('');
  };

  const benefits = [
    {
      icon: <Check className="text-green-500" />,
      text: 'เข้าถึงกลุ่มลูกค้า SME และบุคคลทั่วไปที่ต้องการความช่วยเหลือทางกฎหมาย',
    },
    {
      icon: <Check className="text-green-500" />,
      text: 'ระบบจัดการเคสและนัดหมายออนไลน์ที่ใช้งานง่าย',
    },
    {
      icon: <Check className="text-green-500" />,
      text: 'เพิ่มความน่าเชื่อถือและสร้างโปรไฟล์มืออาชีพของคุณ',
    },
    {
      icon: <Check className="text-green-500" />,
      text: 'มีทีมงานคอยให้ความช่วยเหลือและสนับสนุน',
    },
  ];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
      gender: undefined,
      education: '',
      experience: '',
      licenseNumber: '',
      address: '',
      serviceProvinces: '',
      bankName: undefined,
      bankAccountName: '',
      bankAccountNumber: '',
      lineId: '',
      specialties: [],
      terms: false,
    },
  });

  const handleFileChange = (setter: React.Dispatch<React.SetStateAction<File | null>>, isProfileImage: boolean = false) => (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          variant: "destructive",
          title: "ไฟล์มีขนาดใหญ่เกินไป",
          description: `กรุณาอัปโหลดไฟล์ขนาดไม่เกิน ${MAX_FILE_SIZE_MB}MB`
        });
        event.target.value = ''; // Reset input
        return;
      }

      setter(file);

      // Create preview for profile image
      if (isProfileImage) {
        const previewUrl = URL.createObjectURL(file);
        setProfileImagePreview(previewUrl);
      }
    }
  };

  async function uploadFileToR2Wrapper(file: File, folder: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    return await uploadToR2(formData, folder);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'ระบบยังไม่พร้อม',
        description: 'กำลังเชื่อมต่อกับ Firebase กรุณารอสักครู่แล้วลองใหม่',
      });
      isSubmittingRef.current = false;
      return;
    }
    if (!idCardFile || !licenseFile) {
      toast({ variant: 'destructive', title: 'ข้อมูลไม่ครบ', description: 'กรุณาอัปโหลดไฟล์ให้ครบถ้วน' });
      isSubmittingRef.current = false;
      return;
    }

    setIsLoading(true);

    try {
      if (!turnstileToken) {
        throw new Error('กรุณายืนยันตัวตนผ่าน Cloudflare Turnstile');
      }

      const validation = await validateTurnstile(turnstileToken);
      if (!validation.success) {
        throw new Error('การยืนยันตัวตนล้มเหลว กรุณาลองใหม่');
      }

      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // Force token refresh
      await user.getIdToken(true);

      // 2. Update user profile in Firebase Auth
      await updateProfile(user, { displayName: values.name });

      // Send Custom Email Verification
      import('@/app/actions/auth').then(({ sendCustomVerificationEmail }) => {
        sendCustomVerificationEmail(values.email, values.name).then((res) => {
          if (res.success) console.log("Custom verification email sent");
          else console.error("Error sending custom verification email:", res.error);
        });
      });

      // 3. Upload Files
      const idCardUrl = await uploadFileToR2Wrapper(idCardFile, `lawyer-documents/${user.uid}/id-card`);
      const licenseUrl = await uploadFileToR2Wrapper(licenseFile, `lawyer-documents/${user.uid}/license`);

      // 3.1 Upload Profile Image (optional)
      let profileImageUrl = '';
      if (profileImageFile) {
        profileImageUrl = await uploadFileToR2Wrapper(profileImageFile, `lawyer-profile-images/${user.uid}`);
      }

      // 4. Create user profile document in Firestore (users collection)
      const userDocRef = doc(firestore, 'users', user.uid);
      const userProfileData = {
        uid: user.uid,
        name: values.name,
        email: values.email,
        phone: values.phone,
        role: 'lawyer',
        type: 'บุคคลทั่วไป',
        registeredAt: serverTimestamp(),
        status: 'active',
        avatar: '',
        termsAccepted: true,
        termsAcceptedAt: serverTimestamp(),
      };

      await setDoc(userDocRef, userProfileData);

      // 5. Create lawyer profile document in Firestore (lawyerProfiles collection)
      const lawyerProfileRef = doc(firestore, 'lawyerProfiles', user.uid);
      const lawyerProfileData = {
        userId: user.uid,
        name: values.name,
        email: values.email,
        phone: values.phone,
        dob: values.dob,
        gender: values.gender,
        education: values.education,
        experience: values.experience,
        licenseNumber: values.licenseNumber,
        address: values.address,
        serviceProvinces: values.serviceProvinces.split(',').map(s => s.trim()),
        bankName: values.bankName,
        bankAccountName: values.bankAccountName,
        bankAccountNumber: values.bankAccountNumber,
        lineId: values.lineId,
        specialty: values.specialties,
        status: 'pending',
        description: '',
        imageUrl: profileImageUrl,
        imageHint: 'professional lawyer',
        idCardUrl: idCardUrl,
        licenseUrl: licenseUrl,
        joinedAt: serverTimestamp(),
      };

      await setDoc(lawyerProfileRef, lawyerProfileData);

      // 6. Add to Verified Lawyers Registry (Auto-add)
      try {
        // Sanitize license number for use as document ID (replace / with -)
        const docId = values.licenseNumber.replace(/\//g, '-');
        const verifiedLawyerRef = doc(firestore, 'verifiedLawyers', docId);
        const verifiedLawyerData = {
          licenseNumber: values.licenseNumber,
          firstName: values.name.split(' ')[0],
          lastName: values.name.split(' ').slice(1).join(' ') || '',
          status: 'pending',
          registeredDate: new Date().toISOString(),
          province: values.serviceProvinces.split(',')[0]?.trim() || values.address,
          updatedAt: serverTimestamp()
        };
        await setDoc(verifiedLawyerRef, verifiedLawyerData);
      } catch (err) {
        console.error("Error adding to verified registry:", err);
        // Don't fail the whole registration if this optional step fails
      }

      // Create Admin Notification
      try {
        await addDoc(collection(firestore, 'notifications'), {
          type: 'lawyer_registration',
          title: 'ทนายความใหม่',
          message: `มีทนายความใหม่สมัครสมาชิก: ${values.name}`,
          createdAt: serverTimestamp(),
          read: false,
          recipient: 'admin',
          link: `/admin/lawyers/${user.uid}`,
          relatedId: user.uid
        });
      } catch (e) {
        console.error("Error creating notification:", e);
      }

      toast({
        title: 'สมัครเข้าร่วมสำเร็จ',
        description: 'กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตน และรอเจ้าหน้าที่ตรวจสอบข้อมูล',
      });

      await signOut(auth);
      router.push(`/registration-success`);

    } catch (error: any) {
      console.error(error);

      // Rollback: If user was created but subsequent steps failed, delete the user to prevent "Email already in use" on retry
      if (auth.currentUser && error.code !== 'auth/email-already-in-use') {
        try {
          await auth.currentUser.delete();
          console.log("Rolled back: Deleted zombie auth user due to registration failure.");
        } catch (deleteErr) {
          console.error("Failed to rollback auth user:", deleteErr);
        }
      }

      let errorMessage = 'เกิดข้อผิดพลาดที่ไม่รู้จัก';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น หรือเข้าสู่ระบบ';
      } else if (error.message) {
        // Translate common errors
        if (error.message.includes("File too large")) errorMessage = "ไฟล์มีขนาดใหญ่เกินไป";
        else errorMessage = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'การสมัครไม่สำเร็จ',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            กลับไปหน้าแรก
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Column: Marketing Content */}
          <div className="space-y-6 lg:sticky lg:top-24">
            <div className="relative h-64 w-full rounded-3xl overflow-hidden mb-6">
              <Image
                src={lawyerCoverImg}
                alt="Thai Lawyer"
                fill
                className="object-cover"
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-foreground font-headline">
              เข้าร่วมเป็นส่วนหนึ่งของ Lawslane
            </h1>
            <p className="text-lg text-muted-foreground">
              ขยายฐานลูกค้าและพัฒนาการทำงานของคุณไปกับแพลตฟอร์มกฎหมายสำหรับยุคดิจิทัล
              เรากำลังมองหาทนายความผู้มีความสามารถและมุ่งมั่นที่จะมอบบริการที่ดีที่สุดเพื่อเข้าร่วมเครือข่ายของเรา
            </p>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0">{benefit.icon}</div>
                  <p className="text-foreground/90">{benefit.text}</p>
                </div>
              ))}
            </div>
            <div className="pt-6 hidden lg:block">
              <Button asChild size="lg" variant="outline" className="w-full md:w-auto rounded-full">
                <Link href="/lawyer-login">เข้าสู่ระบบสำหรับทนายที่มีบัญชีแล้ว</Link>
              </Button>
            </div>

          </div>

          {/* Right Column: Signup Form */}
          <div>
            <Card className="shadow-xl border-t-4 border-t-primary rounded-3xl overflow-hidden">
              <CardHeader className="text-center space-y-2">
                <CardTitle className="text-2xl font-bold font-headline">
                  ลงทะเบียนทนายความใหม่
                </CardTitle>
                <CardDescription>
                  กรอกข้อมูลเพื่อสร้างโปรไฟล์และเริ่มรับงาน
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                    toast({
                      variant: "destructive",
                      title: "กรุณากรอกข้อมูลให้ครบถ้วน",
                      description: "มีบางช่องที่ยังไม่ได้กรอก หรือกรอกไม่ถูกต้อง (ดูสีแดงในฟอร์ม)",
                    });
                  })} className="space-y-6">

                    <h3 className="text-lg font-semibold border-b pb-2">ข้อมูลส่วนตัว</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>ชื่อ-นามสกุล (ตามบัตรประชาชน)</FormLabel><FormControl><Input {...field} className="rounded-full px-4" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>เบอร์โทรศัพท์</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="0812345678"
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, '');
                                field.onChange(value);
                              }}
                              maxLength={10}
                              className="rounded-full px-4"
                            />
                          </FormControl>
                          <CardDescription>กรอกเฉพาะตัวเลขเท่านั้น</CardDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <FormField control={form.control} name="dob" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>วันเกิด</FormLabel>
                          <div className="flex gap-2">
                            {/* Day */}
                            <Select
                              value={field.value ? field.value.getDate().toString() : undefined}
                              onValueChange={(value) => {
                                const current = field.value || new Date();
                                const newDate = new Date(current.getFullYear(), current.getMonth(), parseInt(value));
                                field.onChange(newDate);
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className="w-[80px] rounded-full">
                                  <SelectValue placeholder="วัน" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                  <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Month */}
                            <Select
                              value={field.value ? field.value.getMonth().toString() : undefined}
                              onValueChange={(value) => {
                                const current = field.value || new Date();
                                const newDate = new Date(current.getFullYear(), parseInt(value), current.getDate());
                                field.onChange(newDate);
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className="flex-1 rounded-full">
                                  <SelectValue placeholder="เดือน" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {[
                                  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
                                  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
                                ].map((month, index) => (
                                  <SelectItem key={index} value={index.toString()}>{month}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Year */}
                            <Select
                              value={field.value ? field.value.getFullYear().toString() : undefined}
                              onValueChange={(value) => {
                                const current = field.value || new Date();
                                const newDate = new Date(parseInt(value), current.getMonth(), current.getDate());
                                field.onChange(newDate);
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className="w-[100px] rounded-full">
                                  <SelectValue placeholder="ปี" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                                  <SelectItem key={year} value={year.toString()}>{year + 543}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="gender" render={({ field }) => (
                        <FormItem><FormLabel>เพศ</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="rounded-full px-4"><SelectValue placeholder="เลือกเพศ" /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="ชาย">ชาย</SelectItem><SelectItem value="หญิง">หญิง</SelectItem><SelectItem value="อื่นๆ">อื่นๆ</SelectItem></SelectContent>
                          </Select>
                          <FormMessage /></FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem><FormLabel>ที่อยู่ (ตามบัตรประชาชน)</FormLabel><FormControl><Input {...field} className="rounded-full px-4" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="lineId" render={({ field }) => (
                      <FormItem><FormLabel>Line ID (ถ้ามี)</FormLabel><FormControl><Input {...field} className="rounded-full px-4" /></FormControl><FormMessage /></FormItem>
                    )} />

                    <h3 className="text-lg font-semibold border-b pb-2 pt-4">ข้อมูลบัญชีผู้ใช้</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>อีเมล (สำหรับเข้าสู่ระบบ)</FormLabel><FormControl><Input placeholder="name@example.com" {...field} className="rounded-full px-4" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem><FormLabel>รหัสผ่าน</FormLabel><FormControl><Input type="password" placeholder="อย่างน้อย 6 ตัวอักษร" {...field} className="rounded-full px-4" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>

                    <h3 className="text-lg font-semibold border-b pb-2 pt-4">ข้อมูลสำหรับวิชาชีพ</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <FormField control={form.control} name="education" render={({ field }) => (
                        <FormItem><FormLabel>การศึกษา (เช่น น.บ. จุฬาลงกรณ์มหาวิทยาลัย)</FormLabel><FormControl><Input {...field} className="rounded-full px-4" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="experience" render={({ field }) => (
                        <FormItem><FormLabel>ประสบการณ์ทำงาน (เช่น ว่าความมาแล้ว 5 ปี, เชี่ยวชาญคดีแพ่ง)</FormLabel><FormControl><Input {...field} className="rounded-full px-4" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="licenseNumber" render={({ field }) => (
                        <FormItem><FormLabel>เลขที่ใบอนุญาตว่าความ</FormLabel><FormControl><Input {...field} className="rounded-full px-4" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="serviceProvinces" render={({ field }) => (
                        <FormItem>
                          <FormLabel>จังหวัดที่ให้บริการ (เลือกได้มากกว่า 1 จังหวัด)</FormLabel>
                          <div className="space-y-3">
                            <Select
                              onValueChange={(value) => {
                                const currentProvinces = field.value ? field.value.split(',').map(s => s.trim()).filter(s => s) : [];
                                if (!currentProvinces.includes(value)) {
                                  const newProvinces = [...currentProvinces, value];
                                  field.onChange(newProvinces.join(','));
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className="rounded-full px-4">
                                  <SelectValue placeholder="เลือกจังหวัดที่ให้บริการ" />
                                </SelectTrigger>
                              </FormControl>
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
                              {field.value ? field.value.split(',').map(s => s.trim()).filter(s => s).map((province) => (
                                <Badge key={province} variant="secondary" className="flex items-center gap-1">
                                  {province}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentProvinces = field.value.split(',').map(s => s.trim()).filter(s => s);
                                      const newProvinces = currentProvinces.filter(p => p !== province);
                                      field.onChange(newProvinces.join(','));
                                    }}
                                    className="hover:bg-muted rounded-full p-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                    <span className="sr-only">ลบ {province}</span>
                                  </button>
                                </Badge>
                              )) : (
                                <span className="text-sm text-muted-foreground">ยังไม่ได้เลือกจังหวัด</span>
                              )}
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField
                      control={form.control}
                      name="specialties"
                      render={() => (
                        <FormItem>
                          <div className="mb-4"><FormLabel className="text-base">ความเชี่ยวชาญ (เลือกได้มากกว่า 1)</FormLabel></div>
                          <div className="grid grid-cols-2 gap-2">
                            {specialties.map((item) => (
                              <FormField key={item} control={form.control} name="specialties"
                                render={({ field }) => (
                                  <FormItem key={item} className="flex flex-row items-center space-x-3 space-y-0 p-3 bg-gray-100 rounded-xl">
                                    <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => {
                                      return checked ? field.onChange([...field.value, item]) : field.onChange(field.value?.filter((value) => value !== item))
                                    }} /></FormControl>
                                    <FormLabel className="font-normal text-sm">{item}</FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>

                          {/* Custom Specialties */}
                          {customOptions.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {customOptions.map((item) => (
                                <FormField key={item} control={form.control} name="specialties"
                                  render={({ field }) => (
                                    <FormItem key={item} className="flex flex-row items-center space-x-3 space-y-0 p-3 bg-blue-50 border border-blue-100 rounded-xl relative group">
                                      <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => {
                                        return checked ? field.onChange([...field.value, item]) : field.onChange(field.value?.filter((value: string) => value !== item))
                                      }} /></FormControl>
                                      <FormLabel className="font-normal text-sm flex-grow">{item}</FormLabel>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCustomOptions(customOptions.filter(opt => opt !== item));
                                          field.onChange(field.value?.filter((value: string) => value !== item));
                                        }}
                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2 mt-4">
                            <Input
                              placeholder="ระบุความเชี่ยวชาญอื่นๆ"
                              value={customSpecialty}
                              onChange={(e) => setCustomSpecialty(e.target.value)}
                              className="rounded-full px-4"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  // We need to access the field object here, but we are outside the render prop.
                                  // A workaround is to trigger the button click or pass the field from the parent scope if possible.
                                  // Since we are inside the FormField render, we actually HAVE 'field' in scope if we move this inside.
                                  // Let's check the structure. We are inside render={() => ( ... )} so we don't have 'field' directly available for the input unless we wrap it.
                                  // But we can use form.getValues and form.setValue.
                                  const currentValues = form.getValues('specialties') || [];
                                  if (!customSpecialty.trim()) return;
                                  if (specialties.includes(customSpecialty) || customOptions.includes(customSpecialty)) return;

                                  setCustomOptions([...customOptions, customSpecialty]);
                                  form.setValue('specialties', [...currentValues, customSpecialty]);
                                  setCustomSpecialty('');
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                const currentValues = form.getValues('specialties') || [];
                                if (!customSpecialty.trim()) return;
                                if (specialties.includes(customSpecialty) || customOptions.includes(customSpecialty)) {
                                  toast({ title: "มีข้อมูลนี้อยู่แล้ว", description: "ความเชี่ยวชาญนี้มีอยู่ในรายการแล้ว", variant: "destructive" });
                                  return;
                                }
                                setCustomOptions([...customOptions, customSpecialty]);
                                form.setValue('specialties', [...currentValues, customSpecialty]);
                                setCustomSpecialty('');
                              }}
                              className="rounded-full"
                            >
                              เพิ่ม
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <h3 className="text-lg font-semibold border-b pb-2 pt-4">ข้อมูลการรับเงิน</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <FormField control={form.control} name="bankName" render={({ field }) => (
                        <FormItem><FormLabel>ธนาคาร</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="rounded-full px-4"><SelectValue placeholder="เลือกธนาคาร" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {banks.map(bank => (
                                <SelectItem key={bank.name} value={bank.name}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 relative rounded-lg overflow-hidden border bg-white flex items-center justify-center">
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
                          <FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="bankAccountName" render={({ field }) => (
                        <FormItem><FormLabel>ชื่อบัญชี (ต้องตรงกับชื่อผู้สมัคร)</FormLabel><FormControl><Input {...field} className="rounded-full px-4" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="bankAccountNumber" render={({ field }) => (
                        <FormItem><FormLabel>เลขที่บัญชี</FormLabel><FormControl><Input {...field} onChange={(e) => {
                          const formatted = formatBankAccount(e.target.value);
                          field.onChange(formatted);
                        }} maxLength={14} className="rounded-full px-4" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>

                    <h3 className="text-lg font-semibold border-b pb-2 pt-4">รูปโปรไฟล์และเอกสาร</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-3">
                        <Label>รูปโปรไฟล์ (ไม่บังคับ - ไม่เกิน 5MB)</Label>
                        {profileImagePreview && (
                          <div className="flex justify-center">
                            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg">
                              <Image src={profileImagePreview} alt="Preview" fill className="object-cover" />
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2 p-2 border rounded-full bg-gray-50 px-4">
                          <User className="h-5 w-5 text-gray-500 flex-shrink-0" />
                          <span className="text-sm text-gray-600 truncate flex-grow">{profileImageFile ? profileImageFile.name : 'ยังไม่ได้เลือกรูป'}</span>
                          <Input id="profile-image-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange(setProfileImageFile, true)} />
                          <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('profile-image-upload')?.click()} className="rounded-full">{profileImagePreview ? 'เปลี่ยนรูป' : 'เลือกรูป'}</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>ไฟล์บัตรประชาชน</Label>
                        <div className="flex items-center gap-2 p-2 border rounded-full bg-gray-50 px-4">
                          <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
                          <span className="text-sm text-gray-600 truncate flex-grow">{idCardFile ? idCardFile.name : 'ยังไม่ได้เลือกไฟล์'}</span>
                          <Input id="id-card-upload" type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange(setIdCardFile)} />
                          <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('id-card-upload')?.click()} className="rounded-full">เลือกไฟล์</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>ไฟล์ใบอนุญาตทนายความ</Label>
                        <div className="flex items-center gap-2 p-2 border rounded-full bg-gray-50 px-4">
                          <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
                          <span className="text-sm text-gray-600 truncate flex-grow">{licenseFile ? licenseFile.name : 'ยังไม่ได้เลือกไฟล์'}</span>
                          <Input id="license-upload" type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange(setLicenseFile)} />
                          <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('license-upload')?.click()} className="rounded-full">เลือกไฟล์</Button>
                        </div>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="terms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              ฉันยอมรับ <Link href="/privacy" className="text-primary hover:underline">นโยบายความเป็นส่วนตัว</Link> และ <Link href="/terms" className="text-primary hover:underline">ข้อกำหนดการใช้งาน</Link>
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    <TurnstileWidget onVerify={setTurnstileToken} />

                    <Button type="submit" className="w-full rounded-full" size="lg" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      ส่งใบสมัคร
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
            <div className="mt-8 lg:hidden">
              <Button asChild size="lg" variant="outline" className="w-full rounded-full bg-white">
                <Link href="/lawyer-login">เข้าสู่ระบบสำหรับทนายที่มีบัญชีแล้ว</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
