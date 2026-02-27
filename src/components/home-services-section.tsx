
'use client';

import { FileText, Users, Briefcase, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { FadeIn } from '@/components/fade-in';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

export function HomeServicesSection() {
    const t = useTranslations('HomePage.services');

    const services = [
        {
            icon: <FileText className="w-10 h-10 text-[#0B3979]" />,
            title: t('contracts.title'),
            description: t('contracts.description'),
            link: "/services/contracts"
        },
        {
            icon: <ShieldCheck className="w-10 h-10 text-[#0B3979]" />,
            title: t('consultant.title'),
            description: t('consultant.description'),
            link: "/b2b#contact"
        },
        {
            icon: <Briefcase className="w-10 h-10 text-[#0B3979]" />,
            title: t('registration.title'),
            description: t('registration.description'),
            link: "/services/registration"
        },
        {
            icon: <Users className="w-10 h-10 text-[#0B3979]" />,
            title: t('dispute.title'),
            description: t('dispute.description'),
            link: "/b2b#contact"
        }
    ];

    return (
        <section className="w-full py-16 md:py-24 bg-white">
            <div className="container mx-auto px-4 md:px-6">
                <FadeIn direction="up">
                    <div className="text-center mb-12 space-y-4">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0B3979] font-headline">
                            {t('title')}
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            {t('subtitle')}
                        </p>
                    </div>
                </FadeIn>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {services.map((service, index) => (
                        <FadeIn key={index} delay={index * 100} direction="up">
                            <Link href={service.link} className="block h-full">
                                <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 h-full group rounded-3xl">
                                    <CardHeader>
                                        <div className="mb-4 p-4 bg-slate-100 w-fit rounded-xl group-hover:bg-blue-50 transition-colors">
                                            {service.icon}
                                        </div>
                                        <CardTitle className="text-xl font-bold font-headline text-[#0B3979]">
                                            {service.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-slate-600 leading-relaxed">
                                            {service.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        </FadeIn>
                    ))}
                </div>
            </div>
        </section>
    );
}
