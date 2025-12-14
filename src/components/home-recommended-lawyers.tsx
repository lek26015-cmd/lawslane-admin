'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import LawyerCard from '@/components/lawyer-card';
import { useFirebase } from '@/firebase';
import { getApprovedLawyers } from '@/lib/data';
import { LawyerProfile } from '@/lib/types';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/fade-in';

export function HomeRecommendedLawyers() {
    const { firestore } = useFirebase();
    const [lawyers, setLawyers] = useState<LawyerProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLawyers() {
            if (!firestore) return;
            try {
                const fetchedLawyers = await getApprovedLawyers(firestore);
                setLawyers(fetchedLawyers.slice(0, 3));
            } catch (error) {
                console.error("Error fetching lawyers:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchLawyers();
    }, [firestore]);

    if (loading) {
        return (
            <section className="relative w-full bg-slate-50 py-12 md:py-24 lg:py-32 overflow-hidden">
                <div className="container mx-auto px-4 md:px-6 relative z-10">
                    <div className='text-center mb-12'>
                        <h2 className='text-3xl font-bold tracking-tight text-foreground font-headline sm:text-4xl'>ทนายความแนะนำ</h2>
                        <p className="mt-2 text-muted-foreground">กำลังโหลดรายชื่อทนายความ...</p>
                        <Separator className='w-24 mx-auto mt-4 bg-border' />
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="relative w-full py-16 md:py-24 lg:py-32 overflow-hidden">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-white/90 z-10" />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-blue-50/50 z-10" />
                <img
                    src="/_next/image?url=%2Fpic%2FLawlanes-Hero-cover.jpg&w=1920&q=75"
                    alt="Background"
                    className="w-full h-full object-cover opacity-20"
                />
            </div>

            {/* Decorative Elements - Blue Theme */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-10">
                <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] rounded-full bg-blue-100/30 blur-3xl animate-pulse" />
                <div className="absolute top-[30%] -left-[10%] w-[30%] h-[30%] rounded-full bg-indigo-100/30 blur-3xl" />
            </div>

            <div className="container mx-auto px-4 md:px-6 relative z-20">
                <FadeIn direction="up">
                    <div className='text-center mb-16'>
                        <h2 className='text-3xl font-bold tracking-tight text-[#0B3979] font-headline sm:text-5xl drop-shadow-sm'>ทนายความแนะนำ</h2>
                        <p className="mt-4 text-slate-600 max-w-2xl mx-auto text-lg">ทนายความที่มีประสบการณ์และความเชี่ยวชาญเฉพาะด้าน พร้อมให้คำปรึกษาและดูแลคดีของคุณอย่างใกล้ชิด</p>
                        <div className="flex justify-center mt-6">
                            <div className="w-24 h-1.5 bg-[#0B3979] rounded-full" />
                        </div>
                    </div>
                </FadeIn>

                {lawyers.length > 0 ? (
                    <div className="max-w-5xl mx-auto flex flex-col gap-8">
                        {lawyers.map((lawyer, index) => (
                            <FadeIn key={lawyer.id} delay={index * 150} direction="up">
                                <LawyerCard lawyer={lawyer} />
                            </FadeIn>
                        ))}
                    </div>
                ) : (
                    <FadeIn>
                        <EmptyState
                            title="ไม่พบทนายความแนะนำ"
                            description="ขณะนี้ยังไม่มีทนายความแนะนำในระบบ กรุณาลองใหม่ภายหลัง"
                        />
                    </FadeIn>
                )}

                <div className="mt-20 text-center">
                    <FadeIn delay={400} direction="up">
                        <Button asChild size="lg" variant="outline" className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-md hover:shadow-lg transition-all px-10 py-6 rounded-full text-lg font-medium">
                            <Link href={`/lawyers`}>ดูทนายความทั้งหมด</Link>
                        </Button>
                    </FadeIn>
                </div>
            </div>
        </section>
    );
}
