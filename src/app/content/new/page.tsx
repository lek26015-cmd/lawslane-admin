
'use client'

import * as React from 'react'
import {
    ChevronLeft,
    Upload,
    Info,
    PlusCircle,
    Languages,
    Loader2,
    X,
    Tag
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useFirebase } from '@/firebase'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { errorEmitter, FirestorePermissionError } from '@/firebase'
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/constants'
import { compressImageToBase64 } from '@/lib/image-utils'
import Image from 'next/image'
import { translateToMultipleLanguages } from '@/app/actions/translate';

export default function AdminArticleCreatePage() {
    const router = useRouter()
    const { toast } = useToast()
    const { firestore } = useFirebase();

    // Thai (default)
    const [title, setTitle] = React.useState('');
    const [slug, setSlug] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [content, setContent] = React.useState('');

    // English translations
    const [titleEn, setTitleEn] = React.useState('');
    const [descriptionEn, setDescriptionEn] = React.useState('');
    const [contentEn, setContentEn] = React.useState('');

    // Chinese translations
    const [titleZh, setTitleZh] = React.useState('');
    const [descriptionZh, setDescriptionZh] = React.useState('');
    const [contentZh, setContentZh] = React.useState('');

    const [category, setCategory] = React.useState('');
    const [authorName, setAuthorName] = React.useState('ทีมงาน Lawslane');
    const [isSaving, setIsSaving] = React.useState(false);
    const [imageFile, setImageFile] = React.useState<File | null>(null);
    const [imageUrl, setImageUrl] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Translation states
    const [isTranslatingTitle, setIsTranslatingTitle] = React.useState(false);
    const [isTranslatingDesc, setIsTranslatingDesc] = React.useState(false);
    const [isTranslatingContent, setIsTranslatingContent] = React.useState(false);

    const [categories, setCategories] = React.useState(['กฎหมายแรงงาน', 'กฎหมายธุรกิจ', 'ทรัพย์สินทางปัญญา', 'คดีฉ้อโกง', 'กฎหมายแพ่ง']);
    const [newCategory, setNewCategory] = React.useState('');

    const [ctaEnabled, setCtaEnabled] = React.useState(false);
    const [ctaText, setCtaText] = React.useState('');
    const [ctaUrl, setCtaUrl] = React.useState('');

    // Tags state
    const [tags, setTags] = React.useState<string[]>([]);
    const [newTag, setNewTag] = React.useState('');

    const handleAddTag = () => {
        const trimmedTag = newTag.trim().toLowerCase();
        if (trimmedTag && !tags.includes(trimmedTag)) {
            setTags(prev => [...prev, trimmedTag]);
            setNewTag('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(prev => prev.filter(tag => tag !== tagToRemove));
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    const handleTranslateTitle = async () => {
        if (!title.trim()) {
            toast({ variant: "destructive", title: "กรุณากรอกหัวข้อภาษาไทยก่อน" });
            return;
        }
        setIsTranslatingTitle(true);
        try {
            const result = await translateToMultipleLanguages(title);
            setTitleEn(result.english);
            setTitleZh(result.chinese);
            toast({ title: "แปลสำเร็จ", description: "แปลหัวข้อเป็น EN/ZH แล้ว" });
        } catch {
            toast({ variant: "destructive", title: "แปลไม่สำเร็จ" });
        } finally {
            setIsTranslatingTitle(false);
        }
    };

    const handleTranslateDesc = async () => {
        if (!description.trim()) {
            toast({ variant: "destructive", title: "กรุณากรอกคำอธิบายภาษาไทยก่อน" });
            return;
        }
        setIsTranslatingDesc(true);
        try {
            const result = await translateToMultipleLanguages(description);
            setDescriptionEn(result.english);
            setDescriptionZh(result.chinese);
            toast({ title: "แปลสำเร็จ", description: "แปลคำอธิบายเป็น EN/ZH แล้ว" });
        } catch {
            toast({ variant: "destructive", title: "แปลไม่สำเร็จ" });
        } finally {
            setIsTranslatingDesc(false);
        }
    };

    const handleTranslateContent = async () => {
        if (!content.trim()) {
            toast({ variant: "destructive", title: "กรุณากรอกเนื้อหาภาษาไทยก่อน" });
            return;
        }
        setIsTranslatingContent(true);
        try {
            const result = await translateToMultipleLanguages(content);
            setContentEn(result.english);
            setContentZh(result.chinese);
            toast({ title: "แปลสำเร็จ", description: "แปลเนื้อหาเป็น EN/ZH แล้ว" });
        } catch {
            toast({ variant: "destructive", title: "แปลไม่สำเร็จ" });
        } finally {
            setIsTranslatingContent(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > MAX_FILE_SIZE_BYTES) {
                toast({
                    variant: "destructive",
                    title: "ไฟล์มีขนาดใหญ่เกินไป",
                    description: `กรุณาอัปโหลดไฟล์ขนาดไม่เกิน ${MAX_FILE_SIZE_MB}MB`,
                });
                e.target.value = '';
                return;
            }
            setImageFile(file);
            const url = URL.createObjectURL(file);
            setImageUrl(url);
        }
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        const newSlug = newTitle.toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/--+/g, '-');
        setSlug(newSlug);
    }

    const handleSaveChanges = async () => {
        if (!firestore) return;
        if (!title || !slug || !content || !category) {
            toast({
                variant: "destructive",
                title: "ข้อมูลไม่ครบถ้วน",
                description: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน: หัวข้อ, slug, เนื้อหา, และหมวดหมู่",
            });
            return;
        }
        setIsSaving(true);

        try {
            let finalImageUrl = `https://picsum.photos/seed/${slug}/600/400`;

            if (imageFile) {
                toast({
                    title: "กำลังประมวลผลรูปภาพ...",
                    description: "Compressing image..."
                });

                try {
                    finalImageUrl = await compressImageToBase64(imageFile);
                    toast({ title: "รูปภาพพร้อมแล้ว", description: "กำลังบันทึกข้อมูล..." });
                } catch (compressError) {
                    console.error("Compression failed:", compressError);
                    toast({
                        variant: "destructive",
                        title: "รูปภาพมีปัญหา",
                        description: "ไม่สามารถประมวลผลรูปภาพได้"
                    });
                    setIsSaving(false);
                    return;
                }
            }

            const newArticle = {
                title,
                slug,
                description,
                content,
                category,
                authorName,
                imageUrl: finalImageUrl,
                imageHint: 'legal article',
                publishedAt: serverTimestamp(),
                translations: {
                    en: {
                        title: titleEn,
                        description: descriptionEn,
                        content: contentEn,
                    },
                    zh: {
                        title: titleZh,
                        description: descriptionZh,
                        content: contentZh,
                    }
                },
                cta: ctaEnabled ? {
                    enabled: true,
                    text: ctaText,
                    url: ctaUrl,
                } : null,
                tags: tags,
            };

            const articlesCollection = collection(firestore, 'articles');
            await addDoc(articlesCollection, newArticle);

            toast({
                title: "สร้างบทความสำเร็จ",
                description: `บทความใหม่ "${title}" ได้ถูกเพิ่มเข้าสู่ระบบแล้ว`,
            })
            router.push('/content');

        } catch (error: any) {
            console.error("Error creating article:", error);
            if (error.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: 'articles',
                    operation: 'create',
                    requestResourceData: { title, slug },
                });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                toast({
                    variant: "destructive",
                    title: "เกิดข้อผิดพลาด",
                    description: error.message || "ไม่สามารถบันทึกบทความได้",
                });
            }
        } finally {
            setIsSaving(false);
        }
    }

    const handleAddNewCategory = () => {
        if (newCategory && !categories.includes(newCategory)) {
            setCategories(prev => [...prev, newCategory]);
            setCategory(newCategory);
            setNewCategory('');
            toast({
                title: 'เพิ่มหมวดหมู่สำเร็จ',
                description: `หมวดหมู่ "${newCategory}" ได้ถูกเพิ่มในรายการแล้ว`,
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'ไม่สามารถเพิ่มหมวดหมู่ได้',
                description: 'อาจเป็นเพราะช่องว่างหรือมีหมวดหมู่นี้อยู่แล้ว',
            })
        }
    }


    return (
        <main className="flex-1 p-4 sm:px-6 sm:py-0 md:p-8">
            <div className="mx-auto grid max-w-3xl flex-1 auto-rows-max gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/content">
                        <Button variant="outline" size="icon" className="h-7 w-7" disabled={isSaving}>
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">กลับ</span>
                        </Button>
                    </Link>
                    <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                        สร้างบทความใหม่ (3 ภาษา)
                    </h1>
                    <div className="hidden items-center gap-2 md:ml-auto md:flex">
                        <Link href="/content">
                            <Button variant="outline" size="sm" disabled={isSaving}>
                                ยกเลิก
                            </Button>
                        </Link>
                        <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกบทความ'}
                        </Button>
                    </div>
                </div>

                {/* Thai Content (Main) */}
                <Card className="rounded-xl">
                    <CardHeader>
                        <CardTitle>🇹🇭 เนื้อหาภาษาไทย (หลัก)</CardTitle>
                        <CardDescription>
                            กรอกเนื้อหาหลักและรูปภาพสำหรับบทความใหม่
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6">
                            <div className="grid gap-3">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="title">หัวข้อบทความ (H1)</Label>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleTranslateTitle}
                                        disabled={isTranslatingTitle || !title.trim()}
                                    >
                                        {isTranslatingTitle ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Languages className="h-4 w-4 mr-2" />}
                                        แปลหัวข้อ
                                    </Button>
                                </div>
                                <Input
                                    id="title"
                                    type="text"
                                    className="w-full"
                                    value={title}
                                    onChange={handleTitleChange}
                                    placeholder="เช่น 5 สิ่งต้องรู้ก่อนเซ็นสัญญา..."
                                />
                            </div>
                            <div className="grid gap-3">
                                <Label htmlFor="picture">รูปภาพหน้าปก</Label>
                                <div className="flex items-center gap-4">
                                    <div className="aspect-video w-48 rounded-md object-contain bg-muted border flex items-center justify-center overflow-hidden relative">
                                        {imageFile || imageUrl ? (
                                            <Image
                                                src={imageFile ? URL.createObjectURL(imageFile) : (imageUrl || '')}
                                                alt="Preview"
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <span className="text-muted-foreground text-xs">Preview</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Input
                                            id="picture"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            ref={fileInputRef}
                                            onChange={handleImageChange}
                                        />
                                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                            <Upload className="h-4 w-4 mr-2" />
                                            อัปโหลดรูป
                                        </Button>
                                        <p className="text-xs text-muted-foreground">
                                            ขนาดไฟล์ไม่เกิน {MAX_FILE_SIZE_MB}MB
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="grid gap-3">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="description">คำอธิบาย (Meta Description)</Label>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleTranslateDesc}
                                        disabled={isTranslatingDesc || !description.trim()}
                                    >
                                        {isTranslatingDesc ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Languages className="h-4 w-4 mr-2" />}
                                        แปลคำอธิบาย
                                    </Button>
                                </div>
                                <Textarea
                                    id="description"
                                    placeholder="คำอธิบายสั้นๆ ที่จะแสดงในผลการค้นหา"
                                    rows={2}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-3">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="content">เนื้อหาบทความ</Label>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleTranslateContent}
                                        disabled={isTranslatingContent || !content.trim()}
                                    >
                                        {isTranslatingContent ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Languages className="h-4 w-4 mr-2" />}
                                        แปลเนื้อหา
                                    </Button>
                                </div>
                                <Textarea
                                    id="content"
                                    placeholder="เนื้อหาฉบับเต็มของบทความ..."
                                    rows={12}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* English Translation */}
                <Card className="rounded-xl border-blue-200">
                    <CardHeader className="bg-blue-50/50">
                        <CardTitle>🇬🇧 English Translation</CardTitle>
                        <CardDescription>
                            Auto-translated or manually edited English version
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label>Title</Label>
                                <Input
                                    value={titleEn}
                                    onChange={(e) => setTitleEn(e.target.value)}
                                    placeholder="English title..."
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={descriptionEn}
                                    onChange={(e) => setDescriptionEn(e.target.value)}
                                    placeholder="English description..."
                                    rows={2}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Content</Label>
                                <Textarea
                                    value={contentEn}
                                    onChange={(e) => setContentEn(e.target.value)}
                                    placeholder="English content..."
                                    rows={8}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Chinese Translation */}
                <Card className="rounded-xl border-red-200">
                    <CardHeader className="bg-red-50/50">
                        <CardTitle>🇨🇳 中文翻译</CardTitle>
                        <CardDescription>
                            自动翻译或手动编辑的中文版本
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label>标题</Label>
                                <Input
                                    value={titleZh}
                                    onChange={(e) => setTitleZh(e.target.value)}
                                    placeholder="中文标题..."
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>描述</Label>
                                <Textarea
                                    value={descriptionZh}
                                    onChange={(e) => setDescriptionZh(e.target.value)}
                                    placeholder="中文描述..."
                                    rows={2}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>内容</Label>
                                <Textarea
                                    value={contentZh}
                                    onChange={(e) => setContentZh(e.target.value)}
                                    placeholder="中文内容..."
                                    rows={8}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Settings */}
                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="rounded-xl">
                        <CardHeader>
                            <CardTitle>SEO Settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3">
                                <Label htmlFor="slug">Slug (URL Path)</Label>
                                <Input
                                    id="slug"
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    placeholder="เช่น 5-things-before-signing"
                                />
                                <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
                                    <Info className="h-4 w-4 !text-blue-600" />
                                    <AlertDescription>
                                        Slug จะถูกสร้างจากหัวข้อโดยอัตโนมัติ
                                    </AlertDescription>
                                </Alert>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                        <CardHeader>
                            <CardTitle>การจัดหมวดหมู่</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3">
                                <Label htmlFor="category">หมวดหมู่</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger id="category">
                                        <SelectValue placeholder="เลือกหมวดหมู่" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="เพิ่มหมวดหมู่ใหม่"
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                    />
                                    <Button variant="outline" size="icon" onClick={handleAddNewCategory}>
                                        <PlusCircle className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tags Section */}
                <Card className="rounded-xl border-purple-200">
                    <CardHeader className="bg-purple-50/50">
                        <CardTitle className="flex items-center gap-2">
                            <Tag className="h-5 w-5" />
                            แท็กบทความ
                        </CardTitle>
                        <CardDescription>
                            เพิ่มแท็กเพื่อช่วยในการค้นหาและจัดกลุ่มบทความ
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="grid gap-3">
                            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-lg bg-muted/30">
                                {tags.length === 0 && (
                                    <span className="text-muted-foreground text-sm">ยังไม่มีแท็ก</span>
                                )}
                                {tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(tag)}
                                            className="ml-1 hover:text-destructive"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="พิมพ์แท็กแล้วกด Enter หรือคลิกปุ่มเพิ่ม"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyDown={handleTagKeyDown}
                                />
                                <Button variant="outline" size="icon" onClick={handleAddTag} type="button">
                                    <PlusCircle className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* CTA Section */}
                <Card className="rounded-xl border-green-200">
                    <CardHeader className="bg-green-50/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>🎯 Call to Action (CTA)</CardTitle>
                                <CardDescription>
                                    เพิ่มปุ่มหรือลิงก์ในบทความเพื่อกระตุ้นให้ผู้อ่านทำกิจกรรม
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="cta-toggle" className="text-sm">เปิดใช้งาน</Label>
                                <Switch
                                    id="cta-toggle"
                                    checked={ctaEnabled}
                                    onCheckedChange={setCtaEnabled}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    {ctaEnabled && (
                        <CardContent className="pt-4">
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="cta-text">ข้อความปุ่ม</Label>
                                    <Input
                                        id="cta-text"
                                        value={ctaText}
                                        onChange={(e) => setCtaText(e.target.value)}
                                        placeholder="เช่น ปรึกษาทนายความฟรี, ดูบริการเพิ่มเติม"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="cta-url">ลิงก์ปลายทาง (URL)</Label>
                                    <Input
                                        id="cta-url"
                                        value={ctaUrl}
                                        onChange={(e) => setCtaUrl(e.target.value)}
                                        placeholder="เช่น /lawyers, /services/contracts, https://..."
                                    />
                                </div>
                                <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
                                    <Info className="h-4 w-4 !text-green-600" />
                                    <AlertDescription>
                                        ปุ่ม CTA จะแสดงที่ท้ายบทความ
                                    </AlertDescription>
                                </Alert>
                            </div>
                        </CardContent>
                    )}
                </Card>

                <div className="flex items-center justify-end gap-2 md:hidden">
                    <Link href="/content">
                        <Button variant="outline" size="sm" disabled={isSaving}>
                            ยกเลิก
                        </Button>
                    </Link>
                    <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกบทความ'}
                    </Button>
                </div>
            </div>
        </main>
    )
}
