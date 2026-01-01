'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles, X, Loader2 } from 'lucide-react';
import { chat, type ChatResponse } from '@/ai/flows/chat-flow';
import type { ChatMessage } from '@/lib/types';
import { z } from 'zod';
import { useChat } from '@/context/chat-context';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';

const ChatRequestSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      content: z.array(z.object({ text: z.string() })),
    })
  ),
  prompt: z.string(),
});

const isChatResponse = (content: any): content is ChatResponse => {
  return content && Array.isArray(content.sections) && content.sections.every((s: any) => typeof s.title === 'string' && typeof s.content === 'string');
}

export default function ChatModal() {
  const { isAiChatOpen, setAiChatOpen, initialPrompt, setInitialPrompt } = useChat();
  const t = useTranslations('ChatModal');
  const locale = useLocale();

  const quickQuestions = [
    { key: 'contract', label: t('quickQuestions.contract') },
    { key: 'inheritance', label: t('quickQuestions.inheritance') },
    { key: 'company', label: t('quickQuestions.company') },
    { key: 'land', label: t('quickQuestions.land') },
  ];

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: t('welcome'),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset welcome message when locale changes
  useEffect(() => {
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages.length > 0 && newMessages[0].id === '1') {
        newMessages[0] = {
          ...newMessages[0],
          content: t('welcome')
        };
      }
      return newMessages;
    });
  }, [locale, t]);

  useEffect(() => {
    if (initialPrompt && isAiChatOpen) {
      handleInitialPrompt(initialPrompt);
      setInitialPrompt(''); // Clear the prompt after using it
    }
  }, [initialPrompt, isAiChatOpen]);

  const handleInitialPrompt = async (prompt: string) => {
    setIsLoading(true);
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
    };
    setMessages((prev) => [...prev, userMessage]);
    await processChat(prompt);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleQuickQuestion = async (question: string) => {
    setIsLoading(true);
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
    };
    setMessages((prev) => [...prev, userMessage]);

    await processChat(question);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    await processChat(input);
  };

  const processChat = async (prompt: string) => {
    try {
      const history = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
        content: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }],
      }));

      const request: z.infer<typeof ChatRequestSchema> = { history, prompt, locale };
      const response = await chat(request);

      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error processing chat:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: t('error'),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Dialog open={isAiChatOpen} onOpenChange={setAiChatOpen}>
      <DialogContent
        hideCloseButton={true}
        className="fixed inset-0 w-full h-full max-w-none translate-x-0 translate-y-0 rounded-none sm:inset-auto sm:bottom-[88px] sm:right-6 sm:w-96 sm:h-[70vh] sm:rounded-2xl bg-white shadow-2xl border z-50 p-0 flex flex-col origin-bottom-right data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-0 transition-all duration-300"

      >
        <DialogHeader className="flex flex-row justify-between items-center p-4 border-b bg-foreground text-background sm:rounded-t-2xl">
          <DialogTitle asChild>
            <h3 className="text-xl font-bold">{t('title')}</h3>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Chat with the AI assistant to get legal advice.
          </DialogDescription>
          <button onClick={() => setAiChatOpen(false)} className="text-background/70 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </DialogHeader>

        <ScrollArea className="flex-grow p-4 bg-gray-50">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shadow-md">
                      <Sparkles className="w-5 h-5" />
                    </div>
                  </div>
                )}
                <div className={`max-w-xs lg:max-w-sm xl:max-w-md`}>
                  <div className={`p-3 rounded-2xl shadow-sm ${msg.role === 'user'
                    ? 'bg-foreground text-background'
                    : 'bg-white border'
                    }`}
                    style={msg.role === 'user' ? { borderTopRightRadius: 0 } : { borderTopLeftRadius: 0 }}
                  >
                    {typeof msg.content === 'string' ? (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    ) : isChatResponse(msg.content) ? (
                      <div className="space-y-3">
                        {msg.content.sections.map((section, index) => (
                          <div key={index}>
                            <h4 className="font-semibold text-sm mb-1">{section.title}</h4>
                            <p className="text-sm whitespace-pre-wrap">{section.content}</p>
                            {section.link && section.linkText && (
                              <div className="mt-2">
                                <Link href={section.link} onClick={() => setAiChatOpen(false)}>
                                  <Button variant="default" size="sm" className="w-full sm:w-auto">
                                    {section.linkText}
                                  </Button>
                                </Link>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex">
                <div className="flex-shrink-0 mr-3">
                  <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shadow-md">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="bg-white border p-3 rounded-2xl shadow-sm" style={{ borderTopLeftRadius: 0 }}>
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm text-muted-foreground">{t('thinking')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-3 border-t bg-gray-100">
          <p className="text-xs font-semibold text-muted-foreground mb-2 ml-1">{t('quickQuestionsLabel')}</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map(q => (
              <button
                key={q.key}
                onClick={() => handleQuickQuestion(q.label)}
                disabled={isLoading}
                className="text-xs px-3 py-1 bg-white border border-border rounded-full hover:bg-accent transition disabled:opacity-50 disabled:cursor-not-allowed">
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t bg-white sm:rounded-b-2xl">
          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder={t('inputPlaceholder')}
              disabled={isLoading}
              className="flex-grow px-4 py-3 rounded-full bg-gray-100 border-2 border-transparent focus:bg-white focus:border-primary transition outline-none"
            />
            <Button type="submit" size="icon" disabled={isLoading} className="p-3 rounded-full bg-foreground text-background hover:bg-foreground/90 transition shadow-lg w-11 h-11">
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>

      </DialogContent>
    </Dialog>
  );
}
