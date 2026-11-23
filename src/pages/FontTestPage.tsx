import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useLanguage } from '../hooks/useLanguage';

export const FontTestPage: React.FC = () => {
  const { lang, switchLanguage } = useLanguage();
  const [testNumberStyle, setTestNumberStyle] = useState<'bn' | 'en'>('bn');

  const sizes = [
    { label: '12px (Small)', sizeClass: 'text-[12px]' },
    { label: '14px (Body Small)', sizeClass: 'text-[14px]' },
    { label: '16px (Body Standard / Mobile Minimum)', sizeClass: 'text-[16px]' },
    { label: '20px (H3 Heading)', sizeClass: 'text-[20px]' },
    { label: '28px (H2 Heading)', sizeClass: 'text-[28px]' },
    { label: '40px (Display Hero)', sizeClass: 'text-[40px]' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-10 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Typography Test Page (Noindex)</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="mx-auto max-w-5xl space-y-8 bg-white p-8 rounded-2xl shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#17263E]">MartBari Typography & Font Test Suite</h1>
            <p className="text-sm text-[#5B6577] mt-1">
              Testing Noto Sans Bengali Variable & Plus Jakarta Sans Variable across sizes, digits, conjuncts, and components.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => switchLanguage(lang === 'bn' ? 'en' : 'bn')}
              className="px-4 py-2 bg-[#17263E] text-white text-xs font-bold rounded-xl"
            >
              Current Lang: {lang.toUpperCase()} (Click to toggle)
            </button>
            <Link to="/" className="text-xs font-semibold text-[#F47125] hover:underline">
              ← Return Home
            </Link>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-[#FFF4EC] border border-[#F47125]/20 p-4 rounded-xl text-xs text-[#0F1A2C]">
          <p className="font-bold text-[#F47125] mb-1">How to remove this page later:</p>
          Delete <code className="bg-white px-1.5 py-0.5 rounded font-mono">src/pages/FontTestPage.tsx</code> and remove its route <code className="bg-white px-1.5 py-0.5 rounded font-mono">&lt;Route path="font-test" element=&#123;&lt;FontTestPage /&gt;&#125; /&gt;</code> from <code className="bg-white px-1.5 py-0.5 rounded font-mono">src/App.tsx</code>.
        </div>

        {/* Size Scale Inspection */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-[#17263E] border-b pb-2">1. Type Scale Inspection (12px to 40px)</h2>
          {sizes.map(({ label, sizeClass }) => (
            <div key={label} className="border border-gray-100 p-4 rounded-xl space-y-2 bg-[#FAFBFC]">
              <div className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">{label}</div>
              <div className={sizeClass}>
                <p className="font-bold">
                  {lang === 'bn' ? 'বিজ্ঞান ও প্রযুক্তির উৎকর্ষে আমাদের জীবনযাত্রার মান উন্নত হচ্ছে।' : 'Excellence in science and technology improves our quality of life.'}
                </p>
                <p className="text-[#5B6577] mt-1">
                  Digits: ০১২৩৪৫৬৭৮৯ | 0123456789 | Price: ৳১,২৯৯ / ৳1,299
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Conjunct Letters (যুক্তাক্ষর) Test */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#17263E] border-b pb-2">2. Complex Bangla Conjuncts (যুক্তাক্ষর) & Matras</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-gray-50 rounded-xl space-y-1">
              <span className="font-semibold text-xs text-gray-500 block">Conjunct Samples:</span>
              <p className="text-base font-medium">বিজ্ঞান, প্রযুক্তি, রাষ্ট্রীয়, সজীব, উজ্জ্বল, কৌতূহল, বিশ্বস্ত, সচ্ছলতা, অন্তর্ভুক্ত, বিশ্লেষণ।</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl space-y-1">
              <span className="font-semibold text-xs text-gray-500 block">Tabular Numerals / Countdown:</span>
              <p className="text-base font-mono tabular-nums font-bold">০২ : ১৫ : ৪৩ (02 : 15 : 43)</p>
            </div>
          </div>
        </div>

        {/* UI Components Verification */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#17263E] border-b pb-2">3. Component Typography Check</h2>
          <div className="flex flex-wrap items-center gap-4">
            <Button className="bg-[#F47125] text-white">
              {lang === 'bn' ? 'অর্ডার কনফার্ম করুন' : 'Confirm Order'}
            </Button>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              {lang === 'bn' ? 'স্টকে আছে' : 'In Stock'}
            </span>
            <span className="text-lg font-bold text-[#F47125] font-mono tabular-nums">
              ৳২,৯৯০
            </span>
          </div>

          {/* Sample Table */}
          <div className="border rounded-xl overflow-hidden mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="p-3">Order #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-3 font-mono">MB-98234</td>
                  <td className="p-3 font-semibold">মোহাম্মদ রহিম (Mohammad Rahim)</td>
                  <td className="p-3 font-mono tabular-nums">৳৩,৪৯০</td>
                  <td className="p-3">Delivered (ডেলিভার্ড)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
