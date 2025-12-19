
'use client';

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import {
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  setDocumentNonBlocking,
} from '@/firebase';
import { PlaceHolderImages } from './placeholder-images';
import { refreshTitleInfo } from '@/ai/flows/refresh-title-info-flow';

export type Title = {
  id: string;
  title: string;
  type: 'Anime' | 'Manga' | 'Manhwa';
  status: 'Watching' | 'Reading' | 'Planned' | 'Completed';
  progress: number;
  total: number;
  score: number;
  imageUrl: string;
  imageHint: string;
  isSecret: boolean;
  sourceUrl?: string; // Optional: The original URL from where info was fetched
  createdAt: any; // serverTimestamp
  updatedAt: any; // serverTimestamp
};

export const addTitle = (
  firestore: Firestore,
  userId: string,
  newTitleData: Omit<Title, 'id' | 'progress' | 'score' | 'imageHint' | 'createdAt' | 'updatedAt'>
) => {
  if (!userId) {
    throw new Error('User must be logged in to add a title.');
  }
  const titlesCollection = collection(firestore, 'users', userId, 'titles');
  
  const randomPlaceholder = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];

  const data: Omit<Title, 'id'> = {
    ...newTitleData,
    progress: 0,
    score: 0,
    isSecret: newTitleData.isSecret || false,
    imageUrl:
      newTitleData.imageUrl || randomPlaceholder.imageUrl,
    imageHint: newTitleData.imageUrl ? newTitleData.title.split(' ').slice(0, 2).join(' ').toLowerCase() : randomPlaceholder.imageHint,
    sourceUrl: newTitleData.sourceUrl || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  addDocumentNonBlocking(titlesCollection, data);
};

export const updateTitle = (
  firestore: Firestore,
  userId: string,
  titleId: string,
  updatedData: Partial<Omit<Title, 'id' | 'createdAt'>>
) => {
  if (!userId) {
    throw new Error('User must be logged in to update a title.');
  }
  const titleDoc = doc(firestore, 'users', userId, 'titles', titleId);
  updateDocumentNonBlocking(titleDoc, {
    ...updatedData,
    updatedAt: serverTimestamp(),
  });

  // After updating progress, kick off a background refresh
  if (updatedData.progress !== undefined) {
    console.log(`[updateTitle] Kicking off background refresh for title: ${titleId}`)
    refreshTitleInfo({ userId, titleId }).catch(err => {
      // We don't want to bother the user with a toast for a background task
      console.error(`[updateTitle] Background refresh failed for title ${titleId}:`, err);
    })
  }
};

export const deleteTitle = (
  firestore: Firestore,
  userId: string,
  titleId: string
) => {
  if (!userId) {
    throw new Error('User must be logged in to delete a title.');
  }
  const titleDoc = doc(firestore, 'users', userId, 'titles', titleId);
  deleteDocumentNonBlocking(titleDoc);
};

export const updateUserSecretPassword = (
    firestore: Firestore,
    userId: string,
    password: string | null
) => {
    if (!userId) {
        throw new Error('User must be logged in to update their password.');
    }
    const userDocRef = doc(firestore, 'users', userId);
    // Use setDoc with merge:true to create, update, or clear the field
    setDocumentNonBlocking(userDocRef, { secretPassword: password }, { merge: true });
};
