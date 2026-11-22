-- ============================================================================
-- MartBari — Complete Bilingual Demo Seed (Safe to Re-run / Idempotent)
-- ============================================================================
-- Run this script in Supabase SQL Editor AFTER running supabase/schema.sql.
-- Populates settings, 6 categories, 3 brands, 2 suppliers, 15 products with
-- multi-image verified stock galleries, variants, 5 hero banners, 4 pages,
-- 2 coupons, and sample approved product reviews.
-- ============================================================================

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS show_demo_data boolean NOT NULL DEFAULT true;

-- 1. Store Settings (singleton id = 1)
INSERT INTO public.settings (
  id,
  store_name_bn,
  store_name_en,
  phone,
  whatsapp,
  email,
  address_bn,
  address_en,
  facebook_url,
  instagram_url,
  tiktok_url,
  youtube_url,
  delivery_charge_dhaka,
  delivery_charge_outside,
  free_delivery_above,
  bkash_number,
  nagad_number,
  payment_note_bn,
  payment_note_en,
  announcement_bn,
  announcement_en,
  min_order_amount,
  maintenance_mode,
  show_demo_data
)
VALUES (
  1,
  'মার্টবাড়ি',
  'MartBari',
  '+880 1770-501652',
  '8801770501652',
  'martbari.shop@gmail.com',
  'ঢাকা, বাংলাদেশ',
  'Dhaka, Bangladesh',
  'https://facebook.com/martbari',
  'https://instagram.com/martbari',
  'https://tiktok.com/@martbari',
  'https://youtube.com/@martbari',
  70,
  130,
  3000,
  '01770501652',
  '01770501652',
  'সারা বাংলাদেশে ক্যাশ অন ডেলিভারি। বিকাশ বা নগদেও পেমেন্ট করতে পারবেন।',
  'Cash on Delivery available all over Bangladesh. bKash and Nagad accepted.',
  '৳৩,০০০+ অর্ডারে ফ্রি ডেলিভারি! সারা বাংলাদেশে ক্যাশ অন ডেলিভারি সুবিধা।',
  'Free delivery on orders above ৳3,000! Cash on Delivery all over Bangladesh.',
  300,
  false,
  true
)
ON CONFLICT (id) DO NOTHING;

