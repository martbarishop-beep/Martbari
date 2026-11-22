import fs from 'fs';

// 1. Update Header.tsx
const headerPath = 'src/components/Header.tsx';
let headerContent = fs.readFileSync(headerPath, 'utf8');

if (!headerContent.includes('Shield')) {
  headerContent = headerContent.replace(
    "import { Heart, Menu, ShoppingBag } from 'lucide-react';",
    "import { Heart, Menu, Shield, ShoppingBag } from 'lucide-react';"
  );

  const targetHeaderAction = '{/* Wishlist Icon */}';
  const adminHeaderButton = `            {/* Admin Portal Icon */}
            <Link
              to="/admin/login"
              title="Admin Portal / অ্যাডমিন প্যানেল"
              aria-label="Admin Portal"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-white/80 hover:bg-[#F47125] hover:text-white transition-colors"
            >
              <Shield className="h-5 w-5 text-[#F47125] sm:text-white" />
            </Link>
            `;
  headerContent = headerContent.replace(targetHeaderAction, adminHeaderButton + targetHeaderAction);

  // Add Admin link in mobile menu drawer
  const mobileNavTarget = `          <NavLink
            to={localizedPath('/about')}
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex min-h-[44px] items-center rounded-[12px] px-4 text-base font-medium transition-colors',
                isActive
                  ? 'bg-[#F47125]/10 text-[#D95F18] font-semibold'
                  : 'text-[#0F1A2C] hover:bg-[#F5F7FA]',
              )
            }
          >
            {t('nav.about')}
          </NavLink>`;

  const mobileAdminLink = `          <NavLink
            to="/admin/login"
            onClick={() => setMobileMenuOpen(false)}
            className="flex min-h-[44px] items-center gap-2.5 rounded-[12px] px-4 text-base font-semibold text-[#F47125] bg-[#F47125]/10 hover:bg-[#F47125]/20 transition-colors mt-2"
          >
            <Shield className="h-5 w-5" />
            Admin Portal / অ্যাডমিন প্যানেল
          </NavLink>`;

  headerContent = headerContent.replace(mobileNavTarget, mobileNavTarget + '\n' + mobileAdminLink);
  fs.writeFileSync(headerPath, headerContent, 'utf8');
  console.log('Header updated with Admin icon.');
}

// 2. Enhance HomePage.tsx Hero and fallback demo products
const homePath = 'src/pages/HomePage.tsx';
let homeContent = fs.readFileSync(homePath, 'utf8');

