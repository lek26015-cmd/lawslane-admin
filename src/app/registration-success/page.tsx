'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, ArrowLeft } from 'lucide-react';

export default function RegistrationSuccessPage() {
    return (
        <div className="bg-background min-h-screen flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-xl border-t-4 border-t-green-500">
                <CardHeader className="text-center space-y-4">
                    <div className="flex justify-center">
                        <CheckCircle2 className="h-16 w-16 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold font-headline">
                        สมัครสมาชิกสำเร็จ!
                    </CardTitle>
                    <CardDescription className="text-base text-muted-foreground">
                        ข้อมูลการสมัครของคุณถูกส่งเรียบร้อยแล้ว
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-muted/50 p-4 rounded-lg text-center space-y-2">
                        <p className="font-semibold text-foreground">
                            กรุณารอการตรวจสอบเอกสารจากเจ้าหน้าที่
                        </p>
                        <p className="text-sm text-muted-foreground">
                            เราจะทำการตรวจสอบข้อมูลและเอกสารของคุณโดยเร็วที่สุด (ปกติภายใน 24-48 ชั่วโมง)
                        </p>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground text-center">
                        <p>ผลการอนุมัติจะถูกส่งไปยังอีเมลที่คุณลงทะเบียนไว้</p>
                        <p>หรือคุณสามารถเข้าสู่ระบบเพื่อตรวจสอบสถานะได้ภายหลัง</p>
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                        <Button asChild className="w-full" size="lg">
                            <Link href="/">กลับสู่หน้าหลัก</Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/lawyer-login">เข้าสู่ระบบ (สำหรับตรวจสอบสถานะ)</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
