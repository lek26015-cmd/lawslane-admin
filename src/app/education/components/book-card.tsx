'use client';

import Image, { StaticImageData } from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ThumbsUp, Zap } from 'lucide-react';

interface BookCardProps {
    id: string | number;
    title: string;
    coverUrl: string | StaticImageData;
    price: number;
    originalPrice?: number;
    rating?: number; // 0-5
    badges?: Array<{ text: string; color: string; icon?: 'thumbs-up' | 'zap' }>;
    isEbook?: boolean;
    href?: string;
}

export function BookCard({
    id,
    title,
    coverUrl,
    price,
    originalPrice,
    rating = 5.0,
    badges = [],
    isEbook = false,
    href = '#'
}: BookCardProps) {
    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-xl transition-all duration-300 group">
            {/* Image Section */}
            <Link href={href} className="relative aspect-[3/4] w-full mb-4 overflow-hidden rounded-xl bg-slate-50">
                <Image
                    src={coverUrl}
                    alt={title}
                    fill
                    className="object-contain p-2 hover:scale-105 transition-transform duration-500"
                />
                {isEbook && (
                    <Badge className="absolute top-2 right-2 bg-blue-600/90 backdrop-blur-sm text-[10px] px-2 py-0.5">E-Book</Badge>
                )}
            </Link>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-2">
                {badges.map((badge, idx) => (
                    <div key={idx} className={`flex items-center gap-1 text-xs font-bold ${badge.color}`}>
                        {badge.icon === 'thumbs-up' && <ThumbsUp className="w-3 h-3" />}
                        {badge.icon === 'zap' && <Zap className="w-3 h-3" />}
                        {badge.text}
                    </div>
                ))}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 mb-2">
                <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < Math.floor(rating) ? 'fill-current' : 'text-slate-200'}`} />
                    ))}
                </div>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded-sm font-medium">
                    {rating.toFixed(1)}
                </span>
            </div>

            {/* Title */}
            <Link href={href} className="group-hover:text-primary transition-colors">
                <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 mb-4 h-10">
                    {title}
                </h3>
            </Link>

            {/* Footer: Price & Action */}
            <div className="mt-auto flex items-center justify-between">
                <div className="flex flex-col">
                    {originalPrice && (
                        <span className="text-xs text-slate-400 line-through">฿{originalPrice.toLocaleString()}</span>
                    )}
                    <span className="text-lg font-bold text-[#F43F5E]">฿{price.toLocaleString()}</span>
                </div>
                <Link href={href}>
                    <Button
                        size="sm"
                        className="rounded-full bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs px-4 h-8 shadow-sm hover:shadow-md transition-all"
                    >
                        ซื้อเลย
                    </Button>
                </Link>
            </div>
        </div>
    );
}
