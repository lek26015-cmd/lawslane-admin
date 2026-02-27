'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Home, Mail, ArrowRight } from 'lucide-react';
import { FadeIn } from '@/components/fade-in';
import Link from 'next/link';

export default function ComingSoonPage() {
    const t = useTranslations('ComingSoon');

    return (
        <div className="min-h-screen bg-[#0B3979] flex items-center justify-center p-4 overflow-hidden relative">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 blur-[120px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full"></div>
            </div>

            <div className="max-w-4xl w-full text-center space-y-12 relative z-10">
                <FadeIn direction="up">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-blue-200 text-sm font-bold mb-4">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        {t('title')}
                    </div>
                </FadeIn>

                <div className="space-y-6">
                    <FadeIn direction="up" delay={100}>
                        <h1 className="text-4xl md:text-7xl font-black text-white tracking-tight leading-[1.1] font-headline">
                            {t('subtitle')}
                        </h1>
                    </FadeIn>
                    <FadeIn direction="up" delay={200}>
                        <p className="text-lg md:text-xl text-blue-100/70 max-w-2xl mx-auto leading-relaxed font-medium">
                            {t('description')}
                        </p>
                    </FadeIn>
                </div>

                <FadeIn direction="up" delay={300}>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
                        <Button
                            asChild
                            size="lg"
                            className="w-full sm:w-auto rounded-2xl px-10 h-16 bg-white text-[#0B3979] hover:bg-blue-50 shadow-2xl shadow-white/10 hover:shadow-white/20 hover:-translate-y-1 transition-all duration-300 font-black text-lg group"
                        >
                            <Link href="/">
                                <Home className="w-5 h-5 mr-3" />
                                {t('backHome')}
                                <ArrowRight className="w-5 h-5 ml-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="w-full sm:w-auto rounded-2xl px-10 h-16 border-white/20 bg-white/5 text-white hover:bg-white/10 backdrop-blur-md transition-all duration-300 font-bold text-lg"
                        >
                            <a href="mailto:support@lawslane.com">
                                <Mail className="w-5 h-5 mr-3" />
                                {t('contactSales')}
                            </a>
                        </Button>
                    </div>
                </FadeIn>

                {/* Counter or Socials placeholder */}
                <FadeIn direction="up" delay={400} className="pt-12">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
                        {[
                            { label: 'Platform', value: 'B2B/ERP' },
                            { label: 'Modules', value: 'Contract, HR, Billing' },
                            { label: 'AI Engine', value: 'Legal-GPT' },
                            { label: 'Security', value: '256-bit SSL' }
                        ].map((item, i) => (
                            <div key={i} className="text-center p-4 rounded-2xl bg-white/5 border border-white/5">
                                <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest mb-1">{item.label}</p>
                                <p className="text-sm text-white font-bold">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </FadeIn>
            </div>

            {/* Bottom branding */}
            <div className="absolute bottom-8 left-0 w-full text-center opacity-30">
                <p className="text-white text-xs font-bold tracking-[0.2em] uppercase">
                    Lawslane &copy; 2026 - Advanced Agentic Coding
                </p>
            </div>
        </div>
    );
}
