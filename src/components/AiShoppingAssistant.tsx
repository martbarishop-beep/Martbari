import React, { useState, useEffect, useRef } from 'react';
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      const timer = setTimeout(() => inputRef.current?.focus(), 180);
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
      {/* Floating Launcher Button (58x58px circle, positioned cleanly above mobile bottom nav + safe-area) */}
      <div
        className={`fixed right-4 bottom-[calc(76px+env(safe-area-inset-bottom,0px))] md:bottom-6 md:right-6 z-40 ${
          isOpen ? 'hidden sm:block' : 'block'
        }`}
      >
        <div className="relative flex items-center justify-center">
          {/* Soft theme-matched ambient glow ring when closed */}
          {!isOpen && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-1.5 rounded-full bg-gradient-to-br from-[#F47125]/35 to-[#17263E]/30 blur-md motion-safe:animate-pulse"
            />
          )}

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label={
              isOpen
                ? isEn
                  ? 'Close AI Shopping Assistant'
                  : 'এআই শপিং অ্যাসিস্ট্যান্ট বন্ধ করুন'
                : isEn
                  ? 'Open AI Shopping Assistant'
                  : 'এআই শপিং অ্যাসিস্ট্যান্ট খুলুন'
            }
            aria-expanded={isOpen}
            className={`group relative flex h-[58px] w-[58px] items-center justify-center rounded-full text-white transition-all duration-200 ease-out hover:scale-105 hover:-translate-y-0.5 active:scale-95 motion-reduce:transform-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F47125] ${
              isOpen
                ? 'bg-[#0F1A2C] ring-2 ring-white/20 shadow-[0_12px_28px_-6px_rgba(15,26,44,0.45)]'
                : 'bg-gradient-to-br from-[#17263E] via-[#1E3557] to-[#F47125] ring-2 ring-white/30 shadow-[0_12px_30px_-6px_rgba(23,38,62,0.5),0_6px_18px_-4px_rgba(244,113,37,0.45)]'
            }`}
          >
            {isOpen ? (
              <X className="h-6 w-6 text-white transition-transform duration-200 group-hover:rotate-90" />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-7 w-7 text-white transition-transform duration-200 group-hover:scale-105"
              >
                <path
                  d="M12 3C7.03 3 3 6.58 3 11c0 2.02.84 3.87 2.24 5.29-.21 1.48-.89 2.81-1.93 3.74a.5.5 0 0 0 .35.87c2.17-.05 4.08-.77 5.44-1.71.91.2 1.89.31 2.9.31 4.97 0 9-3.58 9-8s-4.03-8.5-9-8.5Z"
                  fill="currentColor"
                  fillOpacity="0.18"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 7.25l.88 2.22 2.22.88-2.22.88-.88 2.22-.88-2.22-2.22-.88 2.22-.88.88-2.22Z"
                  fill="#FFF7ED"
                />
              </svg>
            )}

            {hasUnread && !isOpen && (
              <span
                aria-hidden="true"
                className="absolute top-0.5 right-0.5 h-3 w-3 rounded-full bg-[#F47125] ring-2 ring-white"
              />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Backdrop Scrim */}
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-[#0F1A2C]/50 backdrop-blur-[2px] sm:hidden"
        />
      )}

      {/* Chat Window: Mobile bottom-sheet fullscreen (100dvh safe) & Desktop 380x560 floating card */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isEn ? 'MartBari Shopping Assistant' : 'মার্টবাড়ি শপিং অ্যাসিস্ট্যান্ট'}
          className="fixed inset-x-0 bottom-0 z-50 flex h-[92dvh] max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-[#17263E]/12 bg-white text-[#0F1A2C] shadow-[0_-12px_40px_-10px_rgba(15,26,44,0.35)] dark:border-slate-700/80 dark:bg-[#0F172A] dark:text-slate-100 sm:inset-auto sm:bottom-[92px] sm:right-6 sm:h-[560px] sm:max-h-[calc(100dvh-112px)] sm:w-[380px] sm:rounded-2xl sm:shadow-[0_24px_54px_-14px_rgba(15,26,44,0.32)] animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {/* Mobile Sheet Handle */}
          <div className="flex justify-center bg-gradient-to-r from-[#0F1A2C] via-[#17263E] to-[#1E3354] pt-2 pb-0.5 sm:hidden shrink-0">
            <span className="h-1 w-10 rounded-full bg-white/30" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#0F1A2C] via-[#17263E] to-[#1E3354] px-4 py-3 text-white shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F47125] to-[#D95F18] text-white shadow-sm">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-white leading-snug">
                  {isEn ? 'MartBari Assistant' : 'মার্টবাড়ি অ্যাসিস্ট্যান্ট'}
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full ${
                      isLoading ? 'bg-[#F47125]' : 'bg-emerald-400'
                    }`}
                  />
                  <span className="truncate">
                    {isLoading
                      ? isEn
                        ? 'Typing a reply...'
                        : 'উত্তর লিখছে...'
                      : isEn
                        ? 'Online · Product & Order Help'
                        : 'অনলাইন · পণ্য ও অর্ডার সহায়তা'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmClear((prev) => !prev)}
                title={isEn ? 'Clear history' : 'হিস্টরি মুছুন'}
                aria-label={isEn ? 'Clear history' : 'হিস্টরি মুছুন'}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title={isEn ? 'Close assistant' : 'বন্ধ করুন'}
                aria-label={isEn ? 'Close assistant' : 'বন্ধ করুন'}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Inline Clear History Confirmation Bar */}
          {confirmClear && (
            <div className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-100 shrink-0">
              <span className="font-medium">
                {isEn ? 'Clear all chat messages?' : 'সব মেসেজ মুছে ফেলবেন?'}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleConfirmClearHistory}
                  className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-700 cursor-pointer"
                >
                  {isEn ? 'Clear' : 'হ্যাঁ, মুছুন'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-slate-800 dark:text-amber-100 cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'না'}
                </button>
              </div>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth bg-[#FAF8F5] px-3.5 py-4 space-y-3.5 dark:bg-[#0B1120]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#17263E] text-white rounded-tr-sm shadow-xs dark:bg-[#F47125] dark:text-white'
                      : 'bg-white text-[#0F1A2C] border border-[#17263E]/10 rounded-tl-sm shadow-xs dark:bg-[#1E293B] dark:border-slate-700 dark:text-slate-100'
                  }`}
                >
                  <p className="whitespace-pre-line break-words">{msg.content}</p>

                  {/* Product Cards inside Assistant Message */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-[#17263E]/10 pt-2.5 dark:border-slate-700">
                      <span className="block text-[11px] font-semibold text-[#5B6577] dark:text-slate-400">
                        {isEn ? 'Suggested products' : 'সম্পর্কিত পণ্যসমূহ'}
                      </span>
                      {msg.products.map((prod) => (
                        <div
                          key={prod.id}
                          className="flex items-center gap-2.5 rounded-xl border border-[#17263E]/10 bg-[#FAF8F5] p-2 transition-colors hover:border-[#F47125]/50 dark:border-slate-700 dark:bg-slate-800/80"
                        >
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[#17263E]/10 bg-white dark:border-slate-600 dark:bg-slate-900">
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
                            <h4 className="truncate text-xs font-bold text-[#0F1A2C] dark:text-slate-100">
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
                                    ? 'Out of stock'
                                    : 'স্টক শেষ'}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <Link
                              to={localizedPath(`/product/${prod.slug}`)}
                              onClick={() => setIsOpen(false)}
                              className="whitespace-nowrap rounded-lg border border-[#17263E]/15 bg-white px-2.5 py-1 text-center text-[11px] font-semibold text-[#17263E] transition-colors hover:border-[#F47125] hover:text-[#F47125] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
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
                              className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-[#F47125] px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-[#D95F18] cursor-pointer"
                            >
                              <ShoppingBag className="h-3 w-3" aria-hidden="true" />
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

          {/* Quick Reply Chips */}
          {messages.length <= 2 && !isLoading && (
            <div className="border-t border-[#17263E]/8 bg-white/95 px-3.5 py-2 dark:border-slate-800 dark:bg-[#0F172A] shrink-0">
              <div className="flex flex-wrap gap-1.5">
                {quickSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => void handleSendMessage(suggestion)}
                    className="whitespace-nowrap rounded-full border border-[#17263E]/15 bg-[#FAF8F5] px-3 py-1.5 text-[11px] font-semibold text-[#17263E] transition-colors hover:border-[#F47125] hover:bg-[#FFF4EC] hover:text-[#D95F18] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-[#F47125] dark:hover:text-[#F47125] cursor-pointer"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer Input Bar (safe-area aware for mobile keyboards) */}
          <div className="border-t border-[#17263E]/10 bg-white px-3.5 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-[#0F172A] shrink-0">
            {validationError && (
              <div className="mb-2 flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
            <div className="relative flex items-center gap-2">
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
                    ? 'Ask about products or place an order...'
                    : 'পণ্য সম্পর্কে জানুন বা অর্ডার করুন...'
                }
                disabled={isLoading}
                className="h-11 w-full rounded-xl border border-[#17263E]/15 bg-[#FAF8F5] pl-3.5 pr-12 text-[13px] text-[#0F1A2C] placeholder-[#5B6577] transition-colors focus:border-[#F47125] focus:bg-white focus:outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:bg-slate-900"
              />
              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                aria-label={isEn ? 'Send message' : 'মেসেজ পাঠান'}
                className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[#F47125] text-white transition-all duration-150 hover:bg-[#D95F18] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send className="h-4 w-4" />
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
