'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { LandingPage } from '@/lib/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Globe, MapPin, Facebook } from 'lucide-react';
import Link from 'next/link';

export default function PublicLandingPage() {
    const params = useParams();
    const { firestore } = useFirebase();
    const [page, setPage] = useState<LandingPage | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPage = async () => {
            if (!firestore || !params.slug) return;
            try {
                const q = query(
                    collection(firestore, 'landingPages'),
                    where('slug', '==', params.slug),
                    where('status', '==', 'published') // Only show published pages
                );
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    setPage({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as LandingPage);
                } else {
                    setError('ไม่พบหน้าที่คุณต้องการ หรือหน้านี้ยังไม่ถูกเผยแพร่');
                }
            } catch (err) {
                console.error("Error fetching landing page:", err);
                setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
            } finally {
                setIsLoading(false);
            }
        };
        fetchPage();
    }, [firestore, params.slug]);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>;
    }

    if (error || !page) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-2xl font-bold mb-2">404 - Page Not Found</h1>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Link href="/">
                    <Button variant="outline">กลับสู่หน้าหลัก Lawslane</Button>
                </Link>
            </div>
        );
    }

    const { title, heroImage, logo, content, contactInfo, themeColor } = page;

    return (
        <div className="min-h-screen bg-[#FDFBF7] font-sans text-slate-900">
            {/* Hero Section with Curve */}
            <div className="relative">
                <div className="h-[35vh] md:h-[45vh] relative w-full overflow-hidden">
                    <Image
                        src={heroImage}
                        alt={title}
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-black/20" />
                </div>

                {/* Curved Divider */}
                <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
                    <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[calc(100%+1.3px)] h-[60px] md:h-[100px] fill-[#FDFBF7]">
                        <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" className="hidden"></path>
                        <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" className="hidden"></path>
                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="hidden"></path>

                        {/* Simple Curve */}
                        <path d="M0,0V40c0,0,300,80,600,80s600-80,600-80V0Z" className="hidden"></path>

                        {/* Center Dip Curve (like the reference) */}
                        <path d="M0,0 L0,40 Q600,160 1200,40 L1200,0 Z" className="hidden"></path>

                        {/* Convex Curve (Hill) - Used in reference but inverted? No, reference is a hill. */}
                        <path d="M0,0 L0,60 Q600,-60 1200,60 L1200,0 Z" className="hidden"></path>

                        {/* Actual shape: Top is image, bottom is white with a "hump" in the middle for the profile pic? 
                            Actually the reference image has a white background that curves UP into the image. 
                            So the image has a "concave" bottom or the white section has a "convex" top.
                         */}
                        <path d="M0,120 L0,20 Q600,150 1200,20 L1200,120 Z" fill="#FDFBF7"></path>
                    </svg>
                </div>
            </div>

            {/* Profile Section */}
            <div className="container mx-auto px-4 relative -mt-16 md:-mt-24 text-center z-10">
                {logo ? (
                    <div className="relative w-32 h-32 md:w-48 md:h-48 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
                            <Image src={logo} alt="Logo" fill className="object-cover" />
                        </div>
                    </div>
                ) : (
                    <div className="w-32 h-32 md:w-48 md:h-48 mx-auto mb-6 rounded-full border-4 border-white shadow-xl bg-slate-200 flex items-center justify-center">
                        <span className="text-4xl font-bold text-slate-400">{title.charAt(0)}</span>
                    </div>
                )}

                <h1 className="text-3xl md:text-5xl font-light tracking-wide mb-2 text-[#4A4A4A] uppercase" style={{ color: themeColor }}>
                    {title}
                </h1>

            </div>

            {/* Content Section */}
            <section className="pb-16 md:pb-24">
                <div className="container mx-auto px-4 max-w-3xl text-center">
                    <div className="prose prose-lg max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed">
                        {content}
                    </div>
                </div>
            </section>

            {/* Contact Grid Section */}
            <section className="py-16 bg-white border-t border-slate-100">
                <div className="container mx-auto px-4 max-w-5xl">
                    <h2 className="text-3xl font-light text-center mb-12 text-slate-800 uppercase tracking-widest">Contact Us</h2>
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {contactInfo.phone && (
                            <a href={`tel:${contactInfo.phone}`} className="flex flex-col items-center p-8 bg-[#FDFBF7] rounded-xl hover:shadow-lg transition-all group text-center border border-slate-100">
                                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm mb-6 group-hover:scale-110 transition-transform group-hover:text-slate-600">
                                    <Phone className="w-8 h-8" />
                                </div>
                                <h3 className="font-medium text-slate-900 mb-2 uppercase tracking-wide">Phone</h3>
                                <p className="text-slate-500">{contactInfo.phone}</p>
                            </a>
                        )}

                        {contactInfo.email && (
                            <a href={`mailto:${contactInfo.email}`} className="flex flex-col items-center p-8 bg-[#FDFBF7] rounded-xl hover:shadow-lg transition-all group text-center border border-slate-100">
                                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm mb-6 group-hover:scale-110 transition-transform group-hover:text-slate-600">
                                    <Mail className="w-8 h-8" />
                                </div>
                                <h3 className="font-medium text-slate-900 mb-2 uppercase tracking-wide">Email</h3>
                                <p className="text-slate-500">{contactInfo.email}</p>
                            </a>
                        )}

                        {contactInfo.lineId && (
                            <div className="flex flex-col items-center p-8 bg-[#FDFBF7] rounded-xl hover:shadow-lg transition-all group text-center border border-slate-100 cursor-pointer">
                                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-[#06C755] shadow-sm mb-6 group-hover:scale-110 transition-transform">
                                    <span className="font-bold text-2xl">L</span>
                                </div>
                                <h3 className="font-medium text-slate-900 mb-2 uppercase tracking-wide">Line ID</h3>
                                <p className="text-slate-500">{contactInfo.lineId}</p>
                            </div>
                        )}

                        {contactInfo.facebook && (
                            <a href={contactInfo.facebook} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-8 bg-[#FDFBF7] rounded-xl hover:shadow-lg transition-all group text-center border border-slate-100">
                                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-[#1877F2] shadow-sm mb-6 group-hover:scale-110 transition-transform">
                                    <Facebook className="w-8 h-8" />
                                </div>
                                <h3 className="font-medium text-slate-900 mb-2 uppercase tracking-wide">Facebook</h3>
                                <p className="text-slate-500">Visit Page</p>
                            </a>
                        )}

                        {contactInfo.website && (
                            <a href={contactInfo.website} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-8 bg-[#FDFBF7] rounded-xl hover:shadow-lg transition-all group text-center border border-slate-100">
                                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm mb-6 group-hover:scale-110 transition-transform group-hover:text-slate-600">
                                    <Globe className="w-8 h-8" />
                                </div>
                                <h3 className="font-medium text-slate-900 mb-2 uppercase tracking-wide">Website</h3>
                                <p className="text-slate-500 truncate max-w-[200px]">{contactInfo.website.replace(/^https?:\/\//, '')}</p>
                            </a>
                        )}

                        {contactInfo.address && (
                            <div className="flex flex-col items-center p-8 bg-[#FDFBF7] rounded-xl hover:shadow-lg transition-all group text-center border border-slate-100">
                                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm mb-6 group-hover:scale-110 transition-transform group-hover:text-slate-600">
                                    <MapPin className="w-8 h-8" />
                                </div>
                                <h3 className="font-medium text-slate-900 mb-2 uppercase tracking-wide">Address</h3>
                                <p className="text-slate-500 text-sm">{contactInfo.address}</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#FDFBF7] text-slate-400 py-8 text-center text-sm border-t border-slate-100">
                <div className="container mx-auto px-4">
                    <p>&copy; {new Date().getFullYear()} {title}. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
