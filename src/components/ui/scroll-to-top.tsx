'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export default function ScrollToTopButton() {
    const [isVisible, setIsVisible] = useState(false);
    const [showMobileHint, setShowMobileHint] = useState(false);
    const t = useTranslations('Navigation');

    const toggleVisibility = () => {
        if (window.scrollY > 300) {
            if (!isVisible) {
                setIsVisible(true);
                // Show hint on mobile when first appearing
                if (window.innerWidth < 768) {
                    setShowMobileHint(true);
                    setTimeout(() => setShowMobileHint(false), 3000);
                }
            }
        } else {
            setIsVisible(false);
            setShowMobileHint(false);
        }
    };

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    useEffect(() => {
        window.addEventListener('scroll', toggleVisibility);
        return () => {
            window.removeEventListener('scroll', toggleVisibility);
        };
    }, [isVisible]);

    return (
        <button
            onClick={scrollToTop}
            className={cn(
                'fixed bottom-24 right-8 z-50 p-3 rounded-full bg-blue-600 text-white shadow-lg transition-all duration-300 hover:bg-blue-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center group overflow-hidden',
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
            )}
            aria-label={t('scrollToTop')}
        >
            <ArrowUp className="h-6 w-6 flex-shrink-0" />
            <span className={cn(
                "whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out max-w-0 opacity-0",
                "group-hover:max-w-[150px] group-hover:opacity-100 group-hover:ml-2",
                showMobileHint && "max-w-[150px] opacity-100 ml-2"
            )}>
                {t('scrollToTop')}
            </span>
        </button>
    );
}
