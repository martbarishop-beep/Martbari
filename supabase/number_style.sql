-- ============================================================================
-- MartBari — Add number_style setting to settings table (Idempotent)
-- ============================================================================
-- Run this script in the Supabase SQL Editor.
-- ============================================================================

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS number_style text DEFAULT 'bn' CHECK (number_style IN ('bn', 'en'));

-- Ensure setting row 1 has number_style populated
UPDATE public.settings
SET number_style = COALESCE(number_style, 'bn')
WHERE id = 1;
