'use client';

import { motion } from 'framer-motion';
import { Book } from "@/lib/education-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface AnimatedBookGridProps {
    books: Book[];
}

export function AnimatedBookGrid({ books }: AnimatedBookGridProps) {
    if (books.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center py-20 bg-slate-50 rounded-xl"
            >
                <p className="text-slate-500 text-lg">ยังไม่มีหนังสือวางจำหน่ายในขณะนี้</p>
                <p className="text-slate-400 text-sm mt-2">โปรดติดตามอัปเดตเร็วๆ นี้</p>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.1 }
                }
            }}
        >
            {books.map((book, index) => (
                <motion.div
                    key={book.id}
                    variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0 }
                    }}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
                        <CardHeader className="p-0 overflow-hidden rounded-t-xl bg-slate-100 relative aspect-[2/3]">
                            <img
                                src={book.coverUrl}
                                alt={book.title}
                                className="object-cover w-full h-full"
                            />
                            {book.isDigital && (
                                <Badge className="absolute top-2 right-2 bg-blue-600">E-Book</Badge>
                            )}
                        </CardHeader>
                        <CardContent className="flex-1 p-4">
                            <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2 min-h-[3rem]">
                                {book.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                {book.description}
                            </p>
                            <div className="text-sm text-slate-500">
                                ผู้แต่ง: {book.author}
                            </div>
                        </CardContent>
                        <CardFooter className="p-4 pt-0 flex items-center justify-between mt-auto">
                            <span className="text-lg font-bold text-indigo-700">
                                ฿{book.price.toLocaleString()}
                            </span>
                            <Link href={`/education/books/${book.id}`}>
                                <Button variant="secondary" size="sm">
                                    ดูรายละเอียด
                                </Button>
                            </Link>
                        </CardFooter>
                    </Card>
                </motion.div>
            ))}
        </motion.div>
    );
}
