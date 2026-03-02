'use client'

import * as React from 'react'
import {
    ChevronLeft,
    Upload,
    X,
    FileText,
    Paperclip,
    Trash2,
    Languages,
    Loader2
} from 'lucide-react'
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
import { useFirebase } from '@/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { getLegalFormById } from '@/lib/data'
import { uploadToR2 } from '@/app/actions/upload-r2';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/constants';
import type { LegalForm, LegalFormAttachment } from '@/lib/types';
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

export default function AdminFormEditPage() {
    const params = useParams()
    const router = useRouter()
    const { id } = params
    const { toast } = useToast()
    const { firestore } = useFirebase();

    const [form, setForm] = React.useState<LegalForm | null>(null);
    const [isCustomCategory, setIsCustomCategory] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isTranslatingTitle, setIsTranslatingTitle] = React.useState(false);
    const [isTranslatingDesc, setIsTranslatingDesc] = React.useState(false);

    const handleTranslateTitle = async () => {
        if (!form) return;
        const titleTh = form.titleTh || form.title;
        if (!titleTh?.trim()) {
            toast({ variant: "destructive", title: "กรุณากรอกชื่อภาษาไทยก่อน" });
            return;
        }
        setIsTranslatingTitle(true);
        try {
            const result = await translateToMultipleLanguages(titleTh);
            setForm({ ...form, titleEn: result.english, titleZh: result.chinese });
            toast({ title: "แปลสำเร็จ", description: "แปลชื่อเป็น EN/ZH แล้ว" });
        } catch {
            toast({ variant: "destructive", title: "แปลไม่สำเร็จ" });
        } finally {
            setIsTranslatingTitle(false);
        }
    };

    const handleTranslateDesc = async () => {
        if (!form) return;
        const descTh = form.descriptionTh || form.description;
        if (!descTh?.trim()) {
            toast({ variant: "destructive", title: "กรุณากรอกรายละเอียดภาษาไทยก่อน" });
            return;
        }
        setIsTranslatingDesc(true);
        try {
            const result = await translateToMultipleLanguages(descTh);
            setForm({ ...form, descriptionEn: result.english, descriptionZh: result.chinese });
            toast({ title: "แปลสำเร็จ", description: "แปลรายละเอียดเป็น EN/ZH แล้ว" });
        } catch {
            toast({ variant: "destructive", title: "แปลไม่สำเร็จ" });
        } finally {
            setIsTranslatingDesc(false);
        }
    };

    // Existing attachments per language
    const [attachmentsByLanguage, setAttachmentsByLanguage] = React.useState<Record<LanguageCode, LegalFormAttachment[]>>({
        th: [],
        en: [],
        zh: [],
    });

    // New files per language
    const [newFilesByLanguage, setNewFilesByLanguage] = React.useState<Record<LanguageCode, File[]>>({
        th: [],
        en: [],
        zh: [],
    });

    const fileInputRefs = React.useRef<Record<LanguageCode, HTMLInputElement | null>>({
        th: null,
        en: null,
        zh: null,
    });
    const adminFormsPath = `/forms`;

    React.useEffect(() => {
        if (!firestore || !id) return;
        getLegalFormById(firestore, id as string).then(data => {
            if (data) {
                setForm(data);

                // Check if category is custom
                if (data.category && !CATEGORIES.includes(data.category)) {
                    setIsCustomCategory(true);
                }

                // Group existing attachments by language
                const grouped: Record<LanguageCode, LegalFormAttachment[]> = {
                    th: [],
                    en: [],
                    zh: [],
                };

                if (data.attachments && data.attachments.length > 0) {
                    for (const att of data.attachments) {
                        const lang = att.language || 'th'; // Default to Thai for legacy files
                        if (grouped[lang]) {
                            grouped[lang].push(att);
                        }
                    }
                } else if (data.fileUrl) {
                    // Migrate legacy single file - assume Thai
                    grouped.th.push({
                        url: data.fileUrl,
                        name: data.fileName || 'Document',
                        type: data.fileType || 'pdf',
                        language: 'th',
                    });
                }

                setAttachmentsByLanguage(grouped);
            }
        });
    }, [id, firestore]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!form) return;
        const { id, value } = e.target;
        setForm({ ...form, [id]: value });
    };

    const handleCategoryChange = (value: string) => {
        if (!form) return;
        setForm({ ...form, category: value });
    };

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

            setNewFilesByLanguage(prev => ({
                ...prev,
                [lang]: [...prev[lang], ...validFiles]
            }));
        }
        const ref = fileInputRefs.current[lang];
        if (ref) {
            ref.value = '';
        }
    };

    const removeAttachment = (lang: LanguageCode, index: number) => {
        setAttachmentsByLanguage(prev => ({
            ...prev,
            [lang]: prev[lang].filter((_, i) => i !== index)
        }));
    };

    const removeNewFile = (lang: LanguageCode, index: number) => {
        setNewFilesByLanguage(prev => ({
            ...prev,
            [lang]: prev[lang].filter((_, i) => i !== index)
        }));
    };

    const getFileType = (fileName: string): 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(ext || '')) {
            return ext as any;
        }
        return 'pdf';
    };

    const handleSaveChanges = async () => {
        if (!firestore || !form) return;

        if (!(form.titleTh || form.title) || !form.category) {
            toast({
                variant: "destructive",
                title: "กรุณากรอกข้อมูล",
                description: "กรุณาระบุชื่อเอกสาร (ภาษาไทย) และหมวดหมู่",
            });
            return;
        }

        // Check Thai files (required)
        const totalThaiFiles = attachmentsByLanguage.th.length + newFilesByLanguage.th.length;
        if (totalThaiFiles === 0) {
            toast({
                variant: "destructive",
                title: "กรุณาเลือกไฟล์ภาษาไทย",
                description: "ต้องมีไฟล์ภาษาไทยอย่างน้อย 1 ไฟล์",
            });
            return;
        }

        setIsSaving(true);

        try {
            const finalAttachments: LegalFormAttachment[] = [];

            // Keep existing attachments
            for (const langSection of LANGUAGE_SECTIONS) {
                for (const att of attachmentsByLanguage[langSection.code]) {
                    finalAttachments.push(att);
                }
            }

            // Upload new files
            for (const langSection of LANGUAGE_SECTIONS) {
                const files = newFilesByLanguage[langSection.code];
                for (const file of files) {
                    const formData = new FormData();
                    formData.append('file', file);

                    toast({
                        title: `กำลังอัปโหลด ${file.name} (${langSection.flag})...`,
                    });

                    const url = await uploadToR2(formData, 'forms');
                    finalAttachments.push({
                        url,
                        name: file.name,
                        type: getFileType(file.name),
                        language: langSection.code,
                    });
                }
            }

            const formRef = doc(firestore, 'legalForms', form.id);

            const updatedData: any = {
                title: form.titleTh || form.title,
                titleTh: form.titleTh || form.title,
                titleEn: form.titleEn || null,
                titleZh: form.titleZh || null,
                description: form.descriptionTh || form.description,
                descriptionTh: form.descriptionTh || form.description,
                descriptionEn: form.descriptionEn || null,
                descriptionZh: form.descriptionZh || null,
                category: form.category,
                attachments: finalAttachments,
            };

            // Keep legacy fields in sync with first Thai file
            const thaiFiles = finalAttachments.filter(a => a.language === 'th');
            if (thaiFiles.length > 0) {
                updatedData.fileUrl = thaiFiles[0].url;
                updatedData.fileName = thaiFiles[0].name;
                updatedData.fileType = thaiFiles[0].type;
            }

            await updateDoc(formRef, updatedData);

            toast({
                title: "บันทึกข้อมูลสำเร็จ",
                description: `แบบฟอร์ม "${form.title}" ได้รับการอัปเดตแล้ว`,
            });
            router.push(adminFormsPath);

        } catch (error: any) {
            console.error("Error updating form:", error);
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
        const existingFiles = attachmentsByLanguage[langSection.code];
        const newFiles = newFilesByLanguage[langSection.code];

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

                {/* Existing Attachments */}
                {existingFiles.length > 0 && (
                    <div className="space-y-2">
                        {existingFiles.map((file, index) => (
                            <div key={`existing-${index}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="bg-white p-2 rounded border border-slate-100">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium truncate hover:underline text-blue-700">
                                            {file.name}
                                        </a>
                                        <p className="text-xs text-slate-500 uppercase">{file.type}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-red-500"
                                    onClick={() => removeAttachment(langSection.code, index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {/* New Files */}
                {newFiles.length > 0 && (
                    <div className="space-y-2">
                        {newFiles.map((file, index) => (
                            <div key={`new-${index}`} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="bg-white p-2 rounded border border-green-100">
                                        <FileText className="h-5 w-5 text-green-600" />
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
                                    onClick={() => removeNewFile(langSection.code, index)}
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

    if (!form) {
        return <div>Loading...</div>
    }

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
                        แก้ไขแบบฟอร์ม
                    </h1>
                    <div className="hidden items-center gap-2 md:ml-auto md:flex">
                        <Link href={adminFormsPath}>
                            <Button variant="outline" size="sm" disabled={isSaving}>
                                ยกเลิก
                            </Button>
                        </Link>
                        <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                        </Button>
                    </div>
                </div>
                <Card className="rounded-xl">
                    <CardHeader>
                        <CardTitle>ข้อมูลแบบฟอร์ม</CardTitle>
                        <CardDescription>
                            แก้ไขรายละเอียดและจัดการไฟล์เอกสารแยกตามภาษา
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
                                        disabled={isTranslatingTitle || !(form?.titleTh || form?.title)}
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
                                            value={form.titleTh || form.title || ''}
                                            onChange={(e) => setForm({ ...form, titleTh: e.target.value, title: e.target.value })}
                                            className="flex-1"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🇬🇧</span>
                                        <Input
                                            placeholder="English Title (optional)"
                                            value={form.titleEn || ''}
                                            onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                                            className="flex-1"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🇨🇳</span>
                                        <Input
                                            placeholder="中文标题 (选填)"
                                            value={form.titleZh || ''}
                                            onChange={(e) => setForm({ ...form, titleZh: e.target.value })}
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-3">
                                <Label htmlFor="category">หมวดหมู่ <span className="text-red-500">*</span></Label>
                                <div className="space-y-2">
                                    <Select
                                        value={isCustomCategory ? 'custom' : (CATEGORIES.includes(form.category) ? form.category : '')}
                                        onValueChange={(val) => {
                                            if (val === 'custom') {
                                                setIsCustomCategory(true);
                                                handleCategoryChange('');
                                            } else {
                                                setIsCustomCategory(false);
                                                handleCategoryChange(val);
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
                                            value={form.category}
                                            onChange={(e) => handleCategoryChange(e.target.value)}
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
                                        disabled={isTranslatingDesc || !(form?.descriptionTh || form?.description)}
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
                                            value={form.descriptionTh || form.description || ''}
                                            onChange={(e) => setForm({ ...form, descriptionTh: e.target.value, description: e.target.value })}
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
                                            value={form.descriptionEn || ''}
                                            onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
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
                                            value={form.descriptionZh || ''}
                                            onChange={(e) => setForm({ ...form, descriptionZh: e.target.value })}
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
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                    </Button>
                </div>
            </div>
        </main>
    )
}
