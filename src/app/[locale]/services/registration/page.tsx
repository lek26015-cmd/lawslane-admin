
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FadeIn } from '@/components/fade-in';
import { Building2, Users2, Copyright, ArrowLeft, FileText, Phone, CreditCard, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function RegistrationServicePage() {
    const t = useTranslations('RegistrationService');

    const services = [
        {
            icon: <Building2 className="w-10 h-10 text-slate-600" />,
            title: t('services.company.title'),
            description: t('services.company.description'),
            bg: "bg-yellow-50",
            border: "border-yellow-100"
        },
        {
            icon: <Users2 className="w-10 h-10 text-amber-500" />,
            title: t('services.partnership.title'),
            description: t('services.partnership.description'),
            bg: "bg-yellow-50",
            border: "border-yellow-100"
        },
        {
            icon: <Copyright className="w-10 h-10 text-slate-600" />,
            title: t('services.trademark.title'),
            description: t('services.trademark.description'),
            bg: "bg-yellow-50",
            border: "border-yellow-100"
        }
    ];

    const steps = [
        {
            step: "1",
            title: t('steps.1.title'),
            description: t('steps.1.description'),
            icon: <FileText className="w-6 h-6 text-white" />
        },
        {
            step: "2",
            title: t('steps.2.title'),
            description: t('steps.2.description'),
            icon: <Phone className="w-6 h-6 text-white" />
        },
        {
            step: "3",
            title: t('steps.3.title'),
            description: t('steps.3.description'),
            icon: <CreditCard className="w-6 h-6 text-white" />
        },
        {
            step: "4",
            title: t('steps.4.title'),
            description: t('steps.4.description'),
            icon: <CheckCircle className="w-6 h-6 text-white" />
        }
    ];

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <div className="container mx-auto px-4 md:px-6 py-16 md:py-24">

                {/* Header */}
                <FadeIn direction="up">
                    <div className="text-center mb-16 space-y-4">
                        <h1 className="text-4xl md:text-5xl font-bold font-headline text-[#8B5E00]">
                            {t('title')}
                        </h1>
                        <p className="text-xl text-slate-600">
                            {t('subtitle')}
                        </p>
                    </div>
                </FadeIn>

                {/* Services Cards */}
                <div className="mb-20">
                    <FadeIn direction="up">
                        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 font-headline text-slate-900">
                            {t('servicesTitle')}
                        </h2>
                    </FadeIn>
                    <div className="grid md:grid-cols-3 gap-8">
                        {services.map((service, index) => (
                            <FadeIn key={index} delay={index * 100} direction="up">
                                <Card className={`${service.bg} border ${service.border} shadow-sm hover:shadow-md transition-all h-full rounded-3xl`}>
                                    <CardContent className="flex flex-col items-center text-center p-8 gap-4">
                                        <div className="p-3 bg-white rounded-xl shadow-sm">
                                            {service.icon}
                                        </div>
                                        <h3 className="font-bold text-xl text-slate-900">
                                            {service.title}
                                        </h3>
                                        <p className="text-slate-600">
                                            {service.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            </FadeIn>
                        ))}
                    </div>
                </div>

                {/* Steps Section */}
                <FadeIn direction="up" delay={200}>
                    <div className="bg-slate-50 rounded-[3rem] p-8 md:p-12 mb-20 border border-slate-100">
                        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 font-headline text-slate-900">
                            {t('stepsTitle')}
                        </h2>
                        <div className="grid md:grid-cols-4 gap-8 relative">
                            {steps.map((item, index) => (
                                <div key={index} className="flex flex-col items-center text-center space-y-4 relative z-10">
                                    <div className="w-16 h-16 rounded-full bg-[#D97706] text-white flex items-center justify-center text-2xl font-bold shadow-lg mb-2 ring-4 ring-white">
                                        {item.step}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                                    <p className="text-slate-600 leading-relaxed text-sm">
                                        {item.description}
                                    </p>
                                </div>
                            ))}
                            {/* Connector Line (Desktop only) */}
                            <div className="hidden md:block absolute top-8 left-[12%] right-[12%] h-0.5 bg-slate-200 -z-0" />
                        </div>
                    </div>
                </FadeIn>

                {/* Pricing & CTA */}
                <FadeIn direction="up">
                    <div className="text-center space-y-8">
                        <div className="space-y-2">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline text-[#8B5E00]">
                                {t('pricing.title')}
                            </h2>
                            <p className="text-slate-500">
                                {t('pricing.remark')}
                            </p>
                        </div>

                        <div className="pt-4 space-y-6">
                            <Link href="/services/registration/request">
                                <Button size="lg" className="bg-[#D97706] hover:bg-[#B45309] text-white rounded-full px-10 h-14 text-lg font-semibold shadow-xl shadow-amber-900/20">
                                    {t('cta')}
                                </Button>
                            </Link>

                            <div>
                                <Link href="/sme" className="inline-flex items-center text-slate-500 hover:text-slate-800 transition-colors">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    {t('back')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </FadeIn>

            </div>
        </div>
    );
}
