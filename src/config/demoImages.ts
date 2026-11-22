import heroSmartHomeImg from '../assets/images/hero_smart_home_1795350225074.jpg';
import heroSmartWatchesImg from '../assets/images/hero_smart_watches_1795350224097.jpg';
import heroStudioAudioImg from '../assets/images/hero_studio_audio_1795350223981.jpg';
import heroWorkspaceLightingImg from '../assets/images/hero_workspace_lighting_1795350226226.jpg';

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
  badgeBn: string;
  badgeEn: string;
  primaryCtaBn: string;
  primaryCtaEn: string;
  secondaryCtaBn: string;
  secondaryCtaEn: string;
  linkUrl: string;
}

export const HERO_BANNER_IMAGES: Record<DemoCategoryKey, string> = {
  'smart-watches': heroSmartWatchesImg,
  headphones: heroStudioAudioImg,
  earbuds: heroStudioAudioImg,
  'home-appliances': heroSmartHomeImg,
  lighting: heroWorkspaceLightingImg,
  'mobile-accessories': heroWorkspaceLightingImg,
};

export const HERO_SLIDE_PRESETS: HeroSlidePreset[] = [
  {
    id: 'slide-smart-watches',
    category: 'smart-watches',
    imageUrl: HERO_BANNER_IMAGES['smart-watches'],
    labelBn: 'স্মার্ট ওয়ারেবল কালেকশন',
    labelEn: 'Smart Wearables Collection',
    titleBn: 'অ্যামোলেড স্মার্ট ওয়াচ ও ফিটনেস ট্র্যাকার',
    titleEn: 'AMOLED Smart Watches Built for Everyday Life',
    subtitleBn: 'ব্লুটুথ কলিং, ৭ দিনের ব্যাটারি ও ১ বছরের ওয়ারেন্টি — সারা দেশে ক্যাশ অন ডেলিভারি।',
    subtitleEn: 'Bluetooth calling, vivid AMOLED displays & 7-day battery with Cash on Delivery.',
    badgeBn: '৩০% পর্যন্ত ছাড়',
    badgeEn: 'Up to 30% OFF',
    primaryCtaBn: 'এখনই কিনুন',
    primaryCtaEn: 'Shop Now',
    secondaryCtaBn: 'অফার দেখুন',
    secondaryCtaEn: 'View Offers',
    linkUrl: '/category/smart-watches',
  },
  {
    id: 'slide-audio',
    category: 'headphones',
    imageUrl: HERO_BANNER_IMAGES.headphones,
    labelBn: 'অডিও ও ইয়ারবাডস সিরিজ',
    labelEn: 'Signature Audio & Earbuds',
    titleBn: 'স্টুডিও এএনসি হেডফোন ও ওয়্যারলেস ইয়ারবাডস',
    titleEn: 'Crystal-Clear Audio with Hybrid Noise Cancellation',
    subtitleBn: 'ডিপ বেস সাউন্ড, ৪০ ঘণ্টা প্লেটাইম এবং ক্লিয়ার ইএনসি কলিং কোয়ালিটি।',
    subtitleEn: 'Deep bass, quad-mic ENC calls, and up to 40 hours wireless playback.',
    badgeBn: 'ক্যাশ অন ডেলিভারি',
    badgeEn: 'Cash on Delivery',
    primaryCtaBn: 'এখনই কিনুন',
    primaryCtaEn: 'Shop Now',
    secondaryCtaBn: 'অফার দেখুন',
    secondaryCtaEn: 'View Offers',
    linkUrl: '/category/headphones',
  },
  {
    id: 'slide-appliances',
    category: 'home-appliances',
    imageUrl: HERO_BANNER_IMAGES['home-appliances'],
    labelBn: 'স্মার্ট কিচেন ও হোম',
    labelEn: 'Smart Kitchen & Home',
    titleBn: 'আধুনিক হোম ও কিচেন অ্যাপ্লায়েন্স',
    titleEn: 'Smart Home & Kitchen Essentials Delivered Fast',
    subtitleBn: 'ডিজিটাল ইলেকট্রিক কেটলি, পোর্টেবল ব্লেন্ডার ও কুলিং গ্যাজেট সাশ্রয়ী দামে।',
    subtitleEn: 'Precision digital kettles, portable blenders & compact cooling fans.',
    badgeBn: 'ফ্রি ডেলিভারি ৳৩,০০০+',
    badgeEn: 'Free Delivery ৳3,000+',
    primaryCtaBn: 'এখনই কিনুন',
    primaryCtaEn: 'Shop Now',
    secondaryCtaBn: 'অফার দেখুন',
    secondaryCtaEn: 'View Offers',
    linkUrl: '/category/home-appliances',
  },
  {
    id: 'slide-lighting',
    category: 'lighting',
    imageUrl: HERO_BANNER_IMAGES.lighting,
    labelBn: 'ওয়ার্কস্পেস ও স্মার্ট লাইটিং',
    labelEn: 'Workspace & Smart Lighting',
    titleBn: 'চোখের আরামদায়ক ফ্লিকার-ফ্রি এলইডি লাইটিং',
    titleEn: 'Minimal LED Desk Lamps & Motion Sensor Lights',
    subtitleBn: 'পড়াশোনা ও অফিসের জন্য টাচ-ডিমিং ল্যাম্প ও ম্যাগনেটিক ওয়্যারলেস লাইট।',
    subtitleEn: 'Stepless dimming study lamps and magnetic motion lights for any room.',
    badgeBn: 'নতুন কালেকশন',
    badgeEn: 'New Arrivals',
    primaryCtaBn: 'এখনই কিনুন',
    primaryCtaEn: 'Shop Now',
    secondaryCtaBn: 'অফার দেখুন',
    secondaryCtaEn: 'View Offers',
    linkUrl: '/category/lighting',
  },
  {
    id: 'slide-accessories',
    category: 'mobile-accessories',
    imageUrl: HERO_BANNER_IMAGES['mobile-accessories'],
    labelBn: 'পাওয়ার ও চার্জিং সল্যুশন',
    labelEn: 'Fast Power & Charging',
    titleBn: 'ফাস্ট পাওয়ার ব্যাংক ও গাণ চার্জার কিট',
    titleEn: '22.5W Power Banks & Compact GaN Chargers',
    subtitleBn: 'নিরাপদ ও সুপার-ফাস্ট চার্জিংয়ের জন্য নির্ভরযোগ্য মোবাইল এক্সেসরিজ।',
    subtitleEn: 'Reliable PD fast charging gear engineered for phones, watches & earbuds.',
    badgeBn: '১০০% অরিজিনাল',
    badgeEn: '100% Authentic',
    primaryCtaBn: 'এখনই কিনুন',
    primaryCtaEn: 'Shop Now',
    secondaryCtaBn: 'অফার দেখুন',
    secondaryCtaEn: 'View Offers',
    linkUrl: '/category/mobile-accessories',
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
