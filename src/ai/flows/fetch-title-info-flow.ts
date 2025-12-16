
'use server';
/**
 * @fileOverview An AI flow to extract anime/manga information from a URL.
 * It uses the official MangaDex API for MangaDex URLs to ensure reliability.
 * For other URLs, it attempts a direct fetch as a fallback.
 *
 * - fetchTitleInfo - A function that takes a URL and returns structured data about a title.
 * - FetchTitleInfoInput - The input type for the fetchTitleInfo function.
 * - FetchTitleInfoOutput - The return type for the fetchTitleinfo function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input schema for the public-facing function
const FetchTitleInfoInputSchema = z.object({
  url: z.string().url().describe('The URL of the anime or manga page.'),
});
export type FetchTitleInfoInput = z.infer<typeof FetchTitleInfoInputSchema>;

// Output schema for the flow and public function
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

// Internal schema for the AI prompt
const ScraperPromptInputSchema = z.object({
    url: z.string().url(),
    htmlContent: z.string(),
});

// The Genkit prompt for scraping HTML content
const scraperPrompt = ai.definePrompt({
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
2.  **imageUrl**: The direct, absolute URL for the main cover image or poster. Look for the most prominent image. A meta tag like <meta property="og:image" ...> is a good fallback. This must be a URL to an image file (e.g., .jpg, .png, .webp), not a link to another web page.
3.  **total**: The total number of episodes (for Anime) or chapters (for Manga/Manhwa). If it's a movie, return 1. If you cannot find the count, default to 1.
4.  **type**: Determine if it is 'Anime', 'Manga', or 'Manhwa'. If the content mentions "episodes", it is 'Anime'. If the URL or content mentions "manhwa" or "webtoon", it is 'Manhwa'. Otherwise, assume it is 'Manga'.`,
});

// The Genkit flow that orchestrates the fetching and parsing
const fetchTitleInfoFlow = ai.defineFlow(
  {
    name: 'fetchTitleInfoFlow',
    inputSchema: FetchTitleInfoInputSchema,
    outputSchema: FetchTitleInfoOutputSchema,
  },
  async ({ url }) => {
    const parsedUrl = new URL(url);

    // 1. MangaDex API Fast Path (Most Reliable)
    if (parsedUrl.hostname === 'mangadex.org') {
      try {
        console.log(`[fetchTitleInfo] MangaDex URL detected. Using API.`);
        const match = url.match(/title\/([a-f0-9-]+)/);
        if (!match) throw new Error('Invalid MangaDex URL, could not extract ID.');
        
        const mangaId = match[1];

        // Fetch manga details
        const mangaRes = await fetch(`https://api.mangadex.org/manga/${mangaId}`);
        if (!mangaRes.ok) throw new Error(`MangaDex API for manga failed with status: ${mangaRes.status}`);
        const mangaData = await mangaRes.json();
        
        const title = mangaData.data?.attributes?.title?.en || Object.values(mangaData.data?.attributes?.title || {})[0] || 'Unknown Title';

        // Fetch cover art
        const coverRel = mangaData.data?.relationships?.find((r: any) => r.type === 'cover_art');
        let imageUrl = 'https://picsum.photos/seed/placeholder/400/600'; // Default placeholder
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

        // Fetch chapter count
        const chaptersRes = await fetch(`https://api.mangadex.org/chapter?manga=${mangaId}&limit=1`);
        const chaptersData = chaptersRes.ok ? await chaptersRes.json() : { total: 1 };
        const total = chaptersData.total ?? 1;

        return { title, imageUrl, total, type: 'Manga' };

      } catch (error: any) {
        console.error(`[fetchTitleInfo] MangaDex API Error:`, error.message);
        throw new Error(`Failed to fetch from MangaDex API. Please check the URL. Reason: ${error.message}`);
      }
    }

    // 2. Generic Scraper Fallback (Best Effort)
    try {
      console.log(`[fetchTitleInfo] Using generic AI scraper for ${url}`);
      
      const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}. The site may be blocking requests.`);
      }

      const htmlContent = await response.text();
      const { output } = await scraperPrompt({ url, htmlContent });

      if (!output) {
        throw new Error('AI model failed to return structured output from the HTML content.');
      }
      
      // Ensure imageUrl is an absolute URL
      if (output.imageUrl && !output.imageUrl.startsWith('http')) {
        output.imageUrl = new URL(output.imageUrl, `${parsedUrl.protocol}//${parsedUrl.hostname}`).href;
      }

      return output;
    } catch (error: any) {
      console.error(`[fetchTitleInfo] Generic Scraper Error for URL ${url}:`, error);
      throw new Error(`The AI failed to extract information from the URL. Please check if the URL is correct and public. Reason: ${error.message}`);
    }
  }
);


/**
 * The single, exported server action that the client calls.
 * This function wraps the Genkit flow and includes top-level error handling.
 */
export async function fetchTitleInfo(
  input: FetchTitleInfoInput
): Promise<FetchTitleInfoOutput> {
   try {
    return await fetchTitleInfoFlow(input);
  } catch (error: any) {
    console.error(`[Server Action Error] fetchTitleInfo failed for URL ${input.url}:`, error);
    // Re-throw the error so the client-side `catch` block can handle it.
    // Ensure the message is user-friendly.
    throw new Error(error.message || 'An unexpected error occurred while fetching title information.');
  }
}