-- 2. Categories (6 core categories with verified stock photos)
INSERT INTO public.categories (name_bn, name_en, slug, image_url, sort_order, is_active, seo_title_bn, seo_title_en)
VALUES
  ('স্মার্ট ওয়াচ', 'Smart Watches', 'smart-watches', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80', 1, true, 'স্মার্ট ওয়াচ - মার্টবাড়ি', 'Smart Watches - MartBari'),
  ('হেডফোন', 'Headphones', 'headphones', 'https://images.unsplash.com/photo-1597859359746-f6efe49ce11a?auto=format&fit=crop&w=800&q=80', 2, true, 'হেডফোন - মার্টবাড়ি', 'Headphones - MartBari'),
  ('ইয়ারবাডস', 'Earbuds', 'earbuds', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80', 3, true, 'ইয়ারবাডস - মার্টবাড়ি', 'Earbuds - MartBari'),
  ('হোম অ্যাপ্লায়েন্স', 'Home Appliances', 'home-appliances', 'https://images.pexels.com/photos/8879615/pexels-photo-8879615.jpeg?auto=compress&cs=tinysrgb&w=800', 4, true, 'হোম অ্যাপ্লায়েন্স - মার্টবাড়ি', 'Home Appliances - MartBari'),
  ('লাইটিং', 'Lighting', 'lighting', 'https://images.pexels.com/photos/19240055/pexels-photo-19240055/free-photo-of-vignette-image-of-a-lamp-on-a-desk.jpeg?auto=compress&cs=tinysrgb&w=800', 5, true, 'লাইটিং - মার্টবাড়ি', 'Lighting - MartBari'),
  ('মোবাইল এক্সেসরিজ', 'Mobile Accessories', 'mobile-accessories', 'https://images.unsplash.com/photo-1600490722773-35753aea6332?auto=format&fit=crop&w=800&q=80', 6, true, 'মোবাইল এক্সেসরিজ - মার্টবাড়ি', 'Mobile Accessories - MartBari')
ON CONFLICT (slug) DO UPDATE SET
  image_url = EXCLUDED.image_url;

-- 3. Brands (3 brands with verified logos)
INSERT INTO public.brands (name, slug, logo_url, is_active)
VALUES
  ('ApexTime', 'apextime', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80', true),
  ('SoundWave', 'soundwave', 'https://images.unsplash.com/photo-1597859359746-f6efe49ce11a?auto=format&fit=crop&w=400&q=80', true),
  ('LuminaHome', 'luminahome', 'https://images.pexels.com/photos/19240055/pexels-photo-19240055/free-photo-of-vignette-image-of-a-lamp-on-a-desk.jpeg?auto=compress&cs=tinysrgb&w=400', true)
ON CONFLICT (slug) DO UPDATE SET
  logo_url = EXCLUDED.logo_url;

-- 4. Suppliers (2 dropshipping suppliers)
INSERT INTO public.suppliers (name, phone, whatsapp, email, address, notes, is_active)
SELECT * FROM (
  VALUES
    ('Dhaka Gadget Wholesale', '+8801711000101', '8801711000101', 'wholesale@dhakagadget.example', 'Gulistan Tech Market, Dhaka', 'Primary smartwatch and earbuds supplier', true),
    ('Chattogram Home Tech Hub', '+8801811000202', '8801811000202', 'orders@ctghometech.example', 'Agrabad Commercial Area, Chattogram', 'Home appliances and smart lighting supplier', true)
) AS s(name, phone, whatsapp, email, address, notes, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers existing WHERE existing.name = s.name);

-- 5. Products (15 demo electronics products)
WITH
  c_watch AS (SELECT id FROM public.categories WHERE slug = 'smart-watches' LIMIT 1),
  c_head AS (SELECT id FROM public.categories WHERE slug = 'headphones' LIMIT 1),
  c_buds AS (SELECT id FROM public.categories WHERE slug = 'earbuds' LIMIT 1),
  c_home AS (SELECT id FROM public.categories WHERE slug = 'home-appliances' LIMIT 1),
  c_light AS (SELECT id FROM public.categories WHERE slug = 'lighting' LIMIT 1),
  c_acc AS (SELECT id FROM public.categories WHERE slug = 'mobile-accessories' LIMIT 1),
  b_apex AS (SELECT id FROM public.brands WHERE slug = 'apextime' LIMIT 1),
  b_sound AS (SELECT id FROM public.brands WHERE slug = 'soundwave' LIMIT 1),
  b_lumina AS (SELECT id FROM public.brands WHERE slug = 'luminahome' LIMIT 1),
  s_dhaka AS (SELECT id FROM public.suppliers WHERE name = 'Dhaka Gadget Wholesale' LIMIT 1),
  s_ctg AS (SELECT id FROM public.suppliers WHERE name = 'Chattogram Home Tech Hub' LIMIT 1)
INSERT INTO public.products (
  name_bn, name_en, slug, short_desc_bn, short_desc_en, description_bn, description_en,
  specifications, price, sale_price, cost_price, stock, sku, brand_id, category_id,
  warranty_bn, warranty_en, weight_grams, is_active, is_featured, is_new,
  supplier_id, supplier_sku, supplier_price, estimated_delivery_days
)
VALUES
  (
    'এপেক্সটাইম প্রো অ্যামোলেড স্মার্ট ওয়াচ', 'ApexTime Pro AMOLED Smart Watch', 'apextime-pro-amoled-watch',
    '১.৪৩" অ্যামোলেড ডিসপ্লে ও ব্লুটুথ কলিং সুবিধা', '1.43" AMOLED display with Bluetooth calling & 7-day battery',
    'দৈনন্দিন ফিটনেস ট্র্যাকিং, হার্ট রেট মনিটর, IP68 ওয়াটার রেজিস্ট্যান্স এবং স্পষ্ট অ্যামোলেড স্ক্রিন সহ স্মার্টওয়াচ।',
    'Built with a vibrant 1.43-inch AMOLED display, Bluetooth calling, SpO2 & heart-rate monitoring, and IP68 water resistance.',
    '[{"key_bn":"ডিসপ্লে","key_en":"Display","value_bn":"১.৪৩ ইঞ্চি অ্যামোলেড","value_en":"1.43-inch AMOLED"},{"key_bn":"ব্যাটারি","key_en":"Battery","value_bn":"৭ দিন","value_en":"7 Days"}]'::jsonb,
    3490, 2990, 2050, 4, 'MB-SW-001', (SELECT id FROM b_apex), (SELECT id FROM c_watch),
    '৬ মাসের ওয়ারেন্টি', '6 Months Warranty', 160, true, true, true,
    (SELECT id FROM s_dhaka), 'SUP-SW-101', 1950, 2
  ),
  (
    'এপেক্সটাইম আল্ট্রা ফিটনেস ওয়াচ', 'ApexTime Ultra Fitness Watch', 'apextime-ultra-fitness-watch',
    'স্পোর্টস মোড ও দীর্ঘস্থায়ী ব্যাটারি ব্যাকআপ', 'Rugged titanium-style bezel with 100+ sports modes',
    'অ্যাক্টিভ লাইফস্টাইলের জন্য উপযোগী মাল্টি-স্পোর্টস স্মার্টওয়াচ, স্লিপ ট্র্যাকিং ও ফাস্ট চার্জিং সাপোর্ট।',
    'Designed for active users with 100+ workout modes, sleep analytics, and magnetic fast charging.',
    '[{"key_bn":"ওয়াটারপ্রুফ","key_en":"Water Resistance","value_bn":"IP68","value_en":"IP68"}]'::jsonb,
    2850, 2490, 1680, 30, 'MB-SW-002', (SELECT id FROM b_apex), (SELECT id FROM c_watch),
    '৬ মাসের ওয়ারেন্টি', '6 Months Warranty', 180, true, false, true,
    (SELECT id FROM s_dhaka), 'SUP-SW-102', 1600, 2
  ),
  (
    'এপেক্সটাইম লাইট স্লিম স্মার্ট ওয়াচ', 'ApexTime Lite Slim Watch', 'apextime-lite-slim-watch',
    'হালকা ওজন ও সহজ বাংলা নোটিফিকেশন সাপোর্ট', 'Featherweight everyday watch with clear notifications',
    'হালকা ডিজাইন, সারাদিনের স্টেপ কাউন্টার ও স্মার্টফোন নোটিফিকেশন এলার্ট সহ নির্ভরযোগ্য ঘড়ি।',
    'Lightweight daily smartwatch featuring step tracking, call alerts, and up to 10 days standby.',
    '[{"key_bn":"ওজন","key_en":"Weight","value_bn":"৩৪ গ্রাম","value_en":"34g"}]'::jsonb,
    1890, NULL, 1150, 40, 'MB-SW-003', (SELECT id FROM b_apex), (SELECT id FROM c_watch),
    '৩ মাসের ওয়ারেন্টি', '3 Months Warranty', 120, true, false, false,
    (SELECT id FROM s_dhaka), 'SUP-SW-103', 1100, 3
  ),
  (
    'সাউন্ডওয়েভ এএনসি স্টুডিও হেডফোন', 'SoundWave ANC Studio Headphones', 'soundwave-anc-studio-headphones',
    'অ্যাক্টিভ নয়েজ ক্যান্সেলেশন ও ৪০ ঘণ্টা প্লেটাইম', 'Hybrid Active Noise Cancellation with 40H battery life',
    'ডিপ বেস, সফট মেমোরি-ফোম ইয়ারকাপ এবং ইউএসবি-সি ফাস্ট চার্জিং সহ প্রিমিয়াম ওয়্যারলেস হেডফোন।',
    'Over-ear wireless headphones with hybrid ANC, plush memory foam earcups, and USB-C fast charging.',
    '[{"key_bn":"ব্লুটুথ","key_en":"Bluetooth","value_bn":"৫.৩","value_en":"5.3"},{"key_bn":"প্লেটাইম","key_en":"Playtime","value_bn":"৪০ ঘণ্টা","value_en":"40 Hours"}]'::jsonb,
    4490, 3890, 2650, 18, 'MB-HP-001', (SELECT id FROM b_sound), (SELECT id FROM c_head),
    '৬ মাসের ওয়ারেন্টি', '6 Months Warranty', 320, true, true, true,
    (SELECT id FROM s_dhaka), 'SUP-HP-201', 2550, 2
  ),
  (
    'সাউন্ডওয়েভ বেস প্রো ওয়্যারলেস হেডফোন', 'SoundWave Bass Pro Wireless', 'soundwave-bass-pro-wireless',
    'ফোল্ডেবল ডিজাইন ও ক্লিয়ার কল মাইক্রোফোন', 'Foldable wireless headset with dual-device pairing',
    'ক্লাস, মিটিং ও মিউজিকের জন্য আরামদায়ক হেডফোন। তারযুক্ত ও ওয়্যারলেস দুই মোডেই ব্যবহারযোগ্য।',
    'Dual-mode wired and Bluetooth headset ideal for online classes, work calls, and daily travel.',
    '[{"key_bn":"ড্রাইভার","key_en":"Driver","value_bn":"৪০ মিমি","value_en":"40mm Dynamic"}]'::jsonb,
    2250, 1950, 1320, 28, 'MB-HP-002', (SELECT id FROM b_sound), (SELECT id FROM c_head),
    '৩ মাসের ওয়ারেন্টি', '3 Months Warranty', 260, true, false, false,
    (SELECT id FROM s_dhaka), 'SUP-HP-202', 1250, 3
  ),
  (
    'সাউন্ডওয়েভ পডস প্রো ইয়ারবাডস', 'SoundWave Pods Pro Earbuds', 'soundwave-pods-pro-earbuds',
    'ইএনসি কোয়াড মাইক ও ৩০ ঘণ্টা কেস ব্যাকআপ', 'Quad-mic ENC call clarity & 30-hour charging case',
    'পরিষ্কার ভয়েস কল, লো-ল্যাটেন্সি গেমিং মোড এবং IPX5 স্প্ল্যাশ রেজিস্ট্যান্স সহ ট্রু ওয়্যারলেস ইয়ারবাডস।',
    'True wireless earbuds delivering crisp ENC calls, low-latency gaming mode, and IPX5 sweat protection.',
    '[{"key_bn":"চার্জিং পোর্ট","key_en":"Charging Port","value_bn":"ইউএসবি টাইপ-সি","value_en":"USB Type-C"}]'::jsonb,
    1790, 1490, 920, 3, 'MB-EB-001', (SELECT id FROM b_sound), (SELECT id FROM c_buds),
    '৬ মাসের ওয়ারেন্টি', '6 Months Warranty', 95, true, true, true,
    (SELECT id FROM s_dhaka), 'SUP-EB-301', 880, 2
  ),
  (
    'সাউন্ডওয়েভ মিনি এয়ার বাডস', 'SoundWave Mini Air Buds', 'soundwave-mini-air-buds',
    'কম্প্যাক্ট পকেট কেস ও টাচ কন্ট্রোল', 'Pocket-friendly case with instant auto-pairing',
    'দৈনন্দিন যাতায়াতের জন্য ছোট ও আরামদায়ক ইয়ারবাডস, টাচ সেন্সর ও ফাস্ট পেয়ারিং সহ।',
    'Ultra-compact earbuds with tactile touch controls and reliable Bluetooth 5.3 connection.',
    '[{"key_bn":"ব্যাটারি","key_en":"Battery","value_bn":"২৪ ঘণ্টা","value_en":"24 Hours"}]'::jsonb,
    1150, 990, 620, 65, 'MB-EB-002', (SELECT id FROM b_sound), (SELECT id FROM c_buds),
    '৩ মাসের ওয়ারেন্টি', '3 Months Warranty', 80, true, false, false,
    (SELECT id FROM s_dhaka), 'SUP-EB-302', 590, 2
  ),
  (
    'সাউন্ডওয়েভ গেমিং লো-ল্যাটেন্সি বাডস', 'SoundWave Gaming Buds X', 'soundwave-gaming-buds-x',
    '৪৫ms আল্ট্রা লো-ল্যাটেন্সি গেমিং মোড', '45ms ultra-low latency mode for mobile gaming',
    'মোবাইল গেমারদের জন্য নিখুঁত সাউন্ড সিঙ্ক ও ডুয়াল মোড ইয়ারবাডস।',
    'Tuned for mobile esports with 45ms low-latency audio sync and crisp spatial footsteps.',
    '[{"key_bn":"ল্যাটেন্সি","key_en":"Latency","value_bn":"৪৫ মিলিসেকেন্ড","value_en":"45ms"}]'::jsonb,
    1550, NULL, 940, 35, 'MB-EB-003', (SELECT id FROM b_sound), (SELECT id FROM c_buds),
    '৩ মাসের ওয়ারেন্টি', '3 Months Warranty', 105, true, false, true,
    (SELECT id FROM s_dhaka), 'SUP-EB-303', 900, 3
  ),
  (
    'লুমিনাহোম ডিজিটাল ইলেকট্রিক কেটলি', 'LuminaHome Digital Smart Kettle', 'luminahome-digital-smart-kettle',
    'টেম্পারেচার কন্ট্রোল ও ফুড-গ্রেড স্টেইনলেস স্টিল', 'Precision temperature control & 304 stainless steel body',
    '১.৫ লিটার ক্যাপাসিটি, ডিজিটাল এলইডি ডিসপ্লে ও অটো শাট-অফ নিরাপত্তা সহ আধুনিক ইলেকট্রিক কেটলি।',
    '1.5L electric kettle with real-time LED temperature readout, keep-warm mode, and boil-dry protection.',
    '[{"key_bn":"ধারণক্ষমতা","key_en":"Capacity","value_bn":"১.৫ লিটার","value_en":"1.5 Liters"},{"key_bn":"পাওয়ার","key_en":"Power","value_bn":"১৫০০ ওয়াট","value_en":"1500W"}]'::jsonb,
    2950, 2590, 1780, 22, 'MB-HA-001', (SELECT id FROM b_lumina), (SELECT id FROM c_home),
    '১ বছরের ওয়ারেন্টি', '1 Year Warranty', 1150, true, true, true,
    (SELECT id FROM s_ctg), 'SUP-HA-401', 1700, 3
  ),
  (
    'লুমিনাহোম পোর্টেবল রিচার্জেবল ব্লেন্ডার', 'LuminaHome Portable USB Blender', 'luminahome-portable-usb-blender',
    '৬ ব্লেড ও টাইপ-সি চার্জিং জুসার', '6-blade stainless cutter for smoothies anywhere',
    'ফ্রেশ জুস ও স্মুদি তৈরির জন্য ৩৮০ মিলি পোর্টেবল রিচার্জেবল ব্লেন্ডার।',
    '380ml BPA-free travel blender powered by USB-C rechargeable battery for instant shakes.',
    '[{"key_bn":"ব্লেড","key_en":"Blades","value_bn":"৬টি স্টিল ব্লেড","value_en":"6 Steel Blades"}]'::jsonb,
    1390, 1190, 740, 42, 'MB-HA-002', (SELECT id FROM b_lumina), (SELECT id FROM c_home),
    '৩ মাসের ওয়ারেন্টি', '3 Months Warranty', 480, true, false, false,
    (SELECT id FROM s_ctg), 'SUP-HA-402', 700, 3
  ),
  (
    'লুমিনাহোম মিনি ডেস্ক এয়ার কুলার ফ্যান', 'LuminaHome Mist Desk Fan', 'luminahome-mist-desk-fan',
    'রিচার্জেবল মিস্ট কুলিং ও ৩ স্পিড মোড', '3-speed quiet desk fan with cooling mist tank',
    'গরমে আরামদায়ক বাতাস ও হালকা মিস্ট কুলিং সুবিধা, লো-নয়েজ মোটর সহ।',
    'Whisper-quiet personal cooling fan with 3 airflow levels and built-in rechargeable battery.',
    '[{"key_bn":"স্পিড","key_en":"Speed Levels","value_bn":"৩টি","value_en":"3 Levels"}]'::jsonb,
    1650, NULL, 980, 27, 'MB-HA-003', (SELECT id FROM b_lumina), (SELECT id FROM c_home),
    '৩ মাসের ওয়ারেন্টি', '3 Months Warranty', 650, true, false, false,
    (SELECT id FROM s_ctg), 'SUP-HA-403', 930, 3
  ),
  (
    'লুমিনাহোম আই-কেয়ার এলইডি ডেস্ক ল্যাম্প', 'LuminaHome Eye-Care Desk Lamp', 'luminahome-eyecare-desk-lamp',
    'টাচ ডিমিং ও ৩টি কালার টেম্পারেচার মোড', 'Flicker-free reading lamp with stepless touch dimming',
    'পড়াশোনা ও অফিস ডেস্কের জন্য চোখের আরামদায়ক ফ্লিকার-ফ্রি এলইডি টেবিল ল্যাম্প, রিচার্জেবল ব্যাকআপ সহ।',
    'Architect-style foldable LED desk lamp offering warm, neutral, and daylight modes with USB backup.',
    '[{"key_bn":"মোড","key_en":"Light Modes","value_bn":"৩টি কালার","value_en":"3 Color Temps"}]'::jsonb,
    1490, 1290, 810, 33, 'MB-LT-001', (SELECT id FROM b_lumina), (SELECT id FROM c_light),
    '৬ মাসের ওয়ারেন্টি', '6 Months Warranty', 520, true, true, false,
    (SELECT id FROM s_ctg), 'SUP-LT-501', 760, 3
  ),
  (
    'লুমিনাহোম মোশন সেন্সর ওয়্যারলেস লাইট', 'LuminaHome Motion Sensor Bar Light', 'luminahome-motion-sensor-light',
    'ম্যাগনেটিক মাউন্ট ও অটো মোশন ডিটেকশন', 'Magnetic under-cabinet USB rechargeable sensor light',
    'ওয়ার্ডরোব, রান্নাঘর বা সিঁড়ির জন্য অটো মোশন সেন্সর রিচার্জেবল এলইডি লাইট।',
    'Installs in seconds with magnetic adhesive strips and lights up automatically on motion detection.',
    '[{"key_bn":"দৈর্ঘ্য","key_en":"Length","value_bn":"৩০ সেমি","value_en":"30 cm"}]'::jsonb,
    750, 650, 380, 60, 'MB-LT-002', (SELECT id FROM b_lumina), (SELECT id FROM c_light),
    '৩ মাসের ওয়ারেন্টি', '3 Months Warranty', 190, true, false, true,
    (SELECT id FROM s_ctg), 'SUP-LT-502', 350, 3
  ),
  (
    'এপেক্সটাইম ১০,০০০ এমএএইচ ফাস্ট পাওয়ার ব্যাংক', 'ApexTime 10000mAh 22.5W Power Bank', 'apextime-10000mah-power-bank',
    '২২.৫ ওয়াট পিডি ফাস্ট চার্জিং ও ডিজিটাল ডিসপ্লে', '22.5W PD fast charging with LED percentage readout',
    'স্লিম পকেট-সাইজ পাওয়ার ব্যাংক, টাইপ-সি ও ডুয়াল ইউএসবি আউটপুট সহ।',
    'Compact 10000mAh power bank supporting 22.5W PD/QC fast charging for phones and accessories.',
    '[{"key_bn":"ক্ষমতা","key_en":"Capacity","value_bn":"১০,০০০ mAh","value_en":"10000mAh"}]'::jsonb,
    1590, 1390, 910, 45, 'MB-MA-001', (SELECT id FROM b_apex), (SELECT id FROM c_acc),
    '৬ মাসের ওয়ারেন্টি', '6 Months Warranty', 240, true, true, false,
    (SELECT id FROM s_dhaka), 'SUP-MA-601', 860, 2
  ),
  (
    'এপেক্সটাইম ৩৩ ওয়াট গাণ ফাস্ট চার্জার ও কেবল', 'ApexTime 33W GaN Fast Charger Kit', 'apextime-33w-gan-charger-kit',
    'ইউএসবি-সি + ইউএসবি-এ ডুয়াল পোর্ট ও ব্রেইডেড কেবল', 'Dual-port 33W GaN adapter with 1.5m braided USB-C cable',
    'স্মার্টফোন, ট্যাবলেট ও ইয়ারবাডসের নিরাপদ ও দ্রুত চার্জিংয়ের জন্য কমপ্যাক্ট GaN চার্জার।',
    'Cool-running 33W GaN wall charger with dual USB-C & USB-A outputs plus durable braided cable.',
    '[{"key_bn":"আউটপুট","key_en":"Output","value_bn":"৩৩ ওয়াট","value_en":"33W Max"}]'::jsonb,
    890, 790, 470, 55, 'MB-MA-002', (SELECT id FROM b_apex), (SELECT id FROM c_acc),
    '৬ মাসের ওয়ারেন্টি', '6 Months Warranty', 130, true, false, true,
    (SELECT id FROM s_dhaka), 'SUP-MA-602', 440, 2
  )
ON CONFLICT (slug) DO NOTHING;

-- 6. Verified Multi-Image Galleries for all 15 Demo Products
DELETE FROM public.product_images pi
USING public.products p
WHERE pi.product_id = p.id
  AND (p.sku LIKE 'DEMO-%' OR p.sku LIKE 'MB-%');

WITH demo_gallery(slug, sort_order, image_url) AS (
  VALUES
    ('apextime-pro-amoled-watch', 0, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'),
    ('apextime-pro-amoled-watch', 1, 'https://images.pexels.com/photos/5081914/pexels-photo-5081914.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('apextime-pro-amoled-watch', 2, 'https://images.pexels.com/photos/9528216/pexels-photo-9528216.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('apextime-ultra-fitness-watch', 0, 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80'),
    ('apextime-ultra-fitness-watch', 1, 'https://images.pexels.com/photos/9584702/pexels-photo-9584702.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('apextime-ultra-fitness-watch', 2, 'https://images.pexels.com/photos/9584703/pexels-photo-9584703.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('apextime-lite-slim-watch', 0, 'https://images.unsplash.com/photo-1503327431567-3ab5e6e79140?auto=format&fit=crop&w=800&q=80'),
    ('apextime-lite-slim-watch', 1, 'https://images.pexels.com/photos/5237704/pexels-photo-5237704.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('soundwave-anc-studio-headphones', 0, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'),
    ('soundwave-anc-studio-headphones', 1, 'https://images.unsplash.com/photo-1597859359746-f6efe49ce11a?auto=format&fit=crop&w=800&q=80'),
    ('soundwave-anc-studio-headphones', 2, 'https://images.pexels.com/photos/27507165/pexels-photo-27507165.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('soundwave-bass-pro-wireless', 0, 'https://images.unsplash.com/photo-1520170350707-b2da59970118?auto=format&fit=crop&w=800&q=80'),
    ('soundwave-bass-pro-wireless', 1, 'https://images.unsplash.com/photo-1597859359746-f6efe49ce11a?auto=format&fit=crop&w=800&q=80'),
    ('soundwave-bass-pro-wireless', 2, 'https://images.pexels.com/photos/1591/technology-music-sound-things.jpg?auto=compress&cs=tinysrgb&w=800'),
    ('soundwave-pods-pro-earbuds', 0, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80'),
    ('soundwave-pods-pro-earbuds', 1, 'https://images.pexels.com/photos/8553999/pexels-photo-8553999.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('soundwave-pods-pro-earbuds', 2, 'https://images.pexels.com/photos/11599421/pexels-photo-11599421.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('soundwave-mini-air-buds', 0, 'https://images.unsplash.com/photo-1525825691042-e14d9042fc70?auto=format&fit=crop&w=800&q=80'),
    ('soundwave-mini-air-buds', 1, 'https://images.pexels.com/photos/13387311/pexels-photo-13387311.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('soundwave-gaming-buds-x', 0, 'https://images.pexels.com/photos/10104890/pexels-photo-10104890.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('soundwave-gaming-buds-x', 1, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80'),
    ('luminahome-digital-smart-kettle', 0, 'https://images.pexels.com/photos/8879615/pexels-photo-8879615.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('luminahome-digital-smart-kettle', 1, 'https://images.unsplash.com/photo-1594213114663-d94db9b17125?auto=format&fit=crop&w=800&q=80'),
    ('luminahome-digital-smart-kettle', 2, 'https://images.unsplash.com/photo-1585683034983-b8c9d72a095a?auto=format&fit=crop&w=800&q=80'),
    ('luminahome-portable-usb-blender', 0, 'https://images.unsplash.com/photo-1500388953054-0d94398c7bf1?auto=format&fit=crop&w=800&q=80'),
    ('luminahome-portable-usb-blender', 1, 'https://images.pexels.com/photos/8879615/pexels-photo-8879615.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('luminahome-mist-desk-fan', 0, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80'),
    ('luminahome-mist-desk-fan', 1, 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=compress&cs=tinysrgb&w=800&q=80'),
    ('luminahome-eyecare-desk-lamp', 0, 'https://images.pexels.com/photos/19240055/pexels-photo-19240055/free-photo-of-vignette-image-of-a-lamp-on-a-desk.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('luminahome-eyecare-desk-lamp', 1, 'https://images.pexels.com/photos/8369211/pexels-photo-8369211.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('luminahome-eyecare-desk-lamp', 2, 'https://images.unsplash.com/photo-1580477667995-2b94f01c9516?auto=format&fit=crop&w=800&q=80'),
    ('luminahome-motion-sensor-light', 0, 'https://plus.unsplash.com/premium_photo-1681412205156-bb506a4ea970?auto=format&fit=crop&w=800&q=80'),
    ('luminahome-motion-sensor-light', 1, 'https://plus.unsplash.com/premium_photo-1668005190411-1042cd38522e?auto=format&fit=crop&w=800&q=80'),
    ('apextime-10000mah-power-bank', 0, 'https://images.unsplash.com/photo-1566554738544-d962991c3fee?auto=format&fit=crop&w=800&q=80'),
    ('apextime-10000mah-power-bank', 1, 'https://images.pexels.com/photos/4072683/pexels-photo-4072683.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('apextime-33w-gan-charger-kit', 0, 'https://images.unsplash.com/photo-1600490722773-35753aea6332?auto=format&fit=crop&w=800&q=80'),
    ('apextime-33w-gan-charger-kit', 1, 'https://images.pexels.com/photos/4072683/pexels-photo-4072683.jpeg?auto=compress&cs=tinysrgb&w=800')
)
INSERT INTO public.product_images (product_id, image_url, alt_bn, alt_en, sort_order)
SELECT p.id, g.image_url, p.name_bn, p.name_en, g.sort_order
FROM demo_gallery g
JOIN public.products p ON p.slug = g.slug;

-- 7. Sample Product Variants
INSERT INTO public.product_variants (product_id, name_bn, name_en, sku, price_override, cost_override, stock, is_active)
SELECT p.id, 'ম্যাট ব্ল্যাক', 'Matte Black', p.sku || '-BLK', NULL, NULL, 15, true
FROM public.products p
WHERE p.sku IN ('MB-SW-001', 'MB-HP-001', 'MB-EB-001')
  AND NOT EXISTS (
    SELECT 1 FROM public.product_variants pv WHERE pv.product_id = p.id AND pv.sku = p.sku || '-BLK'
  );

INSERT INTO public.product_variants (product_id, name_bn, name_en, sku, price_override, cost_override, stock, is_active)
SELECT p.id, 'সিলভার মিস্ট', 'Silver Mist', p.sku || '-SLV', NULL, NULL, 10, true
FROM public.products p
WHERE p.sku IN ('MB-SW-001', 'MB-HP-001')
  AND NOT EXISTS (
    SELECT 1 FROM public.product_variants pv WHERE pv.product_id = p.id AND pv.sku = p.sku || '-SLV'
  );

-- 8. Hero Banners (4 bilingual bento hero slides)
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
SELECT
  v.image_url,
  v.label_bn,
  v.label_en,
  v.title_bn,
  v.title_en,
  v.subtitle_bn,
  v.subtitle_en,
  v.price_badge_bn,
  v.price_badge_en,
  v.button_text_bn,
  v.button_text_en,
  v.secondary_button_text_bn,
  v.secondary_button_text_en,
  v.secondary_link_url,
  v.link_url,
  v.sort_order,
  true
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
) AS v(
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
WHERE NOT EXISTS (
  SELECT 1 FROM public.banners existing WHERE existing.link_url = v.link_url
);

-- 9. Content Pages (4 policy & about pages)
INSERT INTO public.pages (slug, title_bn, title_en, content_bn, content_en, is_active)
VALUES
  (
    'about',
    'আমাদের সম্পর্কে',
    'About MartBari',
    'মার্টবাড়ি বাংলাদেশের একটি বিশ্বস্ত অনলাইন ইলেকট্রনিক্স ও হোম অ্যাপ্লায়েন্স স্টোর। আমরা সেরা মানের স্মার্ট ওয়াচ, ইয়ারবাডস, হেডফোন এবং ঘরোয়া স্মার্ট পণ্য সারা বাংলাদেশে দ্রুত ক্যাশ অন ডেলিভারিতে পৌঁছে দিই।',
    'MartBari is your trusted online electronics, gadgets, and home appliances destination in Bangladesh. We curate reliable daily tech with transparent pricing and nationwide Cash on Delivery.',
    true
  ),
  (
    'return-policy',
    'রিটার্ন ও রিফান্ড নীতিমালা',
    'Return & Refund Policy',
    'ডেলিভারি গ্রহণের ৭ দিনের মধ্যে কোনো উৎপাদনজনিত ত্রুটি থাকলে পণ্য রিটার্ন বা পরিবর্তন করা যাবে। পণ্যটি অবশ্যই অক্ষত অবস্থায় ও আসল প্যাকেজিং সহ থাকতে হবে।',
    'Products with manufacturing defects or transit damage may be returned or replaced within 7 days of delivery, provided original packaging and accessories remain intact.',
    true
  ),
  (
    'privacy-policy',
    'গোপনীয়তা নীতি',
    'Privacy Policy',
    'আপনার নাম, ফোন নম্বর এবং ডেলিভারি ঠিকানা শুধুমাত্র অর্ডার প্রক্রিয়াকরণ ও কুরিয়ার ডেলিভারির জন্য ব্যবহার করা হয়। আমরা তৃতীয় পক্ষের কাছে ব্যক্তিগত তথ্য বিক্রি করি না।',
    'Your name, phone number, and delivery address are used strictly for order fulfillment, tracking, and customer support. We never sell personal customer information.',
    true
  ),
  (
    'terms',
    'শর্তাবলী',
    'Terms & Conditions',
    'মার্টবাড়ি থেকে অর্ডার করার মাধ্যমে আপনি আমাদের ডেলিভারি সময়সীমা, পেমেন্ট নিয়মাবলী এবং ওয়ারেন্টি শর্তাবলীতে সম্মতি প্রদান করছেন।',
    'By placing an order with MartBari, you agree to our standard delivery timelines, Cash on Delivery verification rules, and brand warranty terms.',
    true
  )
ON CONFLICT (slug) DO NOTHING;

-- 10. Coupons (WELCOME10 & FREESHIP)
INSERT INTO public.coupons (code, type, value, min_order_amount, max_discount, usage_limit, is_active)
VALUES
  ('WELCOME10', 'percent', 10, 500, 500, 1000, true),
  ('FREESHIP', 'fixed', 130, 1000, 130, 1000, true)
ON CONFLICT (code) DO NOTHING;

-- 11. Sample Approved Product Reviews
WITH sample_reviews(slug, customer_name, rating, comment) AS (
  VALUES
    ('apextime-pro-amoled-watch', 'Tanvir Ahmed', 5, 'Bright AMOLED screen and Bluetooth calling works clearly in Dhaka traffic. Battery lasted 6 days easily.'),
    ('apextime-pro-amoled-watch', 'Nusrat Jahan', 5, 'অসাধারণ কোয়ালিটি! হাতে পরতে খুব হালকা এবং নোটিফিকেশন খুব দ্রুত আসে।'),
    ('soundwave-anc-studio-headphones', 'Mahmudul Hasan', 5, 'Memory foam cups feel super comfortable for work calls and ANC cuts fan noise completely.'),
    ('soundwave-pods-pro-earbuds', 'Farhana Islam', 5, 'কলের সাউন্ড খুব পরিষ্কার এবং চার্জিং কেস অনেক দিন চলে। ক্যাশ অন ডেলিভারি সার্ভিস ভালো ছিল।'),
    ('luminahome-digital-smart-kettle', 'Ariful Haque', 5, 'Heats water rapidly and the digital LED temperature display is super accurate.')
)
INSERT INTO public.reviews (product_id, customer_name, rating, comment, is_approved)
SELECT p.id, sr.customer_name, sr.rating, sr.comment, true
FROM sample_reviews sr
JOIN public.products p ON p.slug = sr.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.reviews existing
  WHERE existing.product_id = p.id AND existing.customer_name = sr.customer_name
);
