'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { useFirebase } from '@/firebase';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export default function LawyerLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');
  // const params = useParams(); // Removed lang param
  // const lang = params.lang as Locale; // Removed lang param
  const { auth } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>('');

  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast({
        variant: 'destructive',
        title: 'กรุณากรอกอีเมล',
        description: 'โปรดระบุอีเมลที่ต้องการรีเซ็ตรหัสผ่าน',
      });
      return;
    }

    setIsResetting(true);
    try {
      // Use custom server action for password reset
      import('@/app/actions/auth').then(({ sendCustomPasswordResetEmailV2 }) => {
        sendCustomPasswordResetEmailV2(resetEmail).then((res) => {
          if (res.success) {
            toast({
              title: 'ส่งอีเมลรีเซ็ตรหัสผ่านแล้ว',
              description: 'กรุณาตรวจสอบกล่องจดหมายของคุณ และอย่าลืมเช็คในโฟลเดอร์ขยะ (Spam/Junk) หากไม่พบอีเมล',
            });
            setIsForgotPasswordOpen(false);
            setResetEmail(''); // Clear email on success
          } else {
            toast({
              variant: 'destructive',
              title: 'เกิดข้อผิดพลาด',
              description: res.error || 'ไม่สามารถส่งอีเมลได้',
            });
          }
        }).catch((err) => { // Catch errors from sendCustomPasswordResetEmail promise
          console.error(err);
          toast({
            variant: 'destructive',
            title: 'เกิดข้อผิดพลาด',
            description: 'ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้',
          });
        });
      }).catch((err) => { // Catch errors from dynamic import
        console.error(err);
        toast({
          variant: 'destructive',
          title: 'เกิดข้อผิดพลาด',
          description: 'ไม่สามารถโหลดฟังก์ชันรีเซ็ตรหัสผ่านได้',
        });
      });
    } catch (error: any) {
      console.error(error);
      let errorMessage = 'ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้';
      // The specific Firebase error codes are now handled by the server action
      // and returned in res.error. This catch block is for unexpected client-side errors.
      if (error.message) {
        errorMessage = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: errorMessage,
      });
    } finally {
      setIsResetting(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth) return;
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

      // Create server-side session cookie
      const idToken = await user.getIdToken();
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      toast({
        title: 'เข้าสู่ระบบสำเร็จ',
        description: 'กำลังนำคุณไปยังแดชบอร์ดทนายความ...',
      });
      const target = redirectUrl || '/lawyer-dashboard';
      if (target.startsWith('http')) {
        window.location.href = target;
      } else {
        router.push(target);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9]">
      <div className="container mx-auto flex justify-center p-4">
        <Card className="w-full max-w-[480px] shadow-2xl rounded-3xl border-none">
          <CardHeader className="text-center space-y-6 pt-10 pb-0">
            <div className="flex justify-center mb-2">
              <Logo href="/" variant="color" />
            </div>
            <div className="px-6">
              <Tabs defaultValue="lawyer" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-14 bg-slate-100 rounded-xl p-1">
                  <TabsTrigger value="customer" asChild className="h-full rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-medium text-base transition-all">
                    <Link href={`/login`}>ลูกค้า</Link>
                  </TabsTrigger>
                  <TabsTrigger value="lawyer" asChild className="h-full rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-medium text-base transition-all">
                    <Link href={`/lawyer-login`}>ทนายความ</Link>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl md:text-3xl font-bold font-headline text-[#0B3979]">
                เข้าสู่ระบบสำหรับทนายความ
              </CardTitle>
              <CardDescription className="text-base text-slate-500">
                ยินดีต้อนรับกลับสู่ Lawslane
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-8 space-y-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-medium text-slate-700">อีเมล</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} disabled={isLoading} className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all text-base" />
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
                        <Input type="password" placeholder="********" {...field} disabled={isLoading} className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all text-base" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
                    <DialogTrigger asChild>
                      <Button variant="link" className="px-0 font-normal text-sm text-slate-500 hover:text-[#0B3979]">
                        ลืมรหัสผ่าน?
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>ลืมรหัสผ่าน?</DialogTitle>
                        <DialogDescription>
                          กรอกอีเมลของคุณเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="reset-email">อีเมล</Label>
                          <Input
                            id="reset-email"
                            placeholder="name@example.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsForgotPasswordOpen(false)} disabled={isResetting}>ยกเลิก</Button>
                        <Button onClick={handleForgotPassword} disabled={isResetting}>
                          {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          ส่งลิงก์รีเซ็ต
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <TurnstileWidget onVerify={setTurnstileToken} />
                <Button type="submit" className="w-full h-12 rounded-full text-lg font-semibold bg-[#0B3979] hover:bg-[#082a5a] shadow-lg shadow-blue-900/20" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  เข้าสู่ระบบ
                </Button>
              </form>
            </Form>
            <div className="text-center">
              <p className="text-slate-500">
                ยังไม่มีบัญชีทนายความ?{' '}
                <Link href="/for-lawyers" className="text-[#0B3979] font-semibold hover:underline decoration-2 underline-offset-4">
                  สมัครสมาชิก
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
