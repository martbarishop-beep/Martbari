import { supabase } from './supabase';

const MAX_WIDTH = 1200;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface CompressResult {
  blob: Blob;
  fileName: string;
}

/**
 * Resizes an image file on the client side using HTML5 Canvas to a maximum width of 1200px
 * and compresses it to modern WebP format.
 */
export async function compressImageToWebp(file: File): Promise<CompressResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files (PNG, JPG, WebP) are allowed.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Image size exceeds the 5MB limit.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image for compression.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to initialize 2D canvas context.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image to WebP.'));
              return;
            }
            const cleanBase = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
            const fileName = `${cleanBase}_${Date.now()}.webp`;
            resolve({ blob, fileName });
          },
          'image/webp',
          0.85,
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image and uploads it to a public Supabase Storage bucket
 */
export async function uploadToStorage(
  file: File,
  bucket: 'product-images' | 'site-assets' | 'category-images' = 'product-images',
): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const { blob, fileName } = await compressImageToWebp(file);

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
