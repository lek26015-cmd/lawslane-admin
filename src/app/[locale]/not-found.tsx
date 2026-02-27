import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';
import { FadeIn } from '@/components/fade-in';

export default function NotFoundPage() {
    const t = useTranslations('NotFound');

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full text-center space-y-8">
                <FadeIn direction="up">
                    <div className="relative">
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
                            <div className="w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full"></div>
                        </div>
                        <h1 className="text-8xl md:text-[150px] font-black text-slate-200 tracking-tighter mix-blend-multiply select-none">
                            404
                        </h1>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <h2 className="text-3xl md:text-5xl font-bold text-slate-800 tracking-tight font-headline">
                                {t('title')}
                            </h2>
                        </div>
                    </div>
                </FadeIn>

                <FadeIn direction="up" delay={100}>
                    <p className="text-lg text-slate-600 max-w-lg mx-auto leading-relaxed">
                        {t('description')}
                    </p>
                </FadeIn>

                <FadeIn direction="up" delay={200}>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                        <Button
                            asChild
                            size="lg"
                            className="w-full sm:w-auto rounded-xl px-8 h-12 bg-[#0B3979] hover:bg-[#082a5a] text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                        >
                            <Link href="/">
                                <Home className="w-5 h-5 mr-2" />
                                {t('backHome')}
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="w-full sm:w-auto rounded-xl px-8 h-12 border-slate-200 text-slate-700 hover:bg-slate-100 transition-all duration-300"
                        >
                            <Link href="/b2b#contact">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                {t('contactSupport')}
                            </Link>
                        </Button>
                    </div>
                </FadeIn>
            </div>
        </div>
    );
}
