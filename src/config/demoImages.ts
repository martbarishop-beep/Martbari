export type DemoCategoryKey =
  | 'smart-watches'
  | 'headphones'
  | 'earbuds'
  | 'home-appliances'
  | 'lighting'
  | 'mobile-accessories';

export interface HeroSlidePreset {
  id: string;
  category: DemoCategoryKey;
  imageUrl: string;
  labelBn: string;
  labelEn: string;
  titleBn: string;
  titleEn: string;
  subtitleBn: string;
  subtitleEn: string;
  priceBadgeBn: string;
  priceBadgeEn: string;
  primaryCtaBn: string;
  primaryCtaEn: string;
  secondaryCtaBn: string;
  secondaryCtaEn: string;
  linkUrl: string;
  secondaryLinkUrl: string;
}

export const HERO_BANNER_IMAGES: Record<DemoCategoryKey, string> = {
  'smart-watches':
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1280&q=75&fm=webp',
  headphones:
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1280&q=75&fm=webp',
  earbuds:
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1280&q=75&fm=webp',
  'home-appliances':
    'https://images.unsplash.com/photo-1594213114663-d94db9b17125?auto=format&fit=crop&w=1280&q=75&fm=webp',
  lighting:
    'https://images.pexels.com/photos/8369211/pexels-photo-8369211.jpeg?auto=compress&cs=tinysrgb&w=1280&fm=webp',
  'mobile-accessories':
    'https://images.unsplash.com/photo-1566554738544-d962991c3fee?auto=format&fit=crop&w=1280&q=75&fm=webp',
};

export const HERO_PROMO_IMAGES = {
  flashSale:
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=768&q=72&fm=webp',
  newArrivals:
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=768&q=72&fm=webp',
} as const;

export const HERO_SLIDE_PRESETS: HeroSlidePreset[] = [
  {
    id: 'slide-smart-watches',
    category: 'smart-watches',
    imageUrl: HERO_BANNER_IMAGES['smart-watches'],
    labelBn: 'স্মার্ট ওয়াচ',
    labelEn: 'Smart Watches',
    titleBn: 'অ্যামোলেড স্মার্ট ওয়াচ ও ফিটনেস ট্র্যাকার',
    titleEn: 'AMOLED Smart Watches Built for Everyday Life',
    subtitleBn: 'ব্লুটুথ কলিং ও ৭ দিনের ব্যাটারি সহ সারা দেশে ক্যাশ অন ডেলিভারি।',
    subtitleEn: 'Bluetooth calling, bright AMOLED screens & 7-day battery backup.',
    priceBadgeBn: 'শুরু ৳১,৮৯০ থেকে',
    priceBadgeEn: 'From ৳1,890',
    primaryCtaBn: 'এখনই কিনুন',
    primaryCtaEn: 'Shop Now',
    secondaryCtaBn: 'অফার দেখুন',
    secondaryCtaEn: 'View Offers',
    linkUrl: '/category/smart-watches',
    secondaryLinkUrl: '/shop?on_sale=true',
  },
  {
    id: 'slide-headphones-earbuds',
    category: 'headphones',
    imageUrl: HERO_BANNER_IMAGES.headphones,
    labelBn: 'হেডফোন ও ইয়ারবাডস',
    labelEn: 'Headphones & Earbuds',
    titleBn: 'স্টুডিও এএনসি হেডফোন ও ওয়্যারলেস ইয়ারবাডস',
    titleEn: 'Studio ANC Headphones & Wireless Earbuds',
    subtitleBn: 'ডিপ বেস সাউন্ড, ৪০ ঘণ্টা প্লেটাইম ও ক্লিয়ার ইএনসি কলিং কোয়ালিটি।',
    subtitleEn: 'Hybrid noise cancellation, deep bass & quad-mic ENC call clarity.',
    priceBadgeBn: 'শুরু ৳৯৯০ থেকে',
    priceBadgeEn: 'From ৳990',
    primaryCtaBn: 'এখনই কিনুন',
    primaryCtaEn: 'Shop Now',
    secondaryCtaBn: 'অফার দেখুন',
    secondaryCtaEn: 'View Offers',
    linkUrl: '/category/headphones',
    secondaryLinkUrl: '/category/earbuds',
  },
  {
    id: 'slide-home-appliances',
    category: 'home-appliances',
    imageUrl: HERO_BANNER_IMAGES['home-appliances'],
    labelBn: 'হোম অ্যাপ্লায়েন্স',
    labelEn: 'Home Appliances',
    titleBn: 'স্মার্ট হোম ও আধুনিক কিচেন অ্যাপ্লায়েন্স',
    titleEn: 'Smart Home & Kitchen Essentials Delivered Fast',
    subtitleBn: 'ডিজিটাল কেটলি, পোর্টেবল ব্লেন্ডার ও কুলিং গ্যাজেট সাশ্রয়ী দামে।',
    subtitleEn: 'Digital kettles, portable blenders & compact cooling gadgets.',
    priceBadgeBn: 'শুরু ৳১,১৯০ থেকে',
    priceBadgeEn: 'From ৳1,190',
    primaryCtaBn: 'এখনই কিনুন',
    primaryCtaEn: 'Shop Now',
    secondaryCtaBn: 'অফার দেখুন',
    secondaryCtaEn: 'View Offers',
    linkUrl: '/category/home-appliances',
    secondaryLinkUrl: '/shop?on_sale=true',
  },
  {
    id: 'slide-accessories-lighting',
    category: 'mobile-accessories',
    imageUrl: HERO_BANNER_IMAGES.lighting,
    labelBn: 'মোবাইল এক্সেসরিজ ও লাইটিং',
    labelEn: 'Mobile Accessories & Lighting',
    titleBn: 'ফাস্ট চার্জিং গিয়ার ও স্মার্ট ডেস্ক লাইটিং',
    titleEn: 'Fast GaN Charging & Minimal LED Lighting',
    subtitleBn: '২২.৫ ওয়াট পাওয়ার ব্যাংক, GaN চার্জার ও ফ্লিকার-ফ্রি ডেস্ক ল্যাম্প।',
    subtitleEn: '22.5W power banks, 33W GaN adapters & eye-care LED desk lamps.',
    priceBadgeBn: 'শুরু ৳৬৫০ থেকে',
    priceBadgeEn: 'From ৳650',
    primaryCtaBn: 'এখনই কিনুন',
    primaryCtaEn: 'Shop Now',
    secondaryCtaBn: 'অফার দেখুন',
    secondaryCtaEn: 'View Offers',
    linkUrl: '/category/mobile-accessories',
    secondaryLinkUrl: '/category/lighting',
  },
];

