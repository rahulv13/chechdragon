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

    // 3. Anikai.to Scraper
    if (parsedUrl.hostname.includes('anikai.to')) {
        console.log(`[Flow] Anikai URL detected.`);

        // Fetch the page with a User-Agent to mimic a browser
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            }
        });

        if (!res.ok) throw new Error(`Anikai fetch failed with status: ${res.status}`);
        const html = await res.text();

        // Regex Extraction
        const titleMatch = html.match(/<h1[^>]*itemprop="name"[^>]*>([^<]+)<\/h1>/i) || html.match(/<meta property="og:title" content="([^"]+)"/i);

        // Priority 1: itemprop="image"
        // Priority 2: .poster img
        // Priority 3: og:image
        const imageMatch =
          html.match(/<img[^>]*itemprop="image"[^>]*src="([^"]+)"/i) ||
          html.match(/<div[^>]*class="poster"[^>]*>\s*<img[^>]*src="([^"]+)"/i) ||
          html.match(/<meta property="og:image" content="([^"]+)"/i);

        // Episode count: look for the 'sub' count in the info section
        const subMatch = html.match(/<span class="sub"[^>]*>.*?(\d+)<\/span>/s);
        // Type: look for the type badge (TV, MOVIE, etc)
        const typeMatch = html.match(/<span><b>(TV|MOVIE|ONA|OVA|SPECIAL)<\/b><\/span>/i);

        const title = titleMatch ? titleMatch[1].replace('Watch ', '').replace(' Online in HD - AnimeKAI', '').trim() : 'Unknown Title';
        const imageUrl = imageMatch ? imageMatch[1] : '';
        let total = subMatch ? parseInt(subMatch[1], 10) : 0;

        // Adjust total if it's 1 (often movies/specials are listed as 1)
        if (total === 0 && typeMatch) {
            total = 1;
        }

        // Map Anikai types to our types
        let type: 'Anime' | 'Manga' | 'Manhwa' = 'Anime';
        // Anikai is primarily anime, so we default to Anime.
        // If we ever scrape a site that mixes them, we'd need better logic.

        return {
            title,
            imageUrl,
            total,
            type
        };
    }

    // 4. Asura Comic Scraper
    if (parsedUrl.hostname.includes('asuracomic.net')) {
      console.log(`[Flow] Asura Comic URL detected.`);

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        }
      });

      if (!res.ok) throw new Error(`Asura Comic fetch failed with status: ${res.status}`);
      const html = await res.text();

      // Extract JSON data using the verified regex
      const complexRegex = /{\\"id\\":\d+,\\"name\\":\\"(?<title>[^"]+)\\",\\"summary\\".*?\\"cover\\":\\"(?<imageUrl>[^"]+)\\".*?\\"chapters_count\\":(?<total>\d+)/;
      const complexMatch = html.match(complexRegex);

      if (complexMatch && complexMatch.groups) {
        return {
          title: complexMatch.groups.title,
          imageUrl: complexMatch.groups.imageUrl,
          total: parseInt(complexMatch.groups.total, 10),
          type: 'Manhwa'
        };
      }

      // Fallback: If regex fails, try to extract basic info or throw specific error
      throw new Error('Could not parse Asura Comic page structure. The site layout may have changed.');
    }

    // 5. If no specific API path matches, throw an error.
    throw new Error('Unsupported URL. Only MangaDex, AniList, Anikai, and Asura Comic links are currently supported for auto-fetching.');
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
