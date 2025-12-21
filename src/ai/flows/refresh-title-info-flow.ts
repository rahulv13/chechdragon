'use server';

import { getAI } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { fetchTitleInfo } from './fetch-title-info-flow';
import type { Title } from '@/lib/data';


// Server-side Firebase initialization
function initializeServerFirebase() {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}
const serverApp = initializeServerFirebase();
const firestore = getFirestore(serverApp);


const RefreshTitleInfoInputSchema = z.object({
  userId: z.string().describe('The ID of the user who owns the title.'),
  titleId: z.string().describe('The ID of the title document to refresh.'),
});
type RefreshTitleInfoInput = z.infer<typeof RefreshTitleInfoInputSchema>;

const ai = getAI();

const refreshTitleInfoFlow = ai.defineFlow(
  {
    name: 'refreshTitleInfoFlow_v1',
    inputSchema: RefreshTitleInfoInputSchema,
  },
  async ({ userId, titleId }) => {
    console.log(`[Flow] Starting refresh for titleId: ${titleId} for user: ${userId}`);

    const titleDocRef = doc(firestore, 'users', userId, 'titles', titleId);
    const titleDoc = await getDoc(titleDocRef);

    if (!titleDoc.exists()) {
      console.error(`[Flow] Title document ${titleId} does not exist.`);
      // We don't throw here, as the doc might have been deleted.
      return;
    }

    const titleData = titleDoc.data() as Title;
    const sourceUrl = titleData.sourceUrl;

    if (!sourceUrl) {
      console.log(`[Flow] No sourceUrl for title ${titleId}. Skipping refresh.`);
      return;
    }

    console.log(`[Flow] Found sourceUrl: ${sourceUrl}. Fetching latest info...`);

    try {
      const latestInfo = await fetchTitleInfo({ url: sourceUrl });

      // Compare and update if necessary
      if (latestInfo.total > titleData.total) {
        console.log(`[Flow] New total found for ${titleId}: ${latestInfo.total} (old: ${titleData.total}). Updating document.`);
        await updateDoc(titleDocRef, {
          total: latestInfo.total,
          // also update image if it changed
          ...(latestInfo.imageUrl !== titleData.imageUrl && { imageUrl: latestInfo.imageUrl }),
          updatedAt: new Date(), // use JS date, serverTimestamp is tricky without backend SDK
        });
        console.log(`[Flow] Successfully updated title ${titleId}.`);
      } else {
        console.log(`[Flow] Total for ${titleId} is already up-to-date.`);
      }
    } catch (error) {
      console.error(`[Flow] Failed to fetch or update info for ${sourceUrl}.`, error);
      // We don't re-throw. A background refresh failing shouldn't interrupt the user.
    }
  }
);

export async function refreshTitleInfo(input: RefreshTitleInfoInput): Promise<void> {
  await refreshTitleInfoFlow(input);
}
