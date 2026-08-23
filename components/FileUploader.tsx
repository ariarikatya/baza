'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { compressImage } from '@/lib/compression';

export interface FileUploaderProps {
  onUploadComplete: (url: string) => void;
  defaultUrl?: string;
  label?: string;
  className?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onUploadComplete,
  defaultUrl,
  label = 'Загрузить аватар / изображение',
  className = '',
}) => {
  const [preview, setPreview] = useState<string | null>(defaultUrl || null);
  const [loading, setLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      // 1. Compress client-side
      const compressed = await compressImage(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        fileType: 'image/jpeg',
      });

      // Show local preview immediately
      const localPreviewUrl = URL.createObjectURL(compressed);
      setPreview(localPreviewUrl);

      // 2. Upload via Proxy API
      const formData = new FormData();
      formData.append('image', compressed);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setPreview(data.url);
        onUploadComplete(data.url);
      } else {
        // Fallback local preview URL if API key not set or failed
        onUploadComplete(localPreviewUrl);
      }
    } catch (err) {
      console.error('File upload failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setPreview(null);
    onUploadComplete('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <div className="relative flex items-center justify-center border-2 border-dashed border-border rounded-xl p-4 bg-card hover:border-brand transition-colors">
        {preview ? (
          <div className="relative group w-full flex items-center justify-center">
            <img
              src={preview}
              alt="Uploaded preview"
              className="max-h-48 rounded-lg object-cover shadow-sm"
            />
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-full hover:bg-destructive/80 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex flex-col items-center justify-center py-6 w-full text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
          >
            {loading ? (
              <Loader2 className="w-8 h-8 animate-spin text-brand" />
            ) : (
              <>
                <Upload className="w-8 h-8 mb-2 text-brand" />
                <span className="text-sm font-medium">Нажмите для выбора файла</span>
                <span className="text-xs text-muted-foreground mt-1">Авто-сжатие (макс 1MB, JPEG)</span>
              </>
            )}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};
