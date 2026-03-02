
'use client'

import * as React from 'react'
import {
    ChevronLeft,
    Upload,
    Info,
    PlusCircle,
    Languages,
    Sparkles,
    Loader2,
    X,
    Tag
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useParams, useRouter } from 'next/navigation'
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
import { getArticleById } from '@/lib/data'
import type { Article } from '@/lib/types'
import { useFirebase } from '@/firebase'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { errorEmitter, FirestorePermissionError } from '@/firebase'
import Image from 'next/image'
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/constants'
import { compressImageToBase64 } from '@/lib/image-utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { translateToMultipleLanguages } from '@/app/actions/translate';

export default function AdminArticleEditPage() {
    const router = useRouter()
    const params = useParams()
    const { id } = params
    const { toast } = useToast()
    const { firestore } = useFirebase();

    const [article, setArticle] = React.useState<Article | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [categories, setCategories] = React.useState(['กฎหมายแรงงาน', 'กฎหมายธุรกิจ', 'ทรัพย์สินทางปัญญา', 'คดีฉ้อโกง', 'กฎหมายแพ่ง']);
    const [newCategory, setNewCategory] = React.useState('');
    const [imageFile, setImageFile] = React.useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Translation States
    const [isTranslating, setIsTranslating] = React.useState<string | null>(null); // 'en' or 'zh' or null

    // Tags state
    const [tags, setTags] = React.useState<string[]>([]);
    const [newTag, setNewTag] = React.useState('');

    // CTA State
    const [ctaEnabled, setCtaEnabled] = React.useState(false);
    const [ctaText, setCtaText] = React.useState('');
    const [ctaUrl, setCtaUrl] = React.useState('');

    React.useEffect(() => {
        if (!firestore || !id) return;
        setIsLoading(true);
        getArticleById(firestore, id as string).then(foundArticle => {
            if (foundArticle) {
                setArticle(foundArticle);
                // Load existing tags
                if (foundArticle.tags && Array.isArray(foundArticle.tags)) {
                    setTags(foundArticle.tags);
                }
                // Load existing CTA
                if (foundArticle.cta) {
                    setCtaEnabled(foundArticle.cta.enabled);
                    setCtaText(foundArticle.cta.text || '');
                    setCtaUrl(foundArticle.cta.url || '');
                }
            }
            setIsLoading(false);
        });
    }, [id, firestore]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!article) return;
        const { id, value } = e.target;

        if (id === 'title') {
            const newSlug = value.toString()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '-')
                .replace(/[^\w-]+/g, '')
                .replace(/--+/g, '-');
            setArticle({ ...article, title: value, slug: newSlug });
        } else {
            setArticle({ ...article, [id]: value });
        }
    };

    const handleTranslationChange = (lang: 'en' | 'zh', field: 'title' | 'description' | 'content', value: string) => {
        if (!article) return;
        setArticle({
            ...article,
            translations: {
                ...article.translations,
                [lang]: {
                    ...article.translations?.[lang],
                    [field]: value
                }
            }
        });
    };

    const handleAiTranslate = async (targetLang: 'en' | 'zh') => {
        if (!article) return;
        setIsTranslating(targetLang);
        try {
            // Translate title, description, content
            const [titleResult, descResult, contentResult] = await Promise.all([
                translateToMultipleLanguages(article.title),
                translateToMultipleLanguages(article.description),
                translateToMultipleLanguages(article.content)
            ]);

            const translatedData = {
                title: targetLang === 'en' ? titleResult.english : titleResult.chinese,
                description: targetLang === 'en' ? descResult.english : descResult.chinese,
                content: targetLang === 'en' ? contentResult.english : contentResult.chinese,
            };

            setArticle({
                ...article,
                translations: {
                    ...article.translations,
                    [targetLang]: translatedData
                }
            });

            toast({
                title: "แปลภาษาสำเร็จ",
                description: `แปลเป็นภาษา${targetLang === 'en' ? 'อังกฤษ' : 'จีน'}เรียบร้อยแล้ว`,
            });

        } catch (error) {
            console.error("Translation error:", error);
            toast({
                variant: "destructive",
                title: "การแปลล้มเหลว",
                description: "ไม่สามารถแปลภาษาได้ กรุณาลองใหม่อีกครั้ง"
            });
        } finally {
            setIsTranslating(null);
        }
    };

    const handleSelectChange = (value: string) => {
        if (!article) return;
        setArticle({ ...article, category: value });
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > MAX_FILE_SIZE_BYTES) {
                toast({
                    variant: "destructive",
                    title: "ไฟล์มีขนาดใหญ่เกินไป",
                    description: `กรุณาอัปโหลดไฟล์ขนาดไม่เกิน ${MAX_FILE_SIZE_MB}MB`,
                });
                e.target.value = ''; // Reset input
                return;
            }
            setImageFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleSaveChanges = async () => {
        if (!firestore || !article) return;
        setIsSaving(true);

        try {
            let finalImageUrl = article.imageUrl;

            if (imageFile) {
                try {
                    finalImageUrl = await compressImageToBase64(imageFile);
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

            const articleRef = doc(firestore, 'articles', article.id);
            const updatedData = {
                title: article.title || '',
                slug: article.slug || '',
                description: article.description || '',
                content: article.content || '',
                category: article.category || '',
                authorName: article.authorName || 'ทีมงาน Lawslane',
                imageUrl: finalImageUrl || '',
                translations: article.translations || {},
                tags: tags,
                cta: ctaEnabled ? {
                    enabled: true,
                    text: ctaText,
                    url: ctaUrl,
                } : null,
            };

            await updateDoc(articleRef, updatedData);

            toast({
                title: "แก้ไขบทความสำเร็จ",
                description: `บทความ "${article.title}" ได้รับการอัปเดตแล้ว`,
            });
            router.push('/admin/content');

        } catch (error: any) {
            console.error("Error updating article:", error);
            if (error.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: `articles/${article.id}`,
                    operation: 'update',
                    requestResourceData: { title: article.title }, // Simplified
                });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                toast({
                    variant: "destructive",
                    title: "เกิดข้อผิดพลาด",
                    description: error.message || "ไม่สามารถบันทึกการเปลี่ยนแปลงได้",
                });
            }
        } finally {
            setIsSaving(false);
        }
    }

    const handleAddNewCategory = () => {
        if (newCategory && !categories.includes(newCategory)) {
            setCategories(prev => [...prev, newCategory]);
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

    if (isLoading || !article) {
        return <div>กำลังโหลด...</div>
    }


    return (
        <main className="flex-1 p-4 sm:px-6 sm:py-0 md:p-8">
            <div className="mx-auto grid max-w-5xl flex-1 auto-rows-max gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/content">
                        <Button variant="outline" size="icon" className="h-7 w-7" disabled={isSaving}>
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">กลับ</span>
                        </Button>
                    </Link>
                    <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                        แก้ไขบทความ
                    </h1>
                    <div className="hidden items-center gap-2 md:ml-auto md:flex">
                        <Link href="/admin/content">
                            <Button variant="outline" size="sm" disabled={isSaving}>
                                ยกเลิก
                            </Button>
                        </Link>
                        <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                        </Button>
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
                    <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
                        <Card className="rounded-xl">
                            <CardHeader>
                                <CardTitle>เนื้อหาบทความ</CardTitle>
                                <CardDescription>
                                    จัดการเนื้อหาบทความและคำแปลภาษาต่างๆ
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="th" className="w-full">
                                    <TabsList className="grid w-full grid-cols-3 mb-4">
                                        <TabsTrigger value="th">🇹🇭 ภาษาไทย (หลัก)</TabsTrigger>
                                        <TabsTrigger value="en">🇺🇸 English</TabsTrigger>
                                        <TabsTrigger value="zh">🇨🇳 中文</TabsTrigger>
                                    </TabsList>

                                    {/* Thai Content (Default) */}
                                    <TabsContent value="th" className="space-y-4">
                                        <div className="grid gap-3">
                                            <Label htmlFor="title">หัวข้อบทความ (TH)</Label>
                                            <Input
                                                id="title"
                                                type="text"
                                                className="w-full"
                                                value={article.title}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="grid gap-3">
                                            <Label htmlFor="description">คำอธิบายย่อ (TH)</Label>
                                            <Textarea
                                                id="description"
                                                value={article.description}
                                                onChange={handleInputChange}
                                                rows={3}
                                            />
                                        </div>
                                        <div className="grid gap-3">
                                            <Label htmlFor="content">เนื้อหาบทความ (TH)</Label>
                                            <Textarea
                                                id="content"
                                                value={article.content}
                                                onChange={handleInputChange}
                                                rows={15}
                                            />
                                        </div>
                                    </TabsContent>

                                    {/* English Content */}
                                    <TabsContent value="en" className="space-y-4">
                                        <div className="flex justify-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAiTranslate('en')}
                                                disabled={isTranslating === 'en'}
                                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                            >
                                                {isTranslating === 'en' ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Sparkles className="mr-2 h-4 w-4" />
                                                )}
                                                Translate with AI
                                            </Button>
                                        </div>
                                        <div className="grid gap-3">
                                            <Label htmlFor="title-en">Title (EN)</Label>
                                            <Input
                                                id="title-en"
                                                type="text"
                                                className="w-full"
                                                value={article.translations?.en?.title || ''}
                                                onChange={(e) => handleTranslationChange('en', 'title', e.target.value)}
                                                placeholder="English Title"
                                            />
                                        </div>
                                        <div className="grid gap-3">
                                            <Label htmlFor="description-en">Description (EN)</Label>
                                            <Textarea
                                                id="description-en"
                                                value={article.translations?.en?.description || ''}
                                                onChange={(e) => handleTranslationChange('en', 'description', e.target.value)}
                                                rows={3}
                                                placeholder="English Description"
                                            />
                                        </div>
                                        <div className="grid gap-3">
                                            <Label htmlFor="content-en">Content (EN)</Label>
                                            <Textarea
                                                id="content-en"
                                                value={article.translations?.en?.content || ''}
                                                onChange={(e) => handleTranslationChange('en', 'content', e.target.value)}
                                                rows={15}
                                                placeholder="English Content"
                                            />
                                        </div>
                                    </TabsContent>

                                    {/* Chinese Content */}
                                    <TabsContent value="zh" className="space-y-4">
                                        <div className="flex justify-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAiTranslate('zh')}
                                                disabled={isTranslating === 'zh'}
                                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                            >
                                                {isTranslating === 'zh' ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Sparkles className="mr-2 h-4 w-4" />
                                                )}
                                                Translate with AI
                                            </Button>
                                        </div>
                                        <div className="grid gap-3">
                                            <Label htmlFor="title-zh">Title (ZH)</Label>
                                            <Input
                                                id="title-zh"
                                                type="text"
                                                className="w-full"
                                                value={article.translations?.zh?.title || ''}
                                                onChange={(e) => handleTranslationChange('zh', 'title', e.target.value)}
                                                placeholder="Chinese Title"
                                            />
                                        </div>
                                        <div className="grid gap-3">
                                            <Label htmlFor="description-zh">Description (ZH)</Label>
                                            <Textarea
                                                id="description-zh"
                                                value={article.translations?.zh?.description || ''}
                                                onChange={(e) => handleTranslationChange('zh', 'description', e.target.value)}
                                                rows={3}
                                                placeholder="Chinese Description"
                                            />
                                        </div>
                                        <div className="grid gap-3">
                                            <Label htmlFor="content-zh">Content (ZH)</Label>
                                            <Textarea
                                                id="content-zh"
                                                value={article.translations?.zh?.content || ''}
                                                onChange={(e) => handleTranslationChange('zh', 'content', e.target.value)}
                                                rows={15}
                                                placeholder="Chinese Content"
                                            />
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>

                        <Card className="rounded-xl">
                            <CardHeader>
                                <CardTitle>รูปภาพหน้าปก</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-3">
                                    <div className="flex items-center gap-4">
                                        <Image
                                            alt={article.title}
                                            className="aspect-video w-48 rounded-md object-contain bg-white p-1 border"
                                            height="90"
                                            src={previewUrl || article.imageUrl}
                                            width="160"
                                        />
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
                                            เปลี่ยนรูป
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-xl">
                            <CardHeader>
                                <CardTitle>Search Engine Optimization (SEO)</CardTitle>
                                <CardDescription>
                                    ปรับแต่งการแสดงผลบนหน้าการค้นหาของ Google
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-6">
                                <div className="grid gap-3">
                                    <Label htmlFor="slug">Slug (URL Path)</Label>
                                    <Input
                                        id="slug"
                                        type="text"
                                        value={article.slug}
                                        onChange={handleInputChange}
                                    />
                                    <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
                                        <Info className="h-4 w-4 !text-blue-600" />
                                        <AlertDescription>
                                            Slug จะถูกสร้างจากหัวข้อโดยอัตโนมัติ แต่สามารถแก้ไขได้ ควรใช้ภาษาอังกฤษและคั่นด้วย -
                                        </AlertDescription>
                                    </Alert>
                                </div>
                                <div className="grid gap-3">
                                    <Label htmlFor="meta-title">Meta Title</Label>
                                    <Input
                                        id="meta-title"
                                        type="text"
                                        defaultValue={article.title}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="grid auto-rows-max items-start gap-4 lg:gap-8">
                        <Card className="rounded-xl">
                            <CardHeader>
                                <CardTitle>การจัดหมวดหมู่</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-6">
                                    <div className="grid gap-3">
                                        <Label htmlFor="category">หมวดหมู่</Label>
                                        <Select value={article.category} onValueChange={handleSelectChange}>
                                            <SelectTrigger id="category">
                                                <SelectValue placeholder="เลือกหมวดหมู่" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map(cat => (
                                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="new-category">เพิ่มหมวดหมู่ใหม่</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="new-category"
                                                placeholder="เช่น กฎหมายครอบครัว"
                                                value={newCategory}
                                                onChange={(e) => setNewCategory(e.target.value)}
                                            />
                                            <Button variant="outline" size="icon" onClick={handleAddNewCategory}>
                                                <PlusCircle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tags Section */}
                        <Card className="rounded-xl border-purple-200">
                            <CardHeader className="bg-purple-50/50">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Tag className="h-4 w-4" />
                                    แท็กบทความ
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="grid gap-3">
                                    <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-lg bg-muted/30">
                                        {tags.length === 0 && (
                                            <span className="text-muted-foreground text-sm">ยังไม่มีแท็ก</span>
                                        )}
                                        {tags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="flex items-center gap-1 px-2 py-1 text-xs">
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
                                            placeholder="พิมพ์แท็ก..."
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            onKeyDown={handleTagKeyDown}
                                            className="text-sm"
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
                                    <div className="space-y-1">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            🎯 Call to Action
                                        </CardTitle>
                                    </div>
                                    <Switch
                                        checked={ctaEnabled}
                                        onCheckedChange={setCtaEnabled}
                                    />
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
                                                placeholder="เช่น ปรึกษาทนายความฟรี"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="cta-url">ลิงก์ปลายทาง (URL)</Label>
                                            <Input
                                                id="cta-url"
                                                value={ctaUrl}
                                                onChange={(e) => setCtaUrl(e.target.value)}
                                                placeholder="/lawyers"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 md:hidden">
                    <Link href="/admin/content">
                        <Button variant="outline" size="sm" disabled={isSaving}>
                            ยกเลิก
                        </Button>
                    </Link>
                    <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                    </Button>
                </div>
            </div>
        </main>
    )
}

