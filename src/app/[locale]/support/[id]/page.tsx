
'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { ReportedTicket } from '@/lib/types';
import { SupportChatBox } from '@/components/chat/support-chat-box';

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { CopyButton } from '@/components/ui/copy-button';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Ticket, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { th, enUS, zhCN } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useTranslations, useLocale } from 'next-intl';
import { useFirebase } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/constants';

function SupportPageContent() {
    const params = useParams();
    const router = useRouter();
    const ticketId = params.id as string;
    const { firestore, user } = useFirebase();
    const t = useTranslations('SupportTicket');
    const locale = useLocale();

    const [ticket, setTicket] = useState<ReportedTicket | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [files, setFiles] = useState<{ name: string, size: number }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Date locale map
    const dateLocales: { [key: string]: any } = {
        th: th,
        en: enUS,
        zh: zhCN
    };
    const currentDateLocale = dateLocales[locale] || th;

    useEffect(() => {
        if (!ticketId || !firestore || !user) {
            return;
        }

        const ticketRef = doc(firestore, 'tickets', ticketId);
        const unsubscribe = onSnapshot(ticketRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setTicket({
                    id: docSnap.id,
                    caseId: data.caseId || '',
                    lawyerId: data.lawyerId || '',
                    caseTitle: data.caseTitle || '',
                    problemType: data.problemType || '',
                    status: data.status || 'pending',
                    reportedAt: data.reportedAt ? data.reportedAt.toDate() : new Date(),
                    clientName: data.clientName || '',
                    email: data.email || ''
                } as ReportedTicket);
            } else {
                setTicket(null);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching ticket:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [ticketId, firestore, user]);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE_BYTES) {
            toast({
                variant: "destructive",
                title: t('fileTooLarge'),
                description: t('fileTooLargeDesc', { size: MAX_FILE_SIZE_MB }),
            });
            return;
        }

        setFiles(prevFiles => [...prevFiles, { name: file.name, size: file.size }]);
        toast({
            title: t('uploadSuccess'),
            description: t('uploadSuccessDesc', { name: file.name }),
        });

        if (event.target) {
            event.target.value = '';
        }
    };

    const statusBadges: { [key: string]: React.ReactNode } = {
        pending: <Badge variant="outline" className="border-yellow-600 text-yellow-700 bg-yellow-50">{t('statusPending')}</Badge>,
        resolved: <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">{t('statusResolved')}</Badge>,
    }

    if (isLoading) {
        return <div>{t('loading')}</div>
    }

    if (!ticket) {
        return <div>{t('notFound')}</div>
    }

    const isResolved = ticket.status === 'resolved';

    return (
        <div className="container mx-auto px-4 md:px-6 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <SupportChatBox ticket={ticket} isDisabled={isResolved} />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Ticket className="w-5 h-5 text-muted-foreground" />
                                {t('detailsTitle')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('ticketId')}:</span>
                                <div className="flex items-center gap-1">
                                    <span className="font-mono font-semibold">{ticket.id}</span>
                                    <CopyButton value={ticket.id} />
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('relatedCase')}:</span>
                                <span className="font-mono">{ticket.caseId}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('issueType')}:</span>
                                <span className="font-semibold">{ticket.problemType}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('dateReported')}:</span>
                                <span>{format(ticket.reportedAt, 'dd MMM yyyy', { locale: currentDateLocale })}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('status')}:</span>
                                {statusBadges[ticket.status]}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('relatedDocs')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="space-y-2 text-sm">
                                    {files.length === 0 ? (
                                        <div className="text-center text-muted-foreground py-4 text-xs">
                                            <FileText className="mx-auto h-8 w-8 mb-2" />
                                            <p>{t('noDocs')}</p>
                                        </div>
                                    ) : (
                                        files.map((file, index) => (
                                            <div key={index} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-100">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                                    <span className="truncate" title={file.name}>{file.name}</span>
                                                </div>
                                                <span className="text-muted-foreground text-xs flex-shrink-0">
                                                    {(file.size / 1024 / 1024).toFixed(2)}MB
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    disabled={isResolved}
                                />
                                <Button onClick={handleUploadClick} className="w-full" disabled={isResolved}>
                                    <Upload className="mr-2 h-4 w-4" /> {t('uploadFile')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

export default function SupportPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SupportPageContent />
        </Suspense>
    )
}
