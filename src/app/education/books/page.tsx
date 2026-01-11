import { Book } from "@/lib/education-types";
import { getAllBooks } from "@/lib/education-data-admin";
import { AnimatedBookGrid } from "../components/animated-book-grid";
import { PageHeader } from "../components/page-header";

export default async function BookListingPage() {
    const books = await getAllBooks();

    return (
        <div className="space-y-6">
            <PageHeader
                title="ร้านหนังสือแนะนำ"
                description="คัดสรรหนังสือคุณภาพเพื่อนักกฎหมายโดยเฉพาะ ทั้งคู่มือสอบ สรุปย่อ และรวมข้อสอบเก่า"
                icon="BookOpen"
                theme="amber"
                backLink="/education"
                backLabel="กลับหน้าหลัก"
                badge={`${books.length} เล่ม`}
            />

            <AnimatedBookGrid books={books} />
        </div>
    );
}
