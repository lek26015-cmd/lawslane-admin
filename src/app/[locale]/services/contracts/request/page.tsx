
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/fade-in';
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from 'next-intl';

export default function ContractRequestPage() {
    const t = useTranslations('ContractsRequest');
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));

        toast({
            title: t('toast.successTitle'),
            description: t('toast.successDesc'),
        });

        setIsSubmitting(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.size > 5 * 1024 * 1024) {
                toast({
                    title: t('toast.errorTitle'),
                    description: t('toast.fileTooLarge'),
                    variant: "destructive"
                });
                return;
            }
            setFile(selectedFile);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 md:py-20">
            <div className="container mx-auto px-4 md:px-6 max-w-3xl">
                <FadeIn direction="up">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl md:text-4xl font-bold font-headline text-[#0B3979] mb-4">
                            {t('title')}
                        </h1>
                        <p className="text-slate-600 text-lg">
                            {t('subtitle')}
                        </p>
                    </div>
                </FadeIn>

                <FadeIn direction="up" delay={100}>
                    <Card className="border-none shadow-xl bg-white rounded-3xl">
                        <CardHeader className="border-b bg-white rounded-t-3xl p-6 md:p-8">
                            <CardTitle className="text-xl font-semibold flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[#0B3979]" />
                                {t('formTitle')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 md:p-8">
                            <form onSubmit={handleSubmit} className="space-y-6">

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">{t('labels.name')}</Label>
                                        <Input id="name" required placeholder={t('labels.namePlaceholder')} className="h-11 rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">{t('labels.phone')}</Label>
                                        <Input id="phone" required type="tel" placeholder={t('labels.phonePlaceholder')} className="h-11 rounded-xl" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">{t('labels.email')}</Label>
                                    <Input id="email" required type="email" placeholder={t('labels.emailPlaceholder')} className="h-11 rounded-xl" />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="type">{t('labels.serviceType')}</Label>
                                    <Select>
                                        <SelectTrigger className="h-11 rounded-xl">
                                            <SelectValue placeholder={t('labels.serviceTypePlaceholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">{t('serviceTypes.draft')}</SelectItem>
                                            <SelectItem value="review">{t('serviceTypes.review')}</SelectItem>
                                            <SelectItem value="consult">{t('serviceTypes.consult')}</SelectItem>
                                            <SelectItem value="other">{t('serviceTypes.other')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('labels.upload')}</Label>
                                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                                        <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={handleFileChange}
                                            accept=".pdf,.doc,.docx,.jpg,.png"
                                        />
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#0B3979]">
                                                <Upload className="w-6 h-6" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-medium text-slate-900">
                                                    {file ? file.name : t('upload.dragDrop')}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {t('upload.support')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="details">{t('labels.details')}</Label>
                                    <Textarea
                                        id="details"
                                        placeholder={t('labels.detailsPlaceholder')}
                                        className="min-h-[120px] resize-none rounded-xl"
                                    />
                                </div>

                                <div className="pt-4">
                                    <Button
                                        type="submit"
                                        className="w-full h-12 text-lg font-semibold bg-[#0B3979] hover:bg-[#082a5a] text-white rounded-xl shadow-lg shadow-blue-900/10"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>{t('submitting')}</>
                                        ) : (
                                            <>{t('submit')}</>
                                        )}
                                    </Button>
                                    <p className="text-center text-sm text-slate-500 mt-4 flex items-center justify-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        {t('privacy')}
                                    </p>
                                </div>

                            </form>
                        </CardContent>
                    </Card>
                </FadeIn>
            </div>
        </div>
    );
}
