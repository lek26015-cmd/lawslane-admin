'use client';

import { Button } from '@/components/ui/button';
import { useChat } from '@/context/chat-context';
import { useTranslations } from 'next-intl';

export default function AiConsultButton() {
    const { setAiChatOpen } = useChat();
    const t = useTranslations('HomePage.aiAnalysis');

    return (
        <Button
            size="lg"
            variant="outline"
            className="bg-transparent text-white border-white hover:bg-white/10 hover:text-white text-lg"
            onClick={() => setAiChatOpen(true)}
        >
            {t('consultButton')}
        </Button>
    );
}
