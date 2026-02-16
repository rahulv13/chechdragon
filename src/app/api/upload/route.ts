
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Binary } from 'mongodb';

export const runtime = 'nodejs';

// Helper to concatenate Uint8Arrays
function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, val) => acc + val.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const uploadId = formData.get('uploadId') as string;
    const indexStr = formData.get('chunkIndex') as string;
    const totalChunksStr = formData.get('totalChunks') as string;
    const userId = formData.get('userId') as string;

    if (!file || !uploadId || !indexStr || !totalChunksStr) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const index = parseInt(indexStr);
    const totalChunks = parseInt(totalChunksStr);

    const client = await clientPromise;
    const db = client.db();

    // Convert File chunk to Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const binaryData = new Binary(uint8Array);

    const chunksCollection = db.collection('chunks');
    const imagesCollection = db.collection('images');

    // Save chunk
    // Note: We use updateOne with upsert to prevent duplicates if retried
    await chunksCollection.updateOne(
      { uploadId, index },
      {
        $set: {
          uploadId,
          index,
          data: binaryData,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    // Check if we have all chunks
    const count = await chunksCollection.countDocuments({ uploadId });

    if (count === totalChunks) {
      // All chunks received. Assemble!
      const chunks = await chunksCollection.find({ uploadId }).sort({ index: 1 }).toArray();

      // Concatenate chunks
      // chunk.data is likely a Binary object, so accessing .buffer (which is Uint8Array or Buffer)
      // Binary.buffer returns the underlying buffer.
      const chunkArrays = chunks.map((c: any) => {
          // c.data is Binary. read(0, length) or .buffer
          if (c.data && c.data.buffer) {
             return new Uint8Array(c.data.buffer);
          }
          return new Uint8Array(0);
      });

      const completeData = concatUint8Arrays(chunkArrays);

      // Create Image
      const newImage = await imagesCollection.insertOne({
        userId: userId || 'unknown',
        data: new Binary(completeData),
        contentType: file.type || 'application/octet-stream',
        createdAt: new Date()
      });

      // Cleanup chunks
      await chunksCollection.deleteMany({ uploadId });

      // Return the new image URL
      const imageUrl = `/api/image/${newImage.insertedId}`;

      return NextResponse.json({ downloadURL: imageUrl, completed: true });
    }

    return NextResponse.json({ completed: false, message: `Chunk ${index + 1}/${totalChunks} received` });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
