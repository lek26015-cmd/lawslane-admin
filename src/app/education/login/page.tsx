
// Force rebuild: 2026-01-10T22:36:18+07:00
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import Image from 'next/image';
import logoColor from '@/pic/logo-lawslane-transparent-color.png';


import { Button } from '@/components/ui/button';
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
    email: z.string().email({ message: 'รูปแบบอีเมลไม่ถูกต้อง' }),
    password: z.string().min(1, { message: 'กรุณากรอกรหัสผ่าน' }),
});

export default function EducationLoginPage() {
    const router = useRouter();
    const { auth, firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string>('');

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
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
                title: 'เข้าสู่ระบบสำเร็จ',
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
                title: 'เข้าสู่ระบบไม่สำเร็จ',
                description: errorMessage,
            });
        } finally {
            setIsGoogleLoading(false);
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!auth || !firestore) return;
        setIsLoading(true);
        try {
            if (turnstileToken) {
                const validation = await validateTurnstile(turnstileToken);
                if (!validation.success) throw new Error('การยืนยันตัวตนล้มเหลว');
            }

            await signInWithEmailAndPassword(auth, values.email, values.password);

            toast({
                title: 'เข้าสู่ระบบสำเร็จ',
                description: 'กำลังนำคุณเข้าสู่คลังข้อสอบ...',
            });
            router.push('/education');

        } catch (error: any) {
            console.error(error);
            let errorMessage = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                errorMessage = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
            }
            toast({
                variant: 'destructive',
                title: 'เข้าสู่ระบบไม่สำเร็จ',
                description: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
            {/* Left Side - Image */}
            <div className="hidden lg:flex flex-col relative bg-slate-900 text-white">
                <div className="absolute inset-0 bg-slate-900/60 z-10" />
                <Image
                    src="/images/legal-document-signing.jpg"
                    alt="Education Portal"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="relative z-20 flex flex-col justify-between h-full p-12">
                    <div className="flex items-center gap-3">
                        <Image
                            src={logoColor}
                            alt="Lawlanes Logo"
                            width={40}
                            height={40}
                            className="h-10 w-auto brightness-0 invert"
                        />
                        <span className="text-xl font-bold tracking-tight">Lawlanes Education</span>
                    </div>
                    <div className="space-y-4 max-w-lg">
                        <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
                            เตรียมสอบทนายความ<br />อย่างมั่นใจ
                        </h1>
                        <p className="text-lg text-slate-200">
                            เข้าถึงคลังข้อสอบ บทความกฎหมาย และหนังสือเตรียมสอบที่ดีที่สุด เพื่อความสำเร็จในเส้นทางวิชาชีพของคุณ
                        </p>
                    </div>
                    <div className="text-sm text-slate-400">
                        © {new Date().getFullYear()} Lawlanes. All rights reserved.
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex items-center justify-center p-4 lg:p-8 bg-slate-50">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
                    <div className="flex flex-col space-y-2 text-center">
                        <div className="mx-auto mb-4 bg-slate-100 p-3 rounded-full lg:hidden">
                            <Image
                                src={logoColor}
                                alt="Lawlanes Logo"
                                width={40}
                                height={40}
                                className="h-10 w-auto"
                            />
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight">เข้าสู่ระบบ</h1>
                        <p className="text-sm text-slate-500">
                            ยินดีต้อนรับกลับสู่ Lawlanes Education
                        </p>
                    </div>

                    <div className="w-full">
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
                            เข้าสู่ระบบด้วย Google
                        </Button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-slate-50 px-2 text-slate-500">หรือ</span>
                        </div>
                    </div>

                    <Form {...form}>
                        <div className="w-full">
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center justify-between">
                                                <FormLabel className="text-slate-700">รหัสผ่าน</FormLabel>
                                                <Link href="#" className="text-xs text-indigo-600 hover:underline">ลืมรหัสผ่าน?</Link>
                                            </div>
                                            <FormControl>
                                                <Input type="password" placeholder="********" {...field} className="h-11 bg-white" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <TurnstileWidget onVerify={setTurnstileToken} />

                                <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-lg font-medium shadow-md shadow-indigo-200" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                    เข้าสู่ระบบ
                                </Button>
                            </form>
                        </div>
                    </Form>

                    <div className="text-center pt-2">
                        <p className="text-sm text-slate-500">
                            ยังไม่มีบัญชี?{' '}
                            <Link href="/education/signup" className="text-indigo-600 font-semibold hover:underline">
                                สมัครสมาชิกฟรี
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
