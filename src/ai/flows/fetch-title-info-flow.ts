
'use server';
/**
 * @fileOverview An AI flow to extract anime/manga information from a URL.
 * It now uses the official MangaDex API for MangaDex URLs to improve reliability.
 * Generic scraping has been removed to ensure stability on Vercel.
 *
 * - fetchTitleInfo - A function that takes a URL and returns structured data about a title.
 * - FetchTitleInfoInput - The input type for the fetchTitleInfo function.
 * - FetchTitleInfoOutput - The return type for the fetchTitleinfo function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FetchTitleInfoInputSchema = z.object({
  url: z.string().url(),
});
export type FetchTitleInfoInput = z.infer<typeof FetchTitleInfoInputSchema>;

const FetchTitleInfoOutputSchema = z.object({
  title: z.string(),
  imageUrl: z.string().url(),
  total: z.number(),
  type: z.enum(['Anime', 'Manga', 'Manhwa']),
});
export type FetchTitleInfoOutput = z.infer<typeof FetchTitleInfoOutputSchema>;

const fetchTitleInfoFlow = ai.defineFlow(
  {
    name: 'fetchTitleInfoFlow',
    inputSchema: FetchTitleInfoInputSchema,
    outputSchema: FetchTitleInfoOutputSchema,
  },
  async ({ url }) => {
    const parsedUrl = new URL(url);

    // --- Fast Path for MangaDex using their API ---
    if (parsedUrl.hostname === 'mangadex.org') {
      try {
        const match = url.match(/title\/([a-f0-9-]+)/);
        if (!match) throw new Error('Invalid MangaDex URL');
        const mangaId = match[1];

        // Fetch manga details
        const mangaRes = await fetch(`https://api.mangadex.org/manga/${mangaId}`);
        if (!mangaRes.ok) throw new Error('MangaDex manga fetch failed');
        const mangaData = await mangaRes.json();
        
        const title = mangaData.data?.attributes?.title?.en ?? Object.values(mangaData.data?.attributes?.title ?? {})[0] ?? 'Unknown';

        // Fetch cover art
        const coverRel = mangaData.data?.relationships?.find((r: any) => r.type === 'cover_art');
        let imageUrl = 'https://picsum.photos/seed/mangadex-fallback/400/600'; // Fallback
        if (coverRel?.id) {
          const coverRes = await fetch(`https://api.mangadex.org/cover/${coverRel.id}`);
          const coverData = await coverRes.json();
          const coverFileName = coverData.data?.attributes?.fileName;
          if (coverFileName) {
            imageUrl = `https://uploads.mangadex.org/covers/${mangaId}/${coverFileName}`;
          }
        }

        // Fetch chapter count
        const chaptersRes = await fetch(`https://api.mangadex.org/chapter?manga=${mangaId}&limit=1`);
        if (!chaptersRes.ok) throw new Error('MangaDex chapters fetch failed');
        const chaptersData = await chaptersRes.json();

        return {
          title,
          imageUrl,
          total: chaptersData.total ?? 1,
          type: 'Manga',
        };
      } catch (error: any) {
        console.error(`[MangaDex API Error] Failed to process ${url}:`, error.message);
        throw new Error(`Could not process MangaDex URL. Reason: ${error.message}`);
      }
    }

    // --- If not MangaDex, throw an error ---
    throw new Error('URL fetching is currently only supported for MangaDex. Please add other titles manually.');
  }
);

// This is the exported server action that the client will call.
export async function fetchTitleInfo(input: FetchTitleInfoInput): Promise<FetchTitleInfoOutput> {
  try {
    return await fetchTitleInfoFlow(input);
  } catch (error: any)
{
    console.error(`[fetchTitleInfo Server Action] Error executing flow for URL ${input.url}:`, error);
    // Re-throw a user-friendly error to the client.
    throw new Error(error.message || 'An unexpected error occurred while fetching title info.');
  }
}

