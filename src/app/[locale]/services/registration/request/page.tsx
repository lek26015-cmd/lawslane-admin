
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/fade-in';
import { Building2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function RegistrationRequestPage() {
    const t = useTranslations('RegistrationRequest');
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        contactName: '',
        companyName: '',
        phone: '',
        email: '',
        registrationType: '',
        details: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (value: string) => {
        setFormData(prev => ({ ...prev, registrationType: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!formData.registrationType) {
            toast({
                title: t('toast.selectType'),
                variant: "destructive"
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // Save to Firestore
            const { firestore: db } = initializeFirebase();
            await addDoc(collection(db, 'registrationRequests'), {
                ...formData,
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            toast({
                title: t('toast.successTitle'),
                description: t('toast.successDesc'),
            });

            // Reset form
            setFormData({
                contactName: '',
                companyName: '',
                phone: '',
                email: '',
                registrationType: '',
                details: ''
            });

        } catch (error) {
            console.error("Error submitting request:", error);
            toast({
                title: t('toast.errorTitle'),
                description: t('toast.errorDesc'),
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-yellow-50/30 py-12 md:py-20">
            <div className="container mx-auto px-4 md:px-6 max-w-3xl">
                <FadeIn direction="up">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl md:text-4xl font-bold font-headline text-[#8B5E00] mb-4">
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
                            <CardTitle className="text-xl font-semibold flex items-center gap-2 text-[#8B5E00]">
                                <Building2 className="w-5 h-5" />
                                {t('formTitle')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 md:p-8">
                            <form onSubmit={handleSubmit} className="space-y-6">

                                <div className="space-y-2">
                                    <Label htmlFor="registrationType">{t('labels.registrationType')} <span className="text-red-500">*</span></Label>
                                    <Select onValueChange={handleSelectChange} value={formData.registrationType}>
                                        <SelectTrigger className="h-11 rounded-xl">
                                            <SelectValue placeholder={t('registrationTypes.placeholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="company">{t('registrationTypes.company')}</SelectItem>
                                            <SelectItem value="partnership">{t('registrationTypes.partnership')}</SelectItem>
                                            <SelectItem value="trademark">{t('registrationTypes.trademark')}</SelectItem>
                                            <SelectItem value="other">{t('registrationTypes.other')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="companyName">{t('labels.companyName')} <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="companyName"
                                        required
                                        placeholder={t('labels.companyNamePlaceholder')}
                                        className="h-11 rounded-xl"
                                        value={formData.companyName}
                                        onChange={handleInputChange}
                                    />
                                    <p className="text-xs text-slate-500">{t('labels.companyNameHint')}</p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="contactName">{t('labels.contactName')} <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="contactName"
                                            required
                                            placeholder={t('labels.contactNamePlaceholder')}
                                            className="h-11 rounded-xl"
                                            value={formData.contactName}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">{t('labels.phone')} <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="phone"
                                            required
                                            type="tel"
                                            placeholder={t('labels.phonePlaceholder')}
                                            className="h-11 rounded-xl"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">{t('labels.email')} <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="email"
                                        required
                                        type="email"
                                        placeholder={t('labels.emailPlaceholder')}
                                        className="h-11 rounded-xl"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="details">{t('labels.details')}</Label>
                                    <Textarea
                                        id="details"
                                        placeholder={t('labels.detailsPlaceholder')}
                                        className="min-h-[100px] resize-none rounded-xl"
                                        value={formData.details}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="pt-4">
                                    <Button
                                        type="submit"
                                        className="w-full h-12 text-lg font-semibold bg-[#D97706] hover:bg-[#B45309] text-white rounded-xl shadow-lg shadow-amber-900/10"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                {t('submitting')}
                                            </>
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
