
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const imagesCollection = db.collection('images');

    let objectId;
    try {
        objectId = new ObjectId(id);
    } catch (e) {
        return NextResponse.json({ error: 'Invalid Image ID' }, { status: 400 });
    }

    const image = await imagesCollection.findOne({ _id: objectId });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Convert Binary to compatible response body
    // image.data is likely a Binary object
    let responseData: BodyInit;

    if (image.data && image.data.buffer) {
        responseData = image.data.buffer;
    } else {
        responseData = new Uint8Array(0);
    }

    const headers = new Headers();
    headers.set('Content-Type', image.contentType);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new NextResponse(responseData, {
      status: 200,
      headers: headers,
    });
  } catch (error: any) {
    console.error('Error serving image:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