export const CATEGORY_DEMO_IMAGES: Record<DemoCategoryKey, string> = {
  'smart-watches':
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
  headphones:
    'https://images.unsplash.com/photo-1597859359746-f6efe49ce11a?auto=format&fit=crop&w=800&q=80',
  earbuds:
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
  'home-appliances':
    'https://images.pexels.com/photos/8879615/pexels-photo-8879615.jpeg?auto=compress&cs=tinysrgb&w=800',
  lighting:
    'https://images.pexels.com/photos/19240055/pexels-photo-19240055/free-photo-of-vignette-image-of-a-lamp-on-a-desk.jpeg?auto=compress&cs=tinysrgb&w=800',
  'mobile-accessories':
    'https://images.unsplash.com/photo-1600490722773-35753aea6332?auto=format&fit=crop&w=800&q=80',
};

export const CATEGORY_PRODUCT_GALLERIES: Record<DemoCategoryKey, string[]> = {
  'smart-watches': [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80',
    'https://images.pexels.com/photos/5081914/pexels-photo-5081914.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/9584702/pexels-photo-9584702.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/9584703/pexels-photo-9584703.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/5237704/pexels-photo-5237704.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  headphones: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1597859359746-f6efe49ce11a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1520170350707-b2da59970118?auto=format&fit=crop&w=800&q=80',
    'https://images.pexels.com/photos/27507165/pexels-photo-27507165.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  earbuds: [
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1525825691042-e14d9042fc70?auto=format&fit=crop&w=800&q=80',
    'https://images.pexels.com/photos/8553999/pexels-photo-8553999.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/11599421/pexels-photo-11599421.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/10104890/pexels-photo-10104890.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/13387311/pexels-photo-13387311.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  'home-appliances': [
    'https://images.pexels.com/photos/8879615/pexels-photo-8879615.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.unsplash.com/photo-1594213114663-d94db9b17125?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1585683034983-b8c9d72a095a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1500388953054-0d94398c7bf1?auto=format&fit=crop&w=800&q=80',
  ],
  lighting: [
    'https://images.pexels.com/photos/19240055/pexels-photo-19240055/free-photo-of-vignette-image-of-a-lamp-on-a-desk.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/8369211/pexels-photo-8369211.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.unsplash.com/photo-1580477667995-2b94f01c9516?auto=format&fit=crop&w=800&q=80',
    'https://plus.unsplash.com/premium_photo-1681412205156-bb506a4ea970?auto=format&fit=crop&w=800&q=80',
  ],
  'mobile-accessories': [
    'https://images.unsplash.com/photo-1566554738544-d962991c3fee?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600490722773-35753aea6332?auto=format&fit=crop&w=800&q=80',
    'https://images.pexels.com/photos/4072683/pexels-photo-4072683.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/9528216/pexels-photo-9528216.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
};

// Per-slug product image arrays (2-4 relevant images per product)
export const PRODUCT_DEMO_IMAGES_BY_SLUG: Record<string, string[]> = {
  'apextime-pro-amoled-watch': [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    'https://images.pexels.com/photos/5081914/pexels-photo-5081914.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/9528216/pexels-photo-9528216.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  'apextime-ultra-fitness-watch': [
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80',
    'https://images.pexels.com/photos/9584702/pexels-photo-9584702.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/9584703/pexels-photo-9584703.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  'apextime-lite-slim-watch': [
    'https://images.unsplash.com/photo-1503327431567-3ab5e6e79140?auto=format&fit=crop&w=800&q=80',
    'https://images.pexels.com/photos/5237704/pexels-photo-5237704.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  'soundwave-anc-studio-headphones': [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1597859359746-f6efe49ce11a?auto=format&fit=crop&w=800&q=80',
    'https://images.pexels.com/photos/27507165/pexels-photo-27507165.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  'soundwave-bass-pro-wireless': [
    'https://images.unsplash.com/photo-1520170350707-b2da59970118?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1597859359746-f6efe49ce11a?auto=format&fit=crop&w=800&q=80',
    'https://images.pexels.com/photos/1591/technology-music-sound-things.jpg?auto=compress&cs=tinysrgb&w=800',
  ],
  'soundwave-pods-pro-earbuds': [
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
    'https://images.pexels.com/photos/8553999/pexels-photo-8553999.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/11599421/pexels-photo-11599421.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  'soundwave-mini-air-buds': [
    'https://images.unsplash.com/photo-1525825691042-e14d9042fc70?auto=format&fit=crop&w=800&q=80',
    'https://images.pexels.com/photos/13387311/pexels-photo-13387311.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  'soundwave-gaming-buds-x': [
    'https://images.pexels.com/photos/10104890/pexels-photo-10104890.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
  ],
  'luminahome-digital-smart-kettle': [
    'https://images.pexels.com/photos/8879615/pexels-photo-8879615.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.unsplash.com/photo-1594213114663-d94db9b17125?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1585683034983-b8c9d72a095a?auto=format&fit=crop&w=800&q=80',
  ],
  'luminahome-portable-usb-blender': [
    'https://images.unsplash.com/photo-1500388953054-0d94398c7bf1?auto=format&fit=crop&w=800&q=80',
    'https://images.pexels.com/photos/8879615/pexels-photo-8879615.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  'luminahome-mist-desk-fan': [
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=800&q=80',
  ],
  'luminahome-eyecare-desk-lamp': [
    'https://images.pexels.com/photos/19240055/pexels-photo-19240055/free-photo-of-vignette-image-of-a-lamp-on-a-desk.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/8369211/pexels-photo-8369211.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.unsplash.com/photo-1580477667995-2b94f01c9516?auto=format&fit=crop&w=800&q=80',
  ],
  'luminahome-motion-sensor-light': [
    'https://plus.unsplash.com/premium_photo-1681412205156-bb506a4ea970?auto=format&fit=crop&w=800&q=80',
    'https://plus.unsplash.com/premium_photo-1668005190411-1042cd38522e?auto=format&fit=crop&w=800&q=80',
  ],
  'apextime-10000mah-power-bank': [
    'https://images.unsplash.com/photo-1566554738544-d962991c3fee?auto=format&fit=crop&w=800&q=80',
    'https://images.pexels.com/photos/4072683/pexels-photo-4072683.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  'apextime-33w-gan-charger-kit': [
    'https://images.unsplash.com/photo-1600490722773-35753aea6332?auto=format&fit=crop&w=800&q=80',
    'https://images.pexels.com/photos/4072683/pexels-photo-4072683.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
};

export const BRAND_DEMO_LOGOS: Record<string, string> = {
  apextime:
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
  soundwave:
    'https://images.unsplash.com/photo-1597859359746-f6efe49ce11a?auto=format&fit=crop&w=400&q=80',
  luminahome:
    'https://images.pexels.com/photos/19240055/pexels-photo-19240055/free-photo-of-vignette-image-of-a-lamp-on-a-desk.jpeg?auto=compress&cs=tinysrgb&w=400',
};

export const EDITORIAL_DEMO_IMAGES = {
  aboutHero:
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
  contactHub:
    'https://images.pexels.com/photos/8369211/pexels-photo-8369211.jpeg?auto=compress&cs=tinysrgb&w=1200',
  emptyShowcase:
    'https://images.pexels.com/photos/9528216/pexels-photo-9528216.jpeg?auto=compress&cs=tinysrgb&w=800',
} as const;
