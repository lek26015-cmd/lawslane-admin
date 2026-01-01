
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FadeIn } from '@/components/fade-in';
import { FileSignature, Briefcase, Home, Scroll, Scale, File, Upload, Calculator, FileCheck } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function ContractsServicePage() {
    const t = useTranslations('ContractsService');

    const steps = [
        {
            step: "1",
            title: t('steps.1.title'),
            description: t('steps.1.description'),
            icon: <Upload className="w-6 h-6 text-white" />
        },
        {
            step: "2",
            title: t('steps.2.title'),
            description: t('steps.2.description'),
            icon: <Calculator className="w-6 h-6 text-white" />
        },
        {
            step: "3",
            title: t('steps.3.title'),
            description: t('steps.3.description'),
            icon: <FileCheck className="w-6 h-6 text-white" />
        }
    ];

    const docTypes = [
        {
            icon: <FileSignature className="w-6 h-6 text-yellow-600" />,
            title: t('docTypes.business'),
            bg: "bg-blue-50"
        },
        {
            icon: <Briefcase className="w-6 h-6 text-yellow-600" />,
            title: t('docTypes.employment'),
            bg: "bg-blue-50"
        },
        {
            icon: <Home className="w-6 h-6 text-green-600" />,
            title: t('docTypes.lease'),
            bg: "bg-blue-50"
        },
        {
            icon: <Scroll className="w-6 h-6 text-brown-600" />,
            title: t('docTypes.wills'),
            bg: "bg-blue-50"
        },
        {
            icon: <Scale className="w-6 h-6 text-gray-600" />,
            title: t('docTypes.litigation'),
            bg: "bg-blue-50"
        },
        {
            icon: <File className="w-6 h-6 text-gray-500" />,
            title: t('docTypes.other'),
            bg: "bg-blue-50"
        }
    ];

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <div className="container mx-auto px-4 md:px-6 py-16 md:py-24">

                {/* Header */}
                <FadeIn direction="up">
                    <div className="text-center mb-16 space-y-4">
                        <h1 className="text-4xl md:text-5xl font-bold font-headline text-[#0B3979]">
                            {t('title')}
                        </h1>
                        <p className="text-xl text-slate-600">
                            {t('subtitle')}
                        </p>
                    </div>
                </FadeIn>

                {/* Steps Section */}
                <FadeIn direction="up" delay={200}>
                    <div className="bg-slate-50 rounded-[3rem] p-8 md:p-12 mb-20 border border-slate-100">
                        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 font-headline text-[#0B3979]">
                            {t('stepsTitle')}
                        </h2>
                        <div className="grid md:grid-cols-3 gap-12 relative">
                            {steps.map((item, index) => (
                                <div key={index} className="flex flex-col items-center text-center space-y-4 relative z-10">
                                    <div className="w-16 h-16 rounded-full bg-[#0B3979] text-white flex items-center justify-center text-2xl font-bold shadow-lg mb-2">
                                        {item.step}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                                    <p className="text-slate-600 leading-relaxed max-w-xs">
                                        {item.description}
                                    </p>
                                </div>
                            ))}
                            {/* Connector Line (Desktop only) */}
                            <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-0.5 bg-slate-200 -z-0" />
                        </div>
                    </div>
                </FadeIn>

                {/* Document Types Section */}
                <div className="mb-20">
                    <FadeIn direction="up">
                        <h2 className="text-2xl md:text-3xl font-bold mb-8 font-headline text-[#0B3979]">
                            {t('docTypesTitle')}
                        </h2>
                    </FadeIn>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {docTypes.map((doc, index) => (
                            <FadeIn key={index} delay={index * 100} direction="up">
                                <Card className={`${doc.bg} border-none shadow-sm hover:shadow-md transition-all h-full rounded-xl`}>
                                    <CardContent className="flex items-center p-6 gap-4">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            {doc.icon}
                                        </div>
                                        <span className="font-semibold text-slate-800 text-lg">
                                            {doc.title}
                                        </span>
                                    </CardContent>
                                </Card>
                            </FadeIn>
                        ))}
                    </div>
                </div>

                {/* Pricing & CTA */}
                <FadeIn direction="up">
                    <div className="text-center space-y-8 bg-white rounded-3xl p-8">
                        <div className="space-y-2">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline text-[#0B3979]">
                                {t('pricing.title')}
                            </h2>
                            <p className="text-slate-500">
                                {t('pricing.subtitle')}
                            </p>
                        </div>

                        <div className="pt-4">
                            <Link href="/services/contracts/request">
                                <Button size="lg" className="bg-[#0B3979] hover:bg-[#082a5a] text-white rounded-full px-10 h-14 text-lg font-semibold shadow-xl shadow-blue-900/20">
                                    {t('pricing.cta')}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </FadeIn>

            </div>
        </div>
    );
}

