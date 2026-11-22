-- ============================================================================
-- MartBari — Update Demo Images (Safe to Re-run / Idempotent)
-- ============================================================================
-- Run this script in your Supabase SQL Editor to replace placeholder images
-- with verified, subject-matched stock photos across categories, brands,
-- hero banners, product_images (2-3 gallery images per product), and variants.
-- Safe to run repeatedly on existing DEMO-* and MB-* catalog rows.
-- ============================================================================

-- 1. Update Category Images (6 core categories)
UPDATE public.categories
SET image_url = CASE slug
  WHEN 'smart-watches' THEN 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'
  WHEN 'headphones' THEN 'https://images.unsplash.com/photo-1597859359746-f6efe49ce11a?auto=format&fit=crop&w=800&q=80'
  WHEN 'earbuds' THEN 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80'
  WHEN 'home-appliances' THEN 'https://images.pexels.com/photos/8879615/pexels-photo-8879615.jpeg?auto=compress&cs=tinysrgb&w=800'
  WHEN 'lighting' THEN 'https://images.pexels.com/photos/19240055/pexels-photo-19240055/free-photo-of-vignette-image-of-a-lamp-on-a-desk.jpeg?auto=compress&cs=tinysrgb&w=800'
  WHEN 'mobile-accessories' THEN 'https://images.unsplash.com/photo-1600490722773-35753aea6332?auto=format&fit=crop&w=800&q=80'
  ELSE image_url
END
WHERE slug IN (
  'smart-watches',
  'headphones',
  'earbuds',
  'home-appliances',
  'lighting',
  'mobile-accessories'
);

-- 2. Update Brand Logos
UPDATE public.brands
SET logo_url = CASE slug
  WHEN 'apextime' THEN 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80'
  WHEN 'soundwave' THEN 'https://images.unsplash.com/photo-1597859359746-f6efe49ce11a?auto=format&fit=crop&w=400&q=80'
  WHEN 'luminahome' THEN 'https://images.pexels.com/photos/19240055/pexels-photo-19240055/free-photo-of-vignette-image-of-a-lamp-on-a-desk.jpeg?auto=compress&cs=tinysrgb&w=400'
  ELSE logo_url
END
WHERE slug IN ('apextime', 'soundwave', 'luminahome');

-- 3. Update & Ensure 5 Verified Hero Banners (1600px wide)
UPDATE public.banners
SET image_url = CASE
  WHEN link_url ILIKE '%smart-watches%' OR sort_order = 1
    THEN 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=85'
  WHEN link_url ILIKE '%headphones%' OR link_url ILIKE '%earbuds%' OR sort_order = 2
    THEN 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1600&q=85'
  WHEN link_url ILIKE '%home-appliances%' OR sort_order = 3
    THEN 'https://images.pexels.com/photos/8879615/pexels-photo-8879615.jpeg?auto=compress&cs=tinysrgb&w=1600'
  WHEN link_url ILIKE '%lighting%' OR sort_order = 4
    THEN 'https://images.pexels.com/photos/8369211/pexels-photo-8369211.jpeg?auto=compress&cs=tinysrgb&w=1600'
  WHEN link_url ILIKE '%mobile-accessories%' OR sort_order = 5
    THEN 'https://images.unsplash.com/photo-1566554738544-d962991c3fee?auto=format&fit=crop&w=1600&q=85'
  ELSE 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=85'
END
WHERE image_url LIKE '/src/%'
   OR sort_order BETWEEN 1 AND 5;

INSERT INTO public.banners (image_url, title_bn, title_en, link_url, sort_order, is_active)
SELECT v.image_url, v.title_bn, v.title_en, v.link_url, v.sort_order, true
FROM (
  VALUES
    (
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=85',
      'অ্যামোলেড স্মার্ট ওয়াচ ও ফিটনেস ট্র্যাকার',
      'AMOLED Smart Watches Built for Everyday Life',
      '/category/smart-watches',
      1
    ),
    (
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1600&q=85',
      'স্টুডিও এএনসি হেডফোন ও ওয়্যারলেস ইয়ারবাডস',
      'Crystal-Clear Audio with Hybrid Noise Cancellation',
      '/category/headphones',
      2
    ),
    (
      'https://images.pexels.com/photos/8879615/pexels-photo-8879615.jpeg?auto=compress&cs=tinysrgb&w=1600',
      'আধুনিক হোম ও কিচেন অ্যাপ্লায়েন্স',
      'Smart Home & Kitchen Essentials Delivered Fast',
      '/category/home-appliances',
      3
    ),
    (
      'https://images.pexels.com/photos/8369211/pexels-photo-8369211.jpeg?auto=compress&cs=tinysrgb&w=1600',
      'চোখের আরামদায়ক ফ্লিকার-ফ্রি এলইডি লাইটিং',
      'Minimal LED Desk Lamps & Motion Sensor Lights',
      '/category/lighting',
      4
    ),
    (
      'https://images.unsplash.com/photo-1566554738544-d962991c3fee?auto=format&fit=crop&w=1600&q=85',
      'ফাস্ট পাওয়ার ব্যাংক ও গাণ চার্জার কিট',
      '22.5W Power Banks & Compact GaN Chargers',
      '/category/mobile-accessories',
      5
    )
) AS v(image_url, title_bn, title_en, link_url, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.banners b WHERE b.link_url = v.link_url
);

