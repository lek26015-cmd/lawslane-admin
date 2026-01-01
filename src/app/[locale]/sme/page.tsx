import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, FileText, Briefcase, Users, ArrowRight, CheckCircle2, Phone, Mail, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl, getImageHint } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SmeContactForm } from '@/components/sme-contact-form';
import { useTranslations } from 'next-intl';

import { FadeIn } from '@/components/fade-in';

export default function SMEPage() {
    const t = useTranslations('SMEPage');

    const services = [
        {
            icon: <FileText className="w-10 h-10 text-primary" />,
            title: t('services.contracts.title'),
            description: t('services.contracts.description'),
            link: "/services/contracts"
        },
        {
            icon: <ShieldCheck className="w-10 h-10 text-primary" />,
            title: t('services.advisor.title'),
            description: t('services.advisor.description'),
            link: "#contact"
        },
        {
            icon: <Briefcase className="w-10 h-10 text-primary" />,
            title: t('services.registration.title'),
            description: t('services.registration.description'),
            link: "/services/registration"
        },
        {
            icon: <Users className="w-10 h-10 text-primary" />,
            title: t('services.dispute.title'),
            description: t('services.dispute.description'),
            link: "#contact"
        }
    ];

    const benefits = [
        t('benefits.list.risk'),
        t('benefits.list.cost'),
        t('benefits.list.expert'),
        t('benefits.list.docs'),
        t('benefits.list.privacy')
    ];

    return (
        <div className="flex flex-col min-h-screen">
            {/* ... (Hero Section remains unchanged) */}

            {/* Services Section */}
            <section id="services" className="w-full py-16 md:py-24 bg-background">
                <div className="container mx-auto px-4 md:px-6">
                    <FadeIn direction="up">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline text-foreground">{t('title')}</h2>
                            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                                {t('subtitle')}
                            </p>
                        </div>
                    </FadeIn>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {services.map((service, index) => (
                            <FadeIn key={index} delay={index * 100} direction="up" fullWidth>
                                {service.link ? (
                                    <Link href={service.link} className="block h-full">
                                        <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 h-full cursor-pointer rounded-3xl">
                                            <CardHeader>
                                                <div className="mb-4 p-3 bg-primary/10 w-fit rounded-xl">
                                                    {service.icon}
                                                </div>
                                                <CardTitle className="text-xl font-bold">{service.title}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-muted-foreground leading-relaxed">
                                                    {service.description}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ) : (
                                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 h-full rounded-3xl">
                                        <CardHeader>
                                            <div className="mb-4 p-3 bg-primary/10 w-fit rounded-xl">
                                                {service.icon}
                                            </div>
                                            <CardTitle className="text-xl font-bold">{service.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-muted-foreground leading-relaxed">
                                                {service.description}
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* Why Choose Us / Benefits */}
            <section className="w-full py-16 md:py-24 bg-secondary/30">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <FadeIn direction="right">
                            <div className="relative h-[400px] lg:h-[500px] rounded-2xl overflow-hidden shadow-2xl">
                                <Image
                                    src={getImageUrl('lawyer-team-working') || '/placeholder.jpg'}
                                    alt="Business meeting"
                                    fill
                                    className="object-cover"
                                    data-ai-hint={getImageHint('lawyer-team-working')}
                                />
                            </div>
                        </FadeIn>
                        <div className="space-y-8">
                            <FadeIn direction="left">
                                <h2 className="text-3xl md:text-4xl font-bold font-headline text-foreground">
                                    {t('benefits.title')}
                                </h2>
                            </FadeIn>
                            <div className="space-y-4">
                                {benefits.map((benefit, index) => (
                                    <FadeIn key={index} delay={index * 100} direction="left">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                                            <p className="text-lg text-foreground/80">{benefit}</p>
                                        </div>
                                    </FadeIn>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Form Section */}
            <section id="contact" className="w-full py-20 bg-gray-50">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="grid lg:grid-cols-2 gap-12">
                        <FadeIn direction="right">
                            <div>
                                <h2 className="text-3xl font-bold font-headline mb-6">{t('contact.title')}</h2>
                                <p className="text-lg text-muted-foreground mb-8">
                                    {t('contact.subtitle')}
                                </p>
                                <div className="space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <Phone className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-lg">{t('contact.phone')}</p>
                                            <p className="text-muted-foreground">0972275494</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <Mail className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-lg">{t('contact.email')}</p>
                                            <p className="text-muted-foreground">noreply@lawslane.com</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <MessageSquare className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-lg">{t('contact.line')}</p>
                                            <p className="text-muted-foreground">@lawslane_biz</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </FadeIn>
                        <FadeIn direction="left">
                            <SmeContactForm />
                        </FadeIn>
                    </div>
                </div>
            </section>
        </div>
    );
}
