'use client';

import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { seedDatabase } from '@/lib/seed-data';
import { Loader2, CheckCircle, AlertCircle, Database, MessageSquare, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SeedDataPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSeeding, setIsSeeding] = useState(false);
    const [isSeedingChat, setIsSeedingChat] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [targetUserId, setTargetUserId] = useState('wS9w7ysNYUajNsBYZ6C7n2Afe9H3');
    const [result, setResult] = useState<{ articles: number; lawyers: number; errors: string[] } | null>(null);

    const handleSeed = async () => {
        if (!firestore) return;

        setIsSeeding(true);
        setResult(null);

        try {
            const res = await seedDatabase(firestore);
            setResult(res);
            if (res.errors.length === 0) {
                toast({
                    title: "Seeding Successful",
                    description: `Added ${res.articles} articles and ${res.lawyers} lawyers.`,
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Seeding Completed with Errors",
                    description: `Check the log for details.`,
                });
            }
        } catch (error: any) {
            console.error("Seeding failed:", error);
            toast({
                variant: "destructive",
                title: "Seeding Failed",
                description: error.message,
            });
        } finally {
            setIsSeeding(false);
        }
    };

    const handleSeedMockChat = async () => {
        if (!firestore) return;

        setIsSeedingChat(true);

        try {
            // User UID provided by admin
            const testUserId = targetUserId.trim();
            if (!testUserId) {
                throw new Error("Target User UID is required");
            }
            // Mock lawyer ID (simulated)
            const mockLawyerId = 'mock-lawyer-001';
            const chatId = uuidv4();

            // First, create or update mock lawyer profile
            const lawyerRef = doc(firestore, 'lawyerProfiles', mockLawyerId);
            await setDoc(lawyerRef, {
                userId: mockLawyerId,
                name: '[ทดสอบ] ทนายจำลอง',
                email: 'mock-lawyer@test.com',
                phone: '000-000-0000',
                licenseNumber: 'MOCK-0001',
                serviceProvinces: ['กรุงเทพมหานคร'],
                status: 'approved',
                description: 'ทนายความจำลองสำหรับทดสอบระบบ',
                specialty: ['ทดสอบ'],
                imageUrl: 'https://i.pravatar.cc/150?u=MockLawyer',
                imageHint: 'Mock lawyer avatar',
                bankName: 'Test Bank',
                bankAccountNumber: '000-0-00000-0',
                gender: 'ชาย',
                address: 'ที่อยู่จำลอง',
                dob: new Date('1990-01-01'),
            }, { merge: true }); // Use merge to avoid overwriting if exists

            // Create mock chat document
            const chatRef = doc(firestore, 'chats', chatId);
            await setDoc(chatRef, {
                participants: [testUserId, mockLawyerId],
                userId: testUserId,
                lawyerId: mockLawyerId,
                createdAt: serverTimestamp(),
                caseTitle: `[ทดสอบ] Ticket สนทนาจำลอง - ${new Date().toLocaleString('th-TH')}`,
                status: 'pending_payment', // This should show up in dashboard
                slipUrl: '',
                lastMessage: 'ข้อความทดสอบจากระบบ Seed',
                lastMessageAt: serverTimestamp(),
                amount: 500, // Match the amount shown in financial overview
            });

            // Create initial message
            const messagesRef = collection(chatRef, 'messages');
            await addDoc(messagesRef, {
                text: 'ข้อความทดสอบจากระบบ Seed - ทดสอบการแสดงผล Dashboard',
                senderId: testUserId,
                timestamp: serverTimestamp(),
            });

            toast({
                title: "สร้างข้อมูลจำลองสำเร็จ",
                description: `สร้าง Chat ID: ${chatId} + Lawyer Profile สำหรับ User: ${testUserId}`,
            });
        } catch (error: any) {
            console.error("Seeding mock chat failed:", error);
            toast({
                variant: "destructive",
                title: "สร้างข้อมูลไม่สำเร็จ",
                description: error.message,
            });
        } finally {
            setIsSeedingChat(false);
        }
    };

    const handleDeleteMockData = async () => {
        setIsDeleting(true);

        try {
            const { deleteTestData } = await import('@/app/actions/seed-actions');
            const result = await deleteTestData();

            if (result.success) {
                toast({
                    title: "ลบข้อมูลทดสอบสำเร็จ",
                    description: `ลบ ${result.deletedChats} Chats และ ${result.deletedLawyers} Lawyer Profiles`,
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error("Deleting mock data failed:", error);
            toast({
                variant: "destructive",
                title: "ลบข้อมูลไม่สำเร็จ",
                description: error.message,
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="container mx-auto py-10 max-w-2xl space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="w-6 h-6" />
                        Seed Database
                    </CardTitle>
                    <CardDescription>
                        Add sample data to your Firestore database for testing purposes.
                        This will add sample articles and approved lawyers.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 flex gap-2 items-start">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>
                            <strong>Warning:</strong> This action adds data to your production database.
                            It does not delete existing data, but may create duplicates if run multiple times
                            (though we try to avoid it). Use with caution.
                        </p>
                    </div>

                    <Button
                        onClick={handleSeed}
                        disabled={isSeeding || !firestore}
                        className="w-full"
                        size="lg"
                    >
                        {isSeeding ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Seeding...
                            </>
                        ) : (
                            "Seed Database Now"
                        )}
                    </Button>

                    {result && (
                        <div className={`rounded-lg p-4 border ${result.errors.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                            <h3 className={`font-bold mb-2 flex items-center gap-2 ${result.errors.length > 0 ? 'text-red-800' : 'text-green-800'}`}>
                                {result.errors.length > 0 ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                Result
                            </h3>
                            <ul className="space-y-1 text-sm">
                                <li className="text-gray-700">Articles Added: <strong>{result.articles}</strong></li>
                                <li className="text-gray-700">Lawyers Added: <strong>{result.lawyers}</strong></li>
                            </ul>
                            {result.errors.length > 0 && (
                                <div className="mt-4">
                                    <p className="font-bold text-red-800 text-sm mb-1">Errors:</p>
                                    <ul className="list-disc list-inside text-xs text-red-700">
                                        {result.errors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Mock Chat Seed Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-6 h-6" />
                        สร้าง Chat จำลอง (ทดสอบ Dashboard)
                    </CardTitle>
                    <CardDescription>
                        สร้าง Chat Ticket จำลองเพื่อทดสอบว่า Dashboard แสดงผลถูกต้อง
                        <br />
                        <strong>User UID:</strong> wS9w7ysNYUajNsBYZ6C7n2Afe9H3
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                        <p>
                            ระบบจะสร้าง Chat ใหม่พร้อม Status <strong>&quot;pending_payment&quot;</strong>
                            และข้อความทดสอบ เพื่อให้แสดงในหน้า Dashboard ของ User ที่ระบุ
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="targetUid">User UID (ID ของลูกค้าที่ต้องการทดสอบ)</Label>
                        <Input
                            id="targetUid"
                            value={targetUserId}
                            onChange={(e) => setTargetUserId(e.target.value)}
                            placeholder="วาง User UID ของลูกค้าที่นี่ (เช่น wS9w...)"
                        />
                        <p className="text-xs text-muted-foreground">
                            * หา UID ได้จากหน้า Users หรือ Firebase Console
                        </p>
                    </div>

                    <Button
                        onClick={handleSeedMockChat}
                        disabled={isSeedingChat || !firestore || !targetUserId}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        size="lg"
                    >
                        {isSeedingChat ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                กำลังสร้าง...
                            </>
                        ) : (
                            "สร้าง Mock Chat ทดสอบ"
                        )}
                    </Button>

                    <Button
                        onClick={handleDeleteMockData}
                        disabled={isDeleting || !firestore}
                        variant="destructive"
                        className="w-full"
                        size="lg"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                กำลังลบ...
                            </>
                        ) : (
                            <>
                                <Trash2 className="mr-2 h-4 w-4" />
                                ลบข้อมูลทดสอบทั้งหมด
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
