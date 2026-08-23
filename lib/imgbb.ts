import axios from 'axios';
import { compressImage } from './compression';

export const uploadToImgBB = async (file: File, apiKey?: string): Promise<string> => {
  // First compress the image
  const compressedFile = await compressImage(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    fileType: 'image/jpeg',
  });

  const formData = new FormData();
  formData.append('image', compressedFile);

  const key = apiKey || process.env.NEXT_PUBLIC_IMGBB_API_KEY || process.env.IMGBB_API_KEY;

  if (!key) {
    console.warn('IMGBB_API_KEY is missing. Returning placeholder or data URL.');
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(compressedFile);
    });
  }

  try {
    const response = await axios.post(`https://api.imgbb.com/1/upload?key=${key}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data && response.data.data && response.data.data.url) {
      return response.data.data.url;
    }
    throw new Error('Invalid response structure from ImgBB API');
  } catch (error) {
    console.error('Failed to upload image to ImgBB:', error);
    // Fallback to Data URL if direct client-side upload fails
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(compressedFile);
    });
  }
};
