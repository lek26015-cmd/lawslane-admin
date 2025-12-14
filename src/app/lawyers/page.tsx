
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { getApprovedLawyers, getAdsByPlacement } from '@/lib/data';
import LawyerCard from '@/components/lawyer-card';
import type { LawyerProfile, Ad } from '@/lib/types';
import { Loader2, Award } from 'lucide-react';
import React from 'react';
import { Progress } from '@/components/ui/progress';
import LawyerFilterSidebar from '@/components/lawyer-filter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { useFirebase } from '@/firebase';
import { LawyerPageSidebarAds } from '@/components/lawyer-page-sidebar-ads';

function LawyersPageContent() {
  const searchParams = useSearchParams();
  const specialties = searchParams.get('specialties');
  const { firestore } = useFirebase();

  const [allLawyers, setAllLawyers] = useState<LawyerProfile[]>([]);
  const [filteredLawyers, setFilteredLawyers] = useState<LawyerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSorting, setIsSorting] = useState(false);
  const [recommendedLawyerIds, setRecommendedLawyerIds] = useState<string[]>([]);
  const [progress, setProgress] = React.useState(10);

  useEffect(() => {
    async function fetchData() {
      if (!firestore) return;
      setIsLoading(true);
      const lawyers = await getApprovedLawyers(firestore);
      setAllLawyers(lawyers);
      setFilteredLawyers(lawyers);
      setIsLoading(false);
    }
    fetchData();
  }, [firestore]);

  const specialtyArray = useMemo(() => specialties ? specialties.split(',') : [], [specialties]);

  useEffect(() => {
    if (isLoading || !specialties) return;

    setIsSorting(true);
    setProgress(30);

    const timer = setTimeout(() => {
      const recommended = allLawyers.filter(lawyer =>
        lawyer.specialty.some(spec => specialtyArray.includes(spec))
      );
      const remaining = allLawyers.filter(lawyer =>
        !recommended.some(rec => rec.id === lawyer.id)
      );

      setRecommendedLawyerIds(recommended.map(l => l.id));
      setProgress(70);

      setTimeout(() => {
        setFilteredLawyers([...recommended, ...remaining]);
        setProgress(100);
        setTimeout(() => setIsSorting(false), 500);
      }, 500);
    }, 1000);

    return () => clearTimeout(timer);

  }, [specialties, allLawyers, isLoading, specialtyArray]);

  useEffect(() => {
    if (isSorting) {
      const timer = setInterval(() => {
        setProgress(prev => (prev >= 95 ? 95 : prev + 5));
      }, 200);
      return () => clearInterval(timer);
    }
  }, [isSorting]);


  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="text-center mb-8">
        {specialties ? (
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl font-headline">
            ทนายที่แนะนำสำหรับคุณ
          </h1>
        ) : (
          <div className="flex justify-center mb-4">
            <img
              src="/_next/image?url=%2Fpic%2Flawyers-center-lawslane.jpg&w=1080&q=75"
              alt="ศูนย์รวมทนายความมืออาชีพ"
              className="w-full max-w-lg h-auto object-contain"
            />
          </div>
        )}
        <p className="max-w-2xl mx-auto mt-4 text-muted-foreground md:text-xl">
          {specialties
            ? 'นี่คือรายชื่อทนายที่ AI แนะนำจากปัญหาของคุณ พร้อมรายชื่อทนายทั้งหมด'
            : 'ค้นหาและเชื่อมต่อกับทนายความที่เชี่ยวชาญคดีแพ่งและคดีฉ้อโกงสำหรับธุรกิจ SME'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 space-y-6">
          <LawyerFilterSidebar />
          <LawyerPageSidebarAds />
        </div>

        <div className="md:col-span-3">
          {isSorting && (
            <div className="mb-8 p-4 rounded-lg bg-secondary">
              <p className="text-center font-semibold text-primary mb-2">กำลังวิเคราะห์และจัดเรียงทนายที่แนะนำ...</p>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-muted-foreground mb-4">
                พบทนายความ {filteredLawyers.length} ท่าน ที่ตรงกับเงื่อนไข
              </p>
              {filteredLawyers.map((lawyer) => (
                <div key={lawyer.id} className={`transition-all duration-500 rounded-xl ${recommendedLawyerIds.includes(lawyer.id) ? 'border-2 border-primary shadow-lg' : ''}`}>
                  <LawyerCard lawyer={lawyer} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export default function LawyersPage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <LawyersPageContent />
    </React.Suspense>
  )
}
