import { Inter } from 'next/font/google';
import { EducationToasterWrapper } from './components/education-toaster-wrapper';




import Link from 'next/link';
import Image from 'next/image';
import logoColor from '@/pic/logo-lawslane-transparent-color.png';
import logoWhite from '@/pic/logo-lawslane-transparent-white.png';
import "../globals.css";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { CartProvider } from './context/cart-context';
import { CartSheet } from './components/cart-sheet';
import { FloatingCartButton } from './components/floating-cart-button';
import { EducationHeaderActions } from './components/header-actions';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'Lawlanes Education | หนังสือและคลังข้อสอบทนาย',
    description: 'เตรียมสอบทนายด้วยหนังสือและระบบทดสอบจาก Lawlanes',
};

export default function EducationLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="th">
            <body className={`min-h-screen bg-slate-50 ${inter.className}`}>
                <FirebaseClientProvider>
                    <CartProvider>
                        {/* Simple Header for Education Portal */}
                        <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                                <Link href="/education" className="flex items-center gap-3 text-primary">
                                    <Image
                                        src={logoColor}
                                        alt="Lawlanes Logo"
                                        width={40}
                                        height={40}
                                        className="h-10 w-auto"
                                        priority
                                    />
                                    <div className="flex flex-col" style={{ lineHeight: '1.1' }}>
                                        <span className="font-bold text-xl">Lawlanes</span>
                                        <span className="font-bold text-xl">Education</span>
                                    </div>
                                </Link>
                                <div className="flex items-center gap-6">
                                    <nav className="flex items-center gap-6 text-sm font-medium">
                                        <Link href="/education/articles" className="hover:text-primary transition-colors">บทความ</Link>
                                        <Link href="/education/books" className="hover:text-primary transition-colors">หนังสือ</Link>
                                        <Link href="/education/exams" className="hover:text-primary transition-colors">คลังข้อสอบ</Link>
                                        <Link href="/education/my-learning" className="hover:text-primary transition-colors">การเรียนรู้ของฉัน</Link>
                                    </nav>
                                    <EducationHeaderActions />
                                </div>
                            </div>
                        </header>

                        <main className="container mx-auto px-4 py-8 min-h-screen">
                            {children}
                        </main>

                        {/* Footer */}
                        <footer className="bg-slate-900 text-slate-300 mt-16">
                            <div className="container mx-auto px-4 py-12">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {/* Brand */}
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <Image
                                                src={logoWhite}
                                                alt="Lawlanes Logo"
                                                width={32}
                                                height={32}
                                                className="h-8 w-auto"
                                            />
                                            <div className="flex flex-col" style={{ lineHeight: '1.1' }}>
                                                <span className="font-bold text-lg text-white">Lawlanes</span>
                                                <span className="font-bold text-lg text-white">Education</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-400">
                                            เตรียมสอบทนายความอย่างมั่นใจ<br />
                                            ด้วยหนังสือและระบบฝึกฝนข้อสอบจาก Lawlanes
                                        </p>
                                    </div>

                                    {/* Quick Links */}
                                    <div>
                                        <h3 className="font-semibold text-white mb-4">ลิงก์ด่วน</h3>
                                        <ul className="space-y-2 text-sm">
                                            <li><Link href="/education/exams" className="hover:text-white transition-colors">คลังข้อสอบ</Link></li>
                                            <li><Link href="/education/books" className="hover:text-white transition-colors">หนังสือเตรียมสอบ</Link></li>
                                            <li><Link href="/education/my-learning" className="hover:text-white transition-colors">การเรียนรู้ของฉัน</Link></li>
                                        </ul>
                                    </div>

                                    {/* Contact / Main Site */}
                                    <div>
                                        <h3 className="font-semibold text-white mb-4">ติดต่อเรา</h3>
                                        <ul className="space-y-2 text-sm">
                                            <li><a href="https://lawlanes.com" target="_blank" rel="noopener" className="hover:text-white transition-colors">เว็บไซต์ Lawlanes หลัก</a></li>
                                            <li><a href="https://www.facebook.com/lawslane" target="_blank" rel="noopener" className="hover:text-white transition-colors">Facebook</a></li>
                                            <li><a href="https://lin.ee/CZzSmHr" target="_blank" rel="noopener" className="hover:text-white transition-colors">LINE Official</a></li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="border-t border-slate-800 mt-8 pt-6 text-center text-sm text-slate-500">
                                    <p>© {new Date().getFullYear()} Lawlanes Education. All rights reserved.</p>
                                </div>
                            </div>
                        </footer>


                        <EducationToasterWrapper />
                        <CartSheet />
                        <FloatingCartButton />
                    </CartProvider>
                </FirebaseClientProvider>
            </body>
        </html>
    );
}
