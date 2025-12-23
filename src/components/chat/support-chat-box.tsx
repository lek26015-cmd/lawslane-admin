
'use client';
import { useState, useEffect, useRef } from 'react';
import type { ReportedTicket } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, UserCog } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/firebase/auth/use-user';
import { useFirebase } from '@/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

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
}

export function SupportChatBox({ ticket, isDisabled = false, isAdmin = false }: SupportChatBoxProps) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { auth, firestore } = useFirebase();
  const { data: user } = useUser(auth);

  const adminProfile = {
    name: 'ฝ่ายสนับสนุน',
    avatar: "https://picsum.photos/seed/admin-avatar/100/100"
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
    // Auto-scroll to bottom
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
    setInput(''); // Clear input immediately

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
      // Optionally show error toast
    }
  };

  return (
    <Card className="flex flex-col h-[80vh] shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="text-xl">Ticket: {ticket.id}</CardTitle>
        <p className="text-sm text-muted-foreground">พูดคุยกับฝ่ายสนับสนุนเกี่ยวกับเคส "{ticket.caseTitle}"</p>
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
                ยังไม่มีข้อความ เริ่มต้นสนทนาได้เลย
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${(msg.role === 'user' && !isAdmin) || (msg.role === 'admin' && isAdmin)
                    ? 'justify-end'
                    : 'justify-start'
                    }`}
                >
                  {((msg.role === 'admin' && !isAdmin) || (msg.role === 'user' && isAdmin)) && (
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={msg.avatarUrl || (msg.role === 'admin' ? adminProfile.avatar : undefined)} />
                      <AvatarFallback>
                        {msg.role === 'admin' ? <UserCog className="w-5 h-5" /> : <UserCog className="w-5 h-5" />}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex flex-col gap-1 items-end">
                    <div
                      className={`max-w-md rounded-lg px-4 py-2 shadow-sm text-sm ${(msg.role === 'user' && !isAdmin) || (msg.role === 'admin' && isAdmin)
                        ? 'bg-foreground text-background self-end'
                        : 'bg-gray-200'
                        }`}
                    >
                      <p>{msg.text}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {msg.senderName} • {msg.createdAt?.toDate ? formatTime(msg.createdAt.toDate()) : 'Just now'}
                    </span>
                  </div>
                  {((msg.role === 'user' && !isAdmin) || (msg.role === 'admin' && isAdmin)) && (
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={msg.avatarUrl || (isAdmin ? adminProfile.avatar : undefined)} />
                      <AvatarFallback>{isAdmin ? <UserCog className="w-5 h-5" /> : "Me"}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 border-t bg-white">
        <form onSubmit={handleSendMessage} className="flex items-center w-full space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isDisabled ? "Ticket นี้ได้รับการแก้ไขแล้ว" : "พิมพ์ข้อความถึงฝ่ายสนับสนุน..."}
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
