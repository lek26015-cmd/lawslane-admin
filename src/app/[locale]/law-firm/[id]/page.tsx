
'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getAdById, getApprovedLawyers } from '@/lib/data';
import type { Ad, LawyerProfile } from '@/lib/types';
import { ArrowLeft, MapPin, Phone, Mail, Building, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import LawyerCard from '@/components/lawyer-card';
import { useFirebase } from '@/firebase';

export default function LawFirmPage() {
  const params = useParams();
  const id = params.id as string;
  const { firestore } = useFirebase();

  const [firm, setFirm] = useState<Ad | null>(null);
  const [lawyers, setLawyers] = useState<LawyerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id || !firestore) return;
      setIsLoading(true);
      const firmData = await getAdById(firestore, id);
      if (!firmData || firmData.placement !== 'Lawyer Page Sidebar') {
        notFound();
        return;
      }
      setFirm(firmData);

      // Fetch real lawyers for the firm
      import('@/lib/data').then(({ getLawyersByFirm }) => {
        getLawyersByFirm(firestore, id).then(firmLawyers => {
          setLawyers(firmLawyers);
        });
      });

      setIsLoading(false);
    }
    fetchData();
  }, [id, firestore]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!firm) {
    return notFound();
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <Link href="/lawyers" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              กลับไปหน้าค้นหาทนาย
            </Link>
          </div>

          <Card className="overflow-hidden shadow-lg">
            <CardHeader className="bg-card p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-shrink-0">
                  <Image
                    src={firm.imageUrl}
                    alt={`${firm.title} logo`}
                    width={150}
                    height={100}
                    className="rounded-lg object-contain border bg-white p-2"
                    data-ai-hint={firm.imageHint}
                  />
                </div>
                <div className="text-center md:text-left">
                  <h1 className="text-4xl font-bold font-headline text-foreground">{firm.title}</h1>
                  <p className="text-lg text-muted-foreground mt-2">{firm.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-8">
                <section>
                  <h2 className="text-2xl font-bold font-headline mb-4 flex items-center gap-2"><Building /> เกี่ยวกับเรา</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {firm.title} เป็นสำนักงานกฎหมายชั้นนำที่ให้บริการที่ปรึกษาด้านกฎหมายธุรกิจครบวงจรสำหรับผู้ประกอบการ SME ด้วยทีมงานทนายความผู้มีประสบการณ์และความเชี่ยวชาญเฉพาะทาง เรามุ่งมั่นที่จะมอบบริการที่มีคุณภาพสูงสุดเพื่อปกป้องและส่งเสริมธุรกิจของคุณให้เติบโตอย่างยั่งยืน
                  </p>
                </section>

                <Separator />

                <section>
                  <h2 className="text-2xl font-bold font-headline mb-4 flex items-center gap-2"><Users /> ทีมทนายความของเรา</h2>
                  <div className="space-y-4">
                    {lawyers.map(lawyer => (
                      <LawyerCard key={lawyer.id} lawyer={lawyer} />
                    ))}
                  </div>
                </section>

              </div>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>ข้อมูลติดต่อ</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 mt-1 text-muted-foreground flex-shrink-0" />
                      <p className="text-muted-foreground">123 อาคารซิตี้ ทาวเวอร์, ถนนสาทร, กรุงเทพมหานคร 10120</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 mt-1 text-muted-foreground flex-shrink-0" />
                      <p className="text-muted-foreground">02-123-4567</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 mt-1 text-muted-foreground flex-shrink-0" />
                      <p className="text-muted-foreground">contact@{firm.id}.law</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div >
  );
}
