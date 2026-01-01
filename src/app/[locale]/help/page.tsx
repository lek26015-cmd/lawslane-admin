
'use client';

import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, HelpCircle, Ticket } from "lucide-react"
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { notifyAdmins } from '@/app/actions/admin-notifications';
import { useTranslations, useLocale } from 'next-intl';

function HelpPageContent() {
  const searchParams = useSearchParams();
  const ticketIdParam = searchParams.get('ticketId');
  const [ticketId, setTicketId] = useState('');
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations('Help');
  const locale = useLocale();

  useEffect(() => {
    if (ticketIdParam) {
      setTicketId(ticketIdParam);
    }
  }, [ticketIdParam]);

  // Get FAQs from translations
  const faqKeys = [0, 1, 2, 3, 4, 5];
  const faqs = faqKeys.map(key => ({
    question: t(`faqs.${key}.question`),
    answer: t(`faqs.${key}.answer`)
  }));

  const problemTypes = [
    { key: 'communication', label: t('problemTypes.communication') },
    { key: 'payment', label: t('problemTypes.payment') },
    { key: 'technical', label: t('problemTypes.technical') },
    { key: 'quality', label: t('problemTypes.quality') },
    { key: 'other', label: t('problemTypes.other') },
  ];


  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-gradient-to-b from-primary/10 to-transparent pb-24 pt-16 md:pt-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <Link href={`/${locale}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4 bg-white/50 px-4 py-2 rounded-full backdrop-blur-sm">
              <ArrowLeft className="w-4 h-4" />
              {t('backToHome')}
            </Link>

            <div className="inline-flex items-center justify-center p-4 bg-white rounded-3xl shadow-sm animate-in fade-in zoom-in duration-500">
              <HelpCircle className="w-12 h-12 text-primary" />
            </div>

            <div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight font-headline text-foreground mb-4">
                {t('title')}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('subtitle')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-16 pb-20">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Report Issue Card */}
          <Card className="border-none shadow-xl shadow-gray-200/50 rounded-[2.5rem] overflow-hidden bg-white">
            <div className="bg-primary/5 p-8 md:p-10 border-b border-primary/10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm text-primary">
                  <Ticket className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-headline">{t('reportIssue')}</h2>
                  <p className="text-muted-foreground mt-1">{t('reportIssueSubtitle')}</p>
                </div>
              </div>
            </div>

            <CardContent className="p-8 md:p-10">
              <form className="space-y-6" onSubmit={async (e) => {
                e.preventDefault();
                if (!firestore || !user) {
                  toast({
                    title: t('loginRequiredTitle'),
                    description: t('loginRequiredDescription'),
                    variant: "destructive"
                  });
                  return;
                }

                setIsSubmitting(true);
                const formData = new FormData(e.target as HTMLFormElement);
                const problemType = formData.get('problemType') as string;
                const description = formData.get('description') as string;

                try {
                  const docRef = await addDoc(collection(firestore, 'tickets'), {
                    userId: user.uid,
                    caseId: ticketId, // Using ticketId input as caseId
                    problemType: problemType,
                    description: description,
                    status: 'pending',
                    reportedAt: serverTimestamp(),
                    clientName: user.displayName || 'Anonymous', // Fallback
                    email: user.email
                  });

                  // Create Admin Notification
                  await addDoc(collection(firestore, 'notifications'), {
                    type: 'ticket',
                    title: 'Ticket ใหม่',
                    message: `มี Ticket ใหม่จาก ${user.displayName || 'ผู้ใช้งาน'} หัวข้อ: ${problemType}`,
                    createdAt: serverTimestamp(),
                    read: false,
                    recipient: 'admin',
                    link: `/admin/tickets/${docRef.id}`,
                    relatedId: docRef.id
                  });

                  // Send Email Notification
                  notifyAdmins('new_ticket', {
                    ticketId: docRef.id,
                    problemType: problemType,
                    description: description,
                    clientName: user.displayName || 'ผู้ใช้งาน',
                    email: user.email
                  });

                  toast({
                    title: t('successTitle'),
                    description: t('successDescription'),
                    className: "bg-green-600 text-white border-none rounded-2xl",
                  });

                  setTicketId('');
                  (e.target as HTMLFormElement).reset();
                } catch (error) {
                  console.error("Error submitting ticket:", error);
                  toast({
                    title: t('errorTitle'),
                    description: t('errorDescription'),
                    variant: "destructive"
                  });
                } finally {
                  setIsSubmitting(false);
                }
              }}>
                <div className="space-y-2">
                  <Label htmlFor="ticket-id" className="text-base font-medium ml-1">{t('caseIdLabel')}</Label>
                  <Input
                    id="ticket-id"
                    name="ticketId"
                    placeholder={t('caseIdPlaceholder')}
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value)}
                    className="h-12 rounded-2xl bg-gray-50 border-gray-200 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="problem-type" className="text-base font-medium ml-1">{t('problemTypeLabel')}</Label>
                  <Select name="problemType">
                    <SelectTrigger id="problem-type" className="h-12 rounded-2xl bg-gray-50 border-gray-200 focus:bg-white transition-all">
                      <SelectValue placeholder={t('problemTypePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {problemTypes.map((type) => (
                        <SelectItem key={type.key} value={type.label} className="rounded-lg cursor-pointer">{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="problem-description" className="text-base font-medium ml-1">{t('problemDescriptionLabel')}</Label>
                  <Textarea
                    id="problem-description"
                    name="description"
                    placeholder={t('problemDescriptionPlaceholder')}
                    rows={5}
                    className="rounded-2xl bg-gray-50 border-gray-200 focus:bg-white transition-all resize-none p-4"
                  />
                </div>

                <Button className="w-full h-12 rounded-full text-lg font-medium shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all" disabled={isSubmitting}>
                  {isSubmitting ? t('submitting') : t('submitButton')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold font-headline">{t('faqTitle')}</h2>
              <p className="text-muted-foreground mt-2">{t('faqSubtitle')}</p>
            </div>

            <div className="grid gap-4">
              {faqs.map((faq, index) => (
                <Accordion type="single" collapsible className="w-full bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300" key={index}>
                  <AccordionItem value={`item-${index + 1}`} className="border-none px-6">
                    <AccordionTrigger className="text-lg font-semibold text-left hover:no-underline py-6">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-base text-muted-foreground pb-6 leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HelpPage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <HelpPageContent />
    </React.Suspense>
  )
}
