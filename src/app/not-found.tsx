import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileQuestion, Home, Gavel } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center bg-gray-50 px-4 py-16 text-center">
            <div className="relative mb-8">
                <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-primary/10 animate-pulse" />
                <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-yellow-500/10 animate-pulse delay-700" />
                <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-white shadow-xl border-4 border-white">
                    <Gavel className="h-20 w-20 text-primary rotate-[-12deg]" />
                </div>
            </div>

            <h1 className="mb-2 text-9xl font-bold tracking-tighter text-gray-900 font-headline">
                404
            </h1>

            <h2 className="mb-4 text-2xl font-bold text-gray-800 md:text-3xl">
                ไม่พบหน้าที่คุณต้องการ
            </h2>

            <p className="mb-8 max-w-[500px] text-gray-500 md:text-lg">
                ดูเหมือนว่าหน้าที่คุณกำลังตามหาจะหายไป หรือถูกย้ายไปที่อื่นแล้ว
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
                <Button asChild size="lg" className="gap-2">
                    <Link href="/">
                        <Home className="h-4 w-4" />
                        กลับสู่หน้าหลัก
                    </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                    <Link href="/lawyers">
                        <FileQuestion className="h-4 w-4" />
                        ค้นหาทนายความ
                    </Link>
                </Button>
            </div>
        </div>
    )
}
