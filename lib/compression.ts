import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  fileType?: string;
  useWebWorker?: boolean;
}

export const compressImage = async (file: File, options?: CompressionOptions): Promise<File> => {
  const defaultOptions: CompressionOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    fileType: 'image/jpeg',
    useWebWorker: true,
  };

  const finalOptions = { ...defaultOptions, ...options };

  try {
    const compressedFile = await imageCompression(file, finalOptions);
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    return file; // Return original file on error
  }
};
