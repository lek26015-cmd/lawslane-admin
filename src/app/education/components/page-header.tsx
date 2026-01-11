'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, LucideIcon, BookOpen, GraduationCap, Award, Settings, FileText, ShoppingBag } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
    BookOpen,
    GraduationCap,
    Award,
    Settings,
    FileText,
    ShoppingBag
};


interface PageHeaderProps {
    title: string;
    description?: string;
    icon?: LucideIcon | string;
    iconColor?: string;
    backLink?: string;
    backLabel?: string;
    children?: ReactNode;
    badge?: string;
    badgeColor?: string;
    theme?: 'indigo' | 'emerald' | 'amber' | 'purple' | 'rose' | 'slate' | 'blue' | 'cyan';
}

const THEMES = {
    indigo: 'from-indigo-600 to-purple-600',
    emerald: 'from-emerald-600 to-teal-600',
    amber: 'from-amber-600 to-orange-600',
    purple: 'from-purple-600 to-indigo-600',
    rose: 'from-rose-600 to-pink-600',
    slate: 'from-slate-700 to-slate-900',
    blue: 'from-blue-600 to-indigo-600',
    cyan: 'from-cyan-600 to-blue-600'
};

export function PageHeader({
    title,
    description,
    icon: iconProp,
    iconColor = 'text-white',
    theme = 'indigo',
    backLink,
    backLabel = 'กลับ',
    children,
    badge,
    badgeColor = 'bg-white/20 text-white',
}: PageHeaderProps) {
    const Icon = typeof iconProp === 'string' ? ICON_MAP[iconProp] : iconProp;
    const themeClasses = THEMES[theme] || THEMES.indigo;

    return (
        <div key={theme} className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${themeClasses} p-8 md:p-10 mb-8`}>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10"
            >
                {/* Background decoration */}
                <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl -z-10" />
                <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-48 h-48 bg-white/10 rounded-full blur-2xl -z-10" />

                {/* Pattern overlay */}
                <div className="absolute inset-0 opacity-10 -z-10">
                    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                </div>

                {/* Back link */}
                {backLink && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Link
                            href={backLink}
                            className="inline-flex items-center text-white/80 hover:text-white transition-colors mb-4 text-sm font-medium"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            {backLabel}
                        </Link>
                    </motion.div>
                )}

                <div className="flex flex-col md:flex-row md:items-center gap-6">
                    {/* Icon */}
                    {Icon && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                            className="w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0"
                        >
                            <Icon className={`w-8 h-8 md:w-10 md:h-10 ${iconColor}`} />
                        </motion.div>
                    )}

                    {/* Content */}
                    <div className="flex-1">
                        {badge && (
                            <motion.span
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${badgeColor}`}
                            >
                                {badge}
                            </motion.span>
                        )}
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2"
                        >
                            {title}
                        </motion.h1>
                        {description && (
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-white/80 text-sm md:text-base max-w-2xl"
                            >
                                {description}
                            </motion.p>
                        )}
                    </div>

                    {/* Optional children (actions, filters, etc.) */}
                    {children && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="flex-shrink-0"
                        >
                            {children}
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {/* Tailwind Safelist - Hidden element to ensure classes are not purged */}
            <div className="hidden from-indigo-600 to-purple-600 from-emerald-600 to-teal-600 from-amber-600 to-orange-600 from-purple-600 to-indigo-600 from-rose-600 to-pink-600 from-slate-700 to-slate-900 from-blue-600 to-indigo-600 from-cyan-600 to-blue-600" />
        </div>
    );
}

// Compact header variation
interface CompactPageHeaderProps {
    title: string;
    description?: string;
    backLink?: string;
    backLabel?: string;
}

export function CompactPageHeader({
    title,
    description,
    backLink,
    backLabel = 'กลับ'
}: CompactPageHeaderProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6"
        >
            {backLink && (
                <Link
                    href={backLink}
                    className="inline-flex items-center text-slate-600 hover:text-primary transition-colors mb-3 text-sm"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {backLabel}
                </Link>
            )}
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h1>
            {description && (
                <p className="text-slate-600 mt-1">{description}</p>
            )}
        </motion.div>
    );
}
