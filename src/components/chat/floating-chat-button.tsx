
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Sparkles } from 'lucide-react';
import { useChat } from '@/context/chat-context';
import { cn } from '@/lib/utils';

import { useTranslations } from 'next-intl';

export default function FloatingChatButton() {
  const { setAiChatOpen, isAiChatOpen } = useChat();
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const t = useTranslations('AiAdvisor');

  useEffect(() => {
    const footer = document.getElementById('page-footer');
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFooterVisible(entry.isIntersecting);
      },
      { threshold: 0.1 } // Trigger when 10% of the footer is visible
    );

    observer.observe(footer);

    return () => {
      observer.unobserve(footer);
    };
  }, []);

  const buttonClasses = cn(
    "relative w-full h-14 pl-5 pr-6 py-2 rounded-full shadow-lg flex items-center justify-center text-base font-semibold transition-colors duration-300",
    isFooterVisible
      ? "bg-white hover:bg-gray-100 text-primary"
      : "bg-foreground hover:bg-foreground/90 text-background"
  );

  return (
    <>
      <div className={cn(
        "fixed bottom-6 right-6 z-40 transition-all duration-300 ease-in-out transform origin-bottom-right",
        isAiChatOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
      )}>
        <div className="relative group">
          <div className={cn(
            "absolute -inset-0.5 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-rainbow-border-spin",
            isFooterVisible ? "bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600" : "bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600"
          )}></div>
          <Button
            onClick={() => setAiChatOpen(true)}
            className={buttonClasses}
            aria-label="Open AI Chat"
          >
            <Sparkles className="mr-2 h-6 w-6" />
            {t('floatingButton')}
          </Button>
        </div>
      </div>
    </>
  );
}
