'use client';

import Image, { StaticImageData } from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

interface CourseCardProps {
    id: string | number;
    title: string;
    description: string;
    thumbnail: string | StaticImageData;
    instructorName: string;
    instructorImage: string | StaticImageData;
    badge?: string; // e.g., "PREMIUM"
    rating?: string; // e.g., "การันตี 7.0"
    category?: string;
    href?: string;
}

export function CourseCard({
    id,
    title,
    description,
    thumbnail,
    instructorName,
    instructorImage,
    badge,
    rating,
    category,
    href = '#'
}: CourseCardProps) {
    return (
        <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-xl transition-all duration-300 group relative">
            {/* Badge Ribbon */}
            {badge && (
                <div className="absolute top-0 left-0 bg-[#EAB308] text-white text-[0.65rem] font-bold px-3 py-1 rounded-br-lg z-20 shadow-sm uppercase tracking-wider">
                    {badge}
                </div>
            )}

            {/* Top Thumbnail Section */}
            <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                <Image
                    src={thumbnail}
                    alt={title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Overlay gradient for better text contrast if needed, mostly for aesthetics */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Content Section */}
            <div className="px-6 pb-6 pt-0 flex flex-col flex-grow relative bg-white">
                {/* Floating Avatar */}
                <div className="relative -mt-8 mb-3 flex justify-center z-10">
                    <div className="p-1 bg-white rounded-full shadow-md">
                        <div className="w-16 h-16 rounded-full overflow-hidden relative bg-slate-200">
                            <Image
                                src={instructorImage}
                                alt={instructorName}
                                fill
                                className="object-cover"
                            />
                        </div>
                    </div>
                </div>

                {/* Instructor Name */}
                <div className="text-center mb-3">
                    <p className="text-slate-500 text-sm font-medium">{instructorName}</p>
                </div>

                {/* Title */}
                <h3 className="text-lg md:text-xl font-bold text-slate-900 leading-tight mb-2 line-clamp-2 text-center group-hover:text-primary transition-colors">
                    {title}
                </h3>

                {/* Description */}
                <p className="text-slate-500 text-sm mb-6 line-clamp-3 text-center flex-grow">
                    {description}
                </p>

                {/* Buttons */}
                <div className="flex items-center gap-3 mt-auto pt-2">
                    <Link href={href} className="flex-1">
                        <Button
                            variant="outline"
                            className="w-full rounded-full border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700 font-medium h-10 text-xs md:text-sm px-2"
                        >
                            อ่านรายละเอียด
                        </Button>
                    </Link>
                    <Link href={`${href}/take`} className="flex-1">
                        <Button
                            className="w-full rounded-full bg-[#10B981] hover:bg-[#059669] text-white font-medium h-10 text-xs md:text-sm px-2 shadow-md hover:shadow-lg transition-all"
                        >
                            ทดลองเรียนฟรี
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Optional Rating Badge */}
            {rating && (
                <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm rotate-3 transform">
                    {rating}
                </div>
            )}
        </div>
    );
}
