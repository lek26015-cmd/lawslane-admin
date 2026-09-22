'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, Globe, Phone, Mail, MapPin, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getEducationSettingsAction, saveEducationSettingsAction } from '@/app/actions/education-settings';

interface SiteSettings {
    siteName: string;
    siteDescription: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    facebook: string;
    line: string;
    website: string;
    announcement: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
    siteName: 'Lawslane Wittaya',
    siteDescription: 'แพลตฟอร์มเตรียมสอบกฎหมายและทนายความออนไลน์',
    contactEmail: 'contact@lawslane.com',
    contactPhone: '',
    address: '',
    facebook: '',
    line: '',
    website: 'https://lawslane.com',
    announcement: '',
};

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await getEducationSettingsAction();
                setSettings({ ...DEFAULT_SETTINGS, ...data });
            } catch (error) {
                console.error('Error fetching settings:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await saveEducationSettingsAction(settings as unknown as Record<string, unknown>);
            if (res.success) {
                toast({ title: "บันทึกการตั้งค่าสำเร็จ" });
            } else {
                throw new Error(res.error);
            }
        } catch (error) {
            toast({ title: "เกิดข้อผิดพลาดในการบันทึก", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const update = (key: keyof SiteSettings, value: string) =>
        setSettings(prev => ({ ...prev, [key]: value }));

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">ตั้งค่าระบบ</h1>
                    <p className="text-slate-500">จัดการการตั้งค่าทั่วไปของระบบ Education</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    บันทึกการตั้งค่า
                </Button>
            </div>

            {/* Site Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-indigo-500" />
                        ข้อมูลเว็บไซต์
                    </CardTitle>
                    <CardDescription>ข้อมูลพื้นฐานของเว็บไซต์</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="siteName">ชื่อเว็บไซต์</Label>
                        <Input id="siteName" value={settings.siteName} onChange={e => update('siteName', e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="siteDescription">คำอธิบายเว็บไซต์</Label>
                        <Textarea id="siteDescription" rows={3} value={settings.siteDescription}
                            onChange={e => update('siteDescription', e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="announcement">ประกาศ / ข้อความแจ้งเตือน</Label>
                        <Textarea id="announcement" rows={2} value={settings.announcement}
                            onChange={e => update('announcement', e.target.value)}
                            placeholder="ข้อความที่จะแสดงเป็น banner ด้านบนเว็บไซต์ (เว้นว่างถ้าไม่ต้องการ)" />
                    </div>
                </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Phone className="w-5 h-5 text-emerald-500" />
                        ข้อมูลติดต่อ
                    </CardTitle>
                    <CardDescription>ข้อมูลสำหรับการติดต่อกับผู้ใช้งาน</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="contactEmail">อีเมล</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <Input id="contactEmail" className="pl-9" value={settings.contactEmail}
                                    onChange={e => update('contactEmail', e.target.value)} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="contactPhone">โทรศัพท์</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <Input id="contactPhone" className="pl-9" value={settings.contactPhone}
                                    onChange={e => update('contactPhone', e.target.value)} placeholder="02-xxx-xxxx" />
                            </div>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="address">ที่อยู่</Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <Input id="address" className="pl-9" value={settings.address}
                                onChange={e => update('address', e.target.value)} placeholder="ที่อยู่สำนักงาน" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Social Links */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ExternalLink className="w-5 h-5 text-sky-500" />
                        โซเชียลมีเดีย
                    </CardTitle>
                    <CardDescription>ลิงก์ไปยังโซเชียลมีเดียของ Lawslane</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="website">เว็บไซต์หลัก</Label>
                        <Input id="website" value={settings.website} onChange={e => update('website', e.target.value)} placeholder="https://lawslane.com" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="facebook">Facebook</Label>
                            <Input id="facebook" value={settings.facebook} onChange={e => update('facebook', e.target.value)} placeholder="https://facebook.com/lawslane" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="line">LINE Official</Label>
                            <Input id="line" value={settings.line} onChange={e => update('line', e.target.value)} placeholder="@lawslane" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
