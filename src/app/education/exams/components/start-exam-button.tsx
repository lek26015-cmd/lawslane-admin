
'use client';

import { Button } from "@/components/ui/button";
import { PlayCircle, Lock } from "lucide-react";
import Link from 'next/link';
import { useUser } from "@/firebase";
import { usePathname } from "next/navigation";

interface StartExamButtonProps {
    examId: string;
}

export function StartExamButton({ examId }: StartExamButtonProps) {
    const { user, isUserLoading } = useUser();
    const pathname = usePathname();

    if (isUserLoading) {
        return (
            <Button size="lg" className="h-14 px-8 text-lg bg-slate-200 text-slate-400" disabled>
                กำลังตรวจสอบสิทธิ์...
            </Button>
        );
    }

    if (!user) {
        return (
            <Link href={`/education/login?redirect=${pathname}`}>
                <Button size="lg" className="h-14 px-8 text-lg bg-slate-800 hover:bg-slate-900 shadow-md">
                    <Lock className="mr-2 w-5 h-5" />
                    เข้าสู่ระบบเพื่อเริ่มทำข้อสอบ
                </Button>
            </Link>
        );
    }

    return (
        <Link href={`/education/exams/${examId}/take`}>
            <Button size="lg" className="h-14 px-8 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200">
                <PlayCircle className="mr-2 w-6 h-6" />
                เริ่มทำข้อสอบทันที
            </Button>
        </Link>
    );
}
