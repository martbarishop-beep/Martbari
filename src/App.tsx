import React, { useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StorefrontLayout } from './components/StorefrontLayout';
import { SupabaseSetupScreen } from './components/SupabaseSetupScreen';
import { ToastContainer } from './components/ui';
import { Spinner } from './components/ui/Spinner';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import { SettingsProvider, useSettingsContext } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import { WishlistProvider } from './context/WishlistContext';
import { initAnalytics } from './lib/analytics';
import { getSavedLanguage, isSupportedLanguage } from './lib/bilingual';
import { isSupabaseConfigured } from './lib/supabase';

// Storefront primary route (eagerly loaded for instant FCP/LCP)
import { HomePage } from './pages/HomePage';

// Secondary storefront routes (route-based code splitting)
const ShopPage = React.lazy(() =>
  import('./pages/ShopPage').then((m) => ({ default: m.ShopPage })),
);
const ProductDetailPage = React.lazy(() =>
  import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })),
);
const CartPage = React.lazy(() =>
  import('./pages/CartPage').then((m) => ({ default: m.CartPage })),
);
const CheckoutPage = React.lazy(() =>
  import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })),
);
const OrderSuccessPage = React.lazy(() =>
  import('./pages/OrderSuccessPage').then((m) => ({ default: m.OrderSuccessPage })),
);
const TrackOrderPage = React.lazy(() =>
  import('./pages/TrackOrderPage').then((m) => ({ default: m.TrackOrderPage })),
);
const ContactPage = React.lazy(() =>
  import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })),
);
const PolicyPage = React.lazy(() =>
  import('./pages/PolicyPage').then((m) => ({ default: m.PolicyPage })),
);
const NotFoundPage = React.lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);
const FontTestPage = React.lazy(() =>
  import('./pages/FontTestPage').then((m) => ({ default: m.FontTestPage })),
);

