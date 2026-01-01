
'use client';
import { useState, useEffect, useRef } from 'react';
import type { ReportedTicket } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, UserCog, Languages } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/firebase/auth/use-user';
import { useFirebase } from '@/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { translateToMultipleLanguages } from '@/app/actions/translate';
import { useTranslations } from 'next-intl';

interface SupportChatBoxProps {
  ticket: ReportedTicket;
  isDisabled?: boolean;
  isAdmin?: boolean;
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
        <ScrollArea className="flex-grow p-6" ref={scrollAreaRef}>
          <div className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
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
                        <AvatarImage src={msg.avatarUrl || (msg.role === 'admin' ? adminProfile.avatar : undefined)} />
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
                        <p>{msg.text}</p>
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
                        <AvatarImage src={msg.avatarUrl || (isAdmin ? adminProfile.avatar : undefined)} />
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
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}
