
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Image from '@/models/Image';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    await dbConnect();

    const image = await Image.findById(id);

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Convert Buffer to headers for correct display
    const headers = new Headers();
    headers.set('Content-Type', image.contentType);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new NextResponse(image.data, {
      status: 200,
      headers: headers,
    });
  } catch (error: any) {
    console.error('Error serving image:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
