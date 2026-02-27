
'use client';

import { useState, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Logo from '@/components/logo';
import { Separator } from '@/components/ui/separator';
import { TurnstileWidget } from '@/components/turnstile-widget';
import { validateTurnstile } from '@/app/actions/turnstile';
// import { Locale } from '@/../i18n.config';
import { Checkbox } from '@/components/ui/checkbox';
import { notifyAdmins } from '@/app/actions/admin-notifications';

const formSchema = z.object({
  name: z.string().min(2, { message: 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร' }),
  email: z.string().email({ message: 'รูปแบบอีเมลไม่ถูกต้อง' }),
  password: z.string().min(6, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }),
  terms: z.boolean().refine(val => val === true, {
    message: 'กรุณายอมรับนโยบายความเป็นส่วนตัว',
  }),
});

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');
  // const params = useParams(); // Removed lang param
  // const lang = params.lang as Locale; // Removed lang param
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const isSubmittingRef = useRef(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      terms: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (!auth || !firestore) {
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

      // 2. Update user profile in Firebase Auth
      await updateProfile(user, { displayName: values.name });

      // Send Custom Email Verification
      import('@/app/actions/auth').then(({ sendCustomVerificationEmail }) => {
        sendCustomVerificationEmail(values.email, values.name).then((res) => {
          if (res.success) console.log("Custom verification email sent");
          else console.error("Error sending custom verification email:", res.error);
        });
      });

      // 3. Create user profile document in Firestore
      const userRef = doc(firestore, 'users', user.uid);
      const userProfileData = {
        uid: user.uid,
        name: values.name,
        email: values.email,
        role: 'customer', // Default role for general signup
        status: 'active',
        termsAccepted: true,
        termsAcceptedAt: serverTimestamp(),
      };



      setDoc(userRef, userProfileData)
        .then(() => {
          // Notify admins
          notifyAdmins('new_user', {
            name: values.name,
            email: values.email
          });
        })
        .catch(error => {
          const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'create',
            requestResourceData: userProfileData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });

      toast({
        title: 'สมัครสมาชิกสำเร็จ',
        description: 'กำลังนำคุณไปยังแดชบอร์ด...',
      });

      const target = redirectUrl || '/dashboard';
      if (target.startsWith('http')) {
        window.location.href = target;
      } else {
        router.push(target);
      }

    } catch (error: any) {
      console.error(error);
      let errorMessage = 'เกิดข้อผิดพลาดที่ไม่รู้จัก';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น';
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'สมัครสมาชิกไม่สำเร็จ',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  }

  async function handleGoogleSignIn() {
    if (!auth || !firestore) return;
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Create server-side session cookie
      const idToken = await user.getIdToken();
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      // Check if user profile already exists
      const userRef = doc(firestore, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const userProfileData = {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          role: 'customer',
          status: 'active',
        };
        // Create a new user profile if it doesn't exist
        setDoc(userRef, userProfileData)
          .catch(error => {
            const permissionError = new FirestorePermissionError({
              path: userRef.path,
              operation: 'create',
              requestResourceData: userProfileData,
            });
            errorEmitter.emit('permission-error', permissionError);
          });
      }

      toast({
        title: 'ลงชื่อเข้าใช้ด้วย Google สำเร็จ',
        description: 'กำลังนำคุณไปยังแดชบอร์ด...',
      });
      const target = redirectUrl || '/dashboard';
      if (target.startsWith('http')) {
        window.location.href = target;
      } else {
        router.push(target);
      }

    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      toast({
        variant: 'destructive',
        title: 'ลงชื่อเข้าใช้ด้วย Google ไม่สำเร็จ',
        description: error.message || 'เกิดข้อผิดพลาดบางอย่าง',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9]">
      <div className="container mx-auto flex justify-center p-4">
        <Card className="w-full max-w-[480px] shadow-2xl rounded-3xl border-none">
          <CardHeader className="text-center space-y-6 pt-10 pb-0">
            <div className="flex justify-center mb-2">
              <Logo href="/" variant="color" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold font-headline text-[#0B3979]">
                สร้างบัญชีใหม่
              </CardTitle>
              <CardDescription className="text-base text-slate-500">
                เข้าร่วม Lawslane เพื่อเข้าถึงบริการด้านกฎหมาย
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-8 space-y-8">
            <Button variant="outline" className="w-full h-12 rounded-full border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium text-base shadow-sm" onClick={handleGoogleSignIn} disabled={isGoogleLoading || isLoading}>
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
                <span className="bg-white px-4 text-slate-400">
                  หรือสมัครด้วยอีเมล
                </span>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-medium text-slate-700">ชื่อ-นามสกุล</FormLabel>
                      <FormControl>
                        <Input placeholder="สมหญิง ใจดี" {...field} disabled={isLoading || isGoogleLoading} className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all text-base" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-medium text-slate-700">อีเมล</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} disabled={isLoading || isGoogleLoading} className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all text-base" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-medium text-slate-700">รหัสผ่าน</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="อย่างน้อย 6 ตัวอักษร" {...field} disabled={isLoading || isGoogleLoading} className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all text-base" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                <Button type="submit" className="w-full h-12 rounded-full text-lg font-semibold bg-[#0B3979] hover:bg-[#082a5a] shadow-lg shadow-blue-900/20" disabled={isLoading || isGoogleLoading}>
                  {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  สมัครสมาชิก
                </Button>
              </form>
            </Form>
            <div className="text-center">
              <p className="text-slate-500">
                มีบัญชีอยู่แล้ว?{' '}
                <Link href={`/login`} className="text-[#0B3979] font-semibold hover:underline decoration-2 underline-offset-4">
                  เข้าสู่ระบบที่นี่
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
