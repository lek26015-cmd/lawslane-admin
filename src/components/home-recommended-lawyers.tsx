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
        <section className="relative w-full bg-gradient-to-b from-white to-slate-50 py-12 md:py-24 lg:py-32 overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-100/30 blur-3xl" />
                <div className="absolute top-[20%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-100/30 blur-3xl" />
            </div>

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                <FadeIn direction="up">
                    <div className='text-center mb-12'>
                        <h2 className='text-3xl font-bold tracking-tight text-slate-800 font-headline sm:text-4xl drop-shadow-sm'>ทนายความแนะนำ</h2>
                        <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">ทนายความที่มีประสบการณ์และความเชี่ยวชาญเฉพาะด้าน พร้อมให้คำปรึกษาและดูแลคดีของคุณอย่างใกล้ชิด</p>
                        <Separator className='w-24 mx-auto mt-6 bg-primary/20 h-1 rounded-full' />
                    </div>
                </FadeIn>

                {lawyers.length > 0 ? (
                    <div className="max-w-5xl mx-auto flex flex-col gap-6">
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

                <div className="mt-16 text-center">
                    <FadeIn delay={400} direction="up">
                        <Button asChild size="lg" variant="outline" className="bg-white hover:bg-gray-50 border-gray-200 text-gray-700 shadow-sm hover:shadow transition-all px-8 rounded-full">
                            <Link href={`/lawyers`}>ดูทนายความทั้งหมด</Link>
                        </Button>
                    </FadeIn>
                </div>
            </div>
        </section>
    );
}
