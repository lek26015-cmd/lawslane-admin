'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';
import { getNotificationPreferences, saveNotificationPreferences, NotificationPreferences } from '@/app/actions/admin-notifications';
import { Loader2 } from 'lucide-react';

export default function AdminSettingsNotificationsPage() {
    const { user } = useUser();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [preferences, setPreferences] = useState<NotificationPreferences>({
        email: '',
        notifyOnNewUser: true,
        notifyOnNewTicket: true,
        notifyOnPayment: true
    });

    useEffect(() => {
        async function fetchPreferences() {
            if (!user) return;

            try {
                const result = await getNotificationPreferences(user.uid);
                if (result.success && result.preferences) {
                    setPreferences(result.preferences);
                } else {
                    // Default to user's auth email if no prefs yet
                    setPreferences(prev => ({ ...prev, email: user.email || '' }));
                }
            } catch (error) {
                console.error('Failed to load preferences:', error);
                toast({
                    variant: 'destructive',
                    title: 'เกิดข้อผิดพลาด',
                    description: 'ไม่สามารถโหลดข้อมูลการตั้งค่าได้'
                });
            } finally {
                setIsLoading(false);
            }
        }

        fetchPreferences();
    }, [user]);

    const handleSaveChanges = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const result = await saveNotificationPreferences(user.uid, preferences);
            if (result.success) {
                toast({
                    title: 'บันทึกการตั้งค่าสำเร็จ',
                    description: 'ระบบได้บันทึกการเปลี่ยนแปลงของคุณแล้ว'
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to save:', error);
            toast({
                variant: 'destructive',
                title: 'บันทึกไม่สำเร็จ',
                description: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
            });
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="mx-auto grid w-full max-w-4xl gap-2">
                <h1 className="text-3xl font-semibold">ตั้งค่าระบบ</h1>
                <p className="text-muted-foreground">จัดการการตั้งค่าทั่วไปของแพลตฟอร์ม Lawslane</p>
            </div>
            <div className="mx-auto grid w-full max-w-4xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
                <nav
                    className="grid gap-4 text-sm text-muted-foreground"
                >
                    <Link href="/admin/settings">ทั่วไป</Link>
                    <Link href="/admin/settings/financials">การเงิน</Link>
                    <Link href="/admin/settings/administrators">ผู้ดูแลระบบ</Link>
                    <Link href="/admin/settings/notifications" className="font-semibold text-primary">การแจ้งเตือน</Link>
                </nav>
                <div className="grid gap-6">
                    <Card className="rounded-xl">
                        <CardHeader>
                            <CardTitle>การแจ้งเตือนทางอีเมล</CardTitle>
                            <CardDescription>
                                จัดการการส่งอีเมลแจ้งเตือนไปยังผู้ใช้และผู้ดูแลระบบ
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="notification-email">อีเมลสำหรับรับการแจ้งเตือน</Label>
                                <Input
                                    id="notification-email"
                                    placeholder="admin@example.com"
                                    value={preferences.email}
                                    onChange={(e) => setPreferences({ ...preferences, email: e.target.value })}
                                />
                                <p className="text-sm text-muted-foreground">หากไม่ระบุ ระบบจะใช้อีเมลบัญชีของคุณ ({user?.email})</p>
                            </div>

                            <div className="flex items-center justify-between space-x-2">
                                <Label htmlFor="email-new-user" className="flex flex-col space-y-1">
                                    <span>ผู้ใช้ใหม่ลงทะเบียน</span>
                                    <span className="font-normal leading-snug text-muted-foreground">
                                        ส่งอีเมลแจ้งเตือนเมื่อมีผู้ใช้ใหม่สมัครสมาชิก
                                    </span>
                                </Label>
                                <Switch
                                    id="email-new-user"
                                    checked={preferences.notifyOnNewUser}
                                    onCheckedChange={(checked) => setPreferences({ ...preferences, notifyOnNewUser: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                                <Label htmlFor="email-new-ticket" className="flex flex-col space-y-1">
                                    <span>Ticket ใหม่</span>
                                    <span className="font-normal leading-snug text-muted-foreground">
                                        ส่งอีเมลแจ้งเตือนเมื่อมีการแจ้งปัญหาเข้ามาใหม่
                                    </span>
                                </Label>
                                <Switch
                                    id="email-new-ticket"
                                    checked={preferences.notifyOnNewTicket}
                                    onCheckedChange={(checked) => setPreferences({ ...preferences, notifyOnNewTicket: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                                <Label htmlFor="email-payment" className="flex flex-col space-y-1">
                                    <span>การชำระเงิน</span>
                                    <span className="font-normal leading-snug text-muted-foreground">
                                        ส่งอีเมลแจ้งเตือนเมื่อมีการชำระเงินสำเร็จ
                                    </span>
                                </Label>
                                <Switch
                                    id="email-payment"
                                    checked={preferences.notifyOnPayment}
                                    onCheckedChange={(checked) => setPreferences({ ...preferences, notifyOnPayment: checked })}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4">
                            <Button onClick={handleSaveChanges} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                บันทึกการเปลี่ยนแปลง
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </main>
    );
}
