import React, { useState } from 'react';
import { Mail, MapPin, MessageCircle, Navigation, Phone, Send } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Breadcrumb, Button, Input, Textarea } from '../components/ui';
import { STORE_DEFAULTS } from '../config/constants';
import { EDITORIAL_DEMO_IMAGES } from '../config/demoImages';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../hooks/useLanguage';
import { useSettings } from '../hooks/useSettings';
import { keepLatinDigits } from '../lib/format';

export const ContactPage: React.FC = () => {
  const { t } = useTranslation();
  const { lang, localizedPath, tField } = useLanguage();
  const { settings } = useSettings();
  const { showToast } = useToast();

  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [hubImgError, setHubImgError] = useState(false);

  const phone = keepLatinDigits(settings.phone || STORE_DEFAULTS.phone);
  const whatsapp = keepLatinDigits(settings.whatsapp || STORE_DEFAULTS.whatsapp).replace(
    /[^\d]/g,
    '',
  );
  const email = settings.email || STORE_DEFAULTS.email;
  const address = tField(settings, 'address') || 'Dhaka, Bangladesh';

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSenderName('');
      setSenderPhone('');
      setMessage('');
      showToast({
        type: 'success',
        title: lang === 'bn' ? 'বার্তা পাঠানো হয়েছে!' : 'Message Sent!',
        description:
          lang === 'bn'
            ? 'আমাদের কাস্টমার কেয়ার টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।'
            : 'Our customer support team will contact you shortly.',
      });
    }, 600);
  };

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>
          {lang === 'bn' ? 'যোগাযোগ' : 'Contact Us'} — {t('brand.name')}
        </title>
      </Helmet>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Breadcrumb
          items={[
            { label: t('nav.home'), to: localizedPath('/') },
            { label: t('nav.contact') },
          ]}
        />

        <div className="mt-6 border-b border-[#17263E]/10 pb-6">
          <h1 className="text-2xl font-bold text-[#0F1A2C] sm:text-3xl">
            {lang === 'bn' ? 'আমাদের সাথে যোগাযোগ করুন' : 'Get in Touch with MartBari'}
          </h1>
          <p className="mt-1.5 text-sm text-[#5B6577]">
            {lang === 'bn'
              ? 'পণ্য, ওয়ারেন্টি বা অর্ডার সংক্রান্ত যেকোনো সহায়তার জন্য আমরা ২৪/৭ প্রস্তুত।'
              : 'Have a question about our products, warranty, or delivery? Reach out to us.'}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left: Contact Info cards & Map Placeholder */}
          <div className="lg:col-span-7 space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <a
                href={`tel:${phone.replace(/[^+\d]/g, '')}`}
                className="flex items-center gap-4 rounded-[12px] border border-[#17263E]/10 bg-white p-5 shadow-soft hover:border-[#F47125]/40 transition-colors"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#17263E] text-white">
                  <Phone className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-medium text-[#5B6577]">{t('footer.phoneLabel')}</p>
                  <p className="text-sm font-semibold text-[#0F1A2C] tabular-nums">{phone}</p>
                </div>
              </a>

              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-[12px] border border-[#17263E]/10 bg-white p-5 shadow-soft hover:border-[#16A34A]/40 transition-colors"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#16A34A] text-white">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-medium text-[#5B6577]">{t('mobile.whatsapp')}</p>
                  <p className="text-sm font-semibold text-[#0F1A2C] tabular-nums">{phone}</p>
                </div>
              </a>

              <a
                href={`mailto:${email}`}
                className="flex items-center gap-4 rounded-[12px] border border-[#17263E]/10 bg-white p-5 shadow-soft hover:border-[#F47125]/40 transition-colors"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#F47125] text-white">
                  <Mail className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#5B6577]">{t('footer.emailLabel')}</p>
                  <p className="truncate text-sm font-semibold text-[#0F1A2C]">{email}</p>
                </div>
              </a>

              <div className="flex items-center gap-4 rounded-[12px] border border-[#17263E]/10 bg-white p-5 shadow-soft">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#17263E]/10 text-[#17263E]">
                  <MapPin className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-medium text-[#5B6577]">{t('brand.name')}</p>
                  <p className="text-sm font-semibold text-[#0F1A2C]">{address}</p>
                </div>
              </div>
            </div>

            {/* MartBari Central Hub Visual Card */}
            <div className="overflow-hidden rounded-2xl border border-[#17263E]/10 bg-[#F5F7FA] shadow-soft">
              <div className="flex items-center justify-between border-b border-[#17263E]/10 bg-white p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0F1A2C]">
                  <Navigation className="h-4 w-4 text-[#F47125]" />
                  <span>
                    {lang === 'bn' ? 'মার্টবাড়ি সেন্ট্রাল হাব' : 'MartBari Central Hub'}
                  </span>
                </div>
                <span className="text-[11px] text-[#5B6577]">{address}</span>
              </div>
              <div className="relative h-60 w-full overflow-hidden bg-[#17263E]">
                {!hubImgError && (
                  <img
                    src={EDITORIAL_DEMO_IMAGES.contactHub}
                    alt={lang === 'bn' ? 'মার্টবাড়ি সেন্ট্রাল হাব' : 'MartBari Logistics Center'}
                    width={1200}
                    height={600}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => setHubImgError(true)}
                    className="h-full w-full object-cover opacity-80"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F1A2C]/90 via-[#17263E]/45 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-3.5 p-5 text-white">
                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F47125] text-white shadow-card">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">
                      {lang === 'bn' ? 'মার্টবাড়ি ডেলিভারি হাব' : 'MartBari Logistics Center'}
                    </p>
                    <p className="text-xs text-white/80 mt-0.5">
                      {lang === 'bn'
                        ? 'ঢাকা, বাংলাদেশ • প্রতিদিন সারা দেশে এক্সপ্রেস ডেলিভারি'
                        : 'Dhaka, Bangladesh • Express nationwide dispatches daily'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Message Form */}
          <div className="lg:col-span-5">
            <form
              onSubmit={handleSendMessage}
              className="rounded-[12px] border border-[#17263E]/10 bg-white p-6 shadow-soft space-y-4"
            >
              <h2 className="text-base font-bold text-[#0F1A2C]">
                {lang === 'bn' ? 'সরাসরি মেসেজ পাঠান' : 'Send a Message'}
              </h2>

              <Input
                label={t('checkout.fullName')}
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. Tanvir Ahmed"
              />

              <Input
                label={t('checkout.phone')}
                type="tel"
                required
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
              />

              <Textarea
                label={lang === 'bn' ? 'আপনার বার্তা' : 'Your Message'}
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  lang === 'bn'
                    ? 'আপনার পণ্যের অনুসন্ধান বা জিজ্ঞাসা লিখুন...'
                    : 'Describe your query or order question...'
                }
              />

              <Button
                type="submit"
                fullWidth
                loading={sending}
                rightIcon={<Send className="h-4 w-4" />}
              >
                {lang === 'bn' ? 'বার্তা পাঠান' : 'Send Message'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};