-- 4. Refresh Multi-Image Galleries in product_images for Demo Products (DEMO-% and MB-%)
-- Clears stale local/demo rows for demo products and inserts verified multi-image galleries.
DELETE FROM public.product_images pi
USING public.products p
WHERE pi.product_id = p.id
  AND (
    p.sku LIKE 'DEMO-%'
    OR p.sku LIKE 'MB-%'
    OR p.slug IN (
      'apextime-pro-amoled-watch',
      'apextime-ultra-fitness-watch',
      'apextime-lite-slim-watch',
      'soundwave-anc-studio-headphones',
      'soundwave-bass-pro-wireless',
      'soundwave-pods-pro-earbuds',
      'soundwave-mini-air-buds',
      'soundwave-gaming-buds-x',
      'luminahome-digital-smart-kettle',
      'luminahome-portable-usb-blender',
      'luminahome-mist-desk-fan',
      'luminahome-eyecare-desk-lamp',
      'luminahome-motion-sensor-light',
      'apextime-10000mah-power-bank',
      'apextime-33w-gan-charger-kit'
    )
  );

WITH demo_gallery(slug, sort_order, image_url) AS (
  VALUES
    -- Smart Watches
    ('apextime-pro-amoled-watch', 0, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'),
    ('apextime-pro-amoled-watch', 1, 'https://images.pexels.com/photos/5081914/pexels-photo-5081914.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('apextime-pro-amoled-watch', 2, 'https://images.pexels.com/photos/9528216/pexels-photo-9528216.jpeg?auto=compress&cs=tinysrgb&w=800'),

    ('apextime-ultra-fitness-watch', 0, 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80'),
    ('apextime-ultra-fitness-watch', 1, 'https://images.pexels.com/photos/9584702/pexels-photo-9584702.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('apextime-ultra-fitness-watch', 2, 'https://images.pexels.com/photos/9584703/pexels-photo-9584703.jpeg?auto=compress&cs=tinysrgb&w=800'),

    ('apextime-lite-slim-watch', 0, 'https://images.unsplash.com/photo-1503327431567-3ab5e6e79140?auto=format&fit=crop&w=800&q=80'),
    ('apextime-lite-slim-watch', 1, 'https://images.pexels.com/photos/5237704/pexels-photo-5237704.jpeg?auto=compress&cs=tinysrgb&w=800'),

    -- Headphones
    ('soundwave-anc-studio-headphones', 0, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'),
    ('soundwave-anc-studio-headphones', 1, 'https://images.unsplash.com/photo-1597859359746-f6efe49ce11a?auto=format&fit=crop&w=800&q=80'),
    ('soundwave-anc-studio-headphones', 2, 'https://images.pexels.com/photos/27507165/pexels-photo-27507165.jpeg?auto=compress&cs=tinysrgb&w=800'),

    ('soundwave-bass-pro-wireless', 0, 'https://images.unsplash.com/photo-1520170350707-b2da59970118?auto=format&fit=crop&w=800&q=80'),
    ('soundwave-bass-pro-wireless', 1, 'https://images.unsplash.com/photo-1597859359746-f6efe49ce11a?auto=format&fit=crop&w=800&q=80'),
    ('soundwave-bass-pro-wireless', 2, 'https://images.pexels.com/photos/1591/technology-music-sound-things.jpg?auto=compress&cs=tinysrgb&w=800'),

    -- Earbuds
    ('soundwave-pods-pro-earbuds', 0, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80'),
    ('soundwave-pods-pro-earbuds', 1, 'https://images.pexels.com/photos/8553999/pexels-photo-8553999.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('soundwave-pods-pro-earbuds', 2, 'https://images.pexels.com/photos/11599421/pexels-photo-11599421.jpeg?auto=compress&cs=tinysrgb&w=800'),

    ('soundwave-mini-air-buds', 0, 'https://images.unsplash.com/photo-1525825691042-e14d9042fc70?auto=format&fit=crop&w=800&q=80'),
    ('soundwave-mini-air-buds', 1, 'https://images.pexels.com/photos/13387311/pexels-photo-13387311.jpeg?auto=compress&cs=tinysrgb&w=800'),

    ('soundwave-gaming-buds-x', 0, 'https://images.pexels.com/photos/10104890/pexels-photo-10104890.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('soundwave-gaming-buds-x', 1, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80'),

    -- Home Appliances
    ('luminahome-digital-smart-kettle', 0, 'https://images.pexels.com/photos/8879615/pexels-photo-8879615.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('luminahome-digital-smart-kettle', 1, 'https://images.unsplash.com/photo-1594213114663-d94db9b17125?auto=format&fit=crop&w=800&q=80'),
    ('luminahome-digital-smart-kettle', 2, 'https://images.unsplash.com/photo-1585683034983-b8c9d72a095a?auto=format&fit=crop&w=800&q=80'),

    ('luminahome-portable-usb-blender', 0, 'https://images.unsplash.com/photo-1500388953054-0d94398c7bf1?auto=format&fit=crop&w=800&q=80'),
    ('luminahome-portable-usb-blender', 1, 'https://images.pexels.com/photos/8879615/pexels-photo-8879615.jpeg?auto=compress&cs=tinysrgb&w=800'),

    ('luminahome-mist-desk-fan', 0, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80'),
    ('luminahome-mist-desk-fan', 1, 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=800&q=80'),

    -- Lighting
    ('luminahome-eyecare-desk-lamp', 0, 'https://images.pexels.com/photos/19240055/pexels-photo-19240055/free-photo-of-vignette-image-of-a-lamp-on-a-desk.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('luminahome-eyecare-desk-lamp', 1, 'https://images.pexels.com/photos/8369211/pexels-photo-8369211.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('luminahome-eyecare-desk-lamp', 2, 'https://images.unsplash.com/photo-1580477667995-2b94f01c9516?auto=format&fit=crop&w=800&q=80'),

    ('luminahome-motion-sensor-light', 0, 'https://plus.unsplash.com/premium_photo-1681412205156-bb506a4ea970?auto=format&fit=crop&w=800&q=80'),
    ('luminahome-motion-sensor-light', 1, 'https://plus.unsplash.com/premium_photo-1668005190411-1042cd38522e?auto=format&fit=crop&w=800&q=80'),

    -- Mobile Accessories
    ('apextime-10000mah-power-bank', 0, 'https://images.unsplash.com/photo-1566554738544-d962991c3fee?auto=format&fit=crop&w=800&q=80'),
    ('apextime-10000mah-power-bank', 1, 'https://images.pexels.com/photos/4072683/pexels-photo-4072683.jpeg?auto=compress&cs=tinysrgb&w=800'),

    ('apextime-33w-gan-charger-kit', 0, 'https://images.unsplash.com/photo-1600490722773-35753aea6332?auto=format&fit=crop&w=800&q=80'),
    ('apextime-33w-gan-charger-kit', 1, 'https://images.pexels.com/photos/4072683/pexels-photo-4072683.jpeg?auto=compress&cs=tinysrgb&w=800')
)
INSERT INTO public.product_images (product_id, image_url, alt_bn, alt_en, sort_order)
SELECT p.id, g.image_url, p.name_bn, p.name_en, g.sort_order
FROM demo_gallery g
JOIN public.products p ON p.slug = g.slug;

-- Fallback: Ensure any custom DEMO-% or MB-% products not listed above still get category-matched verified images
INSERT INTO public.product_images (product_id, image_url, alt_bn, alt_en, sort_order)
SELECT
  p.id,
  CASE c.slug
    WHEN 'smart-watches' THEN 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'
    WHEN 'headphones' THEN 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'
    WHEN 'earbuds' THEN 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80'
    WHEN 'home-appliances' THEN 'https://images.pexels.com/photos/8879615/pexels-photo-8879615.jpeg?auto=compress&cs=tinysrgb&w=800'
    WHEN 'lighting' THEN 'https://images.pexels.com/photos/19240055/pexels-photo-19240055/free-photo-of-vignette-image-of-a-lamp-on-a-desk.jpeg?auto=compress&cs=tinysrgb&w=800'
    ELSE 'https://images.unsplash.com/photo-1566554738544-d962991c3fee?auto=format&fit=crop&w=800&q=80'
  END,
  p.name_bn,
  p.name_en,
  0
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id
WHERE (p.sku LIKE 'DEMO-%' OR p.sku LIKE 'MB-%')
  AND NOT EXISTS (
    SELECT 1 FROM public.product_images pi WHERE pi.product_id = p.id
  );

-- 5. Update Product Variant images for demo products when null or pointing to /src/
UPDATE public.product_variants pv
SET image_url = (
  SELECT pi.image_url
  FROM public.product_images pi
  WHERE pi.product_id = pv.product_id
  ORDER BY pi.sort_order ASC
  LIMIT 1
)
FROM public.products p
WHERE pv.product_id = p.id
  AND (p.sku LIKE 'DEMO-%' OR p.sku LIKE 'MB-%')
  AND (pv.image_url IS NULL OR pv.image_url LIKE '/src/%');
