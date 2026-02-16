
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Chunk from '@/models/Chunk';
import Image from '@/models/Image';

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

    await dbConnect();

    // Convert File chunk to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save chunk
    await Chunk.create({
      uploadId,
      index,
      data: buffer,
    });

    // Check if we have all chunks
    // Note: We use countDocuments to ensure we have exactly 'totalChunks' chunks stored.
    const count = await Chunk.countDocuments({ uploadId });

    if (count === totalChunks) {
      // All chunks received. Assemble!
      const chunks = await Chunk.find({ uploadId }).sort({ index: 1 });

      const completeBuffer = Buffer.concat(chunks.map((c: any) => c.data));

      // Create Image
      const newImage = await Image.create({
        userId: userId || 'unknown',
        data: completeBuffer,
        contentType: file.type || 'application/octet-stream',
      });

      // Cleanup chunks (important to free space)
      await Chunk.deleteMany({ uploadId });

      // Return the new image URL
      const imageUrl = `/api/image/${newImage._id}`;

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
