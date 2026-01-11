'use client';

import { ReactNode } from 'react';

export function HeroFadeIn({ children }: { children: ReactNode }) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-forwards">
            {children}
        </div>
    );
}

export function SectionFadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
    return (
        <div
            className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-forwards"
            style={{ animationDelay: `${delay}s` }}
        >
            {children}
        </div>
    );
}
