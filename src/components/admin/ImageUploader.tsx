import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, UploadCloud, X } from 'lucide-react';
import { uploadToStorage } from '../../lib/imageCompression';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { cn } from '../../lib/utils';
import { ProductImage } from '../ProductImage';

export interface ImageUploaderProps {
  value?: string | string[];
  images?: string[];
  onChange: (urls: any) => void;
  multiple?: boolean;
  maxImages?: number;
  bucket?: 'product-images' | 'site-assets' | 'category-images' | string;
  label?: string;
  helperText?: string;
  className?: string;
}

function resolveBucket(name?: string): 'product-images' | 'site-assets' | 'category-images' {
  if (!name) return 'product-images';
  if (name === 'product-images' || name === 'products') return 'product-images';
  if (name === 'category-images' || name === 'categories') return 'category-images';
  return 'site-assets';
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  images,
  onChange,
  multiple,
  maxImages,
  bucket = 'product-images',
  label,
  helperText,
  className,
}) => {
  const { at } = useAdminLanguage();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolvedHelper = helperText ?? at('uploader.helper');
  const isMultiple = multiple ?? (maxImages !== undefined && maxImages > 1);
  const targetBucket = resolveBucket(bucket);

  const rawImages = images ?? value;
  const imagesList = Array.isArray(rawImages) ? rawImages : rawImages ? [rawImages] : [];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const url = await uploadToStorage(file, targetBucket);
        uploadedUrls.push(url);
      }

      if (isMultiple) {
        const combined = [...imagesList, ...uploadedUrls];
        const finalUrls = maxImages ? combined.slice(0, maxImages) : combined;
        onChange(finalUrls);
      } else {
        onChange(uploadedUrls[0]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (urlToRemove: string) => {
    if (isMultiple) {
      onChange(imagesList.filter((u) => u !== urlToRemove));
    } else {
      onChange('');
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-[#0F1A2C] mb-1.5">
          {label}
        </label>
      )}

      {/* Drop / Select Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center rounded-[10px] border-2 border-dashed border-[#17263E]/20 bg-[#F5F7FA] p-6 text-center transition-colors cursor-pointer hover:border-[#F47125] hover:bg-[#F47125]/5',
          uploading && 'pointer-events-none opacity-60',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={isMultiple}
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-7 w-7 animate-spin text-[#F47125]" />
            <p className="text-xs font-semibold text-[#0F1A2C]">
              {at('uploader.compressing')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#F47125] shadow-sm">
              <UploadCloud className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-[#0F1A2C]">
              {at('uploader.clickOrDrag')}
            </p>
            <p className="text-[11px] text-[#5B6577]">{resolvedHelper}</p>
          </div>
        )}
      </div>

      {error && <p className="mt-1.5 text-xs font-semibold text-[#DC2626]">{error}</p>}

      {/* Image Preview Grid */}
      {imagesList.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {imagesList.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className="group relative h-20 w-20 overflow-hidden rounded-[8px] border border-[#17263E]/15 bg-white shadow-sm"
            >
              <ProductImage src={url} alt={`Upload ${idx + 1}`} aspectClassName="aspect-square" />

              {idx === 0 && isMultiple && (
                <span className="absolute bottom-1 left-1 rounded bg-[#17263E] px-1 text-[9px] font-bold text-white uppercase">
                  {at('uploader.main')}
                </span>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(url);
                }}
                className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[#DC2626] shadow-sm hover:bg-[#DC2626] hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
