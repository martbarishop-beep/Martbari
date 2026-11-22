-- ============================================================================
-- MartBari — Update Hero Banners for Bento Grid Slideshow (Idempotent / Safe to Re-run)
-- ============================================================================
-- Run this script once in the Supabase SQL Editor.
-- It safely adds the new bilingual hero columns to public.banners and
-- updates or inserts the 4 bento hero slides:
--   1. Smart Watches (/category/smart-watches)
--   2. Headphones & Earbuds (/category/headphones)
--   3. Home Appliances (/category/home-appliances)
--   4. Mobile Accessories & Lighting (/category/mobile-accessories)
-- ============================================================================

-- 1. Add new bilingual columns safely (no-op if already present)
ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS label_bn text,
  ADD COLUMN IF NOT EXISTS label_en text,
  ADD COLUMN IF NOT EXISTS subtitle_bn text,
  ADD COLUMN IF NOT EXISTS subtitle_en text,
  ADD COLUMN IF NOT EXISTS price_badge_bn text,
  ADD COLUMN IF NOT EXISTS price_badge_en text,
  ADD COLUMN IF NOT EXISTS button_text_bn text,
  ADD COLUMN IF NOT EXISTS button_text_en text,
  ADD COLUMN IF NOT EXISTS secondary_button_text_bn text,
  ADD COLUMN IF NOT EXISTS secondary_button_text_en text,
  ADD COLUMN IF NOT EXISTS secondary_link_url text;

-- 2. Deactivate legacy standalone 5th demo slide (/category/lighting) if present
--    (Mobile Accessories & Lighting are combined cleanly into slide 4)
UPDATE public.banners
SET is_active = false
WHERE link_url = '/category/lighting';

-- 3. Upsert the 4 bento slideshow banners idempotently by link_url
DO $$
DECLARE
  v_slide record;
  v_existing_id uuid;
