import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Users, ShieldCheck, ArrowRight, Briefcase, UserCheck, FileText } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
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
import { FadeIn } from '@/components/fade-in';

export const dynamic = 'force-dynamic';

async function getHomePageData(db: any) {
  // Only fetch sidebar ads server-side if possible, or move that to client too if it fails.
  // Given previous errors, sidebar ads seemed to work (fetched: 1), so we can keep it or move it.
  // The user log showed: "Debug: Sidebar Ads fetched: 1". So that one works!

  let sidebarAds: any[] = [];

  try {
    // console.log("Debug: Fetching Sidebar Ads...");
    sidebarAds = await getAdsByPlacement(db, 'Lawyer Page Sidebar');
    // console.log("Debug: Sidebar Ads fetched:", sidebarAds.length);
  } catch (e: any) {
    console.error("Error fetching sidebar ads:", e.code, e.message);
  }

  return {
    sidebarAds: sidebarAds,
  };
}

export default async function Home() {
  const { firestore: db } = initializeFirebase();
  // const { sidebarAds } = await getHomePageData(db); // We don't actually use sidebarAds in the main render here, 
  // wait, getHomePageData was returning them but where were they used? 
  // Looking at the file content, sidebarAds wasn't used in the JSX! 
  // It seems getHomePageData was just fetching them but they weren't rendered in the main Home component shown in previous file views.
  // The Sidebar Ads are for the Lawyer Search page, not the Homepage.
  // So we can probably remove getHomePageData entirely if it's not used.

  // However, let's keep the structure simple.

  // ข้อมูล Feature แบบภาษาไทย
  const features = [
    {
      icon: <MessageSquare className="w-6 h-6 text-blue-600" />,
      title: "ปรึกษาได้ทุกที่",
      description: "แชทหรือวิดีโอคอลกับทนายความได้ทันที ไม่ว่าจะอยู่ที่ไหน",
    },
    {
      icon: <Users className="w-6 h-6 text-blue-600" />,
      title: "ทนายความคัดคุณภาพ",
      description: "ทนายความทุกคนผ่านการตรวจสอบประวัติและใบอนุญาตเรียบร้อยแล้ว",
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,
      title: "ปลอดภัยและเป็นส่วนตัว",
      description: "ข้อมูลคดีของคุณจะถูกเก็บเป็นความลับสูงสุด ด้วยมาตรฐานความปลอดภัย",
    },
  ];

  const stats = [
    { value: '10x', label: 'รวดเร็วกว่าเดิม' },
    { value: '50+', label: 'ทนายความผู้เชี่ยวชาญ' },
    { value: '24/7', label: 'บริการตลอด 24 ชม.' },
    { value: '100%', label: 'ความพึงพอใจ' },
  ];

  // const mainArticle = articles[0];
  // const otherArticles = articles.slice(1, 5);

  return (
    <>
      <div className="flex flex-col">
        <section className="relative w-full py-20 md:py-32 lg:py-40 bg-slate-900 text-white">
          <div className="absolute inset-0 z-0 opacity-40">
            <Image
              src={getImageUrl('hero-main')}
              alt="Lawyers working"
              fill
              className="object-cover"
              data-ai-hint={getImageHint('hero-main')}
              priority
            />
          </div>
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-slate-900/90 to-slate-900/50" />

          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <FadeIn direction="up">
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">

                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline leading-tight">
                    ปรึกษาปัญหากฎหมายกับ<br />ทนายความมืออาชีพ
                  </h1>
                  <p className="max-w-[600px] text-gray-200 md:text-xl">
                    แพลตฟอร์มที่เชื่อมโยงคุณกับทนายความผู้เชี่ยวชาญ ค้นหาทนายที่ใช่ หรือปรึกษา AI ทนายความอัจฉริยะได้ทันที
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link href={`/lawyers`}>
                      <Button size="lg" className="bg-white text-slate-900 hover:bg-gray-100 text-lg font-semibold">ค้นหาทนายความ</Button>
                    </Link>
                    <AiConsultButton />
                  </div>
                </div>
              </FadeIn>

              {/* หมายเหตุ: ถ้า AiAnalysisCard รับ props เป็น t หรือ lang อาจต้องไปแก้ไฟล์นั้นด้วย */}
              <FadeIn direction="left" delay={200}>
                <AiAnalysisCard />
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
                    <p className="text-sm font-semibold text-primary uppercase">ขั้นตอนการใช้งาน</p>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground font-headline mt-2">
                      ใช้งานง่าย สะดวก และรวดเร็ว
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
                  ตรวจสอบสถานะทนายความได้จริง
                </h2>
                <p className="max-w-[700px] text-blue-100 md:text-xl">
                  เพื่อความมั่นใจสูงสุด คุณสามารถตรวจสอบใบอนุญาตว่าความของทนายความทุกคนในระบบได้ทันที ผ่านฐานข้อมูลสภาทนายความ
                </p>
                <div className="pt-4">
                  <Link href="/verify-lawyer">
                    <Button size="lg" variant="secondary" className="text-lg font-semibold text-blue-900 hover:bg-white/90">
                      ตรวจสอบสถานะทนาย
                    </Button>
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="bg-white rounded-[3rem] shadow-2xl p-8 md:p-12 lg:p-16 overflow-hidden">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <FadeIn direction="right">
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-primary uppercase">สำหรับธุรกิจ SME</p>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground font-headline">
                      โซลูชันกฎหมายเพื่อธุรกิจ SME
                    </h2>
                    <p className="text-muted-foreground text-lg">
                      ลดความเสี่ยงทางกฎหมาย ช่วยให้ธุรกิจของคุณเติบโตได้อย่างมั่นคง ด้วยบริการที่ปรึกษากฎหมายมืออาชีพ
                    </p>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <ShieldCheck className="w-6 h-6 text-primary" />
                      <span>ร่างและตรวจสัญญาธุรกิจ</span>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <FileText className="w-6 h-6 text-primary" />
                      <span>ที่ปรึกษากฎหมายประจำบริษัท</span>
                    </div>
                    <div className="pt-4">
                      <Button size="lg" asChild>
                        <Link href={`/sme`}>ดูบริการสำหรับ SME</Link>
                      </Button>
                    </div>
                  </div>
                </FadeIn>
                <FadeIn direction="left">
                  <div className="relative">
                    <div className="aspect-video overflow-hidden rounded-2xl shadow-lg">
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
                  สำหรับทนายความ
                </h2>
                <p className="max-w-3xl mx-auto mt-4 text-background/80 md:text-xl">
                  ร่วมเป็นส่วนหนึ่งกับเราเพื่อขยายฐานลูกความ และสร้างความน่าเชื่อถือบนโลกออนไลน์
                </p>
                <div className="mt-8">
                  <Link href={`/for-lawyers`}>
                    <Button size="lg" variant="secondary" className="text-lg">
                      <UserCheck className="mr-2 h-5 w-5" /> สมัครเข้าร่วมเป็นทนายความ
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