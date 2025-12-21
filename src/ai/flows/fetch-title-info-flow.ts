'use server';

import { getAI } from '@/ai/genkit';
import { z } from 'genkit';

// Define schema types, but do not export them from this server module.
const FetchTitleInfoInputSchema = z.object({
  url: z.string().url().describe('The URL of the anime or manga page.'),
});
type FetchTitleInfoInput = z.infer<typeof FetchTitleInfoInputSchema>;

const FetchTitleInfoOutputSchema = z.object({
  title: z.string().describe('The official title of the anime or manga.'),
  imageUrl: z
    .string()
    .url()
    .describe('The direct, absolute URL for the cover image.'),
  total: z
    .number()
    .describe('The total number of episodes or chapters available on the page.'),
  type: z
    .enum(['Anime', 'Manga', 'Manhwa'])
    .describe("The media type, one of 'Anime', 'Manga', or 'Manhwa'."),
});
type FetchTitleInfoOutput = z.infer<typeof FetchTitleInfoOutputSchema>;

const ai = getAI();

const fetchTitleInfoFlow = ai.defineFlow(
  {
    name: 'fetchTitleInfoFlow_v5', // Use a unique name
    inputSchema: FetchTitleInfoInputSchema,
    outputSchema: FetchTitleInfoOutputSchema,
  },
  async ({ url }) => {
    const parsedUrl = new URL(url);

    // 1. MangaDex API Fast Path
    if (parsedUrl.hostname === 'mangadex.org') {
      console.log(`[Flow] MangaDex URL detected. Using API.`);
      const match = url.match(/title\/([a-f0-9-]+)/);
      if (!match) throw new Error('Invalid MangaDex URL, could not extract ID.');
      const mangaId = match[1];

      const mangaRes = await fetch(`https://api.mangadex.org/manga/${mangaId}`);
      if (!mangaRes.ok) throw new Error(`MangaDex API for manga failed with status: ${mangaRes.status}`);
      const mangaData = await mangaRes.json();

      const title = mangaData.data?.attributes?.title?.en || Object.values(mangaData.data?.attributes?.title || {})[0] || 'Unknown Title';

      const coverRel = mangaData.data?.relationships?.find((r: any) => r.type === 'cover_art');
      let imageUrl = 'https://picsum.photos/seed/placeholder/400/600';
      if (coverRel?.id) {
        const coverRes = await fetch(`https://api.mangadex.org/cover/${coverRel.id}`);
        if (coverRes.ok) {
          const coverData = await coverRes.json();
          const coverFileName = coverData.data?.attributes?.fileName;
          if (coverFileName) {
            imageUrl = `https://uploads.mangadex.org/covers/${mangaId}/${coverFileName}`;
          }
        }
      }

      const chaptersRes = await fetch(`https://api.mangadex.org/chapter?manga=${mangaId}&limit=1`);
      const chaptersData = chaptersRes.ok ? await chaptersRes.json() : { total: 1 };
      const total = chaptersData.total ?? 1;

      return { title, imageUrl, total, type: 'Manga' as const };
    }

    // 2. AniList API Fast Path
    if (parsedUrl.hostname === 'anilist.co') {
      console.log(`[Flow] AniList URL detected. Using API.`);
      const match = url.match(/\/(anime|manga)\/(\d+)/);
      if (!match) throw new Error('Invalid AniList URL, could not extract ID.');
      const mediaId = match[2];

      const query = `
            query ($id: Int) {
                Media(id: $id) {
                    title { romaji english }
                    coverImage { large }
                    episodes
                    chapters
                    type
                    countryOfOrigin
                }
            }
        `;
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ query, variables: { id: parseInt(mediaId) } }),
      });

      if (!res.ok) throw new Error(`AniList API failed with status: ${res.status}`);
      const json = await res.json();
      const media = json.data?.Media;

      if (!media) throw new Error('Could not find media on AniList with that ID.');

      const detectedType =
        media.type === 'ANIME'
          ? 'Anime'
          : media.countryOfOrigin === 'KR'
          ? 'Manhwa'
          : 'Manga';

      return {
        title: media.title.english || media.title.romaji,
        imageUrl: media.coverImage.large,
        total: media.episodes || media.chapters || 0,
        type: detectedType as 'Anime' | 'Manga' | 'Manhwa',
      };
    }

    // 3. If no specific API path matches, throw an error.
    throw new Error('Unsupported URL. Only MangaDex and AniList links are currently supported for auto-fetching.');
  }
);

/**
 * The single, exported server action that the client calls.
 * This function wraps the Genkit flow and includes top-level error handling.
 */
export async function fetchTitleInfo(
  input: FetchTitleInfoInput
): Promise<FetchTitleInfoOutput> {
  console.log(`[Server Action] fetchTitleInfo called with URL: ${input.url}`);
  try {
    // Execute the flow
    return await fetchTitleInfoFlow(input);

  } catch (error: any) {
    console.error(`[Server Action Error] fetchTitleInfo failed for URL ${input.url}:`, error);
    // Re-throw the error so the client-side `catch` block can handle it.
    throw new Error(error.message || 'An unexpected error occurred while fetching title information.');
  }
}
