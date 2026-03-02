'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import logoLawslane from '@/pic/logo-lawslane.jpg';
import Logo from '@/components/logo';
import { TurnstileWidget } from '@/components/turnstile-widget';
import { validateTurnstile } from '@/app/actions/turnstile';
import { requestAdminPasswordReset } from '@/app/actions/auth-admin';

const formSchema = z.object({
  email: z.string().email({ message: 'รูปแบบอีเมลไม่ถูกต้อง' }),
  password: z.string().min(1, { message: 'กรุณากรอกรหัสผ่าน' }),
});

export default function AdminLoginPage() {
  const router = useRouter();
  const { auth, firestore } = useFirebase();
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
      const result = await requestAdminPasswordReset(resetEmail);
      if (result.success) {
        toast({
          title: 'ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว',
          description: `กรุณาตรวจสอบอีเมลของคุณ (ส่งไปที่ ${result.sentTo}) และอย่าลืมเช็คในโฟลเดอร์ขยะ (Spam/Junk)`,
        });
        setIsForgotPasswordOpen(false);
        setResetEmail('');
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้',
      });
    } finally {
      setIsResetting(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth) {
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเชื่อมต่อกับระบบยืนยันตัวตนได้',
      });
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

      // 1. Sign in with Firebase Client SDK
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // 2. Get ID Token
      const idToken = await user.getIdToken();

      // 3. Create Session Cookie via API
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      toast({
        title: 'เข้าสู่ระบบสำเร็จ',
        description: 'กำลังนำคุณไปยังแดชบอร์ดผู้ดูแลระบบ...',
      });

      // Force refresh to update middleware state
      router.refresh();
      router.push('/admin');

    } catch (error: any) {
      console.error(error);
      let errorMessage = 'เกิดข้อผิดพลาดที่ไม่รู้จัก';
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
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="container mx-auto flex justify-center p-4">
        <Card className="w-full max-w-md shadow-xl bg-gray-800/50 border-gray-700 rounded-xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center text-white">
              <Image
                src={logoLawslane}
                alt="Lawslane Logo"
                width={100}
                height={100}
                className="h-20 w-auto rounded-full"
              />
            </div>
            <CardTitle className="text-2xl font-bold font-headline pt-4">
              Administrator Login
            </CardTitle>
            <CardDescription className="text-gray-400">
              สำหรับผู้ดูแลระบบ Lawslane เท่านั้น
            </CardDescription>
          </CardHeader>
          <CardContent>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">อีเมล</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="name@example.com"
                          {...field}
                          disabled={isLoading}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
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
                      <FormLabel className="text-gray-300">รหัสผ่าน</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="********"
                          {...field}
                          disabled={isLoading}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
                    <DialogTrigger asChild>
                      <Button variant="link" className="px-0 font-normal text-sm text-gray-400 hover:text-primary">
                        ลืมรหัสผ่าน?
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-800 border-gray-700 text-white">
                      <DialogHeader>
                        <DialogTitle>ลืมรหัสผ่าน?</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          กรอกอีเมลของคุณเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
                          <br />
                          <span className="text-xs text-gray-500">(ลิงก์จะถูกส่งไปยังอีเมลแจ้งเตือนที่คุณตั้งค่าไว้)</span>
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="reset-email" className="text-gray-300">อีเมล</Label>
                          <Input
                            id="reset-email"
                            placeholder="name@example.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsForgotPasswordOpen(false)} disabled={isResetting} className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">ยกเลิก</Button>
                        <Button onClick={handleForgotPassword} disabled={isResetting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                          {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          ส่งลิงก์รีเซ็ต
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <TurnstileWidget onVerify={setTurnstileToken} />
                <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  เข้าสู่ระบบ
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
