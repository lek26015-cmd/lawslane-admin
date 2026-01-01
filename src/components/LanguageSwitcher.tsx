'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/navigation';
import { useTransition } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from 'lucide-react';

interface LanguageSwitcherProps {
    className?: string;
    iconClassName?: string;
}

const languages = {
    th: { label: 'ไทย', flag: '🇹🇭' },
    en: { label: 'English', flag: '🇺🇸' },
    zh: { label: '中文', flag: '🇨🇳' },
};

export default function LanguageSwitcher({ className, iconClassName }: LanguageSwitcherProps) {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    const onSelectChange = (nextLocale: string) => {
        startTransition(() => {
            router.replace(pathname, { locale: nextLocale });
        });
    };

    const currentLang = languages[locale as keyof typeof languages] || languages.th;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300",
                        "bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20",
                        "text-white font-medium shadow-lg hover:shadow-xl hover:scale-105",
                        className
                    )}
                >
                    <span className="text-xl">{currentLang.flag}</span>
                    <span className={cn("uppercase", iconClassName)}>{locale}</span>
                    <ChevronDown className={cn("w-4 h-4 opacity-70", iconClassName)} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px] bg-white/95 backdrop-blur-sm border-slate-100 p-1 rounded-xl shadow-xl">
                {Object.entries(languages).map(([key, { label, flag }]) => (
                    <DropdownMenuItem
                        key={key}
                        onClick={() => onSelectChange(key)}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer focus:bg-blue-50 focus:text-blue-700",
                            locale === key ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"
                        )}
                    >
                        <span className="text-xl leading-none">{flag}</span>
                        <span className="flex-1">{label}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
