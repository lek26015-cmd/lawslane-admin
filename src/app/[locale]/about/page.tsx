'use client';

import { Shield, Award, Heart, Globe, Mail, Phone, MapPin, Scale, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import groupPhoto from '@/pic/lawslane-photo-group.png';
import { Link } from '@/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FadeIn } from '@/components/fade-in';
import { useTranslations } from 'next-intl';

export default function AboutPage() {
    const t = useTranslations('AboutPage');

    const teamValues = [
        {
            icon: <Shield className="w-8 h-8" />,
            key: 'trustworthy'
        },
        {
            icon: <Award className="w-8 h-8" />,
            key: 'professionalism'
        },
        {
            icon: <Heart className="w-8 h-8" />,
            key: 'care'
        },
        {
            icon: <Globe className="w-8 h-8" />,
            key: 'accessibility'
        },
    ];

    const milestones = ['founded', 'launch', 'expansion'];

    return (
        <div className="flex flex-col">


            {/* Story Section */}
            <section className="w-full py-16 md:py-24 bg-white">
                <div className="container mx-auto px-4 md:px-6">
                    <FadeIn direction="up">
                        <div className="max-w-4xl mx-auto text-center mb-16 space-y-4">
                            <h2 className="text-3xl md:text-5xl font-bold font-headline text-[#0B3979]">
                                {t('title')}
                            </h2>
                            <div className="space-y-2">
                                <p className="text-lg md:text-xl text-slate-700 font-medium">
                                    {t('subtitle')}
                                </p>
                            </div>
                        </div>
                    </FadeIn>

                    {/* Mobile Only Image - Appears First */}
                    <div className="lg:hidden mb-12">
                        <FadeIn direction="up">
                            <div className="relative">
                                <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-[2.5rem] -z-10 transform rotate-2 opacity-70"></div>
                                <div className="relative overflow-hidden rounded-[2rem] shadow-2xl border-4 border-white w-full">
                                    <Image
                                        src={groupPhoto}
                                        alt="Team Lawslane Group Photo"
                                        className="w-full h-auto"
                                        placeholder="blur"
                                        priority
                                    />
                                </div>
                                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
                            </div>
                        </FadeIn>
                    </div>

                    <div className="grid lg:grid-cols-12 gap-12 items-start">
                        {/* Text Content - Spanning 5 columns */}
                        <div className="lg:col-span-5">
                            <FadeIn direction="right">
                                <div className="space-y-8">
                                    {/* Header & Quote */}
                                    <div className="space-y-6 text-center lg:text-left">
                                        <blockquote className="relative">
                                            <div className="text-2xl md:text-3xl font-bold font-headline text-slate-800 leading-tight">
                                                {t('quote')}
                                            </div>
                                            <div className="mt-6 text-lg text-slate-600 font-medium">
                                                {t('quoteDesc')}
                                            </div>
                                        </blockquote>
                                    </div>

                                    {/* Narrative Text - Increased Size */}
                                    <div className="space-y-8 text-lg text-slate-600 leading-relaxed text-center lg:text-left">
                                        <p>
                                            {t('story.intro')}
                                        </p>

                                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                                            <p className="font-medium text-slate-800 italic mb-4">
                                                {t('story.question')}
                                            </p>
                                            <p className="font-bold text-[#0B3979] text-xl">
                                                {t('story.answer')}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="mb-4">
                                                {t('story.whoWeAre')}
                                            </p>
                                            <ul className="space-y-3 pl-4">
                                                <li className="flex items-center gap-3 text-slate-700 bg-red-50 p-3 rounded-lg mx-auto lg:mx-0 w-fit">
                                                    <span className="text-red-500 font-bold">❌</span>
                                                    {t('story.painPoints.fear')}
                                                </li>
                                                <li className="flex items-center gap-3 text-slate-700 bg-red-50 p-3 rounded-lg mx-auto lg:mx-0 w-fit">
                                                    <span className="text-red-500 font-bold">❌</span>
                                                    {t('story.painPoints.expensive')}
                                                </li>
                                                <li className="flex items-center gap-3 text-slate-700 bg-red-50 p-3 rounded-lg mx-auto lg:mx-0 w-fit">
                                                    <span className="text-red-500 font-bold">❌</span>
                                                    {t('story.painPoints.disadvantage')}
                                                </li>
                                            </ul>
                                        </div>

                                        <p className="font-medium text-slate-800">
                                            {t('story.solution')}
                                        </p>

                                        <p>
                                            <strong>{t('story.belief1')}</strong><br />
                                            <strong>{t('story.belief2')}</strong>
                                        </p>

                                        <p>
                                            {t('story.whatWeDo')}
                                        </p>

                                        <div className="border-l-4 border-[#0B3979] pl-6 py-2">
                                            <p className="italic text-slate-700 mb-4">
                                                {t('story.experience')}
                                            </p>
                                            <p className="font-bold text-[#0B3979]">
                                                {t('story.mission')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <div className="pt-4 text-center lg:text-left">
                                        <Link href="/lawyers">
                                            <Button size="lg" className="bg-[#0B3979] hover:bg-[#082a5a] h-12 px-8 text-lg rounded-full">
                                                {t('findLawyer')}
                                                <ArrowRight className="ml-2 w-5 h-5" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </FadeIn>
                        </div>

                        {/* Image Content - Spanning 7 columns (Larger) */}
                        <div className="lg:col-span-7">
                            <FadeIn direction="left" delay={200} className="hidden lg:block">
                                <div className="relative">
                                    <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-[2.5rem] -z-10 transform rotate-2 opacity-70"></div>
                                    <div className="relative overflow-hidden rounded-[2rem] shadow-2xl border-4 border-white w-full">
                                        <Image
                                            src={groupPhoto}
                                            alt="Team Lawslane Group Photo"
                                            className="w-full h-auto"
                                            placeholder="blur"
                                            priority
                                        />
                                    </div>

                                    {/* Optional Decoration */}
                                    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
                                </div>
                            </FadeIn>

                            {/* Core Values (Moved here) */}
                            <div className="mt-12">
                                <FadeIn direction="up">
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-bold font-headline text-[#0B3979] mb-2">
                                            {t('values.title')}
                                        </h2>
                                        <p className="text-slate-500">{t('values.subtitle')}</p>
                                    </div>
                                </FadeIn>
                                <div className="grid grid-cols-2 gap-4">
                                    {teamValues.map((value, index) => (
                                        <FadeIn key={index} delay={index * 100} direction="up">
                                            <Card className="h-full bg-slate-50 border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group">
                                                <CardContent className="p-4 text-center space-y-3">
                                                    <div className="w-12 h-12 mx-auto rounded-xl bg-white shadow-sm flex items-center justify-center text-[#0B3979] group-hover:scale-110 transition-transform duration-300">
                                                        {value.icon}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-800 text-sm">{t(`values.${value.key}.title`)}</h3>
                                                        <p className="text-xs text-slate-500">{t(`values.${value.key}.titleEn`)}</p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </FadeIn>
                                    ))}
                                </div>
                            </div>

                            {/* Team Quote Box (Moved here) */}
                            <div className="mt-12">
                                <FadeIn direction="up" delay={200}>
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                                        <p className="mt-2 text-slate-600 text-base lg:text-lg">
                                            {t('teamQuote.message')}
                                        </p>
                                        <p className="text-lg lg:text-xl font-bold text-slate-800 italic mt-4 font-headline">
                                            {t('teamQuote.slogan')}
                                        </p>
                                    </div>
                                </FadeIn>
                            </div>
                        </div>
                    </div>


                </div>
            </section>




            {/* Timeline Section */}
            <section className="w-full py-16 md:py-24 bg-gradient-to-b from-slate-50 to-slate-100">
                <div className="container mx-auto px-4 md:px-6">
                    <FadeIn direction="up">
                        <div className="text-center max-w-2xl mx-auto mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline text-foreground mb-4">
                                {t('journey.title')}
                            </h2>
                            <p className="text-lg text-muted-foreground">{t('journey.subtitle')}</p>
                        </div>
                    </FadeIn>
                    <div className="max-w-3xl mx-auto">
                        <div className="relative">
                            {/* Timeline Line */}
                            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-cyan-400 transform md:-translate-x-1/2" />

                            {milestones.map((key, index) => (
                                <FadeIn key={index} delay={index * 150} direction={index % 2 === 0 ? 'right' : 'left'}>
                                    <div className={`relative flex items-center mb-8 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                                        {/* Timeline Dot */}
                                        <div className="absolute left-4 md:left-1/2 w-4 h-4 bg-blue-500 rounded-full transform md:-translate-x-1/2 ring-4 ring-white" />

                                        {/* Content */}
                                        <div className={`ml-12 md:ml-0 md:w-1/2 ${index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                                            <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                                                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold mb-2">
                                                    {t(`milestones.${key}.year`)}
                                                </span>
                                                <h3 className="text-xl font-bold text-foreground mb-1">{t(`milestones.${key}.title`)}</h3>
                                                <p className="text-sm text-primary mb-2">{t(`milestones.${key}.titleEn`)}</p>
                                                <p className="text-muted-foreground">{t(`milestones.${key}.description`)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </FadeIn>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section className="w-full py-16 md:py-24 bg-slate-900 text-white">
                <div className="container mx-auto px-4 md:px-6">
                    <FadeIn direction="up">
                        <div className="max-w-4xl mx-auto">
                            <div className="text-center mb-12">
                                <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
                                    {t('contact.title')}
                                </h2>
                                <p className="text-blue-200 text-lg">{t('contact.subtitle')}</p>
                            </div>
                            <div className="grid md:grid-cols-3 gap-8">
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto bg-white/10 rounded-full flex items-center justify-center mb-4">
                                        <Mail className="w-7 h-7 text-blue-300" />
                                    </div>
                                    <h3 className="font-semibold mb-2">{t('contact.email.title')}</h3>
                                    <a href={`mailto:${t('contact.email.value')}`} className="text-blue-300 hover:text-blue-200 transition-colors">
                                        {t('contact.email.value')}
                                    </a>
                                </div>
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto bg-white/10 rounded-full flex items-center justify-center mb-4">
                                        <Phone className="w-7 h-7 text-blue-300" />
                                    </div>
                                    <h3 className="font-semibold mb-2">{t('contact.phone.title')}</h3>
                                    <a href={`tel:+66${t('contact.phone.value').replace(/-/g, '')}`} className="text-blue-300 hover:text-blue-200 transition-colors">
                                        {t('contact.phone.value')}
                                    </a>
                                </div>
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto bg-white/10 rounded-full flex items-center justify-center mb-4">
                                        <MapPin className="w-7 h-7 text-blue-300" />
                                    </div>
                                    <h3 className="font-semibold mb-2">{t('contact.office.title')}</h3>
                                    <p className="text-blue-300">{t('contact.office.value')}</p>
                                </div>
                            </div>
                            <div className="text-center mt-12">
                                <a href="https://www.lawslane.com/th/sme#contact" target="_blank" rel="noopener noreferrer">
                                    <Button size="lg" variant="secondary" className="text-slate-900">
                                        <Mail className="mr-2 w-5 h-5" />
                                        {t('contact.sendMessage')}
                                    </Button>
                                </a>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* CTA Section */}
            <section className="w-full py-16 md:py-24 bg-gradient-to-r from-blue-900 to-cyan-600">
                <div className="container mx-auto px-4 md:px-6">
                    <FadeIn direction="up">
                        <div className="text-center text-white max-w-3xl mx-auto">
                            <div className="inline-flex items-center justify-center p-4 bg-white/10 rounded-full backdrop-blur-sm mb-6">
                                <Scale className="w-10 h-10" />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
                                {t('cta.title')}
                            </h2>
                            <p className="text-xl text-blue-100 mb-8">
                                {t('cta.subtitle')}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href="/lawyers">
                                    <Button size="lg" className="bg-white text-blue-900 hover:bg-gray-100 text-lg font-semibold px-8">
                                        {t('cta.button')}
                                        <ArrowRight className="ml-2 w-5 h-5" />
                                    </Button>
                                </Link>

                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>
        </div>
    );
}
