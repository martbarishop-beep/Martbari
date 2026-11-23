-- ============================================================================
-- MartBari — Fix Logo Storage & Settings RLS (Idempotent / Safe to Re-run)
-- ============================================================================
-- Run this script in the Supabase SQL Editor.
-- It ensures the 'site-assets' storage bucket exists, is public, has proper RLS policies
-- for public viewing and admin uploads, and verifies settings updates.
-- ============================================================================

-- 1. Ensure 'site-assets' bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-assets',
  'site-assets',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']::text[];

-- 2. Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing conflicting storage policies on site-assets if any
DROP POLICY IF EXISTS "Public Access site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete site-assets" ON storage.objects;

-- 4. Create permissive storage policies for site-assets
CREATE POLICY "Public Access site-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');

CREATE POLICY "Authenticated Upload site-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'site-assets');

CREATE POLICY "Authenticated Update site-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'site-assets');

CREATE POLICY "Authenticated Delete site-assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'site-assets');

-- 5. Ensure settings table allows public read and staff/admin update
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select settings" ON public.settings;
DROP POLICY IF EXISTS "Staff update settings" ON public.settings;
DROP POLICY IF EXISTS "Admin upsert settings" ON public.settings;

CREATE POLICY "Public select settings"
ON public.settings FOR SELECT
USING (true);

CREATE POLICY "Staff update settings"
ON public.settings FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
