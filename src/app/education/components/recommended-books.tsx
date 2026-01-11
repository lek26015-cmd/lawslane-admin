import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { getAllBooks } from '@/lib/education-data-admin';
import { BookCard } from './book-card';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious
} from "@/components/ui/carousel";

export async function RecommendedBooksSection() {
    const allBooks = await getAllBooks();
    const books = allBooks.slice(0, 8); // Show first 8 books

    return (
        <section className="py-12 bg-slate-50 border-y border-slate-200">
            <div className="container mx-auto px-4">
                <div className="flex flex-col lg:flex-row gap-8 items-stretch">
                    {/* Left Column: Header & Intro */}
                    <div className="lg:w-1/4 flex flex-col justify-center space-y-6">
                        <div>
                            <span className="text-pink-500 font-bold text-sm tracking-wider uppercase mb-2 block">ร้านหนังสือออนไลน์</span>
                            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">
                                หนังสือเรียน<br />แนะนำ
                            </h2>
                        </div>
                        <p className="text-slate-600 text-lg leading-relaxed">
                            LAWLANES ผู้นำด้านนวัตกรรมการศึกษากฎหมายรูปแบบใหม่ ผสานเทคโนโลยีเข้ากับการเรียน
                            เพื่อผลลัพธ์ทางการเรียนการสอนที่มีประสิทธิภาพที่สุด
                        </p>
                        <Link href="/education/books">
                            <Button className="bg-[#10B981] hover:bg-[#059669] text-white rounded-full px-8 py-6 text-lg font-bold shadow-lg hover:shadow-xl transition-all w-fit group">
                                ดูหนังสือทั้งหมด
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </div>

                    {/* Right Column: Carousel */}
                    <div className="lg:w-3/4 min-w-0">
                        <Carousel
                            opts={{
                                align: "start",
                                loop: true,
                            }}
                            className="w-full"
                        >
                            <CarouselContent className="-ml-4 pb-4">
                                {books.map((book, idx) => (
                                    <CarouselItem key={book.id} className="pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
                                        <div className="h-full py-2">
                                            <BookCard
                                                id={book.id}
                                                title={book.title}
                                                coverUrl={book.coverUrl}
                                                price={book.price}
                                                originalPrice={Math.round(book.price * 1.2)} // Mock original price
                                                rating={4.5 + (idx % 5) / 10} // Mock rating
                                                badges={[
                                                    idx === 0 ? { text: "แนะนำ NEW!!", color: "text-green-600", icon: "thumbs-up" } :
                                                        idx === 1 ? { text: "ขายดี!!", color: "text-yellow-500", icon: "zap" } :
                                                            idx === 2 ? { text: "ขายดี!!", color: "text-yellow-500", icon: "zap" } :
                                                                { text: "ยอดนิยม", color: "text-blue-500" }
                                                ]}
                                                isEbook={book.isDigital}
                                                href={`/education/books/${book.id}`}
                                            />
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <div className="flex justify-center mt-6 lg:justify-end gap-2">
                                <CarouselPrevious className="static translate-y-0 h-12 w-12 bg-white shadow-md border-0 text-slate-800 hover:bg-slate-50 hover:text-primary" />
                                <CarouselNext className="static translate-y-0 h-12 w-12 bg-white shadow-md border-0 text-slate-800 hover:bg-slate-50 hover:text-primary" />
                            </div>
                        </Carousel>
                    </div>
                </div>
            </div>
        </section>
    );
}
