'use client';

import * as React from 'react';
import Link from 'next/link';
import {
    FileText,
    Search,
    Download,
    Lock,
    File,
    Filter,
    ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFirebase, useUser } from '@/firebase';
import { getAllLegalForms, incrementFormDownloads } from '@/lib/data';
import type { LegalForm, LegalFormAttachment } from '@/lib/types';
import { format } from 'date-fns';
import { th, enUS, zhCN } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { SidebarAds } from '@/components/sidebar-ads';
import { RecommendedArticles } from '@/components/recommended-articles';
import { useTranslations, useLocale } from 'next-intl';

// Category mapping keys
const CATEGORY_KEYS: Record<string, string> = {
    "สัญญาธุรกิจ": "businessContract",
    "สัญญาจ้างงาน": "employmentContract",
    "อสังหาริมทรัพย์": "realEstate",
    "ครอบครัวและมรดก": "familyInheritance",
    "หนังสือมอบอำนาจ": "powerOfAttorney",
};

const STATIC_CATEGORIES = [
    "สัญญาธุรกิจ",
    "สัญญาจ้างงาน",
    "อสังหาริมทรัพย์",
    "ครอบครัวและมรดก",
    "หนังสือมอบอำนาจ",
];

export default function FormsPage() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const t = useTranslations('LegalForms');
    const locale = useLocale();

    const [forms, setForms] = React.useState<LegalForm[]>([]);
    const [filteredForms, setFilteredForms] = React.useState<LegalForm[]>([]);
    const [categories, setCategories] = React.useState<string[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedCategory, setSelectedCategory] = React.useState('all'); // Use 'all' as key

    // Download Limit State
    const [showLoginDialog, setShowLoginDialog] = React.useState(false);
    const [guestDownloads, setGuestDownloads] = React.useState(0);

    React.useEffect(() => {
        // Load guest downloads from localStorage
        const stored = localStorage.getItem('guest_downloads');
        if (stored) {
            setGuestDownloads(parseInt(stored, 10));
        }
    }, []);

    React.useEffect(() => {
        if (!firestore) return;
        const fetchForms = async () => {
            setIsLoading(true);
            try {
                const data = await getAllLegalForms(firestore);
                // Normalize attachments for legacy data and ensure language field exists
                const normalizedData = data.map(f => {
                    // Add language field to all attachments if missing (legacy data)
                    const normalizedAttachments = (f.attachments || []).map(att => ({
                        ...att,
                        language: att.language || 'th' as const, // Default to Thai for legacy
                    }));

                    if (normalizedAttachments.length === 0 && f.fileUrl) {
                        // Create attachment from legacy single file
                        return {
                            ...f,
                            attachments: [{
                                url: f.fileUrl,
                                name: f.fileName || 'Document',
                                type: (f.fileType || 'pdf') as 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx',
                                language: 'th' as const,
                            }]
                        };
                    }

                    return {
                        ...f,
                        attachments: normalizedAttachments,
                    };
                });
                setForms(normalizedData);
                setFilteredForms(normalizedData);

                // Extract unique categories
                const uniqueCategories = Array.from(new Set(normalizedData.map(f => f.category))).filter(Boolean);
                // Merge with static categories and sort
                const allCategories = Array.from(new Set([...STATIC_CATEGORIES, ...uniqueCategories])).sort();
                setCategories(['all', ...allCategories]);
            } catch (error) {
                console.error("Error fetching forms:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchForms();
    }, [firestore]);

    React.useEffect(() => {
        let result = forms;

        if (selectedCategory !== 'all') {
            result = result.filter(f => f.category === selectedCategory);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(f =>
                f.title.toLowerCase().includes(query) ||
                f.description.toLowerCase().includes(query)
            );
        }

        setFilteredForms(result);
    }, [searchQuery, selectedCategory, forms]);

    const handleDownload = async (form: LegalForm, attachment: LegalFormAttachment) => {
        if (!user) {
            if (guestDownloads >= 3) {
                setShowLoginDialog(true);
                return;
            }

            // Increment guest download count
            const newCount = guestDownloads + 1;
            setGuestDownloads(newCount);
            localStorage.setItem('guest_downloads', newCount.toString());
        }

        // Increment server-side counter
        if (firestore) {
            incrementFormDownloads(firestore, form.id);
        }

        // Trigger download
        window.open(attachment.url, '_blank');
    };

    const getFileIcon = (type: string) => {
        switch (type) {
            case 'pdf': return <FileText className="h-8 w-8 text-[#0B3979]" />;
            case 'doc':
            case 'docx': return <FileText className="h-8 w-8 text-blue-500" />;
            case 'xls':
            case 'xlsx': return <FileText className="h-8 w-8 text-green-500" />;
            default: return <File className="h-8 w-8 text-slate-500" />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-[#0B3979] text-white py-12">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4 font-headline">
                        {t('heroTitle')}
                    </h1>
                    <p className="text-blue-100 text-lg max-w-2xl mx-auto">
                        {t('heroDescription')}
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Sidebar (Filters & Ads) - 3 cols */}
                    <div className="lg:col-span-3 space-y-6">
                        <Card className="border-none shadow-lg rounded-3xl overflow-hidden">
                            <CardHeader className="pb-3 bg-white">
                                <CardTitle className="flex items-center gap-2 text-lg text-[#0B3979]">
                                    <Search className="h-5 w-5" />
                                    {t('searchTitle')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="bg-white pt-0">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                                    <Input
                                        placeholder={t('searchPlaceholder')}
                                        className="pl-10 rounded-full bg-slate-50 border-slate-200 focus:bg-white transition-all h-11"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-lg rounded-3xl overflow-hidden">
                            <CardHeader className="pb-3 bg-white">
                                <CardTitle className="flex items-center gap-2 text-lg text-[#0B3979]">
                                    <Filter className="h-5 w-5" />
                                    {t('categoryTitle')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-2 bg-white">
                                {categories.map(cat => (
                                    <Button
                                        key={cat}
                                        variant="ghost"
                                        className={`justify-start w-full font-normal rounded-xl h-auto py-3 px-4 transition-all ${selectedCategory === cat
                                            ? 'bg-blue-50 text-[#0B3979] font-semibold shadow-sm'
                                            : 'hover:bg-slate-50 text-slate-600'
                                            }`}
                                        onClick={() => setSelectedCategory(cat)}
                                    >
                                        {cat === 'all' ? t('all') : (CATEGORY_KEYS[cat] ? t(`categories.${CATEGORY_KEYS[cat]}`) : cat)}
                                    </Button>
                                ))}
                            </CardContent>
                        </Card>

                        <SidebarAds placement="Legal Forms Sidebar" />
                    </div>

                    {/* Main Content (Forms List) - 6 cols */}
                    <div className="lg:col-span-6">
                        <div className="mb-6 flex items-center justify-between px-2">
                            <h2 className="text-2xl font-bold text-[#0B3979] font-headline">
                                {selectedCategory === 'all' ? t('allDocuments') : (CATEGORY_KEYS[selectedCategory] ? t(`categories.${CATEGORY_KEYS[selectedCategory]}`) : selectedCategory)}
                            </h2>
                            <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm">
                                {t('found')} {filteredForms.length} {t('items')}
                            </span>
                        </div>

                        {isLoading ? (
                            <div className="text-center py-20 text-slate-500">{t('loading')}</div>
                        ) : filteredForms.length === 0 ? (
                            <div className="text-center py-32 text-slate-500 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                    <FileText className="h-10 w-10 text-slate-300" />
                                </div>
                                <p className="text-xl font-semibold text-slate-700 mb-2">{t('noFormsFound')}</p>
                                <p className="text-slate-400">{t('tryDifferentSearch')}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {filteredForms.map(form => {
                                    // Group attachments by language
                                    const attachmentsByLang: Record<'th' | 'en' | 'zh', typeof form.attachments> = {
                                        th: [],
                                        en: [],
                                        zh: [],
                                    };

                                    (form.attachments || []).forEach(att => {
                                        const lang = att.language || 'th'; // Default to Thai for legacy
                                        if (attachmentsByLang[lang]) {
                                            attachmentsByLang[lang].push(att);
                                        }
                                    });

                                    const firstFile = form.attachments?.[0];
                                    const fileType = firstFile?.type || 'pdf';

                                    const langLabels = {
                                        th: { flag: '🇹🇭', label: 'TH' },
                                        en: { flag: '🇬🇧', label: 'EN' },
                                        zh: { flag: '🇨🇳', label: 'ZH' },
                                    };

                                    const availableLangs = (['th', 'en', 'zh'] as const).filter(
                                        lang => attachmentsByLang[lang].length > 0
                                    );

                                    return (
                                        <Card key={form.id} className="hover:shadow-lg transition-all duration-300 border-none shadow-sm rounded-2xl overflow-hidden group bg-white">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center p-2">
                                                {/* Icon Section */}
                                                <div className="p-4 shrink-0">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                                        {getFileIcon(fileType)}
                                                    </div>
                                                </div>

                                                {/* Content Section */}
                                                <div className="flex-1 min-w-0 py-2 px-2 sm:px-0 space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border-none">
                                                            {form.category}
                                                        </Badge>
                                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                            • {form.createdAt?.toDate ? format(form.createdAt.toDate(), 'd MMM yy', { locale: locale === 'zh' ? zhCN : locale === 'en' ? enUS : th }) : ''}
                                                        </span>
                                                    </div>

                                                    <h3 className="text-lg font-bold text-slate-800 leading-tight group-hover:text-[#0B3979] transition-colors">
                                                        {locale === 'en' ? (form.titleEn || form.titleTh || form.title)
                                                            : locale === 'zh' ? (form.titleZh || form.titleTh || form.title)
                                                                : (form.titleTh || form.title)}
                                                    </h3>

                                                    <p className="text-sm text-slate-500 line-clamp-1 pr-4">
                                                        {locale === 'en' ? (form.descriptionEn || form.descriptionTh || form.description || t('noDescription'))
                                                            : locale === 'zh' ? (form.descriptionZh || form.descriptionTh || form.description || t('noDescription'))
                                                                : (form.descriptionTh || form.description || t('noDescription'))}
                                                    </p>

                                                    <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                                                        <div className="flex items-center gap-1">
                                                            <Download className="h-3 w-3" />
                                                            <span>{form.downloads || 0} {t('times')}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Section - Language Buttons */}
                                                <div className="p-4 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                                                    <div className="flex flex-wrap gap-2 justify-end">
                                                        {availableLangs.map(lang => {
                                                            const files = attachmentsByLang[lang];
                                                            const { flag, label } = langLabels[lang];

                                                            if (files.length === 1) {
                                                                // Single file - direct download button
                                                                return (
                                                                    <Button
                                                                        key={lang}
                                                                        className="bg-[#0B3979] hover:bg-[#082a5a] text-white rounded-xl h-10 font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 px-4"
                                                                        onClick={() => handleDownload(form, files[0])}
                                                                    >
                                                                        <span className="mr-2">{flag}</span>
                                                                        {label}
                                                                    </Button>
                                                                );
                                                            } else {
                                                                // Multiple files - dropdown
                                                                return (
                                                                    <DropdownMenu key={lang}>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button className="bg-[#0B3979] hover:bg-[#082a5a] text-white rounded-xl h-10 font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 px-4">
                                                                                <span className="mr-2">{flag}</span>
                                                                                {label}
                                                                                <ChevronDown className="ml-1 h-3 w-3" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end" className="w-[200px] rounded-xl">
                                                                            {files.map((file, idx) => (
                                                                                <DropdownMenuItem key={idx} onClick={() => handleDownload(form, file)} className="cursor-pointer py-2">
                                                                                    <FileText className="mr-2 h-4 w-4 text-slate-500" />
                                                                                    <span className="truncate">{file.name}</span>
                                                                                </DropdownMenuItem>
                                                                            ))}
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                );
                                                            }
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar (Recommended Articles) - 3 cols */}
                    <div className="lg:col-span-3 space-y-6">
                        <RecommendedArticles />
                    </div>
                </div>
            </div>

            {/* Login Dialog */}
            <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Lock className="h-5 w-5 text-[#0B3979]" />
                            {t('loginDialog.title')}
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            {t('loginDialog.description')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
                        <Button variant="outline" onClick={() => setShowLoginDialog(false)}>
                            {t('loginDialog.cancel')}
                        </Button>
                        <Button asChild className="bg-[#0B3979] hover:bg-[#082a5a]">
                            <Link href="/login">
                                {t('loginDialog.loginSignup')}
                            </Link>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
