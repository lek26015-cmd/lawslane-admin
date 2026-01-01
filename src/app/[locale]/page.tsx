import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Users, ShieldCheck, ArrowRight, Briefcase, UserCheck, FileText, Download, Check } from 'lucide-react';
import Image from 'next/image';
import { Link } from '@/navigation';
import { getApprovedLawyers, getAllArticles, getAdsByPlacement, getImageUrl, getImageHint } from '@/lib/data';
import LawyerCard from '@/components/lawyer-card';
import AiAnalysisCard from '@/components/ai-analysis-card';
import AiConsultButton from '@/components/ai-consult-button';
import { HomepageBannerWrapper } from '@/components/homepage-banner-wrapper';
import { HomeLatestArticles } from '@/components/home-latest-articles';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { initializeFirebase } from '@/firebase';

import { HomeRecommendedLawyers } from '@/components/home-recommended-lawyers';
import { HomeServicesSection } from '@/components/home-services-section';
import { FadeIn } from '@/components/fade-in';

export const dynamic = 'force-dynamic';

export default function Home() {
  const t = useTranslations('HomePage');
  const { firestore: db } = initializeFirebase();

  // ข้อมูล Feature แบบภาษาไทย
  const features = [
    {
      icon: <MessageSquare className="w-6 h-6 text-blue-600" />,
      title: t('mainFeatures.anywhere.title'),
      description: t('mainFeatures.anywhere.description'),
    },
    {
      icon: <Users className="w-6 h-6 text-blue-600" />,
      title: t('mainFeatures.quality.title'),
      description: t('mainFeatures.quality.description'),
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,
      title: t('mainFeatures.privacy.title'),
      description: t('mainFeatures.privacy.description'),
    },
  ];

  const stats = [
    { value: '10x', label: t('stats.faster') },
    { value: '50+', label: t('stats.experts') },
    { value: '24/7', label: t('stats.247') },
    { value: '100%', label: t('stats.satisfaction') },
  ];

  // ...

  return (
    <>
      <div className="flex flex-col">
        <section className="relative w-full py-20 md:py-32 lg:py-40 bg-slate-900 text-white rounded-b-[80px] overflow-hidden">
          <Image
            src="/images/Lawlanes-Hero-cover.jpg"
            alt="Lawslane Hero Background"
            fill
            className="object-cover object-center opacity-40"
            priority
          />

          <div className="absolute inset-0 z-0 bg-gradient-to-r from-slate-900/90 to-slate-900/50" />


          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <FadeIn direction="up">
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">

                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline leading-tight whitespace-pre-line">
                    {t('hero.title')}
                  </h1>
                  <p className="max-w-[600px] text-gray-200 md:text-xl">
                    {t('hero.subtitle')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link href={`/lawyers`}>
                      <Button size="lg" className="bg-white text-slate-900 hover:bg-gray-100 text-lg font-semibold">{t('lawyerSearch.cta')}</Button>
                    </Link>
                    <AiConsultButton />
                  </div>
                </div>
              </FadeIn>

              {/* ... AiAnalysisCard ... */}
              <FadeIn direction="left" delay={200}>
                <AiAnalysisCard />
              </FadeIn>
            </div>
          </div>
        </section>

        {/* Legal Forms CTA - Redesigned (Text Left, Features Right) */}
        <section className="w-full py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Column: Text Content */}
              <FadeIn direction="right">
                <div className="space-y-6">
                  <h2 className="text-3xl md:text-4xl font-bold font-headline text-[#0B3979]">
                    {t('legalForms.title')}
                  </h2>
                  <p className="text-slate-600 text-lg leading-relaxed">
                    {t('legalForms.description')}
                  </p>
                  <div className="pt-2">
                    <Link href="/forms" className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-[#0B3979] rounded-full hover:bg-[#082a5a] shadow-lg hover:shadow-xl transition-all duration-300 group">
                      {t('legalForms.cta')}
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </FadeIn>

              {/* Right Column: Features List */}
              <FadeIn direction="left" delay={200}>
                <div className="space-y-4">
                  {[
                    t('legalForms.features.professional'),
                    t('legalForms.features.update'),
                    t('legalForms.features.free')
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-4 bg-slate-50 px-6 py-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all hover:-translate-y-1">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <Check className="w-5 h-5 text-green-600" />
                      </div>
                      <span className="text-slate-700 font-medium text-lg">{item}</span>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* Lawyer Search CTA */}
        <section className="w-full py-16 md:py-24 bg-blue-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <FadeIn direction="up" className="text-center">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-3xl md:text-4xl font-bold font-headline text-[#0B3979]">
                      {t('lawyerSearch.title')}
                    </h2>
                    <p className="text-slate-600 text-lg leading-relaxed max-w-2xl mx-auto">
                      {t('lawyerSearch.description')}
                    </p>
                  </div>

                  <div className="flex flex-col md:flex-row justify-center gap-4 text-left">
                    {[
                      t('lawyerSearch.features.verified'),
                      t('lawyerSearch.features.expert'),
                      t('lawyerSearch.features.review')
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-3 bg-white px-5 py-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-slate-700 font-medium">{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4">
                    <Link href="/lawyers" className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-[#0B3979] rounded-full hover:bg-[#082a5a] shadow-lg hover:shadow-xl transition-all duration-300 group">
                      {t('lawyerSearch.cta')}
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <FadeIn direction="up">
                  <div>
                    <p className="text-sm font-semibold text-primary uppercase">{t('usageSteps.label')}</p>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground font-headline mt-2">
                      {t('usageSteps.title')}
                    </h2>
                  </div>
                </FadeIn>
                <div className="grid grid-cols-2 gap-4">
                  {stats.map((stat, index) => (
                    <FadeIn key={index} delay={index * 100} direction="up">
                      <Card className="p-4 bg-gray-100 border-none text-center h-full flex flex-col justify-center rounded-3xl shadow-sm hover:shadow-md transition-all">
                        <p className="text-4xl font-bold text-primary">{stat.value}</p>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                      </Card>
                    </FadeIn>
                  ))}
                </div>
              </div>
              <div className="space-y-8">
                {features.map((feature, index) => (
                  <FadeIn key={index} delay={index * 150} direction="left">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        {feature.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{feature.title}</h3>
                        <p className="text-muted-foreground mt-1">{feature.description}</p>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-r from-blue-900 to-cyan-600 text-white">
          <div className="container mx-auto px-4 md:px-6">
            <FadeIn direction="up">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-white/10 rounded-full backdrop-blur-sm">
                  <ShieldCheck className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white font-headline">
                  {t('verifyStatus.title')}
                </h2>
                <p className="max-w-[700px] text-blue-100 md:text-xl">
                  {t('verifyStatus.description')}
                </p>
                <div className="pt-4">
                  <Link href="/verify-lawyer">
                    <Button size="lg" variant="secondary" className="text-lg font-semibold text-blue-900 hover:bg-white/90">
                      {t('verifyStatus.button')}
                    </Button>
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="bg-white rounded-3xl md:rounded-[3rem] shadow-2xl p-8 md:p-12 lg:p-16 overflow-hidden">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <FadeIn direction="right">
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-primary uppercase">{t('smeSolution.label')}</p>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground font-headline">
                      {t('smeSolution.title')}
                    </h2>
                    <p className="text-muted-foreground text-lg">
                      {t('smeSolution.description')}
                    </p>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <ShieldCheck className="w-6 h-6 text-primary" />
                      <span>{t('smeSolution.contract')}</span>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <FileText className="w-6 h-6 text-primary" />
                      <span>{t('smeSolution.consultant')}</span>
                    </div>
                    <div className="pt-4">
                      <Button size="lg" asChild>
                        <Link href={`/sme`}>{t('smeSolution.button')}</Link>
                      </Button>
                    </div>
                  </div>
                </FadeIn>
                <FadeIn direction="left">
                  <div className="relative">
                    <div className="aspect-video relative overflow-hidden rounded-3xl md:rounded-[3rem] shadow-lg">
                      <Image
                        src={getImageUrl('lawyer-team-working')}
                        alt="Man in a suit holding a gavel"
                        fill
                        className="object-cover"
                        data-ai-hint={getImageHint('lawyer-team-working')}
                      />
                    </div>
                  </div>
                </FadeIn>
              </div>
            </div>
          </div>
        </section>

        {/* Recommended Lawyers - Client Side Fetching */}
        <HomeRecommendedLawyers />

        {/* Services Section */}
        <HomeServicesSection />

        <section className="w-full bg-gray-50 pb-12">
          <div className="container mx-auto px-4 md:px-6">
            <HomepageBannerWrapper />
          </div>
        </section>

        {/* Articles Section - Client Side Fetching */}
        <HomeLatestArticles />

        <section className="w-full bg-foreground text-background">
          <div className="container mx-auto px-4 md:px-6 py-12 md:py-24 lg:py-32">
            <FadeIn direction="up">
              <div className="text-center">
                <div className="inline-block bg-background text-foreground p-3 rounded-full mb-4">
                  <Briefcase className="h-8 w-8" />
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                  {t('forLawyersFooter.title')}
                </h2>
                <p className="max-w-3xl mx-auto mt-4 text-background/80 md:text-xl">
                  {t('forLawyersFooter.description')}
                </p>
                <div className="mt-8">
                  <Link href={`/for-lawyers`}>
                    <Button size="lg" variant="secondary" className="text-lg">
                      <UserCheck className="mr-2 h-5 w-5" /> {t('forLawyersFooter.button')}
                    </Button>
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

      </div >
    </>
  );
}