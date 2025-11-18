
'use server';
/**
 * @fileOverview An AI flow to extract anime/manga information from a URL.
 * It now uses the official MangaDex API for MangaDex URLs to improve reliability and avoid AI rate limits.
 *
 * - fetchTitleInfo - A function that takes a URL and returns structured data about a title.
 * - FetchTitleInfoInput - The input type for the fetchTitleInfo function.
 * - FetchTitleInfoOutput - The return type for the fetchTitleinfo function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FetchTitleInfoInputSchema = z.object({
  url: z.string().url().describe('The URL of the anime or manga page.'),
});
export type FetchTitleInfoInput = z.infer<typeof FetchTitleInfoInputSchema>;

const FetchTitleInfoOutputSchema = z.object({
  title: z.string().describe('The official title of the anime or manga.'),
  imageUrl: z
    .string()
    .url()
    .describe(
      'The direct, absolute URL for the cover image. Must be a URL to an image file (e.g., .jpg, .png, .webp), not a URL to a web page.'
    ),
  total: z
    .number()
    .describe(
      'The total number of episodes or chapters available on the page.'
    ),
  type: z.enum(['Anime', 'Manga', 'Manhwa']).describe("The media type, one of 'Anime', 'Manga', or 'Manhwa'."),
});
export type FetchTitleInfoOutput = z.infer<typeof FetchTitleInfoOutputSchema>;


const ScraperPromptInputSchema = z.object({
    url: z.string().url(),
    htmlContent: z.string(),
});

const prompt = ai.definePrompt({
  name: 'fetchTitleInfoPrompt',
  input: { schema: ScraperPromptInputSchema },
  output: { schema: FetchTitleInfoOutputSchema },
  prompt: `You are an expert web scraper. Your task is to analyze the provided HTML content and extract the requested information in the specified JSON format. The URL is provided for context.

URL: {{{url}}}

HTML Content:
\`\`\`html
{{{htmlContent}}}
\`\`\`

You must extract the following details:
1.  **title**: The official title of the series. Find this in the main heading (like <h1>) or the page <title> tag.
2.  **imageUrl**: The direct, absolute URL for the main cover image or poster. Look for the most prominent image, often inside a component that looks like a card or poster. A meta tag like <meta property="og:image" ...> is a good fallback. This must be a URL to an image file (e.g., .jpg, .png, .webp), not a link to another web page.
3.  **total**: The total number of episodes (for Anime) or chapters (for Manga/Manhwa).
    -   If it is a movie with only one part, return 1.
    -   If you absolutely cannot find an episode or chapter list in the HTML, default to 1.
4.  **type**: Determine if it is 'Anime', 'Manga', or 'Manhwa'.
    - If the content mentions "episodes" or "anime", it is 'Anime'.
    - If the content or URL mentions "manhwa" or "webtoon", or if the site is a known manhwa-focused site (like asurascans, omegascans), it is 'Manhwa'.
    - Otherwise, if it has "chapters", assume it is 'Manga'.`,
});


export async function fetchTitleInfo(
  input: FetchTitleInfoInput
): Promise<FetchTitleInfoOutput> {
  const url = new URL(input.url);

  // --- Hybrid Approach: Use MangaDex API if applicable ---
  if (url.hostname === 'mangadex.org') {
    try {
      console.log(`[fetchTitleInfo] MangaDex URL detected. Using API.`);
      const match = input.url.match(/title\/([a-f0-9\-]+)/);
      const mangaId = match?.[1];
      if (!mangaId) throw new Error('Invalid MangaDex URL, could not extract ID.');

      // --- Fetch Manga Info ---
      const mangaRes = await fetch(`https://api.mangadex.org/manga/${mangaId}`, {
        headers: { 'User-Agent': 'DraglistApp/1.0 (https://draglist.app)' },
      });

      const mangaText = await mangaRes.text();
      if (!mangaText.startsWith('{')) {
        console.error('[MangaDex API Error] Non-JSON response:', mangaText.slice(0, 200));
        throw new Error('MangaDex API returned a non-JSON response (rate-limited or invalid request).');
      }
      const mangaData = JSON.parse(mangaText);

      const title =
        mangaData.data?.attributes?.title?.en ||
        Object.values(mangaData.data?.attributes?.title || {})[0] ||
        'Unknown Title';

      // --- Fetch cover filename properly ---
      const coverRel = mangaData.data?.relationships?.find(
        (r: any) => r.type === 'cover_art'
      );
      let imageUrl = 'https://picsum.photos/seed/placeholder/400/600'; // Valid placeholder

      if (coverRel?.id) {
        const coverRes = await fetch(`https://api.mangadex.org/cover/${coverRel.id}`);
        const coverData = await coverRes.json();
        const coverFileName = coverData.data?.attributes?.fileName;
        if (coverFileName) {
          imageUrl = `https://uploads.mangadex.org/covers/${mangaId}/${coverFileName}`;
        }
      }

      // --- Fetch Chapters ---
      const chaptersRes = await fetch(
        `https://api.mangadex.org/chapter?manga=${mangaId}&limit=500&translatedLanguage[]=en`,
        { headers: { 'User-Agent': 'DraglistApp/1.0' } }
      );
      const chaptersText = await chaptersRes.text();
      const chaptersData = chaptersText.startsWith('{')
        ? JSON.parse(chaptersText)
        : { total: 1 };
      
      const total = chaptersData.total ?? 1;

      return { title, imageUrl, total, type: 'Manga' };

    } catch (error: any) {
      console.error(`[fetchTitleInfo] MangaDex API Error:`, error);
      // Fallback to generic scraper if API fails for some reason
    }
  }
  
  // --- Generic Scraper as Fallback ---
  try {
    console.log(`[fetchTitleInfo] Using generic AI scraper for ${input.url}`);
    const response = await fetch(input.url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const htmlContent = await response.text();

    const { output } = await prompt({
        url: input.url,
        htmlContent: htmlContent,
    });

    if (!output) {
      throw new Error('AI model failed to return structured output from the HTML content.');
    }
    
    // Ensure imageUrl is an absolute URL
    if (output.imageUrl && !output.imageUrl.startsWith('http')) {
      output.imageUrl = new URL(output.imageUrl, `${url.protocol}//${url.hostname}`).href;
    }

    return output;
  } catch (error: any) {
    console.error(`[fetchTitleInfo] Generic Scraper Error for URL ${input.url}:`, error);
    throw new Error(`The AI failed to extract information from the URL. Please check if the URL is correct and public. Reason: ${error.message}`);
  }
}
