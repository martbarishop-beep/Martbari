import React, { useState } from 'react';
import { ShieldCheck, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { theme } from '../config/theme';
import { useLanguage } from '../hooks/useLanguage';
import { cn } from '../lib/utils';
import type { Review } from '../types';
import { HomeSectionHeader } from './HomeSectionHeader';

interface HomeReviewsSectionProps {
  reviews: Review[];
  showDemoData: boolean;
}

const DEMO_FALLBACK_REVIEWS = [
  {
    id: 'demo-rev-1',
    name: 'তানভীর আহমেদ',
    nameEn: 'Tanvir Ahmed',
    comment:
      'স্মার্টওয়াচটি অর্ডার করার পরদিনই ঢাকায় ডেলিভারি পেয়েছি। কোয়ালিটি চমৎকার এবং ব্যাটারি ব্যাকআপ এক সপ্তাহ থাকে!',
    commentEn:
      'Received my smartwatch the very next day in Dhaka. Premium build and the battery easily lasts a full week!',
  },
  {
    id: 'demo-rev-2',
    name: 'ফারহানা ইসলাম',
    nameEn: 'Farhana Islam',
    comment:
      'ইয়ারবাডসের সাউন্ড এবং কলিং কোয়ালিটি খুব পরিষ্কার। ডেলিভারি ম্যানের সামনে চেক করে টাকা দেওয়ার সুবিধা পেয়ে খুব নিশ্চিন্ত লেগেছে।',
    commentEn:
      'Sound and ENC call clarity are superb. Loved the ability to inspect the package before paying the rider.',
  },
  {
    id: 'demo-rev-3',
    name: 'আরিফুল হক',
    nameEn: 'Ariful Haque',
    comment:
      'মার্টবাড়ি থেকে ইলেকট্রিক কেটলি অর্ডার করেছিলাম। একদম অরিজিনাল ও দ্রুত গরম হয়। ১০০% সুপারিশ করছি।',
    commentEn:
      'Ordered the smart kettle from MartBari. Authentic quality and heats rapidly. Highly recommended store!',
  },
];

export const HomeReviewsSection: React.FC<HomeReviewsSectionProps> = ({
  reviews,
  showDemoData,
}) => {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const [mobileExpanded, setMobileExpanded] = useState(false);

  if (reviews.length === 0 && !showDemoData) {
    return null;
  }

  const displayReviews =
    reviews.length > 0
      ? reviews.slice(0, 3).map((rev) => ({
          id: rev.id,
          name: rev.customer_name,
          comment: rev.comment || '',
          rating: rev.rating,
        }))
      : DEMO_FALLBACK_REVIEWS.map((rev) => ({
          id: rev.id,
          name: lang === 'bn' ? rev.name : rev.nameEn,
          comment: lang === 'bn' ? rev.comment : rev.commentEn,
          rating: 5,
        }));

  return (
    <section className="w-full">
      <div className={theme.layout.containerClass}>
        <div
          style={{ backgroundColor: theme.colors.sectionNavyTint }}
          className={theme.layout.homeSectionBoxClass}
        >
          <HomeSectionHeader
            eyebrow={t('home.reviewsEyebrow')}
            title={t('home.reviewsTitle')}
            subtitle={t('home.reviewsSubtitle')}
          />

          <div className="mt-5 md:mt-7 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
            {displayReviews.map((rev, index) => {
              const hideOnMobile = !mobileExpanded && index >= 1;
              return (
                <div
                  key={rev.id}
                  style={{
                    borderRadius: theme.radii.card,
                    boxShadow: theme.shadows.card,
                  }}
                  className={cn(
                    'desktop-card-lift flex flex-col border border-[#17263E]/10 bg-white p-4',
                    hideOnMobile && 'hidden md:flex',
                  )}
                >
                  <div className="flex items-center gap-1 text-[#F47125]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'h-4 w-4',
                          i < rev.rating ? 'fill-current' : 'text-[#E5E9F0]',
                        )}
                        aria-hidden="true"
                      />
                    ))}
                  </div>

                  <p className="mt-3 flex-1 text-sm leading-relaxed text-[#0F1A2C]">
                    "{rev.comment}"
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-[#17263E]/8 pt-3 text-xs text-[#5B6577]">
                    <span className="font-semibold text-[#0F1A2C] truncate">{rev.name}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 font-medium text-[#16A34A]">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t('home.verifiedBuyer')}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {displayReviews.length > 1 && (
            <div className="mt-5 flex justify-center md:hidden">
              <button
                type="button"
                onClick={() => setMobileExpanded((prev) => !prev)}
                className={cn(theme.buttons.secondary, 'min-h-[42px] px-5 text-xs')}
              >
                {mobileExpanded ? t('home.reviewsShowLess') : t('home.reviewsShowMore')}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
