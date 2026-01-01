
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2 } from 'lucide-react';
import Logo from '@/components/logo';
import { findLawyerSpecialties } from '@/ai/flows/find-lawyers-flow';
import { useChat } from '@/context/chat-context';
import { useTranslations } from 'next-intl';

export default function AiAnalysisCard() {
  const router = useRouter();
  const [isFindingLawyers, setIsFindingLawyers] = useState(false);
  const [analysisText, setAnalysisText] = useState('');
  const { setAiChatOpen } = useChat();
  const t = useTranslations('HomePage.aiAnalysis');

  const handleAnalysis = async () => {
    if (!analysisText.trim()) return;
    setIsFindingLawyers(true);
    try {
      const result = await findLawyerSpecialties({ problem: analysisText });
      const specialties = result.specialties.join(',');
      router.push(`/lawyers?specialties=${encodeURIComponent(specialties)}`);
    } catch (error) {
      console.error('Failed to find lawyer specialties:', error);
      router.push(`/lawyers`);
    } finally {
      setIsFindingLawyers(false);
    }
  };

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 rounded-3xl md:rounded-[2.5rem] blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-rainbow-border-spin"></div>
      <Card className="relative p-6 md:p-8 shadow-xl bg-card text-card-foreground rounded-3xl md:rounded-[2.5rem]">
        <div className="absolute top-4 right-4 bg-foreground/10 text-foreground p-3 rounded-full shadow-lg">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <Logo href="/" variant="color" showText={false} />
          <h2 className="text-2xl md:text-3xl font-bold font-headline">
            {t('title')}
          </h2>
        </div>
        <p className="text-muted-foreground mb-6">
          {t('description')}
        </p>
        <div className="space-y-4">
          <Textarea
            value={analysisText}
            onChange={(e) => setAnalysisText(e.target.value)}
            placeholder={t('placeholder')}
            rows={4}
            className="bg-background/10 text-foreground placeholder:text-muted-foreground border-border rounded-2xl resize-none"
          />
          <Button size="lg" className="w-full rounded-2xl" onClick={handleAnalysis} disabled={isFindingLawyers}>
            {isFindingLawyers ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('analyzing')}
              </>
            ) : (
              t('button')
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
