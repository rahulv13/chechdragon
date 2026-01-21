
import { NextRequest, NextResponse } from 'next/server';
import { firebaseConfig } from '@/firebase/config';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;
    const authHeader = req.headers.get('Authorization');

    if (!file || !path) {
      return NextResponse.json(
        { error: 'File and path are required' },
        { status: 400 }
      );
    }

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const bucketName = firebaseConfig.storageBucket;
    const encodedPath = encodeURIComponent(path);

    // Firebase Storage JSON API endpoint
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o?name=${encodedPath}`;

    // Convert File to ArrayBuffer for the fetch body
    const arrayBuffer = await file.arrayBuffer();

    const firebaseResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': file.type,
      },
      body: arrayBuffer,
    });

    if (!firebaseResponse.ok) {
      const errorText = await firebaseResponse.text();
      console.error('Firebase Storage Error:', errorText);
      return NextResponse.json(
        { error: `Storage upload failed: ${firebaseResponse.statusText}` },
        { status: firebaseResponse.status }
      );
    }

    const data = await firebaseResponse.json();

    // Construct the public download URL (or use the one from metadata if available,
    // but usually we construct it to match getDownloadURL format)
    // Format: https://firebasestorage.googleapis.com/v0/b/[bucket]/o/[name]?alt=media&token=[downloadToken]
    const downloadToken = data.downloadTokens;
    const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;

    return NextResponse.json({ downloadURL });
  } catch (error: any) {
    console.error('Upload proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
