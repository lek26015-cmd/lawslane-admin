import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';
import './globals.css';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="relative">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
                        <div className="w-72 h-72 bg-blue-500/10 blur-[100px] rounded-full"></div>
                    </div>
                    <h1 className="text-8xl md:text-[180px] font-black text-slate-200/50 tracking-tighter select-none">
                        404
                    </h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <h2 className="text-3xl md:text-5xl font-bold text-slate-800 tracking-tight font-headline">
                            ไม่พบหน้าที่ต้องการ
                        </h2>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-lg text-slate-600 max-w-lg mx-auto leading-relaxed">
                        ขออภัยครับ หน้าที่คุณกำลังค้นหาอาจถูกลบไปแล้ว เปลี่ยนชื่อ หรือไม่มีอยู่ตั้งแต่แรก
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                    <Button
                        asChild
                        size="lg"
                        className="w-full sm:w-auto rounded-xl px-8 h-14 bg-[#0B3979] hover:bg-[#082a5a] text-white shadow-xl shadow-blue-900/10 hover:shadow-blue-900/20 hover:-translate-y-0.5 transition-all duration-300 font-bold"
                    >
                        <Link href="/">
                            <Home className="w-5 h-5 mr-3" />
                            กลับสู่หน้าหลัก
                        </Link>
                    </Button>
                    <Button
                        asChild
                        variant="outline"
                        size="lg"
                        className="w-full sm:w-auto rounded-xl px-8 h-14 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all duration-300 font-bold"
                    >
                        <Link href="/th/b2b#contact">
                            <ArrowLeft className="w-4 h-4 mr-3" />
                            ติดต่อแอดมิน
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
