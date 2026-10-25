
import { NextRequest, NextResponse } from 'next/server';
import { firebaseConfig } from '@/firebase/config';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify it doesn't exceed 4MB
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const bucket = firebaseConfig.storageBucket;
    if (!bucket) {
      return NextResponse.json({ error: 'Storage bucket not configured' }, { status: 500 });
    }

    // Generate unique name
    const ext = file.name.split('.').pop() || 'png';
    const filePath = `users/${userId}/dashboard-${Date.now()}.${ext}`;

    // Upload to Firebase Storage JSON API
    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(filePath)}`;

    const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': file.type,
        },
        body: file,
    });

    if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Firebase Storage upload failed:', uploadResponse.status, errorText);
        return NextResponse.json({ error: 'Failed to upload to storage: ' + uploadResponse.status }, { status: uploadResponse.status });
    }

    const uploadData = await uploadResponse.json();

    // Generate the public download URL
    const downloadToken = uploadData.downloadTokens;
    const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;

    return NextResponse.json({ downloadURL, completed: true });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
