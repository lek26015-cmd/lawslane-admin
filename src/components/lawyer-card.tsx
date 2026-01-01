
'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LawyerProfile } from '@/lib/types';
import { Mail, Scale, Phone, BadgeCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import profileLawyerImg from '@/pic/profile-lawyer.jpg';
import { useUser } from '@/firebase';
import { useTranslations } from 'next-intl';

import { getSpecialtyKey } from '@/lib/specialties';

interface LawyerCardProps {
  lawyer: LawyerProfile;
}

export default function LawyerCard({ lawyer }: LawyerCardProps) {
  const router = useRouter();
  const { user } = useUser();
  const t = useTranslations('Lawyers');

  // Helper to translate specialty
  const translateSpecialty = (spec: string) => {
    const key = getSpecialtyKey(spec);
    return key ? t(`specialties.${key}`) : spec;
  };

  // Use real data if available, otherwise default to 0 (or hide)
  const rating = lawyer.averageRating || 0;
  const reviewCount = lawyer.reviewCount || 0;

  const handleStartChat = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    router.push(`/payment?type=chat&lawyerId=${lawyer.id}`);
  };

  const handleViewProfile = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    router.push(`/lawyers/${lawyer.id}`);
  };

  return (
    <div className="group relative flex flex-col md:flex-row items-center md:items-start p-6 gap-6 w-full bg-white text-card-foreground rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-primary overflow-hidden">
      {/* Decorative background blob */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />

      <div className="flex-shrink-0 flex flex-col items-center gap-3 w-full md:w-auto relative z-10">
        <div className="relative h-24 w-24 flex-shrink-0">
          <Image
            src={lawyer.imageUrl || profileLawyerImg}
            alt={lawyer.name}
            fill
            className="rounded-full object-cover ring-4 ring-white shadow-md group-hover:scale-105 transition-transform duration-300"
            data-ai-hint={lawyer.imageHint}
          />
          <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-sm">
            <BadgeCheck className="w-5 h-5 text-blue-500 fill-blue-50" />
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Scale key={i} className={`w-3.5 h-3.5 ${i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 font-medium bg-gray-50 px-2 py-0.5 rounded-full">
            {reviewCount > 0 ? `${reviewCount} ${t('card.reviews')}` : t('card.newLawyer')}
          </p>
        </div>
      </div>

      <div className="flex-grow text-center md:text-left relative z-10 w-full">
        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1 justify-center md:justify-start">
          {/* Lawyer name is NOT translated */}
          <h3 className="font-bold text-xl text-slate-800">{lawyer.name}</h3>
          {lawyer.status === 'approved' && (
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-blue-50 text-blue-700 hover:bg-blue-100">
              {t('card.verified')}
            </span>
          )}
        </div>

        <p className="font-semibold text-primary/90 text-sm uppercase tracking-wide mb-2">{translateSpecialty(lawyer.specialty[0])}</p>
        <p className="text-sm text-slate-500 mb-4 line-clamp-2 leading-relaxed">{lawyer.description}</p>

        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
          {lawyer.specialty.slice(0, 3).map((spec, index) => (
            <Badge key={index} variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 font-normal">
              {translateSpecialty(spec)}
            </Badge>
          ))}
          {lawyer.specialty.length > 3 && (
            <Badge variant="outline" className="text-muted-foreground font-normal">+{lawyer.specialty.length - 3}</Badge>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 flex flex-col sm:flex-row md:flex-col items-stretch justify-center gap-3 w-full md:w-40 mt-2 md:mt-0 relative z-10">
        <Button
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all"
          onClick={handleViewProfile}
        >
          {t('card.viewProfile')}
        </Button>
        <Button variant="outline" className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800" onClick={handleStartChat}>
          <Mail className="mr-2 h-4 w-4" /> {t('card.sendMessage')}
        </Button>
      </div>
    </div>
  );
}
