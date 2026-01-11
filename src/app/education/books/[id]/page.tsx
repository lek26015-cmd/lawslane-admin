import { Book } from "@/lib/education-types";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ChevronLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookPurchaseSection } from "../../components/book-purchase-section";
import { getBookById, getAllBooks } from "@/lib/education-data-admin";

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const book = await getBookById(id);

    if (!book) {
        return notFound();
    }

    // Get related books (excluding current book)
    const allBooks = await getAllBooks();
    const relatedBooks = allBooks.filter(b => b.id !== id).slice(0, 4);

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Breadcrumb / Back */}
            <Link href="/education/books" className="inline-flex items-center text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                <ChevronLeft className="w-4 h-4 mr-1" />
                ย้อนกลับไปร้านหนังสือ
            </Link>

            <div className="grid md:grid-cols-12 gap-10">
                {/* Left Column: Image */}
                <div className="md:col-span-4 lg:col-span-3">
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-xl bg-slate-100 mb-6">
                        <img
                            src={book.coverUrl}
                            alt={book.title}
                            className="object-cover w-full h-full"
                        />
                        {book.isDigital && (
                            <Badge className="absolute top-4 right-4 bg-blue-600 text-lg px-3 py-1">E-Book</Badge>
                        )}
                    </div>
                </div>

                {/* Right Column: Details */}
                <div className="md:col-span-8 lg:col-span-9 space-y-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">{book.title}</h1>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                            <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-700 font-medium">
                                ผู้แต่ง: {book.author}
                            </span>
                            {book.publisher && (
                                <span>สำนักพิมพ์: {book.publisher}</span>
                            )}
                            {book.publishedAt && (
                                <span>ตีพิมพ์: {book.publishedAt.toLocaleDateString('th-TH')}</span>
                            )}
                        </div>
                    </div>

                    <Separator />

                    <div className="prose prose-slate max-w-none">
                        <h3 className="text-lg font-semibold">รายละเอียดหนังสือ</h3>
                        <p className="whitespace-pre-line text-slate-600 leading-relaxed">
                            {book.description}
                        </p>
                    </div>

                    {/* Book Metadata */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 bg-slate-50 rounded-lg p-4 border border-slate-100">
                        {book.isbn && (
                            <div>
                                <p className="text-xs text-slate-400">ISBN</p>
                                <p className="font-medium">{book.isbn}</p>
                            </div>
                        )}
                        {book.pageCount && (
                            <div>
                                <p className="text-xs text-slate-400">จำนวนหน้า</p>
                                <p className="font-medium">{book.pageCount} หน้า</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-slate-400">รูปแบบ</p>
                            <p className="font-medium">{book.isDigital ? "ไฟล์ PDF" : "เล่มจริง"}</p>
                        </div>
                    </div>

                    {/* Client Component for Purchase Actions */}
                    <BookPurchaseSection book={book} />
                </div>
            </div>

            {/* Related Books Section */}
            {relatedBooks.length > 0 && (
                <section className="pt-8 border-t mt-12">
                    <div className="flex items-center gap-2 mb-6">
                        <BookOpen className="w-5 h-5 text-slate-600" />
                        <h2 className="text-xl font-bold text-slate-900">หนังสือที่เกี่ยวข้อง</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {relatedBooks.map((relatedBook) => (
                            <Link key={relatedBook.id} href={`/education/books/${relatedBook.id}`} className="group">
                                <div className="relative aspect-[2/3] w-full bg-slate-100 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1">
                                    <img
                                        src={relatedBook.coverUrl}
                                        alt={relatedBook.title}
                                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                                    />
                                    {relatedBook.isDigital && (
                                        <Badge className="absolute top-1.5 right-1.5 bg-blue-600 text-[10px] px-1.5 py-0.5 shadow-sm">E-Book</Badge>
                                    )}
                                </div>
                                <div className="mt-2 px-0.5">
                                    <h3 className="font-medium text-sm leading-tight line-clamp-2 text-slate-800 group-hover:text-indigo-600 transition-colors">
                                        {relatedBook.title}
                                    </h3>
                                    <p className="text-sm font-bold text-indigo-600 mt-1">
                                        ฿{relatedBook.price.toLocaleString()}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

