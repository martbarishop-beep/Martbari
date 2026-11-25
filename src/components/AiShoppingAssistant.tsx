import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Sparkles,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
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
        ? "Hello! I am MartBari's AI Shopping Assistant. How can I help you today? You can ask about our smart gadgets, check prices, stock, or place an order directly with Cash on Delivery!"
        : 'আসসালামু আলাইকুম! আমি মার্টবাড়ির এআই শপিং অ্যাসিস্ট্যান্ট। যেকোনো গ্যাজেট বা হোম অ্যাপ্লায়েন্স খুঁজতে, দাম বা স্টক জানতে অথবা সরাসরি ক্যাশ অন ডেলিভারিতে অর্ডার করতে আমাকে জানান!',
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

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    } else {
      setConfirmClear(false);
    }
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

    // Capture last 10 prior messages before appending current message
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
    ? [
        'Show popular smart watches',
        'How does Cash on Delivery work?',
        'What are the delivery charges?',
        'I want to place an order',
      ]
    : [
        'স্মার্ট ওয়াচ দেখাও',
        'ক্যাশ অন ডেলিভারি আছে?',
        'ডেলিভারি চার্জ কত?',
        'আমি অর্ডার করতে চাই',
      ];

  return (
    <>
      {/* Floating Launcher Button (positioned above mobile bottom nav) */}
      <div className="fixed bottom-[74px] right-3 md:bottom-6 md:right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isEn ? 'Open AI Shopping Assistant' : 'এআই শপিং অ্যাসিস্ট্যান্ট খুলুন'}
          className="group relative flex items-center gap-2 rounded-full bg-[#17263E] px-3.5 py-2.5 sm:px-4 sm:py-3 text-white shadow-xl hover:bg-[#1e304f] hover:shadow-2xl active:scale-95 transition-all duration-200 border border-white/15 cursor-pointer"
        >
          <div className="relative flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-[#F47125] transition-transform duration-300 group-hover:rotate-12" />
            {hasUnread && !isOpen && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#F47125] animate-ping" />
            )}
          </div>
          <span className="hidden sm:inline text-xs font-bold tracking-wide">
            {isEn ? 'AI Assistant' : 'মার্টবাড়ি অ্যাসিস্ট্যান্ট'}
          </span>
          <span className="inline-flex items-center justify-center rounded-full bg-[#F47125] px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
            AI
          </span>
        </button>
      </div>

      {/* Floating Chat Drawer Window (nearly fullscreen on mobile, floating card on desktop) */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isEn ? 'MartBari Shopping Assistant' : 'মার্টবাড়ি শপিং অ্যাসিস্ট্যান্ট'}
          className="fixed inset-2 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[420px] sm:h-[620px] z-50 flex flex-col rounded-2xl bg-white shadow-2xl border border-[#E1E4EA] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E1E4EA] bg-[#17263E] px-4 py-3.5 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/20">
                <Sparkles className="h-5 w-5 text-[#F47125]" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#17263E]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white">
                    {isEn ? 'MartBari Assistant' : 'মার্টবাড়ি অ্যাসিস্ট্যান্ট'}
                  </h3>
                  <span className="rounded bg-[#F47125]/20 border border-[#F47125]/40 px-1 py-0.2 text-[9px] font-bold text-[#F47125]">
                    AI
                  </span>
                </div>
                <p className="text-[11px] text-gray-300">
                  {isEn ? 'Online · Product & Order Support' : 'অনলাইন · পণ্য ও অর্ডার সহায়তা'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setConfirmClear((prev) => !prev)}
                title={isEn ? 'Clear history' : 'হিস্টরি মুছুন'}
                aria-label={isEn ? 'Clear history' : 'হিস্টরি মুছুন'}
                className="rounded-lg p-1.5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title={isEn ? 'Close assistant' : 'বন্ধ করুন'}
                aria-label={isEn ? 'Close assistant' : 'বন্ধ করুন'}
                className="rounded-lg p-1.5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Inline Clear History Confirmation Bar */}
          {confirmClear && (
            <div className="flex items-center justify-between gap-2 bg-amber-50 border-b border-amber-200 px-3.5 py-2 text-xs text-amber-950 shrink-0">
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
                  className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'না'}
                </button>
              </div>
            </div>
          )}

          {/* Quick Suggestions Chips */}
          {messages.length <= 2 && (
            <div className="border-b border-[#E1E4EA] bg-[#F8FAFC] px-3 py-2 shrink-0">
              <p className="text-[11px] font-medium text-[#5B6577] mb-1.5">
                {isEn ? 'Suggested questions:' : 'সরাসরি প্রশ্ন করুন:'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quickSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => void handleSendMessage(suggestion)}
                    className="rounded-full bg-white border border-[#E1E4EA] px-2.5 py-1 text-[11px] font-medium text-[#0F1A2C] hover:border-[#F47125] hover:text-[#F47125] transition-colors cursor-pointer text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FAF8F5]/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                    msg.role === 'user'
                      ? 'bg-[#17263E] text-white rounded-tr-xs'
                      : 'bg-white text-[#0F1A2C] border border-[#E1E4EA] rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-line break-words">{msg.content}</p>

                  {/* Product Cards inside Assistant Message */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-3 space-y-2 pt-2 border-t border-[#E1E4EA]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6577] block">
                        {isEn ? 'Recommended Products:' : 'সম্পর্কিত পণ্যসমূহ:'}
                      </span>
                      {msg.products.map((prod) => (
                        <div
                          key={prod.id}
                          className="flex items-center gap-2.5 rounded-xl border border-[#E1E4EA] bg-[#F8FAFC] p-2 hover:border-[#F47125] transition-colors"
                        >
                          <img
                            src={prod.image_url || '/pwa-512x512.png'}
                            alt={isEn ? prod.name_en : prod.name_bn}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/pwa-512x512.png';
                            }}
                            className="h-12 w-12 rounded-lg object-cover bg-white shrink-0 border border-gray-100"
                            loading="lazy"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[11px] font-bold text-[#0F1A2C] truncate">
                              {isEn ? prod.name_en : prod.name_bn}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-bold text-[#F47125]">
                                ৳{formatNumber(prod.price, lang)}
                              </span>
                              {prod.stock > 0 ? (
                                <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded">
                                  {isEn ? 'In Stock' : 'স্টকে আছে'}
                                </span>
                              ) : (
                                <span className="text-[9px] font-semibold text-rose-600 bg-rose-50 px-1 py-0.2 rounded">
                                  {isEn ? 'Out of stock' : 'স্টক শেষ'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <Link
                              to={localizedPath(`/product/${prod.slug}`)}
                              onClick={() => setIsOpen(false)}
                              className="rounded-lg bg-white border border-[#E1E4EA] px-2 py-1 text-[10px] font-bold text-[#0F1A2C] hover:text-[#F47125] text-center"
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
                              className="rounded-lg bg-[#F47125] px-2 py-1 text-[10px] font-bold text-white hover:bg-[#e05e13] text-center cursor-pointer"
                            >
                              {isEn ? 'Buy' : 'কিনুন'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Order Confirmation Card */}
                  {msg.order && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-[#0F1A2C]">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-1.5">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        <span>{isEn ? 'Order Received!' : 'অর্ডার গ্রহণ করা হয়েছে!'}</span>
                      </div>
                      <div className="space-y-1 text-[11px] text-[#334155]">
                        <p className="flex justify-between font-mono font-bold text-emerald-950">
                          <span>{isEn ? 'Order No:' : 'অর্ডার নম্বর:'}</span>
                          <span>{msg.order.order_number}</span>
                        </p>
                        <p className="flex justify-between">
                          <span>{isEn ? 'Customer:' : 'গ্রাহক:'}</span>
                          <span className="font-semibold">{msg.order.customer_name}</span>
                        </p>
                        <p className="flex justify-between">
                          <span>{isEn ? 'Phone:' : 'ফোন:'}</span>
                          <span className="font-mono">{msg.order.phone}</span>
                        </p>
                        <p className="truncate" title={msg.order.address}>
                          <span className="font-semibold">{isEn ? 'Address: ' : 'ঠিকানা: '}</span>
                          {msg.order.address}
                        </p>
                        <div className="border-t border-emerald-200 pt-1 mt-1 flex justify-between font-bold text-emerald-900 text-xs">
                          <span>{isEn ? 'Total (COD):' : 'মোট বিল (ক্যাশ অন ডেলিভারি):'}</span>
                          <span>৳{formatNumber(msg.order.total, lang)}</span>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-emerald-200 pt-2">
                        <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-medium">
                          <Clock className="h-3 w-3" />{' '}
                          {isEn ? 'Pending Admin Call' : 'অ্যাডমিন কনফার্ম করলে কল করা হবে'}
                        </span>
                        <Link
                          to={localizedPath(`/track-order?phone=${msg.order.phone}`)}
                          onClick={() => setIsOpen(false)}
                          className="text-[11px] font-bold text-[#F47125] hover:underline shrink-0"
                        >
                          {isEn ? 'Track Order →' : 'ট্র্যাক করুন →'}
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex items-start">
                <div className="rounded-2xl rounded-tl-xs bg-white border border-[#E1E4EA] px-4 py-3 shadow-xs">
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

          {/* Footer Input Bar */}
          <div className="border-t border-[#E1E4EA] bg-white p-3 shrink-0">
            {validationError && (
              <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1.5 text-[11px] font-medium text-rose-700">
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
                    ? 'Ask about gadgets or place an order...'
                    : 'গ্যাজেট সম্পর্কে জানুন বা অর্ডার করুন...'
                }
                disabled={isLoading}
                className="w-full rounded-xl border border-[#E1E4EA] bg-[#F8FAFC] py-2.5 pl-3.5 pr-11 text-xs text-[#0F1A2C] placeholder-gray-400 focus:border-[#F47125] focus:bg-white focus:outline-none transition-colors disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                aria-label={isEn ? 'Send message' : 'মেসেজ পাঠান'}
                className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[#F47125] text-white hover:bg-[#e05e13] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1.5 px-1">
              <span>
                {isEn ? 'MartBari AI Shopping Assistant' : 'মার্টবাড়ি এআই শপিং অ্যাসিস্ট্যান্ট'}
              </span>
              {inputMessage.length > 400 && (
                <span className={inputMessage.length >= 490 ? 'text-rose-500 font-bold' : ''}>
                  {inputMessage.length}/500
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
