'use client';

import { useMemo, useRef, useState } from 'react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/lib/data';

export default function DashboardImageUpload() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: userData, isLoading } = useDoc<{ dashboardImage?: string }>(userDocRef);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !firestore) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (e.g. 4.5MB limit for Server Actions/API routes usually, we enforce 4MB to be safe)
    if (file.size > 4 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 4MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const idToken = await user.getIdToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', `users/${user.uid}/dashboard-image`);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const { downloadURL } = await response.json();

      updateUserProfile(firestore, user.uid, { dashboardImage: downloadURL });

      toast({
        title: 'Success',
        description: 'Dashboard image updated',
      });
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const dashboardImage = userData?.dashboardImage;

  return (
    <Card className="relative overflow-hidden group h-[120px] md:h-auto min-h-[120px]">
      <CardContent className="p-0 h-full flex items-center justify-center bg-muted/20">
        {isLoading ? (
           <div className="flex items-center justify-center h-full w-full">
               <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
           </div>
        ) : dashboardImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dashboardImage}
              alt="Dashboard preference"
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Change
              </Button>
            </div>
          </>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-2 cursor-pointer h-full w-full hover:bg-muted/40 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
            )}
            <span className="text-xs text-muted-foreground font-medium">
               {isUploading ? 'Uploading...' : 'Upload Image'}
            </span>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileSelect}
        />
      </CardContent>
    </Card>
  );
}
