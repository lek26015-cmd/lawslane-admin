
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import Image from 'next/image';
import logoColor from '@/pic/logo-lawslane-transparent-color.png';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { TurnstileWidget } from '@/components/turnstile-widget';
import { validateTurnstile } from '@/app/actions/turnstile';

const formSchema = z.object({
    name: z.string().min(2, { message: 'กรุณาระบุชื่ออย่างน้อย 2 ตัวอักษร' }),
    email: z.string().email({ message: 'รูปแบบอีเมลไม่ถูกต้อง' }),
    password: z.string().min(8, { message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร' }),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
});

export default function EducationSignupPage() {
    const router = useRouter();
    const { auth, firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string>('');

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
        },
    });

    async function handleGoogleSignIn() {
        if (!auth || !firestore) {
            toast({
                variant: 'destructive',
                title: 'เกิดข้อผิดพลาด',
                description: 'ไม่สามารถเชื่อมต่อกับระบบยืนยันตัวตนได้',
            });
            return;
        }
        setIsGoogleLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });

            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const userRef = doc(firestore, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    uid: user.uid,
                    name: user.displayName,
                    email: user.email,
                    role: 'education_student',
                    type: 'บุคคลทั่วไป',
                    status: 'active',
                    createdAt: serverTimestamp(),
                });
            }

            toast({
                title: 'เข้าสู่ระบบด้วย Google สำเร็จ',
                description: 'กำลังนำคุณเข้าสู่คลังข้อสอบ...',
            });

            router.push('/education');

        } catch (error: any) {
            console.error("Google Sign-In Error:", error);
            let errorMessage = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google';
            if (error.code === 'auth/popup-blocked') errorMessage = 'เบราว์เซอร์ของคุณบล็อกป๊อปอัป';
            else if (error.code === 'auth/popup-closed-by-user') errorMessage = 'คุณปิดหน้าต่างป๊อปอัปก่อนการเข้าสู่ระบบจะเสร็จสมบูรณ์';

            toast({
                variant: 'destructive',
                title: 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ',
                description: errorMessage,
            });
        } finally {
            setIsGoogleLoading(false);
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!auth || !firestore) return;

        if (!turnstileToken) {
            toast({
                variant: 'destructive',
                title: 'กรุณายืนยันตัวตน',
                description: 'โปรดยืนยันว่าคุณไม่ใช่หุ่นยนต์',
            });
            return;
        }

        setIsLoading(true);
        try {
            // 1. Validate Turnstile
            const validation = await validateTurnstile(turnstileToken);
            if (!validation.success) throw new Error('การยืนยันตัวตนล้มเหลว');

            // 2. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            const user = userCredential.user;

            // 3. Update Profile Name
            await updateProfile(user, { displayName: values.name });

            // 4. Create Firestore Document with 'education_student' role
            const userDocRef = doc(firestore, 'users', user.uid);
            await setDoc(userDocRef, {
                uid: user.uid,
                name: values.name,
                email: values.email,
                role: 'education_student',
                type: 'บุคคลทั่วไป',
                status: 'active',
                createdAt: serverTimestamp(),
                registeredAt: serverTimestamp(),
            });

            toast({
                title: 'สมัครสมาชิกสำเร็จ',
                description: 'ยินดีต้อนรับสู่ Lawlanes Education',
            });

            router.push('/education');

        } catch (error: any) {
            console.error(error);
            let errorMessage = 'เกิดข้อผิดพลาดในการสมัครสมาชิก';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว';
            }
            toast({
                variant: 'destructive',
                title: 'สมัครสมาชิกไม่สำเร็จ',
                description: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12">
            <div className="container mx-auto flex justify-center p-4">
                <Card className="w-full max-w-[480px] shadow-xl rounded-2xl border-indigo-100">
                    <CardHeader className="text-center space-y-4 pt-10">
                        <div className="flex flex-col items-center justify-center mb-4 gap-3">
                            <Image
                                src={logoColor}
                                alt="Lawlanes Logo"
                                width={60}
                                height={60}
                                className="h-16 w-auto"
                                priority
                            />
                            <div className="flex flex-col" style={{ lineHeight: '1.1' }}>
                                <span className="font-bold text-2xl text-indigo-900">Lawlanes</span>
                                <span className="font-bold text-2xl text-indigo-600">Education</span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <CardDescription className="text-slate-500">
                                สำหรับใช้งานคลังข้อสอบ Lawlanes Education
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <Button
                            variant="outline"
                            className="w-full h-11 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-medium shadow-sm transition-all"
                            onClick={handleGoogleSignIn}
                            disabled={isGoogleLoading || isLoading}
                        >
                            {isGoogleLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                    <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512S0 403.3 0 261.8 106.5 11.8 244 11.8c67.7 0 130.4 27.2 175.2 73.4l-72.2 67.7C324.9 123.7 286.8 102 244 102c-88.6 0-160.2 72.3-160.2 161.8s71.6 161.8 160.2 161.8c94.9 0 133-66.3 137.4-101.4H244V261.8h244z"></path>
                                </svg>
                            )}
                            สมัครสมาชิกด้วย Google
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-200" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-slate-50 px-4 text-slate-500">
                                    หรือสมัครสมาชิกด้วยอีเมล
                                </span>
                            </div>
                        </div>

                        <Form {...form}>
                            <div className="w-full">
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700">ชื่อ-นามสกุล</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="สมชาย ใจดี" {...field} className="h-11 bg-white" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700">อีเมล</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="name@example.com" {...field} className="h-11 bg-white" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="password"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-700">รหัสผ่าน</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" placeholder="********" {...field} className="h-11 bg-white" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="confirmPassword"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-700">ยืนยันรหัสผ่าน</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" placeholder="********" {...field} className="h-11 bg-white" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <TurnstileWidget onVerify={setTurnstileToken} />

                                    <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-lg font-medium shadow-md shadow-indigo-200" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                        สมัครสมาชิก
                                    </Button>
                                </form>
                            </div>
                        </Form>

                        <div className="text-center pt-2">
                            <p className="text-sm text-slate-500">
                                มีบัญชีอยู่แล้ว?{' '}
                                <Link href="/education/login" className="text-indigo-600 font-semibold hover:underline">
                                    เข้าสู่ระบบ
                                </Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