BEGIN
  FOR v_slide IN
    SELECT *
    FROM (
      VALUES
        (
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=85',
          'স্মার্ট ওয়াচ',
          'Smart Watches',
          'অ্যামোলেড স্মার্ট ওয়াচ ও ফিটনেস ট্র্যাকার',
          'AMOLED Smart Watches Built for Everyday Life',
          'ব্লুটুথ কলিং ও ৭ দিনের ব্যাটারি সহ সারা দেশে ক্যাশ অন ডেলিভারি।',
          'Bluetooth calling, bright AMOLED screens & 7-day battery backup.',
          'শুরু ৳১,৮৯০ থেকে',
          'From ৳1,890',
          'এখনই কিনুন',
          'Shop Now',
          'অফার দেখুন',
          'View Offers',
          '/shop?on_sale=true',
          '/category/smart-watches',
          1
        ),
        (
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1600&q=85',
          'হেডফোন ও ইয়ারবাডস',
          'Headphones & Earbuds',
          'স্টুডিও এএনসি হেডফোন ও ওয়্যারলেস ইয়ারবাডস',
          'Studio ANC Headphones & Wireless Earbuds',
          'ডিপ বেস সাউন্ড, ৪০ ঘণ্টা প্লেটাইম ও ক্লিয়ার ইএনসি কলিং কোয়ালিটি।',
          'Hybrid noise cancellation, deep bass & quad-mic ENC call clarity.',
          'শুরু ৳৯৯০ থেকে',
          'From ৳990',
          'এখনই কিনুন',
          'Shop Now',
          'অফার দেখুন',
          'View Offers',
          '/category/earbuds',
          '/category/headphones',
          2
        ),
        (
          'https://images.pexels.com/photos/8879615/pexels-photo-8879615.jpeg?auto=compress&cs=tinysrgb&w=1600',
          'হোম অ্যাপ্লায়েন্স',
          'Home Appliances',
          'স্মার্ট হোম ও আধুনিক কিচেন অ্যাপ্লায়েন্স',
          'Smart Home & Kitchen Essentials Delivered Fast',
          'ডিজিটাল কেটলি, পোর্টেবল ব্লেন্ডার ও কুলিং গ্যাজেট সাশ্রয়ী দামে।',
          'Digital kettles, portable blenders & compact cooling gadgets.',
          'শুরু ৳১,১৯০ থেকে',
          'From ৳1,190',
          'এখনই কিনুন',
          'Shop Now',
          'অফার দেখুন',
          'View Offers',
          '/shop?on_sale=true',
          '/category/home-appliances',
          3
        ),
        (
          'https://images.pexels.com/photos/8369211/pexels-photo-8369211.jpeg?auto=compress&cs=tinysrgb&w=1600',
          'মোবাইল এক্সেসরিজ ও লাইটিং',
          'Mobile Accessories & Lighting',
          'ফাস্ট চার্জিং গিয়ার ও স্মার্ট ডেস্ক লাইটিং',
          'Fast GaN Charging & Minimal LED Lighting',
          '২২.৫ ওয়াট পাওয়ার ব্যাংক, GaN চার্জার ও ফ্লিকার-ফ্রি ডেস্ক ল্যাম্প।',
          '22.5W power banks, 33W GaN adapters & eye-care LED desk lamps.',
          'শুরু ৳৬৫০ থেকে',
          'From ৳650',
          'এখনই কিনুন',
          'Shop Now',
          'অফার দেখুন',
          'View Offers',
          '/category/lighting',
          '/category/mobile-accessories',
          4
        )
    ) AS t(
      image_url,
      label_bn,
      label_en,
      title_bn,
      title_en,
      subtitle_bn,
      subtitle_en,
      price_badge_bn,
      price_badge_en,
      button_text_bn,
      button_text_en,
      secondary_button_text_bn,
      secondary_button_text_en,
      secondary_link_url,
      link_url,
      sort_order
    )
  LOOP
    SELECT id INTO v_existing_id
    FROM public.banners
    WHERE link_url = v_slide.link_url
    ORDER BY sort_order ASC, created_at ASC
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      UPDATE public.banners
      SET
        image_url = v_slide.image_url,
        label_bn = v_slide.label_bn,
        label_en = v_slide.label_en,
        title_bn = v_slide.title_bn,
        title_en = v_slide.title_en,
        subtitle_bn = v_slide.subtitle_bn,
        subtitle_en = v_slide.subtitle_en,
        price_badge_bn = v_slide.price_badge_bn,
        price_badge_en = v_slide.price_badge_en,
        button_text_bn = v_slide.button_text_bn,
        button_text_en = v_slide.button_text_en,
        secondary_button_text_bn = v_slide.secondary_button_text_bn,
        secondary_button_text_en = v_slide.secondary_button_text_en,
        secondary_link_url = v_slide.secondary_link_url,
        sort_order = v_slide.sort_order,
        is_active = true
      WHERE id = v_existing_id;
    ELSE
      INSERT INTO public.banners (
        image_url,
        label_bn,
        label_en,
        title_bn,
        title_en,
        subtitle_bn,
        subtitle_en,
        price_badge_bn,
        price_badge_en,
        button_text_bn,
        button_text_en,
        secondary_button_text_bn,
        secondary_button_text_en,
        secondary_link_url,
        link_url,
        sort_order,
        is_active
      )
      VALUES (
        v_slide.image_url,
        v_slide.label_bn,
        v_slide.label_en,
        v_slide.title_bn,
        v_slide.title_en,
        v_slide.subtitle_bn,
        v_slide.subtitle_en,
        v_slide.price_badge_bn,
        v_slide.price_badge_en,
        v_slide.button_text_bn,
        v_slide.button_text_en,
        v_slide.secondary_button_text_bn,
        v_slide.secondary_button_text_en,
        v_slide.secondary_link_url,
        v_slide.link_url,
        v_slide.sort_order,
        true
      );
    END IF;
  END LOOP;
END $$;