// Lazy-loaded Admin pages (so storefront visitors never download administrative bundles)
const AdminWorkspaceShell = React.lazy(() =>
  import('./components/admin/AdminWorkspaceShell').then((m) => ({
    default: m.AdminWorkspaceShell,
  }))
);
const AdminLoginPage = React.lazy(() =>
  import('./pages/admin/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage }))
);
const AdminLayout = React.lazy(() =>
  import('./components/admin/AdminLayout').then((m) => ({ default: m.AdminLayout }))
);
const AdminDashboardPage = React.lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const AdminProductsPage = React.lazy(() =>
  import('./pages/admin/AdminProductsPage').then((m) => ({ default: m.AdminProductsPage }))
);
const AdminProductFormPage = React.lazy(() =>
  import('./pages/admin/AdminProductFormPage').then((m) => ({ default: m.AdminProductFormPage }))
);
const AdminOrdersPage = React.lazy(() =>
  import('./pages/admin/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage }))
);
const AdminOrderDetailPage = React.lazy(() =>
  import('./pages/admin/AdminOrderDetailPage').then((m) => ({ default: m.AdminOrderDetailPage }))
);
const AdminOrderCreatePage = React.lazy(() =>
  import('./pages/admin/AdminOrderCreatePage').then((m) => ({ default: m.AdminOrderCreatePage }))
);
const AdminCategoriesPage = React.lazy(() =>
  import('./pages/admin/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage }))
);
const AdminBrandsPage = React.lazy(() =>
  import('./pages/admin/AdminBrandsPage').then((m) => ({ default: m.AdminBrandsPage }))
);
const AdminSuppliersPage = React.lazy(() =>
  import('./pages/admin/AdminSuppliersPage').then((m) => ({ default: m.AdminSuppliersPage }))
);
const AdminInventoryPage = React.lazy(() =>
  import('./pages/admin/AdminInventoryPage').then((m) => ({ default: m.AdminInventoryPage }))
);
const AdminCustomersPage = React.lazy(() =>
  import('./pages/admin/AdminCustomersPage').then((m) => ({ default: m.AdminCustomersPage }))
);
const AdminCustomerDetailPage = React.lazy(() =>
  import('./pages/admin/AdminCustomerDetailPage').then((m) => ({
    default: m.AdminCustomerDetailPage,
  }))
);
const AdminCouponsPage = React.lazy(() =>
  import('./pages/admin/AdminCouponsPage').then((m) => ({ default: m.AdminCouponsPage }))
);
const AdminReviewsPage = React.lazy(() =>
  import('./pages/admin/AdminReviewsPage').then((m) => ({ default: m.AdminReviewsPage }))
);
const AdminBannersPage = React.lazy(() =>
  import('./pages/admin/AdminBannersPage').then((m) => ({ default: m.AdminBannersPage }))
);
const AdminPagesPage = React.lazy(() =>
  import('./pages/admin/AdminPagesPage').then((m) => ({ default: m.AdminPagesPage }))
);
const AdminReportsPage = React.lazy(() =>
  import('./pages/admin/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage }))
);
const AdminSettingsPage = React.lazy(() =>
  import('./pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage }))
);
const AdminStaffPage = React.lazy(() =>
  import('./pages/admin/AdminStaffPage').then((m) => ({ default: m.AdminStaffPage }))
);
const AdminActivityPage = React.lazy(() =>
  import('./pages/admin/AdminActivityPage').then((m) => ({ default: m.AdminActivityPage }))
);
const AdminBackupPage = React.lazy(() =>
  import('./pages/admin/AdminBackupPage').then((m) => ({ default: m.AdminBackupPage }))
);
const AdminDemoDataPage = React.lazy(() =>
  import('./pages/admin/AdminDemoDataPage').then((m) => ({ default: m.AdminDemoDataPage }))
);
const AdminSupplierOrdersPage = React.lazy(() =>
  import('./pages/admin/AdminSupplierOrdersPage').then((m) => ({ default: m.AdminSupplierOrdersPage }))
);
const AdminPaymentsPage = React.lazy(() =>
  import('./pages/admin/AdminPaymentsPage').then((m) => ({ default: m.AdminPaymentsPage }))
);

const RootRedirect: React.FC = () => {
  const targetLang = getSavedLanguage();
  return <Navigate to={`/${targetLang}`} replace />;
};

const UNPREFIXED_STOREFRONT_PREFIXES = new Set([
  'shop',
  'category',
  'product',
  'cart',
  'checkout',
  'order-success',
  'track-order',
  'about',
  'contact',
  'return-policy',
  'privacy-policy',
  'terms',
]);

const LocalizedStorefrontShell: React.FC = () => {
  const { lang } = useParams<{ lang: string }>();
  const location = useLocation();

  if (!isSupportedLanguage(lang)) {
    const saved = getSavedLanguage();
    if (lang && UNPREFIXED_STOREFRONT_PREFIXES.has(lang.toLowerCase())) {
      return (
        <Navigate
          to={`/${saved}${location.pathname}${location.search}${location.hash}`}
          replace
        />
      );
    }
    return (
      <LanguageProvider routeLang={saved}>
        <StorefrontLayout>
          <NotFoundPage />
        </StorefrontLayout>
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider routeLang={lang}>
      <StorefrontLayout />
    </LanguageProvider>
  );
};

const FallbackNotFound: React.FC = () => {
  return (
    <LanguageProvider routeLang={getSavedLanguage()}>
      <StorefrontLayout>
        <NotFoundPage />
      </StorefrontLayout>
    </LanguageProvider>
  );
};

const AnalyticsInitializer: React.FC = () => {
  const { settings } = useSettingsContext();

  useEffect(() => {
    initAnalytics(settings);
  }, [settings]);

  return null;
};

// Admin authentication & code-splitting boundary
const AdminShell: React.FC = () => {
  return (
    <AdminAuthProvider>
      <React.Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA]">
            <div className="flex flex-col items-center gap-3">
              <Spinner size="lg" className="text-[#F47125]" />
              <p className="text-xs font-semibold text-[#5B6577]">Loading workspace...</p>
            </div>
          </div>
        }
      >
        <Outlet />
      </React.Suspense>
    </AdminAuthProvider>
  );
};

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <HelmetProvider>
        <ErrorBoundary>
          <SupabaseSetupScreen />
        </ErrorBoundary>
      </HelmetProvider>
    );
  }

  return (
    <HelmetProvider>
      <ErrorBoundary>
        <ToastProvider>
          <SettingsProvider>
            <AnalyticsInitializer />
            <WishlistProvider>
              <CartProvider>
                <BrowserRouter>
                  <Routes>
                    {/* Root redirects to saved language or /bn */}
                    <Route path="/" element={<RootRedirect />} />
                    <Route
                      path="/font-test"
                      element={
                        <React.Suspense
                          fallback={
                            <div className="flex min-h-screen items-center justify-center bg-white">
                              <Spinner size="lg" className="text-[#F47125]" />
                            </div>
                          }
                        >
                          <FontTestPage />
                        </React.Suspense>
                      }
                    />

                    {/* Bilingual Admin Portal (Code-split with React.lazy, EN / BN) */}
                    <Route path="/admin" element={<AdminShell />}>
                      <Route element={<AdminWorkspaceShell />}>
                        <Route path="login" element={<AdminLoginPage />} />

                        {/* Protected Admin Routes (Guarded by AdminLayout) */}
                        <Route element={<AdminLayout />}>
                          <Route index element={<AdminDashboardPage />} />
                          <Route path="orders" element={<AdminOrdersPage />} />
                          <Route path="orders/create" element={<AdminOrderCreatePage />} />
                          <Route path="orders/:id" element={<AdminOrderDetailPage />} />
                          <Route path="products" element={<AdminProductsPage />} />
                          <Route path="products/new" element={<AdminProductFormPage />} />
                          <Route path="products/:id" element={<AdminProductFormPage />} />
                          <Route path="categories" element={<AdminCategoriesPage />} />
                          <Route path="brands" element={<AdminBrandsPage />} />
                          <Route path="suppliers" element={<AdminSuppliersPage />} />
                          <Route path="inventory" element={<AdminInventoryPage />} />
                          <Route path="customers" element={<AdminCustomersPage />} />
                          <Route path="customers/:id" element={<AdminCustomerDetailPage />} />
                          <Route path="coupons" element={<AdminCouponsPage />} />
                          <Route path="reviews" element={<AdminReviewsPage />} />
                          <Route path="banners" element={<AdminBannersPage />} />
                          <Route path="pages" element={<AdminPagesPage />} />
                          <Route path="reports" element={<AdminReportsPage />} />
                          <Route path="settings" element={<AdminSettingsPage />} />
                          <Route path="staff" element={<AdminStaffPage />} />
                          <Route path="activity" element={<AdminActivityPage />} />
                          <Route path="backup" element={<AdminBackupPage />} />
                          <Route path="demo-data" element={<AdminDemoDataPage />} />
                          <Route path="supplier-orders" element={<AdminSupplierOrdersPage />} />
                          <Route path="payments" element={<AdminPaymentsPage />} />
                          <Route path="*" element={<Navigate to="/admin" replace />} />
                        </Route>
                      </Route>
                    </Route>

                    {/* Bilingual Storefront routes (/bn/* and /en/*) */}
                    <Route path="/:lang" element={<LocalizedStorefrontShell />}>
                      <Route index element={<HomePage />} />
                      <Route path="shop" element={<ShopPage />} />
                      <Route path="category/:slug" element={<ShopPage />} />
                      <Route path="product/:slug" element={<ProductDetailPage />} />
                      <Route path="cart" element={<CartPage />} />
                      <Route path="checkout" element={<CheckoutPage />} />
                      <Route
                        path="order-success/:orderNumber"
                        element={<OrderSuccessPage />}
                      />
                      <Route path="track-order" element={<TrackOrderPage />} />
                      <Route
                        path="about"
                        element={<PolicyPage slug="about" fallbackTitleKey="nav.about" />}
                      />
                      <Route path="contact" element={<ContactPage />} />
                      <Route
                        path="return-policy"
                        element={
                          <PolicyPage slug="return-policy" fallbackTitleKey="footer.returnPolicy" />
                        }
                      />
                      <Route
                        path="privacy-policy"
                        element={
                          <PolicyPage
                            slug="privacy-policy"
                            fallbackTitleKey="footer.privacyPolicy"
                          />
                        }
                      />
                      <Route
                        path="terms"
                        element={<PolicyPage slug="terms" fallbackTitleKey="footer.terms" />}
                      />
                      <Route path="*" element={<NotFoundPage />} />
                    </Route>

                    {/* Unknown top-level paths */}
                    <Route path="*" element={<FallbackNotFound />} />
                  </Routes>
                </BrowserRouter>
                <ToastContainer />
              </CartProvider>
            </WishlistProvider>
          </SettingsProvider>
        </ToastProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}
