'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { uploadToR2 } from '@/app/actions/upload-r2';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/constants';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, User } from 'lucide-react';
import Logo from '@/components/logo';
import Image from 'next/image';
import { TurnstileWidget } from '@/components/turnstile-widget';
import { validateTurnstile } from '@/app/actions/turnstile';
import { notifyAdmins } from '@/app/actions/admin-notifications';

const specialties = [
    'คดีฉ้อโกง SMEs',
    'คดีแพ่งและพาณิชย์',
    'การผิดสัญญา',
    'ทรัพย์สินทางปัญญา',
    'กฎหมายแรงงาน',
    'อสังหาริมทรัพย์',
];

const formSchema = z.object({
    name: z.string().min(2, { message: 'ชื่อ-นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร' }),
    email: z.string().email({ message: 'รูปแบบอีเมลไม่ถูกต้อง' }),
    password: z.string().min(6, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }),
    licenseNumber: z.string().min(1, { message: 'กรุณากรอกเลขใบอนุญาต' }),
    specialties: z.array(z.string()).min(1, { message: 'กรุณาเลือกความเชี่ยวชาญอย่างน้อย 1 อย่าง' }),
    terms: z.boolean().refine(val => val === true, {
        message: 'กรุณายอมรับนโยบายความเป็นส่วนตัว',
    }),
});

