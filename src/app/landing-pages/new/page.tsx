'use client';

import { useState, useRef } from 'react';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Upload, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { uploadToR2 } from '@/app/actions/upload-r2';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect } from 'react';

export default function NewLandingPage() {
    const router = useRouter();
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isAdmin, setIsAdmin] = useState(true);

    // Form States
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [content, setContent] = useState('');
    const [themeColor, setThemeColor] = useState('#1e40af'); // Default blue
    const [status, setStatus] = useState<'published' | 'draft'>('draft');

    // Contact Info
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [website, setWebsite] = useState('');
    const [address, setAddress] = useState('');
    const [lineId, setLineId] = useState('');
    const [facebook, setFacebook] = useState('');

    // Images
    const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);

    const heroInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const checkUserRole = async () => {
            if (user && firestore) {
                try {
                    const userDocRef = doc(firestore, 'users', user.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        if (userData.role !== 'admin') {
                            setIsAdmin(false);
                        } else {
                            setIsAdmin(true);
                        }
                    }
                } catch (e) {
                    console.error("Error checking role:", e);
                }
            }
        };
        checkUserRole();
    }, [user, firestore]);

    const handleFixAdminRole = async () => {
        if (!user || !firestore) return;
        try {
            const userDocRef = doc(firestore, 'users', user.uid);
            await import('firebase/firestore').then(({ setDoc }) =>
                setDoc(userDocRef, { role: 'admin' }, { merge: true })
            );
            setIsAdmin(true);
            toast({
                title: "Success",
                description: "You are now an Admin!",
            });
        } catch (error: any) {
            console.error("Error fixing admin role:", error);
            toast({
                variant: "destructive",
                title: "Failed",
                description: error.message,
            });
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'hero' | 'logo') => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > MAX_FILE_SIZE_BYTES) {
                toast({
                    variant: "destructive",
                    title: "ไฟล์ใหญ่เกินไป",
                    description: `ขนาดไฟล์ต้องไม่เกิน ${MAX_FILE_SIZE_MB}MB`,
                });
                return;
            }
            if (type === 'hero') setHeroImageFile(file);
            else setLogoFile(file);
        }
    };

    const generateSlug = (text: string) => {
        return text.toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special chars
            .replace(/\s+/g, '-') // Replace spaces with -
            .replace(/--+/g, '-') // Replace multiple - with single -
            .trim();
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        if (!slug) {
            setSlug(generateSlug(e.target.value));
        }
    };

    const handleSubmit = async () => {
        if (!title || !slug || !content) {
            toast({
                variant: "destructive",
                title: "ข้อมูลไม่ครบถ้วน",
                description: "กรุณากรอกชื่อเพจ, Slug และเนื้อหา",
            });
            return;
        }

        if (!heroImageFile) {
            toast({
                variant: "destructive",
                title: "ขาดรูปภาพ Hero",
                description: "กรุณาอัปโหลดรูปภาพส่วนหัว (Hero Image)",
            });
            return;
        }

        setIsSaving(true);

        try {
            // Check slug uniqueness
            const q = query(collection(firestore!, 'landingPages'), where('slug', '==', slug));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                toast({
                    variant: "destructive",
                    title: "Slug ซ้ำ",
                    description: "Slug นี้ถูกใช้งานแล้ว กรุณาเปลี่ยนใหม่",
                });
                setIsSaving(false);
                return;
            }

            // Upload Images
            let heroImageUrl = '';
            let logoUrl = '';

            const heroFormData = new FormData();
            heroFormData.append('file', heroImageFile);
            heroImageUrl = await uploadToR2(heroFormData, 'landing-pages');

            if (logoFile) {
                const logoFormData = new FormData();
                logoFormData.append('file', logoFile);
                logoUrl = await uploadToR2(logoFormData, 'landing-pages');
            }

            // Save to Firestore
            console.log("Saving to Firestore...", { uid: user?.uid, isAdmin });
            await addDoc(collection(firestore!, 'landingPages'), {
                title,
                slug,
                content,
                themeColor,
                status,
                heroImage: heroImageUrl,
                logo: logoUrl,
                contactInfo: {
                    phone,
                    email,
                    website,
                    address,
                    lineId,
                    facebook
                },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            toast({
                title: "สร้างสำเร็จ",
                description: "สร้าง Landing Page เรียบร้อยแล้ว",
            });

            router.push('/admin/landing-pages');

        } catch (error: any) {
            console.error("Error creating landing page:", error);
            toast({
                variant: "destructive",
                title: "เกิดข้อผิดพลาด",
                description: error.message || "ไม่สามารถสร้าง Landing Page ได้",
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {!isAdmin && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-red-800">
                    <div>
                        <h3 className="font-bold">Access Denied: You are not an Admin</h3>
                        <p className="text-sm">You need admin permissions to create landing pages.</p>
                    </div>
                    <Button variant="destructive" onClick={handleFixAdminRole}>
                        Fix Admin Role (Dev Only)
                    </Button>
                </div>
            )}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin/landing-pages">
                    <Button variant="outline" size="icon">
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">สร้าง Landing Page ใหม่</h1>
            </div>

            <div className="grid gap-6">
                {/* Basic Info */}
                <Card className="rounded-xl">
                    <CardHeader>
                        <CardTitle>ข้อมูลทั่วไป</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid gap-2">
                            <Label>ชื่อเพจ (Title)</Label>
                            <Input value={title} onChange={handleTitleChange} placeholder="เช่น สำนักงานกฎหมาย A" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Slug (URL)</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-sm">lawslane.com/p/</span>
                                <Input value={slug} onChange={(e) => setSlug(generateSlug(e.target.value))} placeholder="law-firm-a" />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>สถานะ</Label>
                            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">แบบร่าง (Draft)</SelectItem>
                                    <SelectItem value="published">เผยแพร่ (Published)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>สีธีม (Theme Color)</Label>
                            <div className="flex gap-2 items-center">
                                <Input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="w-12 h-12 p-1" />
                                <Input value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="w-32" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Images */}
                <Card className="rounded-xl">
                    <CardHeader>
                        <CardTitle>รูปภาพ</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid gap-2">
                            <Label>รูปภาพส่วนหัว (Hero Image) *</Label>
                            <div className="aspect-video bg-muted rounded-lg overflow-hidden relative border-2 border-dashed border-muted-foreground/25 flex items-center justify-center group cursor-pointer"
                                onClick={() => heroInputRef.current?.click()}>
                                {heroImageFile ? (
                                    <Image src={URL.createObjectURL(heroImageFile)} alt="Hero" fill className="object-cover" />
                                ) : (
                                    <div className="text-center text-muted-foreground">
                                        <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p>คลิกเพื่ออัปโหลด</p>
                                        <p className="text-xs">แนะนำขนาด 1920x1080px</p>
                                    </div>
                                )}
                                <input type="file" ref={heroInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'hero')} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>โลโก้ (Logo)</Label>
                            <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden relative border-2 border-dashed border-muted-foreground/25 flex items-center justify-center group cursor-pointer"
                                onClick={() => logoInputRef.current?.click()}>
                                {logoFile ? (
                                    <Image src={URL.createObjectURL(logoFile)} alt="Logo" fill className="object-contain p-2" />
                                ) : (
                                    <div className="text-center text-muted-foreground">
                                        <Upload className="w-6 h-6 mx-auto mb-1 opacity-50" />
                                        <p className="text-xs">อัปโหลด</p>
                                    </div>
                                )}
                                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'logo')} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Content */}
                <Card className="rounded-xl">
                    <CardHeader>
                        <CardTitle>เนื้อหา (Content)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-2">
                            <Label>เกี่ยวกับเรา / บริการ</Label>
                            <Textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="เขียนรายละเอียดเกี่ยวกับสำนักงาน หรือบริการต่างๆ..."
                                className="min-h-[200px]"
                            />
                            <p className="text-xs text-muted-foreground">รองรับข้อความธรรมดา (ในอนาคตจะรองรับ Rich Text)</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Contact Info */}
                <Card className="rounded-xl">
                    <CardHeader>
                        <CardTitle>ข้อมูลติดต่อ</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>เบอร์โทรศัพท์</Label>
                            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="081-234-5678" />
                        </div>
                        <div className="grid gap-2">
                            <Label>อีเมล</Label>
                            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@example.com" />
                        </div>
                        <div className="grid gap-2">
                            <Label>เว็บไซต์</Label>
                            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
                        </div>
                        <div className="grid gap-2">
                            <Label>Line ID</Label>
                            <Input value={lineId} onChange={(e) => setLineId(e.target.value)} placeholder="@lineid" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Facebook Page URL</Label>
                            <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/..." />
                        </div>
                        <div className="grid gap-2 sm:col-span-2">
                            <Label>ที่อยู่</Label>
                            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ที่อยู่สำนักงาน..." />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Link href="/admin/landing-pages">
                        <Button variant="outline">ยกเลิก</Button>
                    </Link>
                    <Button onClick={handleSubmit} disabled={isSaving}>
                        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        บันทึก
                    </Button>
                </div>
            </div>
        </div>
    );
}
