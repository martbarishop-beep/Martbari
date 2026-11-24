import { supabase } from './supabase';

const MAX_WIDTH = 1200;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface CompressResult {
  blob: Blob;
  fileName: string;
}

export interface CompressOptions {
  maxWidth?: number;
  targetMaxBytes?: number;
  initialQuality?: number;
}

function canvasToWebpBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to compress image to WebP.'));
          return;
        }
        resolve(blob);
      },
      'image/webp',
      quality,
    );
  });
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image for compression.'));
      img.onload = () => resolve(img);
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Resizes an image file on the client side using HTML5 Canvas and compresses it
 * to WebP format, iteratively fitting within targetMaxBytes if specified.
 */
export async function compressImageToWebp(
  file: File,
  options: CompressOptions = {},
): Promise<CompressResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files (PNG, JPG, WebP) are allowed.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Image size exceeds the 5MB limit.');
  }

  const maxWidth = options.maxWidth ?? MAX_WIDTH;
  const targetMaxBytes = options.targetMaxBytes ?? 240 * 1024;
  const initialQuality = options.initialQuality ?? 0.84;

  const img = await loadImageFromFile(file);

  let width = img.width;
  let height = img.height;

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to initialize 2D canvas context.');
  }

  let bestBlob: Blob | null = null;
  let currentWidth = width;
  let currentHeight = height;

  // Step 1: reduce WebP quality first while keeping dimensions crisp
  const qualitySteps = [initialQuality, 0.74, 0.64, 0.54];
  for (const q of qualitySteps) {
    canvas.width = currentWidth;
    canvas.height = currentHeight;
    ctx.clearRect(0, 0, currentWidth, currentHeight);
    ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
    const blob = await canvasToWebpBlob(canvas, q);
    bestBlob = blob;
    if (blob.size <= targetMaxBytes) {
      break;
    }
  }

  // Step 2: if still above targetMaxBytes (e.g. high-detail photo), downscale width slightly
  const downscaleSteps = [1024, 840];
  for (const nextWidth of downscaleSteps) {
    if (!bestBlob || bestBlob.size <= targetMaxBytes || currentWidth <= nextWidth) {
      break;
    }
    currentHeight = Math.round((img.height * nextWidth) / img.width);
    currentWidth = nextWidth;
    canvas.width = currentWidth;
    canvas.height = currentHeight;
    ctx.clearRect(0, 0, currentWidth, currentHeight);
    ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
    bestBlob = await canvasToWebpBlob(canvas, 0.7);
  }

  if (!bestBlob) {
    throw new Error('Failed to compress image to WebP.');
  }

  const cleanBase = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${cleanBase}_${Date.now()}.webp`;
  return { blob: bestBlob, fileName };
}

/**
 * Compresses an image and uploads it to a public Supabase Storage bucket
 */
export async function uploadToStorage(
  file: File,
  bucket: 'product-images' | 'site-assets' | 'category-images' = 'product-images',
  compressOptions?: CompressOptions,
): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const resolvedOptions: CompressOptions =
    compressOptions ??
    (bucket === 'site-assets'
      ? { maxWidth: 1920, targetMaxBytes: 340 * 1024, initialQuality: 0.86 }
      : { maxWidth: 1200, targetMaxBytes: 220 * 1024, initialQuality: 0.84 });

  const { blob, fileName } = await compressImageToWebp(file, resolvedOptions);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, blob, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: true,
    });

  if (error || !data) {
    throw new Error(error?.message ?? 'Storage upload failed.');
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicData.publicUrl;
}
