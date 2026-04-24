
'use client';
import { useState, useEffect, useRef } from 'react';
import type { ReportedTicket } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, UserCog, Languages, Paperclip, FileIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SecureImage } from '@/components/secure-image';
import { useUser } from '@/firebase/auth/use-user';
import { useFirebase } from '@/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { translateToMultipleLanguages } from '@/app/actions/translate';
import { getSecureDownloadUrl } from '@/app/actions/secure-view';
import { useTranslations } from 'next-intl';

interface SupportChatBoxProps {
  ticket: ReportedTicket;
  isDisabled?: boolean;
  isAdmin?: boolean;
  onFileUpload?: (file: File) => void;
  isUploading?: boolean;
}

interface SupportMessage {
  id: string;
  role: 'user' | 'admin';
  text: string;
  senderName: string;
  avatarUrl?: string;
  createdAt?: any;
  translation?: string;
  isTranslating?: boolean;
}

export function SupportChatBox({ ticket, isDisabled = false, isAdmin = false }: SupportChatBoxProps) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('SupportTicket');

  // For admin pages without intl context, default to 'th'

  const { auth, firestore } = useFirebase();
  const { data: user } = useUser(auth);

  const adminProfile = {
    name: 'ฝ่ายสนับสนุน',
    avatar: "https://picsum.photos/seed/admin-avatar/100/100"
  };

  const handleTranslateMessage = async (messageId: string, text: string) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, isTranslating: true } : msg
    ));

    try {
      const result = await translateToMultipleLanguages(text);

      // Translate to English by default for admin/support context
      const translatedText = result.english;

      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, translation: translatedText, isTranslating: false }
          : msg
      ));
    } catch (error) {
      console.error('Translation failed:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, isTranslating: false } : msg
      ));
    }
  };

  useEffect(() => {
    if (!firestore || !ticket.id) return;

    const messagesRef = collection(firestore, 'tickets', ticket.id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: SupportMessage[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SupportMessage));
      setMessages(msgs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, ticket.id]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollableNode = scrollAreaRef.current.querySelector('div[style*="overflow: scroll"]');
      if (scrollableNode) {
        scrollableNode.scrollTop = scrollableNode.scrollHeight;
      }
    }
  }, [messages]);

  const handleFileClick = async (text: string) => {
    const fileName = text.replace('[อัปโหลดไฟล์]', '').trim();
    const file = ticket.files?.find((f: any) => f.name === fileName);

    if (!file) return;

    try {
      const url = await getSecureDownloadUrl(file.url);
      if (!url) return;

      const isImage = file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
      if (isImage) {
        setSelectedImage(url);
      } else {
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error("Failed to view file:", err);
    }
  };


  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || !user || !firestore || isDisabled) return;

    const text = input.trim();
    setInput('');

    try {
      const messagesRef = collection(firestore, 'tickets', ticket.id, 'messages');
      await addDoc(messagesRef, {
        text,
        senderId: user.uid,
        senderName: user.displayName || (isAdmin ? 'Admin' : 'ลูกค้า'),
        role: isAdmin ? 'admin' : 'user',
        createdAt: serverTimestamp(),
        avatarUrl: user.photoURL || null
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const isOwnMessage = (msg: SupportMessage) =>
    (msg.role === 'user' && !isAdmin) || (msg.role === 'admin' && isAdmin);

  return (
    <Card className="flex flex-col h-[80vh] shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="text-xl">{t('ticketId')}: {ticket.id}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('chatSubtitle')} "{ticket.caseTitle}"</p>
      </CardHeader>

      <CardContent className="flex-grow p-0 flex flex-col min-h-0">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-6">
            {/* Initial Description */}
            {ticket.description && (
              <div className="flex justify-start mb-6">
                <div className="max-w-[85%] bg-slate-100 rounded-2xl rounded-tl-none p-4 shadow-sm border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">รายละเอียดปัญหาเริ่มต้น</p>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {ticket.description}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-2 text-right">
                    {formatTime(ticket.reportedAt)}
                  </p>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 && !ticket.description ? (
              <div className="text-center text-muted-foreground py-10">
                {t('noMessages')}
              </div>
            ) : (
              messages.map((msg) => {
                const ownMessage = isOwnMessage(msg);

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${ownMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    {!ownMessage && (
                      <Avatar className="h-10 w-10">
                        <SecureImage src={msg.avatarUrl || (msg.role === 'admin' ? adminProfile.avatar : undefined)} alt={msg.senderName} className="h-full w-full" />
                        <AvatarFallback>
                          <UserCog className="w-5 h-5" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex flex-col gap-1">
                        <div
                          className={`max-w-md rounded-lg px-4 py-2 shadow-sm text-sm ${ownMessage
                            ? 'bg-foreground text-background'
                            : 'bg-gray-200'
                            }`}
                        >
                          {msg.text.startsWith('[อัปโหลดไฟล์]') ? (
                            <div 
                              className="flex items-center gap-2 py-1 cursor-pointer hover:opacity-80"
                              onClick={() => handleFileClick(msg.text)}
                            >
                              <FileIcon className="w-4 h-4" />
                              <span className="font-medium underline">{msg.text.replace('[อัปโหลดไฟล์]', '').trim()}</span>
                            </div>
                          ) : (
                            <p>{msg.text}</p>
                          )}
                        </div>

                      {/* Translate button - show for messages from other party */}
                      {!ownMessage && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTranslateMessage(msg.id, msg.text)}
                            disabled={msg.isTranslating}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          >
                            {msg.isTranslating ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Languages className="w-3 h-3" />
                            )}
                            <span>{msg.translation ? t('retranslate') : t('translate')}</span>
                          </button>
                        </div>
                      )}

                      {/* Translation display */}
                      {msg.translation && !ownMessage && (
                        <div className="max-w-md px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs">
                          <p className="text-blue-700 font-medium mb-1">{t('translationLabel')}</p>
                          <p className="text-blue-800">{msg.translation}</p>
                        </div>
                      )}

                      <span className="text-xs text-muted-foreground">
                        {msg.senderName} • {msg.createdAt?.toDate ? formatTime(msg.createdAt.toDate()) : 'Just now'}
                      </span>
                    </div>
                    {ownMessage && (
                      <Avatar className="h-10 w-10">
                        <SecureImage src={msg.avatarUrl || (isAdmin ? adminProfile.avatar : undefined)} alt="Me" className="h-full w-full" />
                        <AvatarFallback>{isAdmin ? <UserCog className="w-5 h-5" /> : "Me"}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 border-t bg-white">
        <form onSubmit={handleSendMessage} className="flex items-center w-full space-x-2">
          {!isDisabled && onFileUpload && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFileUpload(file);
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isLoading || isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full h-10 w-10 text-muted-foreground"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
            </>
          )}
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isDisabled ? t('ticketResolved') : t('typeMessage')}
            disabled={isLoading || isDisabled}
            className="flex-grow rounded-full"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim() || isDisabled}
            className="rounded-full w-10 h-10 bg-blue-600 hover:bg-blue-700"
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </form>
      </CardFooter>
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none">
          {selectedImage && (
            <img 
              src={selectedImage} 
              alt="Preview" 
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg" 
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>

  );
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}
