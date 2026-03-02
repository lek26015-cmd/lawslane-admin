'use client';

import { useState, useRef, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter, useParams } from 'next/navigation';
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
import { LandingPage } from '@/lib/types';

export default function EditLandingPage() {
    const router = useRouter();
    const params = useParams();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Form States
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [content, setContent] = useState('');
    const [themeColor, setThemeColor] = useState('#1e40af');
    const [status, setStatus] = useState<'published' | 'draft'>('draft');

    // Contact Info
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [website, setWebsite] = useState('');
    const [address, setAddress] = useState('');
    const [lineId, setLineId] = useState('');
    const [facebook, setFacebook] = useState('');

    // Images
    const [heroImageUrl, setHeroImageUrl] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);

    const heroInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchPage = async () => {
            if (!firestore || !params.id) return;
            try {
                const docRef = doc(firestore, 'landingPages', params.id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as LandingPage;
                    setTitle(data.title);
                    setSlug(data.slug);
                    setContent(data.content);
                    setThemeColor(data.themeColor || '#1e40af');
                    setStatus(data.status);
                    setHeroImageUrl(data.heroImage);
                    setLogoUrl(data.logo || '');

                    if (data.contactInfo) {
                        setPhone(data.contactInfo.phone || '');
                        setEmail(data.contactInfo.email || '');
                        setWebsite(data.contactInfo.website || '');
                        setAddress(data.contactInfo.address || '');
                        setLineId(data.contactInfo.lineId || '');
                        setFacebook(data.contactInfo.facebook || '');
                    }
                } else {
                    toast({
                        variant: "destructive",
                        title: "ไม่พบข้อมูล",
                        description: "ไม่พบ Landing Page ที่ต้องการแก้ไข",
                    });
                    router.push('/admin/landing-pages');
                }
            } catch (error) {
                console.error("Error fetching page:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPage();
    }, [firestore, params.id]);

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

    const handleSubmit = async () => {
        if (!title || !slug || !content) {
            toast({
                variant: "destructive",
                title: "ข้อมูลไม่ครบถ้วน",
                description: "กรุณากรอกชื่อเพจ, Slug และเนื้อหา",
            });
            return;
        }

        setIsSaving(true);

        try {
            // Upload Images if changed
            let finalHeroUrl = heroImageUrl;
            let finalLogoUrl = logoUrl;

            if (heroImageFile) {
                const heroFormData = new FormData();
                heroFormData.append('file', heroImageFile);
                finalHeroUrl = await uploadToR2(heroFormData, 'landing-pages');
            }

            if (logoFile) {
                const logoFormData = new FormData();
                logoFormData.append('file', logoFile);
                finalLogoUrl = await uploadToR2(logoFormData, 'landing-pages');
            }

            // Update Firestore
            const docRef = doc(firestore!, 'landingPages', params.id as string);
            await updateDoc(docRef, {
                title,
                slug, // Ideally we should check uniqueness again if changed, but skipping for simplicity
                content,
                themeColor,
                status,
                heroImage: finalHeroUrl,
                logo: finalLogoUrl,
                contactInfo: {
                    phone,
                    email,
                    website,
                    address,
                    lineId,
                    facebook
                },
                updatedAt: serverTimestamp(),
            });

            toast({
                title: "บันทึกสำเร็จ",
                description: "แก้ไข Landing Page เรียบร้อยแล้ว",
            });

            router.push('/admin/landing-pages');

        } catch (error) {
            console.error("Error updating landing page:", error);
            toast({
                variant: "destructive",
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถบันทึกการแก้ไขได้",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center">กำลังโหลดข้อมูล...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin/landing-pages">
                    <Button variant="outline" size="icon">
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">แก้ไข Landing Page</h1>
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
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Slug (URL)</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-sm">lawslane.com/p/</span>
                                <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
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
                            <Label>รูปภาพส่วนหัว (Hero Image)</Label>
                            <div className="aspect-video bg-muted rounded-lg overflow-hidden relative border-2 border-dashed border-muted-foreground/25 flex items-center justify-center group cursor-pointer"
                                onClick={() => heroInputRef.current?.click()}>
                                {heroImageFile ? (
                                    <Image src={URL.createObjectURL(heroImageFile)} alt="Hero" fill className="object-cover" />
                                ) : heroImageUrl ? (
                                    <Image src={heroImageUrl} alt="Hero" fill className="object-cover" />
                                ) : (
                                    <div className="text-center text-muted-foreground">
                                        <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p>คลิกเพื่อเปลี่ยนรูป</p>
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
                                ) : logoUrl ? (
                                    <Image src={logoUrl} alt="Logo" fill className="object-contain p-2" />
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
                                className="min-h-[200px]"
                            />
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
                            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>อีเมล</Label>
                            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>เว็บไซต์</Label>
                            <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Line ID</Label>
                            <Input value={lineId} onChange={(e) => setLineId(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Facebook Page URL</Label>
                            <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} />
                        </div>
                        <div className="grid gap-2 sm:col-span-2">
                            <Label>ที่อยู่</Label>
                            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Link href="/admin/landing-pages">
                        <Button variant="outline">ยกเลิก</Button>
                    </Link>
                    <Button onClick={handleSubmit} disabled={isSaving}>
                        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        บันทึกการแก้ไข
                    </Button>
                </div>
            </div>
        </div>
    );
}
