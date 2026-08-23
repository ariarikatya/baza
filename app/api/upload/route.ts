import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image');

    if (!imageFile) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    const key = process.env.IMGBB_API_KEY || process.env.NEXT_PUBLIC_IMGBB_API_KEY;

    if (!key) {
      // Return SVG placeholder data URL if key is missing
      return NextResponse.json({
        success: true,
        url: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=300',
      });
    }

    const imgbbFormData = new FormData();
    imgbbFormData.append('image', imageFile);

    const response = await axios.post(`https://api.imgbb.com/1/upload?key=${key}`, imgbbFormData);

    if (response.data && response.data.data && response.data.data.url) {
      return NextResponse.json({ success: true, url: response.data.data.url });
    }

    return NextResponse.json({ error: 'Failed to upload to ImgBB' }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
