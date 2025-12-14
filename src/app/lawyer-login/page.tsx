
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
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

export default function LawyerLoginPage() {
  const router = useRouter();
  // const params = useParams(); // Removed lang param
  // const lang = params.lang as Locale; // Removed lang param
  const { auth } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

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

      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: 'เข้าสู่ระบบสำเร็จ',
        description: 'กำลังนำคุณไปยังแดชบอร์ดทนายความ...',
      });
      router.push(`/lawyer-dashboard`);
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="container mx-auto flex justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <Logo href="/" variant="color" />
            </div>
            <Tabs defaultValue="lawyer" className="w-full">
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
              เข้าสู่ระบบสำหรับทนายความ
            </CardTitle>
            <CardDescription>
              ยินดีต้อนรับกลับสู่ Lawslane
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
                      <FormLabel>อีเมล</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} disabled={isLoading} />
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
                        <Input type="password" placeholder="********" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <TurnstileWidget onVerify={setTurnstileToken} />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  เข้าสู่ระบบ
                </Button>
              </form>
            </Form>
            <div className="mt-4 text-center text-sm">
              <p>
                ยังไม่มีบัญชีทนายความ?{' '}
                <Link href="/for-lawyers" className="underline hover:text-primary">
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
