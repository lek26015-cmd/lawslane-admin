'use client';

import { useState, useEffect } from "react";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, Mail, Shield, Camera, Package, ArrowRight, Settings } from "lucide-react";
import { PageHeader } from '../components/page-header';
import { updateProfile } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    const [displayName, setDisplayName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/education/login');
        } else if (user) {
            setDisplayName(user.displayName || "");
        }
    }, [user, isUserLoading, router]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            setIsSaving(true);
            await updateProfile(user, {
                displayName: displayName
            });
            toast({
                title: "บันทึกข้อมูลสำเร็จ",
                description: "ข้อมูลส่วนตัวของคุณได้รับการอัปเดตแล้ว",
                duration: 3000,
            });
            // Force reload to update header avatar (optional, but ensuring context updates)
            router.refresh();
        } catch (error) {
            console.error("Error updating profile:", error);
            toast({
                variant: "destructive",
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isUserLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Beautiful Page Header */}
            <PageHeader
                title="จัดการบัญชี"
                description="จัดการข้อมูลส่วนตัวและการเข้าสู่ระบบของคุณ"
                icon={Settings}
                theme="slate"
                backLink="/education"
                backLabel="กลับหน้าหลัก"
            />

            <Card>
                <CardHeader>
                    <CardTitle>ข้อมูลส่วนตัว</CardTitle>
                    <CardDescription>
                        ข้อมูลที่แสดงบนโปรไฟล์สาธารณะและใบรับรองของคุณ
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center sm:flex-row gap-6">
                        <div className="relative group">
                            <Avatar className="h-24 w-24 border-2 border-slate-100">
                                <AvatarImage src={user.photoURL || ''} />
                                <AvatarFallback className="text-2xl bg-slate-100 text-slate-400">
                                    {displayName?.charAt(0) || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            {/* Placeholder for image upload feature */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-not-allowed">
                                <Camera className="h-6 w-6" />
                            </div>
                        </div>
                        <div className="space-y-1 text-center sm:text-left">
                            <h3 className="font-medium text-slate-900">รูปโปรไฟล์</h3>
                            <p className="text-sm text-slate-500">
                                รูปภาพจะแสดงในความคิดเห็นและหน้าโปรไฟล์ของคุณ
                                <br />(ปัจจุบันรองรับการดึงรูปจาก Google เท่านั้น)
                            </p>
                        </div>
                    </div>

                    <Separator />

                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">อีเมล</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    id="email"
                                    value={user.email || ''}
                                    disabled
                                    className="pl-9 bg-slate-50 text-slate-500"
                                />
                            </div>
                            <p className="text-[0.8rem] text-slate-500">
                                อีเมลใช้สำหรับเข้าสู่ระบบและไม่สามารถเปลี่ยนได้
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="displayName">ชื่อที่แสดง (Display Name)</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    id="displayName"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="pl-9"
                                    placeholder="ชื่อ-นามสกุล หรือชื่อเล่น"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button type="submit" disabled={isSaving || displayName === user.displayName} className="bg-indigo-600 hover:bg-indigo-700">
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                บันทึกการเปลี่ยนแปลง
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/education/profile/orders')}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-indigo-600" />
                        ประวัติการสั่งซื้อ
                    </CardTitle>
                    <CardDescription>
                        ดูรายการคำสั่งซื้อหนังสือและติดตามสถานะพัสดุ
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="link" className="px-0 text-indigo-600">
                        ดูทั้งหมด <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-slate-500" />
                        ความปลอดภัย
                    </CardTitle>
                    <CardDescription>
                        จัดการรหัสผ่านและการเข้าถึงบัญชี
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                            <div className="space-y-0.5">
                                <div className="font-medium text-slate-900">รหัสผ่าน</div>
                                <div className="text-sm text-slate-500">
                                    เปลี่ยนรหัสผ่านเพื่อความปลอดภัยของบัญชี
                                </div>
                            </div>
                            <Button variant="outline" disabled>
                                เปลี่ยนรหัสผ่าน
                            </Button>
                        </div>
                        <p className="text-xs text-slate-400 text-center">
                            * หากเข้าสู่ระบบด้วย Google คุณไม่จำเป็นต้องตั้งค่ารหัสผ่าน
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
