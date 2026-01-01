'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import Logo from '@/components/logo';

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { auth } = useFirebase();
    const { toast } = useToast();

    const oobCode = searchParams.get('oobCode');

    const [email, setEmail] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isVerifying, setIsVerifying] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!auth || !oobCode) {
            setIsVerifying(false);
            if (!oobCode) setError('ไม่พบรหัสยืนยัน (Code) ในลิงก์');
            return;
        }

        verifyPasswordResetCode(auth, oobCode)
            .then((email) => {
                setEmail(email);
                setIsVerifying(false);
            })
            .catch((error) => {
                console.error('Error verifying code:', error);
                setIsVerifying(false);
                setError('ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว');
            });
    }, [auth, oobCode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast({
                variant: 'destructive',
                title: 'รหัสผ่านไม่ตรงกัน',
                description: 'กรุณากรอกรหัสผ่านยืนยันให้ตรงกัน',
            });
            return;
        }

        if (newPassword.length < 6) {
            toast({
                variant: 'destructive',
                title: 'รหัสผ่านสั้นเกินไป',
                description: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร',
            });
            return;
        }

        if (!auth || !oobCode) return;

        setIsSubmitting(true);
        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            setIsSuccess(true);
            toast({
                title: 'เปลี่ยนรหัสผ่านสำเร็จ',
                description: 'คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที',
            });
        } catch (error: any) {
            console.error('Error resetting password:', error);
            toast({
                variant: 'destructive',
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isVerifying) {
        return (
            <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-[#0B3979]" />
                <p className="text-slate-500">กำลังตรวจสอบลิงก์...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center space-y-4">
                <div className="flex justify-center">
                    <XCircle className="h-12 w-12 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">ลิงก์ไม่ถูกต้อง</h2>
                <p className="text-slate-500">{error}</p>
                <Button onClick={() => router.push('/login')} variant="outline" className="mt-4">
                    กลับไปหน้าเข้าสู่ระบบ
                </Button>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="text-center space-y-6">
                <div className="flex justify-center">
                    <CheckCircle2 className="h-16 w-16 text-green-500" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-[#0B3979]">เปลี่ยนรหัสผ่านสำเร็จ!</h2>
                    <p className="text-slate-500">รหัสผ่านของคุณได้รับการเปลี่ยนแปลงเรียบร้อยแล้ว</p>
                </div>
                <Button
                    onClick={() => router.push('/login')}
                    className="w-full h-12 rounded-full text-lg font-semibold bg-[#0B3979] hover:bg-[#082a5a] shadow-lg shadow-blue-900/20"
                >
                    เข้าสู่ระบบ
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2 text-center">
                <h1 className="text-2xl font-bold text-[#0B3979]">ตั้งรหัสผ่านใหม่</h1>
                <p className="text-slate-500">สำหรับบัญชี: <span className="font-medium text-slate-900">{email}</span></p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
                    <Input
                        id="new-password"
                        type="password"
                        placeholder="********"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isSubmitting}
                        className="h-11"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</Label>
                    <Input
                        id="confirm-password"
                        type="password"
                        placeholder="********"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isSubmitting}
                        className="h-11"
                        required
                    />
                </div>

                <Button
                    type="submit"
                    className="w-full h-12 rounded-full text-lg font-semibold bg-[#0B3979] hover:bg-[#082a5a] shadow-lg shadow-blue-900/20 mt-6"
                    disabled={isSubmitting}
                >
                    {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    เปลี่ยนรหัสผ่าน
                </Button>
            </form>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9] p-4">
            <Card className="w-full max-w-[480px] shadow-2xl rounded-3xl border-none">
                <CardHeader className="text-center pt-8 pb-0">
                    <div className="flex justify-center mb-4">
                        <Logo href="/" variant="color" />
                    </div>
                </CardHeader>
                <CardContent className="p-8">
                    <Suspense fallback={
                        <div className="flex flex-col items-center justify-center space-y-4 py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-[#0B3979]" />
                            <p className="text-slate-500">กำลังโหลด...</p>
                        </div>
                    }>
                        <ResetPasswordContent />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
