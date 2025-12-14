
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase';

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
import Logo from '@/components/logo';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TurnstileWidget } from '@/components/turnstile-widget';
import { validateTurnstile } from '@/app/actions/turnstile';
// import { Locale } from '@/../i18n.config'; // Removed unused import

const formSchema = z.object({
  email: z.string().email({ message: 'รูปแบบอีเมลไม่ถูกต้อง' }),
  password: z.string().min(1, { message: 'กรุณากรอกรหัสผ่าน' }),
});

export default function LoginPage() {
  const router = useRouter();
  // const params = useParams(); // Removed lang param
  // const lang = params.lang as Locale; // Removed lang param
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth || !firestore) return;
    setIsLoading(true);
    try {
      if (!turnstileToken) {
        throw new Error('กรุณายืนยันตัวตนผ่าน Cloudflare Turnstile');
      }

      const validation = await validateTurnstile(turnstileToken);
      if (!validation.success) {
        throw new Error('การยืนยันตัวตนล้มเหลว กรุณาลองใหม่');
      }

      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // Check role
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      let role = 'customer';

      if (userDoc.exists()) {
        role = userDoc.data().role;
      } else {
        // Recreate user doc if missing (e.g. after database clear)
        await setDoc(userDocRef, {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email,
          role: 'customer',
          createdAt: serverTimestamp(),
        });
      }

      if (role === 'lawyer') {
        if (!user.emailVerified) {
          toast({
            variant: 'destructive',
            title: 'กรุณายืนยันอีเมล',
            description: 'ระบบได้ส่งลิงก์ยืนยันไปที่อีเมลของคุณแล้ว กรุณาตรวจสอบและยืนยันก่อนเข้าใช้งาน',
          });
          await signOut(auth);
          return;
        }
        router.push('/lawyer-dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error(error);
      let errorMessage = 'เกิดข้อผิดพลาดที่ไม่รู้จัก';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      } else if (error.message) {
        errorMessage = error.message;
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

  async function handleGoogleSignIn() {
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเชื่อมต่อกับระบบยืนยันตัวตนได้ กรุณารีเฟรชหน้าจอ',
      });
      return;
    }
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user profile already exists
      const userRef = doc(firestore, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      let role = 'customer';

      if (!userSnap.exists()) {
        // Create a new user profile if it doesn't exist
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          role: 'customer',
        });
      } else {
        role = userSnap.data().role;
      }

      toast({
        title: 'เข้าสู่ระบบด้วย Google สำเร็จ',
        description: 'กำลังนำคุณไปยังแดชบอร์ด...',
      });

      if (role === 'lawyer') {
        router.push('/lawyer-dashboard');
      } else {
        router.push('/dashboard');
      }

    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      let errorMessage = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google';

      if (error.code === 'auth/popup-blocked') {
        errorMessage = 'เบราว์เซอร์ของคุณบล็อกป๊อปอัป กรุณาอนุญาตให้แสดงป๊อปอัปสำหรับเว็บไซต์นี้';
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'คุณปิดหน้าต่างป๊อปอัปก่อนการเข้าสู่ระบบจะเสร็จสมบูรณ์';
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = 'มีการร้องขอป๊อปอัปซ้อนกัน กรุณาลองใหม่อีกครั้ง';
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'โดเมนนี้ยังไม่ได้รับอนุญาตให้ใช้ Google Sign-In (กรุณาแจ้งผู้ดูแลระบบ)';
      } else if (error.message) {
        errorMessage = `${errorMessage}: ${error.message}`;
      }

      toast({
        variant: 'destructive',
        title: 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ',
        description: errorMessage,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="container mx-auto flex justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <Logo href="/" variant="color" />
            </div>
            <Tabs defaultValue="customer" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="customer" asChild>
                  <Link href={`/login`}>ลูกค้า</Link>
                </TabsTrigger>
                <TabsTrigger value="lawyer" asChild>
                  <Link href={`/lawyer-login`}>ทนายความ</Link>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <CardTitle className="text-2xl font-bold font-headline pt-4">
              เข้าสู่ระบบ
            </CardTitle>
            <CardDescription>
              ยินดีต้อนรับกลับสู่ Lawslane
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading || isLoading}>
              {isGoogleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512S0 403.3 0 261.8 106.5 11.8 244 11.8c67.7 0 130.4 27.2 175.2 73.4l-72.2 67.7C324.9 123.7 286.8 102 244 102c-88.6 0-160.2 72.3-160.2 161.8s71.6 161.8 160.2 161.8c94.9 0 133-66.3 137.4-101.4H244V261.8h244z"></path>
                </svg>
              )}
              เข้าสู่ระบบด้วย Google
            </Button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  หรือเข้าสู่ระบบด้วยอีเมล
                </span>
              </div>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>อีเมล</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} disabled={isLoading || isGoogleLoading} />
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
                        <Input type="password" placeholder="********" {...field} disabled={isLoading || isGoogleLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <TurnstileWidget onVerify={setTurnstileToken} />
                <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  เข้าสู่ระบบ
                </Button>
              </form>
            </Form>
            <div className="mt-4 text-center text-sm">
              <p>
                ยังไม่มีบัญชี?{' '}
                <Link href={`/signup`} className="underline hover:text-primary">
                  สมัครสมาชิกที่นี่
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
