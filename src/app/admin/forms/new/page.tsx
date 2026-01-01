'use client'

import * as React from 'react'
import {
    ChevronLeft,
    Upload,
    X,
    FileText,
    Paperclip,
    Languages,
    Loader2
} from 'lucide-react'
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
import { useFirebase } from '@/firebase'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { uploadToR2 } from '@/app/actions/upload-r2';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/constants';
import type { LegalFormAttachment } from '@/lib/types';
import { translateToMultipleLanguages } from '@/app/actions/translate';

const CATEGORIES = [
    "สัญญาธุรกิจ",
    "สัญญาจ้างงาน",
    "อสังหาริมทรัพย์",
    "ครอบครัวและมรดก",
    "หนังสือมอบอำนาจ",
    "อื่นๆ"
];

type LanguageCode = 'th' | 'en' | 'zh';

interface LanguageFileSection {
    code: LanguageCode;
    label: string;
    flag: string;
    required: boolean;
}

const LANGUAGE_SECTIONS: LanguageFileSection[] = [
    { code: 'th', label: 'ภาษาไทย', flag: '🇹🇭', required: true },
    { code: 'en', label: 'English', flag: '🇬🇧', required: false },
    { code: 'zh', label: '中文', flag: '🇨🇳', required: false },
];

export default function AdminFormCreatePage() {
    const router = useRouter()
    const { toast } = useToast()
    const { firestore } = useFirebase();

    const [titleTh, setTitleTh] = React.useState('');
    const [titleEn, setTitleEn] = React.useState('');
    const [titleZh, setTitleZh] = React.useState('');
    const [descriptionTh, setDescriptionTh] = React.useState('');
    const [descriptionEn, setDescriptionEn] = React.useState('');
    const [descriptionZh, setDescriptionZh] = React.useState('');
    const [category, setCategory] = React.useState('');
    const [isCustomCategory, setIsCustomCategory] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isTranslatingTitle, setIsTranslatingTitle] = React.useState(false);
    const [isTranslatingDesc, setIsTranslatingDesc] = React.useState(false);

    const handleTranslateTitle = async () => {
        if (!titleTh.trim()) {
            toast({ variant: "destructive", title: "กรุณากรอกชื่อภาษาไทยก่อน" });
            return;
        }
        setIsTranslatingTitle(true);
        try {
            const result = await translateToMultipleLanguages(titleTh);
            setTitleEn(result.english);
            setTitleZh(result.chinese);
            toast({ title: "แปลสำเร็จ", description: "แปลชื่อเป็น EN/ZH แล้ว" });
        } catch {
            toast({ variant: "destructive", title: "แปลไม่สำเร็จ" });
        } finally {
            setIsTranslatingTitle(false);
        }
    };

    const handleTranslateDesc = async () => {
        if (!descriptionTh.trim()) {
            toast({ variant: "destructive", title: "กรุณากรอกรายละเอียดภาษาไทยก่อน" });
            return;
        }
        setIsTranslatingDesc(true);
        try {
            const result = await translateToMultipleLanguages(descriptionTh);
            setDescriptionEn(result.english);
            setDescriptionZh(result.chinese);
            toast({ title: "แปลสำเร็จ", description: "แปลรายละเอียดเป็น EN/ZH แล้ว" });
        } catch {
            toast({ variant: "destructive", title: "แปลไม่สำเร็จ" });
        } finally {
            setIsTranslatingDesc(false);
        }
    };

    // Files per language
    const [filesByLanguage, setFilesByLanguage] = React.useState<Record<LanguageCode, File[]>>({
        th: [],
        en: [],
        zh: [],
    });
    const fileInputRefs = React.useRef<Record<LanguageCode, HTMLInputElement | null>>({
        th: null,
        en: null,
        zh: null,
    });
    const adminFormsPath = `/admin/forms`;

    const handleFileChange = (lang: LanguageCode, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            const validFiles = files.filter(file => {
                if (file.size > MAX_FILE_SIZE_BYTES) {
                    toast({
                        variant: "destructive",
                        title: "ไฟล์มีขนาดใหญ่เกินไป",
                        description: `ไฟล์ ${file.name} มีขนาดเกิน ${MAX_FILE_SIZE_MB}MB`,
                    });
                    return false;
                }
                return true;
            });

            setFilesByLanguage(prev => ({
                ...prev,
                [lang]: [...prev[lang], ...validFiles]
            }));
        }
        // Reset input so the same file can be selected again if needed
        const ref = fileInputRefs.current[lang];
        if (ref) {
            ref.value = '';
        }
    };

    const removeFile = (lang: LanguageCode, index: number) => {
        setFilesByLanguage(prev => ({
            ...prev,
            [lang]: prev[lang].filter((_, i) => i !== index)
        }));
    };

    const getFileType = (fileName: string): 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(ext || '')) {
            return ext as any;
        }
        return 'pdf'; // Default fallback
    };

    const handleSaveChanges = async () => {
        if (!firestore) return;

        if (!titleTh || !category) {
            toast({
                variant: "destructive",
                title: "กรุณากรอกข้อมูล",
                description: "กรุณาระบุชื่อเอกสาร (ภาษาไทย) และหมวดหมู่",
            });
            return;
        }

        // Thai files are required
        if (filesByLanguage.th.length === 0) {
            toast({
                variant: "destructive",
                title: "กรุณาเลือกไฟล์ภาษาไทย",
                description: "ต้องมีไฟล์ภาษาไทยอย่างน้อย 1 ไฟล์",
            });
            return;
        }

        setIsSaving(true);

        try {
            const attachments: LegalFormAttachment[] = [];

            // Upload files for each language
            for (const langSection of LANGUAGE_SECTIONS) {
                const files = filesByLanguage[langSection.code];
                for (const file of files) {
                    const formData = new FormData();
                    formData.append('file', file);

                    toast({
                        title: `กำลังอัปโหลด ${file.name} (${langSection.flag})...`,
                    });

                    const url = await uploadToR2(formData, 'forms');
                    attachments.push({
                        url,
                        name: file.name,
                        type: getFileType(file.name),
                        language: langSection.code,
                    });
                }
            }

            const newForm = {
                title: titleTh, // Primary fallback
                titleTh,
                titleEn: titleEn || undefined,
                titleZh: titleZh || undefined,
                description: descriptionTh, // Primary fallback
                descriptionTh,
                descriptionEn: descriptionEn || undefined,
                descriptionZh: descriptionZh || undefined,
                category,
                attachments,
                downloads: 0,
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(firestore, 'legalForms'), newForm);

            toast({
                title: "สร้างแบบฟอร์มสำเร็จ",
                description: `แบบฟอร์ม "${titleTh}" พร้อมไฟล์ ${attachments.length} ไฟล์ ได้ถูกเพิ่มแล้ว`,
            });
            router.push(adminFormsPath);

        } catch (error: any) {
            console.error("Error creating form:", error);
            toast({
                variant: "destructive",
                title: "เกิดข้อผิดพลาด",
                description: error.message,
            });
        } finally {
            setIsSaving(false);
        }
    }

    const renderLanguageSection = (langSection: LanguageFileSection) => {
        const files = filesByLanguage[langSection.code];

        return (
            <div key={langSection.code} className="border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{langSection.flag}</span>
                    <Label className="font-semibold">
                        {langSection.label}
                        {langSection.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {!langSection.required && (
                        <span className="text-xs text-slate-400">(ไม่บังคับ)</span>
                    )}
                </div>

                {/* File List */}
                {files.length > 0 && (
                    <div className="space-y-2">
                        {files.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="bg-white p-2 rounded border border-slate-100">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{file.name}</p>
                                        <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-red-500"
                                    onClick={() => removeFile(langSection.code, index)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add File Button */}
                <div>
                    <Input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                        className="hidden"
                        ref={(el) => { fileInputRefs.current[langSection.code] = el; }}
                        onChange={(e) => handleFileChange(langSection.code, e)}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRefs.current[langSection.code]?.click()}
                        className="border-dashed"
                    >
                        <Paperclip className="h-4 w-4 mr-2" />
                        เพิ่มไฟล์ {langSection.label}
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <main className="flex-1 p-4 sm:px-6 sm:py-0 md:p-8">
            <div className="mx-auto grid max-w-2xl flex-1 auto-rows-max gap-4">
                <div className="flex items-center gap-4">
                    <Link href={adminFormsPath}>
                        <Button variant="outline" size="icon" className="h-7 w-7" disabled={isSaving}>
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">กลับ</span>
                        </Button>
                    </Link>
                    <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                        เพิ่มแบบฟอร์มใหม่
                    </h1>
                    <div className="hidden items-center gap-2 md:ml-auto md:flex">
                        <Link href={adminFormsPath}>
                            <Button variant="outline" size="sm" disabled={isSaving}>
                                ยกเลิก
                            </Button>
                        </Link>
                        <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </Button>
                    </div>
                </div>
                <Card className="rounded-xl">
                    <CardHeader>
                        <CardTitle>ข้อมูลแบบฟอร์ม</CardTitle>
                        <CardDescription>
                            กรอกรายละเอียดและอัปโหลดไฟล์เอกสารแยกตามภาษา
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6">
                            <div className="grid gap-3">
                                <div className="flex items-center justify-between">
                                    <Label>ชื่อเอกสาร (แยกตามภาษา)</Label>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleTranslateTitle}
                                        disabled={isTranslatingTitle || !titleTh.trim()}
                                    >
                                        {isTranslatingTitle ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Languages className="h-4 w-4 mr-2" />}
                                        แปลอัตโนมัติ
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🇹🇭</span>
                                        <Input
                                            placeholder="ชื่อภาษาไทย *"
                                            value={titleTh}
                                            onChange={(e) => setTitleTh(e.target.value)}
                                            className="flex-1"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🇬🇧</span>
                                        <Input
                                            placeholder="English Title (optional)"
                                            value={titleEn}
                                            onChange={(e) => setTitleEn(e.target.value)}
                                            className="flex-1"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🇨🇳</span>
                                        <Input
                                            placeholder="中文标题 (选填)"
                                            value={titleZh}
                                            onChange={(e) => setTitleZh(e.target.value)}
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-3">
                                <Label htmlFor="category">หมวดหมู่ <span className="text-red-500">*</span></Label>
                                <div className="space-y-2">
                                    <Select
                                        value={isCustomCategory ? 'custom' : (CATEGORIES.includes(category) ? category : '')}
                                        onValueChange={(val) => {
                                            if (val === 'custom') {
                                                setIsCustomCategory(true);
                                                setCategory('');
                                            } else {
                                                setIsCustomCategory(false);
                                                setCategory(val);
                                            }
                                        }}
                                    >
                                        <SelectTrigger id="category">
                                            <SelectValue placeholder="เลือกหมวดหมู่" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.filter(c => c !== "อื่นๆ").map(cat => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                            <SelectItem value="custom">อื่นๆ (ระบุเอง)</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {isCustomCategory && (
                                        <Input
                                            placeholder="ระบุหมวดหมู่..."
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            className="mt-2"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-3">
                                <div className="flex items-center justify-between">
                                    <Label>รายละเอียด (แยกตามภาษา)</Label>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleTranslateDesc}
                                        disabled={isTranslatingDesc || !descriptionTh.trim()}
                                    >
                                        {isTranslatingDesc ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Languages className="h-4 w-4 mr-2" />}
                                        แปลอัตโนมัติ
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">🇹🇭</span>
                                            <span className="text-sm text-slate-500">ภาษาไทย</span>
                                        </div>
                                        <Textarea
                                            placeholder="คำอธิบายภาษาไทย (ถ้ามี)"
                                            value={descriptionTh}
                                            onChange={(e) => setDescriptionTh(e.target.value)}
                                            rows={2}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">🇬🇧</span>
                                            <span className="text-sm text-slate-500">English</span>
                                        </div>
                                        <Textarea
                                            placeholder="English description (optional)"
                                            value={descriptionEn}
                                            onChange={(e) => setDescriptionEn(e.target.value)}
                                            rows={2}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">🇨🇳</span>
                                            <span className="text-sm text-slate-500">中文</span>
                                        </div>
                                        <Textarea
                                            placeholder="中文描述 (选填)"
                                            value={descriptionZh}
                                            onChange={(e) => setDescriptionZh(e.target.value)}
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-3">
                                <Label>ไฟล์เอกสารแยกตามภาษา</Label>
                                <div className="space-y-4">
                                    {LANGUAGE_SECTIONS.map(renderLanguageSection)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    รองรับไฟล์ PDF, Word, Excel ขนาดไม่เกิน 5MB ต่อไฟล์
                                </p>
                            </div>

                        </div>
                    </CardContent>
                </Card>
                <div className="flex items-center justify-end gap-2 md:hidden">
                    <Link href={adminFormsPath}>
                        <Button variant="outline" size="sm" disabled={isSaving}>
                            ยกเลิก
                        </Button>
                    </Link>
                    <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                    </Button>
                </div>
            </div>
        </main>
    )
}
