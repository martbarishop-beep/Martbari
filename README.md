# MartBari (মার্টবাড়ি) — Dropshipping E-Commerce Platform

MartBari is a production-ready, bilingual (Bangla + English) e-commerce web platform built for a Bangladeshi dropshipping store selling electronics, gadgets, and home appliances.

## Tech Stack & Architecture
- **Frontend & Admin:** React 19, Vite, TypeScript, Tailwind CSS v4, React Router v7, Recharts, DOMPurify.
- **Backend & Database:** Supabase (PostgreSQL database, Row Level Security, Auth, Storage buckets, Realtime order inserts).
- **Hosting / Deployment:** Static SPA targeting **Cloudflare Pages**.

---

## 1. Setup & Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your Supabase project credentials:
   ```env
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
   APP_URL="https://martbari.shop"
   ```

---

## 2. Supabase Database Setup

1. Open your Supabase project dashboard -> **SQL Editor**.
2. Run the complete database migration and schema script located at `supabase/schema.sql`. This provisions all 17 tables, RLS security policies, triggers, `public_products` secure view, helper RPC functions (`create_order`, `track_order`, `validate_coupon`), storage buckets (`products`, `categories`, `brands`, `banners`, `settings`), and initial seed data.
3. **Admin User Creation**:
   - Go to **Supabase Authentication -> Users** and create your admin account (e.g. `martbari.shop@gmail.com`).
   - Run the following snippet in the SQL Editor to assign the admin role:
     ```sql
     update profiles set role = 'admin', is_active = true where id = 'YOUR_USER_UUID';
     ```

---

## 3. Cloudflare Pages Deployment

Configure your Cloudflare Pages project with the following settings:
- **Framework preset:** Vite (or None)
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Node version:** `20` (or higher)
- **Environment Variables:**
  - `VITE_SUPABASE_URL`: Your Supabase Project URL
  - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anonymous Key
  - `APP_URL`: Your Cloudflare Pages production URL (e.g. `https://martbari.pages.dev`)

### Supabase Auth URL Configuration
In your Supabase Dashboard -> **Authentication -> URL Configuration**:
- Set **Site URL** to your Cloudflare Pages production URL.
- Add your Cloudflare Pages production URL and callback routes to **Redirect URLs**.

---

## 4. Local Development

Start the development server on port 3000:
```bash
npm run dev
```