export default function LawyerExpressSignupPage() {
    const router = useRouter();
    const { auth, firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string>('');
    const [customSpecialty, setCustomSpecialty] = useState('');
    const [customOptions, setCustomOptions] = useState<string[]>([]);
    const isSubmittingRef = useRef(false);
    const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
    const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > MAX_FILE_SIZE_BYTES) {
                toast({
                    variant: "destructive",
                    title: "ไฟล์มีขนาดใหญ่เกินไป",
                    description: `กรุณาอัปโหลดไฟล์ขนาดไม่เกิน ${MAX_FILE_SIZE_MB}MB`
                });
                e.target.value = '';
                return;
            }
            setProfileImageFile(file);
            // Create preview URL
            const previewUrl = URL.createObjectURL(file);
            setProfileImagePreview(previewUrl);
        }
    };

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

        const newOptions = [...customOptions, customSpecialty];
        setCustomOptions(newOptions);

        // Add to form values
        const currentValues = field.value || [];
        field.onChange([...currentValues, customSpecialty]);

        setCustomSpecialty('');
    };

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            licenseNumber: '',
            specialties: [],
            terms: false,
        },
    });

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

            // Create server-side session cookie
            const idToken = await user.getIdToken();
            await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });

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

            // 2.5 Upload Profile Image (optional)
            let profileImageUrl = '';
            if (profileImageFile) {
                const formData = new FormData();
                formData.append('file', profileImageFile);
                profileImageUrl = await uploadToR2(formData, `lawyer-profile-images/${user.uid}`);
            }

            // 3. Create user profile document in Firestore (users collection)
            const userDocRef = doc(firestore, 'users', user.uid);
            const userProfileData = {
                uid: user.uid,
                name: values.name,
                email: values.email,
                role: 'lawyer',
                type: 'บุคคลทั่วไป',
                registeredAt: serverTimestamp(),
                status: 'pending', // Pending approval
                avatar: '',
                termsAccepted: true,
                termsAcceptedAt: serverTimestamp(),
            };

            await setDoc(userDocRef, userProfileData);

            // 4. Create lawyer profile document in Firestore (lawyerProfiles collection)
            // Minimal data for express signup
            const lawyerProfileRef = doc(firestore, 'lawyerProfiles', user.uid);
            const lawyerProfileData = {
                userId: user.uid,
                name: values.name,
                email: values.email,
                licenseNumber: values.licenseNumber,
                specialty: values.specialties,
                status: 'pending',
                joinedAt: serverTimestamp(),
                // Default empty/pending values for fields not collected yet
                phone: '',
                dob: null,
                gender: '',
                education: '',
                experience: '',
                address: '',
                serviceProvinces: [],
                bankName: '',
                bankAccountName: '',
                bankAccountNumber: '',
                description: '',
                imageUrl: profileImageUrl,
                idCardUrl: '',
                licenseUrl: '',
            };

            await setDoc(lawyerProfileRef, lawyerProfileData);

            // 5. Add to Verified Lawyers Registry (Auto-add via Server Action)
            try {
                // Dynamically import to ensure server action is handled correctly
                const { addToVerifiedRegistry } = await import('@/app/actions/lawyer-actions');
                await addToVerifiedRegistry({
                    licenseNumber: values.licenseNumber,
                    firstName: values.name.split(' ')[0],
                    lastName: values.name.split(' ').slice(1).join(' ') || '',
                    province: 'ไม่ระบุ'
                });
            } catch (err) {
                console.error("Error adding to verified registry:", err);
            }

            // 6. Create Admin Notification
            try {
                await addDoc(collection(firestore, 'notifications'), {
                    type: 'lawyer_registration',
                    title: 'สมัครทนายความ (Express)',
                    message: `มีทนายความใหม่สมัครสมาชิก (ด่วน): ${values.name}`,
                    createdAt: serverTimestamp(),
                    read: false,
                    recipient: 'admin',
                    link: `/lawyers/${user.uid}`,
                    relatedId: user.uid
                });

                // Send Email Notification to Admins
                await notifyAdmins('new_lawyer', {
                    name: values.name,
                    email: values.email,
                    licenseNumber: values.licenseNumber,
                    uid: user.uid
                });
            } catch (e) {
                console.error("Error creating notification:", e);
            }

            toast({
                title: 'สมัครเข้าร่วมสำเร็จ',
                description: 'กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตน',
            });

            await signOut(auth);
            router.push(`/registration-success`);

        } catch (error: any) {
            console.error(error);

            // Rollback logic
            if (auth.currentUser && error.code !== 'auth/email-already-in-use') {
                try {
                    await auth.currentUser.delete();
                } catch (deleteErr) {
                    console.error("Failed to rollback auth user:", deleteErr);
                }
            }

            let errorMessage = 'เกิดข้อผิดพลาดที่ไม่รู้จัก';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น หรือเข้าสู่ระบบ';
            } else if (error.message) {
                errorMessage = error.message;
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
        <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9] py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <div className="flex justify-center mb-4">
                        <Logo href="/" variant="color" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900 font-headline">
                        ลงทะเบียนทนายความ
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        สำหรับผู้ได้รับเชิญ (สมัครด่วน)
                    </p>
                </div>

                <Card className="shadow-2xl rounded-3xl border-none">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-center text-[#0B3979]">สร้างบัญชีใหม่</CardTitle>
                        <CardDescription className="text-center">
                            กรอกข้อมูลเบื้องต้นเพื่อเปิดใช้งานบัญชี
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>ชื่อ-นามสกุล</FormLabel>
                                            <FormControl>
                                                <Input placeholder="ทนายสมชาย ยุติธรรม" {...field} className="rounded-xl bg-slate-50 border-slate-200" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Profile Image Upload */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium">รูปโปรไฟล์ (ไม่บังคับ - ไม่เกิน 5MB)</label>
                                    {profileImagePreview && (
                                        <div className="flex justify-center">
                                            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg">
                                                <Image src={profileImagePreview} alt="Preview" fill className="object-cover" />
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 p-2 border rounded-xl bg-slate-50 border-slate-200 px-4">
                                        <User className="h-5 w-5 text-gray-500 flex-shrink-0" />
                                        <span className="text-sm text-gray-600 truncate flex-grow">{profileImageFile ? profileImageFile.name : 'ยังไม่ได้เลือกรูป'}</span>
                                        <Input id="profile-image-upload-express" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                        <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('profile-image-upload-express')?.click()} className="rounded-full">{profileImagePreview ? 'เปลี่ยนรูป' : 'เลือกรูป'}</Button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>อีเมล</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="name@example.com" {...field} className="rounded-xl bg-slate-50 border-slate-200" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>รหัสผ่าน</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="อย่างน้อย 6 ตัวอักษร" {...field} className="rounded-xl bg-slate-50 border-slate-200" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="licenseNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>เลขที่ใบอนุญาตว่าความ</FormLabel>
                                            <FormControl>
                                                <Input placeholder="1234/2567" {...field} className="rounded-xl bg-slate-50 border-slate-200" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="specialties"
                                    render={() => (
                                        <FormItem>
                                            <div className="mb-4"><FormLabel className="text-base">ความเชี่ยวชาญ</FormLabel></div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {specialties.map((item) => (
                                                    <FormField key={item} control={form.control} name="specialties"
                                                        render={({ field }) => (
                                                            <FormItem key={item} className="flex flex-row items-center space-x-3 space-y-0 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value?.includes(item)}
                                                                        onCheckedChange={(checked) => {
                                                                            return checked
                                                                                ? field.onChange([...field.value, item])
                                                                                : field.onChange(field.value?.filter((value) => value !== item))
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className="font-normal text-sm cursor-pointer w-full">{item}</FormLabel>
                                                            </FormItem>
                                                        )}
                                                    />
                                                ))}
                                                {customOptions.map((item) => (
                                                    <FormField key={item} control={form.control} name="specialties"
                                                        render={({ field }) => (
                                                            <FormItem key={item} className="flex flex-row items-center space-x-3 space-y-0 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value?.includes(item)}
                                                                        onCheckedChange={(checked) => {
                                                                            return checked
                                                                                ? field.onChange([...field.value, item])
                                                                                : field.onChange(field.value?.filter((value) => value !== item))
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className="font-normal text-sm cursor-pointer w-full text-blue-700">{item}</FormLabel>
                                                            </FormItem>
                                                        )}
                                                    />
                                                ))}
                                            </div>

                                            <div className="flex gap-2 mt-4">
                                                <FormField
                                                    control={form.control}
                                                    name="specialties"
                                                    render={({ field }) => (
                                                        <>
                                                            <Input
                                                                placeholder="ระบุความเชี่ยวชาญอื่นๆ"
                                                                value={customSpecialty}
                                                                onChange={(e) => setCustomSpecialty(e.target.value)}
                                                                className="rounded-full px-4"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        handleAddCustomSpecialty(field);
                                                                    }
                                                                }}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="rounded-full"
                                                                onClick={() => handleAddCustomSpecialty(field)}
                                                            >
                                                                เพิ่ม
                                                            </Button>
                                                        </>
                                                    )}
                                                />
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="terms"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 text-sm">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    ฉันยอมรับ <Link href="/privacy" className="text-primary hover:underline">นโยบายความเป็นส่วนตัว</Link>
                                                </FormLabel>
                                                <FormMessage />
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                <TurnstileWidget onVerify={setTurnstileToken} />

                                <Button type="submit" className="w-full h-12 rounded-full text-lg font-semibold bg-[#0B3979] hover:bg-[#082a5a] shadow-lg" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                    สมัครสมาชิก
                                </Button>

                                <div className="text-center text-sm text-slate-500 mt-4">
                                    <Link href="/login" className="text-[#0B3979] hover:underline">
                                        เข้าสู่ระบบ
                                    </Link>
                                </div>

                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
