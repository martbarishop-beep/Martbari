import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Send,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { formatNumber } from '../lib/format';
import { acquireBodyScrollLock } from '../lib/scrollLock';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  products?: Array<{
    id: string;
    name_bn: string;
    name_en: string;
    slug: string;
    price: number;
    sale_price: number | null;
    stock: number;
    image_url: string;
  }>;
  order?: {
    order_number: string;
    customer_name: string;
    phone: string;
    address: string;
    subtotal: number;
    delivery_charge: number;
    total: number;
    status: string;
  };
}

const STORAGE_KEY = 'martbari_ai_chat_history_v2';

export const AiShoppingAssistant: React.FC = () => {
  const { lang, localizedPath } = useLanguage();
  const isEn = lang === 'en';

  const [isOpen, setIsOpen] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherButtonRef = useRef<HTMLButtonElement>(null);

  const openAssistant = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeAssistant = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Smooth enter/exit transition lifecycle (preserves message state while animating out)
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const raf = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => window.cancelAnimationFrame(raf);
    }

    setIsVisible(false);
    const timer = window.setTimeout(() => {
      setIsRendered(false);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  // Close with Escape key (especially on desktop)
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAssistant();
        window.setTimeout(() => launcherButtonRef.current?.focus(), 60);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, closeAssistant]);

  // Lock background page scrolling while mobile fullscreen sheet is open
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 639px)');
    let releaseLock: (() => void) | null = null;

    const syncLock = () => {
      if (mql.matches) {
        if (!releaseLock) {
          releaseLock = acquireBodyScrollLock();
        }
      } else if (releaseLock) {
        releaseLock();
        releaseLock = null;
      }
    };

    syncLock();
    mql.addEventListener('change', syncLock);
    return () => {
      mql.removeEventListener('change', syncLock);
      if (releaseLock) {
        releaseLock();
        releaseLock = null;
      }
    };
  }, [isOpen]);

  // Load message history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {
      // Ignore localStorage errors
    }

    const initialGreeting: ChatMessage = {
      id: 'greeting-1',
      role: 'assistant',
      content: isEn
        ? "Hello! I am MartBari's AI Shopping Assistant. Ask me about our gadgets, check prices or stock, or place an order directly with Cash on Delivery."
        : 'আসসালামু আলাইকুম! আমি মার্টবাড়ির শপিং অ্যাসিস্ট্যান্ট। যেকোনো পণ্যের দাম ও স্টক জানতে অথবা সরাসরি ক্যাশ অন ডেলিভারিতে অর্ডার করতে আমাকে জানান!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([initialGreeting]);
  }, [isEn]);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
      } catch {
        // Ignore quota errors
      }
    }
  }, [messages]);

  // Auto scroll to bottom smoothly
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
      const timer = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
    setConfirmClear(false);
  }, [isOpen, messages, isLoading]);

  const handleConfirmClearHistory = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    const resetGreeting: ChatMessage = {
      id: `greeting-${Date.now()}`,
      role: 'assistant',
      content: isEn
        ? "Chat history cleared. How can I assist you today with MartBari's products?"
        : 'মেসেজ হিস্টরি মুছে ফেলা হয়েছে। মার্টবাড়ি থেকে কী পণ্য খুঁজছেন জানান!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([resetGreeting]);
    setConfirmClear(false);
    setValidationError(null);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputMessage).trim();
    if (!text || isLoading) return;

    if (text.length > 500) {
      setValidationError(
        isEn
          ? 'Message cannot exceed 500 characters.'
          : 'মেসেজ সর্বোচ্চ ৫০০ অক্ষরের মধ্যে হতে হবে।',
      );
      return;
    }

    setValidationError(null);

    const historyPayload = messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) {
      setInputMessage('');
    }
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          lang,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok && !data?.reply) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      const replyText =
        data.reply ||
        (isEn
          ? 'Sorry, I could not process your request. Please try again.'
          : 'দুঃখিত, এই মুহূর্তে উত্তর দেওয়া সম্ভব হয়নি। আবার চেষ্টা করুন।');

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        products:
          Array.isArray(data.products) && data.products.length > 0 ? data.products : undefined,
        order: data.order || undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (!isOpen) {
        setHasUnread(true);
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `assistant-err-${Date.now()}`,
        role: 'assistant',
        content: isEn
          ? 'A connection error occurred. Please try again or contact us at +880 1770-501652.'
          : 'সংযোগে সমস্যা হচ্ছে। অনুগ্রহ করে একটু পর আবার চেষ্টা করুন অথবা আমাদের হটলাইনে (+880 1770-501652) কল করুন।',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const quickSuggestions = isEn
    ? ['Popular products', 'I want to order', 'Delivery charges', 'Cash on Delivery?']
    : ['জনপ্রিয় পণ্য', 'অর্ডার করতে চাই', 'ডেলিভারি চার্জ', 'ক্যাশ অন ডেলিভারি?'];

  return (
    <>
      {/* Slim Rounded-Square Floating Launcher (40x40 mobile, 44x44 desktop; hides completely when chat is open) */}
      <button
        ref={launcherButtonRef}
        type="button"
        onClick={openAssistant}
        aria-hidden={isOpen}
        tabIndex={isOpen ? -1 : 0}
        aria-label={
          isEn ? 'Open AI Shopping Assistant' : 'এআই শপিং অ্যাসিস্ট্যান্ট খুলুন'
        }
        aria-expanded={isOpen}
        aria-controls="martbari-ai-chat-dialog"
        className={`print:hidden fixed right-2.5 bottom-[calc(73px+env(safe-area-inset-bottom,0px))] md:bottom-3 md:right-3 z-40 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#17263E] via-[#1E3557] to-[#F47125] text-white ring-1 ring-white/25 shadow-[0_6px_18px_-4px_rgba(23,38,62,0.42),0_3px_10px_-4px_rgba(244,113,37,0.3)] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none hover:scale-[1.04] active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F47125] focus-visible:ring-2 focus-visible:ring-[#F47125]/40 ${
          isOpen
            ? 'opacity-0 translate-y-2 scale-90 pointer-events-none'
            : 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="h-5 w-5 text-white"
        >
          <path
            d="M12 3.5C7.3 3.5 3.5 6.86 3.5 11c0 1.9.8 3.64 2.12 4.97-.2 1.38-.82 2.62-1.78 3.48a.45.45 0 0 0 .32.78c2.02-.05 3.8-.72 5.06-1.59.86.19 1.79.29 2.78.29 4.7 0 8.5-3.36 8.5-7.93 0-4.14-3.8-7.5-8.5-7.5Z"
            fill="currentColor"
            fillOpacity="0.18"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M12 7.5l.78 1.92 1.92.78-1.92.78-.78 1.92-.78-1.92-1.92-.78 1.92-.78.78-1.92Z"
            fill="#FFF7ED"
          />
        </svg>

        {hasUnread && !isOpen && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#F47125] ring-2 ring-white"
          />
        )}
      </button>

      {/* Mobile Backdrop Scrim */}
      {isRendered && (
        <div
          aria-hidden="true"
          onClick={closeAssistant}
          className={`print:hidden fixed inset-0 z-40 bg-[#0F1A2C]/45 backdrop-blur-[1.5px] sm:hidden transition-opacity duration-200 motion-reduce:transition-none ${
            isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />
      )}

      {/* Compact Chat Window: Mobile 75dvh bottom sheet & Desktop 352x472 card */}
      {isRendered && (
        <div
          id="martbari-ai-chat-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={isEn ? 'AI Assistant' : 'AI সহকারী'}
          className={`print:hidden fixed inset-x-0 bottom-0 z-50 flex h-[75dvh] max-h-[75dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-[#17263E]/12 bg-white text-[#0F1A2C] shadow-[0_-10px_32px_-8px_rgba(15,26,44,0.3)] dark:border-slate-700/80 dark:bg-[#0F172A] dark:text-slate-100 sm:inset-auto sm:bottom-3 sm:right-3 sm:h-[472px] sm:max-h-[min(480px,70dvh)] sm:w-[352px] sm:rounded-2xl sm:shadow-[0_18px_42px_-12px_rgba(15,26,44,0.28)] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${
            isVisible
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-4 sm:scale-[0.97] pointer-events-none'
          }`}
        >
          {/* Slim Mobile Sheet Handle */}
          <div className="flex justify-center bg-gradient-to-r from-[#0F1A2C] via-[#17263E] to-[#1E3354] pt-1.5 pb-0.5 sm:hidden shrink-0">
            <span className="h-1 w-9 rounded-full bg-white/30" />
          </div>

          {/* Slim Header (44-48px) */}
          <div className="flex h-12 min-h-[44px] max-h-[48px] items-center justify-between gap-2 border-b border-white/10 bg-gradient-to-r from-[#0F1A2C] via-[#17263E] to-[#1E3354] px-3 text-white shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#F47125] to-[#D95F18] text-white">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="truncate text-[13px] font-bold text-white leading-[1.4]">
                  {isEn ? 'AI Assistant' : 'AI সহকারী'}
                </h3>
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    isLoading ? 'bg-[#F47125]' : 'bg-emerald-400'
                  }`}
                />
                {isLoading && (
                  <span className="truncate text-[11px] text-slate-300">
                    {isEn ? 'Typing...' : 'লিখছে...'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmClear((prev) => !prev)}
                title={isEn ? 'Clear history' : 'হিস্টরি মুছুন'}
                aria-label={isEn ? 'Clear history' : 'হিস্টরি মুছুন'}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#F47125]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              {/* Close Button (40x40px touch area, visually compact icon) */}
              <button
                type="button"
                onClick={closeAssistant}
                title={isEn ? 'Close (Esc)' : 'বন্ধ করুন (Esc)'}
                aria-label={isEn ? 'Close assistant' : 'এআই শপিং অ্যাসিস্ট্যান্ট বন্ধ করুন'}
                className="group flex h-10 w-10 items-center justify-center rounded-lg text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#F47125]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 transition-colors group-hover:bg-white/20">
                  <X className="h-3.5 w-3.5" />
                </span>
              </button>
            </div>
          </div>

          {/* Inline Clear History Confirmation Bar */}
          {confirmClear && (
            <div className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-100 shrink-0">
              <span className="font-medium leading-[1.4]">
                {isEn ? 'Clear all chat messages?' : 'সব মেসেজ মুছে ফেলবেন?'}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleConfirmClearHistory}
                  className="rounded-md bg-rose-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-rose-700 cursor-pointer"
                >
                  {isEn ? 'Clear' : 'হ্যাঁ'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-slate-800 dark:text-amber-100 cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'না'}
                </button>
              </div>
            </div>
          )}

          {/* Compact Messages Scroll Area */}
          <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth bg-[#FAF8F5] px-3 py-2.5 space-y-2 dark:bg-[#0B1120]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-xl px-2.5 py-2 text-[13px] sm:text-[13.5px] leading-[1.48] ${
                    msg.role === 'user'
                      ? 'bg-[#17263E] text-white rounded-tr-xs shadow-xs dark:bg-[#F47125] dark:text-white'
                      : 'bg-white text-[#0F1A2C] border border-[#17263E]/10 rounded-tl-xs shadow-xs dark:bg-[#1E293B] dark:border-slate-700 dark:text-slate-100'
                  }`}
                >
                  <p className="whitespace-pre-line break-words">{msg.content}</p>

                  {/* Compact Product Cards (2-3 fit comfortably at once) */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-2 space-y-1.5 border-t border-[#17263E]/10 pt-2 dark:border-slate-700">
                      {msg.products.map((prod) => (
                        <div
                          key={prod.id}
                          className="flex items-center gap-2 rounded-lg border border-[#17263E]/10 bg-[#FAF8F5] p-1.5 transition-colors hover:border-[#F47125]/50 dark:border-slate-700 dark:bg-slate-800/80"
                        >
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[#17263E]/10 bg-white dark:border-slate-600 dark:bg-slate-900">
                            <img
                              src={prod.image_url || '/pwa-512x512.png'}
                              alt={isEn ? prod.name_en : prod.name_bn}
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/pwa-512x512.png';
                              }}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="line-clamp-2 py-0.5 text-[12px] font-bold leading-[1.48] text-[#0F1A2C] dark:text-slate-100">
                              {isEn ? prod.name_en : prod.name_bn}
                            </h4>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                              <span className="font-bold text-[#F47125] tabular-nums">
                                ৳{formatNumber(prod.price, lang)}
                              </span>
                              <span aria-hidden="true" className="text-[#5B6577] dark:text-slate-500">
                                ·
                              </span>
                              <span
                                className={
                                  prod.stock > 0
                                    ? 'font-medium text-emerald-700 dark:text-emerald-400'
                                    : 'font-medium text-rose-600 dark:text-rose-400'
                                }
                              >
                                {prod.stock > 0
                                  ? isEn
                                    ? 'In stock'
                                    : 'স্টকে আছে'
                                  : isEn
                                    ? 'Out'
                                    : 'স্টক শেষ'}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <Link
                              to={localizedPath(`/product/${prod.slug}`)}
                              onClick={closeAssistant}
                              className="whitespace-nowrap rounded-md border border-[#17263E]/15 bg-white px-2 py-0.5 text-center text-[10.5px] font-semibold leading-[1.4] text-[#17263E] transition-colors hover:border-[#F47125] hover:text-[#F47125] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                            >
                              {isEn ? 'View' : 'দেখুন'}
                            </Link>
                            <button
                              type="button"
                              onClick={() =>
                                void handleSendMessage(
                                  isEn
                                    ? `I would like to order "${prod.name_en}"`
                                    : `আমি "${prod.name_bn}" পণ্যটি অর্ডার করতে চাই`,
                                )
                              }
                              className="inline-flex items-center justify-center gap-0.5 whitespace-nowrap rounded-md bg-[#F47125] px-2 py-0.5 text-[10.5px] font-bold leading-[1.4] text-white transition-colors hover:bg-[#D95F18] cursor-pointer"
                            >
                              <ShoppingBag className="h-2.5 w-2.5" aria-hidden="true" />
                              {isEn ? 'Buy' : 'কিনুন'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Order Confirmation Card */}
                  {msg.order && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-[#0F1A2C] dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-slate-100">
                      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>{isEn ? 'Order Received' : 'অর্ডার গ্রহণ করা হয়েছে'}</span>
                      </div>
                      <div className="space-y-1 text-[11px] text-[#334155] dark:text-slate-300">
                        <p className="flex justify-between font-mono font-bold text-emerald-950 dark:text-emerald-200 tabular-nums">
                          <span>{isEn ? 'Order No:' : 'অর্ডার নম্বর:'}</span>
                          <span>{msg.order.order_number}</span>
                        </p>
                        <p className="flex justify-between gap-2">
                          <span>{isEn ? 'Customer:' : 'গ্রাহক:'}</span>
                          <span className="font-semibold text-right">{msg.order.customer_name}</span>
                        </p>
                        <p className="flex justify-between gap-2">
                          <span>{isEn ? 'Phone:' : 'ফোন:'}</span>
                          <span className="font-mono tabular-nums">{msg.order.phone}</span>
                        </p>
                        <p className="truncate" title={msg.order.address}>
                          <span className="font-semibold">{isEn ? 'Address: ' : 'ঠিকানা: '}</span>
                          {msg.order.address}
                        </p>
                        <div className="mt-1 flex justify-between border-t border-emerald-200 pt-1 text-xs font-bold text-emerald-900 dark:border-emerald-800/60 dark:text-emerald-200 tabular-nums">
                          <span>{isEn ? 'Total (COD):' : 'মোট বিল (COD):'}</span>
                          <span>৳{formatNumber(msg.order.total, lang)}</span>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-emerald-200 pt-2 dark:border-emerald-800/60">
                        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                          <Clock className="h-3 w-3 shrink-0" />
                          {isEn ? 'Pending confirmation call' : 'অ্যাডমিন কনফার্ম করে কল করবে'}
                        </span>
                        <Link
                          to={localizedPath(`/track-order?phone=${msg.order.phone}`)}
                          onClick={() => setIsOpen(false)}
                          className="shrink-0 whitespace-nowrap text-[11px] font-bold text-[#F47125] hover:underline"
                        >
                          {isEn ? 'Track Order →' : 'ট্র্যাক করুন →'}
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
                <span className="mt-1 px-1 text-[10px] text-[#5B6577] dark:text-slate-400 tabular-nums">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex items-start">
                <div className="rounded-2xl rounded-tl-sm border border-[#17263E]/10 bg-white px-4 py-3 shadow-xs dark:border-slate-700 dark:bg-[#1E293B]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#F47125] animate-bounce" />
                    <span
                      className="h-2 w-2 rounded-full bg-[#F47125] animate-bounce"
                      style={{ animationDelay: '0.15s' }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-[#F47125] animate-bounce"
                      style={{ animationDelay: '0.3s' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Single-row Horizontally Scrollable Quick Reply Chips */}
          {messages.length <= 2 && !isLoading && (
            <div className="border-t border-[#17263E]/8 bg-white/95 px-3 py-1.5 dark:border-slate-800 dark:bg-[#0F172A] shrink-0">
              <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto no-scrollbar">
                {quickSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => void handleSendMessage(suggestion)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-[#17263E]/15 bg-[#FAF8F5] px-2.5 py-1 text-[11px] font-semibold leading-[1.4] text-[#17263E] transition-colors hover:border-[#F47125] hover:bg-[#FFF4EC] hover:text-[#D95F18] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-[#F47125] dark:hover:text-[#F47125] cursor-pointer"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Slim Input Bar (40px height, round send button, safe-area aware) */}
          <div className="border-t border-[#17263E]/10 bg-white px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-[#0F172A] shrink-0">
            {validationError && (
              <div className="mb-1.5 flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                maxLength={500}
                onChange={(e) => {
                  setInputMessage(e.target.value);
                  if (validationError && e.target.value.trim().length <= 500) {
                    setValidationError(null);
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  isEn
                    ? 'Ask about products or order...'
                    : 'পণ্য বা অর্ডার সম্পর্কে লিখুন...'
                }
                disabled={isLoading}
                className="h-10 w-full rounded-full border border-[#17263E]/15 bg-[#FAF8F5] pl-3.5 pr-11 text-[13.5px] leading-[1.45] text-[#0F1A2C] placeholder-[#5B6577] transition-colors focus:border-[#F47125] focus:bg-white focus:outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:bg-slate-900"
              />
              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                aria-label={isEn ? 'Send message' : 'মেসেজ পাঠান'}
                className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#F47125] text-white transition-all duration-150 hover:bg-[#D95F18] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>

            {inputMessage.length > 400 && (
              <div className="mt-1 flex justify-end px-1 text-[10px] tabular-nums">
                <span
                  className={
                    inputMessage.length >= 490
                      ? 'font-bold text-rose-500'
                      : 'text-[#5B6577] dark:text-slate-400'
                  }
                >
                  {inputMessage.length}/500
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
