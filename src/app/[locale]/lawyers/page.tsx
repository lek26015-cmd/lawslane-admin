
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
import { RecommendedArticles } from '@/components/recommended-articles';
import { useTranslations } from 'next-intl';

function LawyersPageContent() {
  const searchParams = useSearchParams();
  const specialties = searchParams.get('specialties');
  const { firestore } = useFirebase();
  const t = useTranslations('Lawyers');

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

    let isMounted = true;
    setIsSorting(true);
    setProgress(30);

    const runSorting = async () => {
      // Simulate delay for analysis
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!isMounted) return;

      const recommended = allLawyers.filter(lawyer =>
        lawyer.specialty.some(spec => specialtyArray.includes(spec))
      );
      const remaining = allLawyers.filter(lawyer =>
        !recommended.some(rec => rec.id === lawyer.id)
      );

      setRecommendedLawyerIds(recommended.map(l => l.id));
      setProgress(70);

      // Simulate delay for sorting
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!isMounted) return;

      setFilteredLawyers([...recommended, ...remaining]);
      setProgress(100);

      // Final delay before hiding progress
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!isMounted) return;
      setIsSorting(false);
    };

    runSorting();

    return () => {
      isMounted = false;
    };

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
            {t('recommendedTitle')}
          </h1>
        ) : (
          <div className="flex justify-center mb-4 flex-col">
            {/* Desktop Image */}
            <img
              src="/images/lawyers-center-lawslane.jpg"
              alt="Professional Lawyers Center"
              className="hidden md:block w-full h-auto object-cover"
            />

            {/* Mobile View: Image Only - Full Width */}
            <div className="block md:hidden w-screen -ml-4 mr-0">
              <img
                src="/images/lawyers-center-lawslane-mobile.jpg"
                alt="Professional Lawyers Center"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        )}
        {specialties && (
          <p className="max-w-2xl mx-auto mt-4 text-muted-foreground md:text-xl">
            {t('recommendedDescription')}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 space-y-6">
          <LawyerFilterSidebar />
          <LawyerPageSidebarAds />
          <RecommendedArticles />
        </div>

        <div className="md:col-span-3">
          {isSorting && (
            <div className="mb-8 p-4 rounded-lg bg-secondary">
              <p className="text-center font-semibold text-primary mb-2">{t('analyzing')}</p>
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
                {t('foundLawyers', { count: filteredLawyers.length })}
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