// Check if demo products fallback is enriched
if (!homeContent.includes('Ultra Smartwatch Pro 8')) {
  // Let's add rich demo products fallback when public_products is empty
  const demoFallbackReplacement = `        const prods = (allProductsData ?? []) as PublicProduct[];
        if (prods.length > 0) {
          const ids = prods.map((p) => p.id);
          const { data: imgData } = await supabase
            .from('product_images')
            .select('product_id, image_url, sort_order')
            .in('product_id', ids)
            .order('sort_order', { ascending: true });
          const imageMap = new Map<string, string>();
          (imgData as DbProductImage[] | null)?.forEach((img) => {
            if (!imageMap.has(img.product_id)) {
              imageMap.set(img.product_id, img.image_url);
            }
          });
          const withImages: ProductWithImage[] = prods.map((p) => ({
            ...p,
            image_url: imageMap.get(p.id) ?? null,
          }));
          setFlashSaleProducts(
            withImages.filter((p) => p.sale_price !== null && p.sale_price < p.price).slice(0, 4),
          );
          setFeaturedProducts(withImages.filter((p) => p.is_featured).slice(0, 6));
          setNewArrivals(withImages.filter((p) => p.is_new).slice(0, 6));
          setBestSellers(withImages.slice(0, 6));
        } else {
          // Rich demo fallback products for instant stunning showcase
          const demoProducts: ProductWithImage[] = [
            {
              id: 'demo-1',
              name_bn: 'অ্যামোলেড স্মার্টওয়াচ প্রো ৮ (Ultra Smartwatch)',
              name_en: 'AMOLED Smart Watch Pro 8 Ultra',
              slug: 'amoled-smart-watch-pro-8',
              short_desc_bn: 'ব্লুটুথ কলিং, হার্ট রেট ও স্পোর্টস মোড সম্বলিত প্রিমিয়াম স্মার্টওয়াচ।',
              short_desc_en: 'Premium smartwatch with Bluetooth calling, AMOLED display & fitness tracking.',
              price: 3499,
              sale_price: 2400,
              stock_status: 'in_stock',
              stock_quantity: 45,
              rating_avg: 4.9,
              rating_count: 38,
              is_featured: true,
              is_new: true,
              created_at: new Date().toISOString(),
              image_url: DEMO_IMAGES.smartwatch,
            },
            {
              id: 'demo-2',
              name_bn: 'ট্রু ওয়্যারলেস প্রো ইয়ারবাডস (ENC & Deep Bass)',
              name_en: 'True Wireless Pro Earbuds ENC Deep Bass',
              slug: 'true-wireless-pro-earbuds',
              short_desc_bn: 'ক্রিস্টাল ক্লিয়ার সাউন্ড ও দীর্ঘস্থায়ী ব্যাটারি ব্যাকআপ।',
              short_desc_en: 'Crystal clear ENC audio quality with ultra-long battery life.',
              price: 2200,
              sale_price: 1550,
              stock_status: 'in_stock',
              stock_quantity: 60,
              rating_avg: 4.8,
              rating_count: 52,
              is_featured: true,
              is_new: true,
              created_at: new Date().toISOString(),
              image_url: DEMO_IMAGES.earbuds,
            },
            {
              id: 'demo-3',
              name_bn: 'স্মার্ট ইলেকট্রিক কেটলি ২.০ লিটার',
              name_en: 'Smart Electric Kettle 2.0L Stainless Steel',
              slug: 'smart-electric-kettle-2l',
              short_desc_bn: 'দ্রুত পানি গরম করার জন্য স্টেইনলেস স্টিল বডি ও অটো শাট-অফ।',
              short_desc_en: 'Rapid boil stainless steel electric kettle with auto shut-off protection.',
              price: 2800,
              sale_price: 1950,
              stock_status: 'in_stock',
              stock_quantity: 25,
              rating_avg: 4.7,
              rating_count: 19,
              is_featured: true,
              is_new: false,
              created_at: new Date().toISOString(),
              image_url: DEMO_IMAGES.appliance,
            },
            {
              id: 'demo-4',
              name_bn: 'কর্ডলেস হ্যান্ডহেল্ড ভ্যাকুয়াম ক্লিনার',
              name_en: 'Cordless Handheld Car & Home Vacuum Cleaner',
              slug: 'cordless-handheld-vacuum-cleaner',
              short_desc_bn: 'শক্তিশালী সাকশন পাওয়ার ও রিচার্জেবল ব্যাটারিযুক্ত পোর্টেবল ক্লিনার।',
              short_desc_en: 'Powerful suction rechargeable portable vacuum cleaner for car and home.',
              price: 4500,
              sale_price: 3600,
              stock_status: 'in_stock',
              stock_quantity: 18,
              rating_avg: 4.9,
              rating_count: 27,
              is_featured: true,
              is_new: true,
              created_at: new Date().toISOString(),
              image_url: DEMO_IMAGES.hero,
            },
            {
              id: 'demo-5',
              name_bn: 'ম্যাগনেটিক ৩-ইন-১ ফাস্ট ওয়্যারলেস চার্জার',
              name_en: 'Magnetic 3-in-1 Fast Wireless Charging Station',
              slug: 'magnetic-3-in-1-wireless-charger',
              short_desc_bn: 'একসাথে ফোন, ইয়ারবাডস ও স্মার্টওয়াচ চার্জ করার সুবিধা।',
              short_desc_en: 'Simultaneously charge your phone, smartwatch, and wireless earbuds.',
              price: 1800,
              sale_price: 1290,
              stock_status: 'in_stock',
              stock_quantity: 40,
              rating_avg: 4.6,
              rating_count: 15,
              is_featured: false,
              is_new: true,
              created_at: new Date().toISOString(),
              image_url: DEMO_IMAGES.smartwatch,
            },
            {
              id: 'demo-6',
              name_bn: 'পোর্টেবল ব্লুটুথ স্পিকার উইথ আরবিজি লাইট',
              name_en: 'Portable Bluetooth Speaker with RGB Light',
              slug: 'portable-bluetooth-speaker-rgb',
              short_desc_bn: 'রিচ বেস ও চমৎকার সাউন্ড এফেক্টসহ ওয়াটারপ্রুফ স্পিকার।',
              short_desc_en: 'Waterproof portable bluetooth speaker with deep bass and vibrant RGB lighting.',
              price: 1600,
              sale_price: 1150,
              stock_status: 'in_stock',
              stock_quantity: 35,
              rating_avg: 4.8,
              rating_count: 31,
              is_featured: true,
              is_new: false,
              created_at: new Date().toISOString(),
              image_url: DEMO_IMAGES.earbuds,
            },
          ];
          setFlashSaleProducts(demoProducts.filter(p => p.sale_price));
          setFeaturedProducts(demoProducts.filter(p => p.is_featured));
          setNewArrivals(demoProducts.filter(p => p.is_new));
          setBestSellers(demoProducts);
        }`;

  // Replace the loading/fallback block
  const targetBlock = 'const prods = (allProductsData ?? []) as PublicProduct[];';
  if (homeContent.includes(targetBlock)) {
    // We can replace the try catch block handling prods
    console.log('Home content target found');
  }
}

console.log('Update script completed.');
