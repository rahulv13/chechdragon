
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input and Output Schemas for the overall flow
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

// Internal schema for the AI scraper prompt
const ScraperPromptInputSchema = z.object({
  url: z.string().url(),
  htmlContent: z.string(),
});

// The AI prompt for scraping generic URLs
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
2.  **imageUrl**: The direct, absolute URL for the main cover image or poster. Look for the most prominent image, often inside a component that looks like a card or poster. A meta tag like <meta property="og:image" ...> is a good fallback. This must be a URL to an image file (e.g., .jpg, .png, .webp), not a link to another web page.
3.  **total**: The total number of episodes (for Anime) or chapters (for Manga/Manhwa). If it's a movie, return 1. If you cannot find a count, default to 1.
4.  **type**: Determine if it is 'Anime', 'Manga', or 'Manhwa'. If the content mentions "episodes" or "anime", it is 'Anime'. If it mentions "manhwa" or "webtoon", it is 'Manhwa'. Otherwise, if it has "chapters", assume it is 'Manga'.`,
});

// The main flow, wrapped with defineFlow for robust execution
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
        console.error('MangaDex API path failed:', error.message);
        // If the API path fails for any reason, we can still fall back to the generic scraper
      }
    }

    // --- Generic Scraper Fallback Path ---
    console.log(`[fetchTitleInfoFlow] Using generic scraper for ${url}`);
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
        cache: 'no-store'
    });
    
    const htmlContent = await response.text();

    if (!response.ok || htmlContent.length < 500) {
      console.error('Scraping failed. Response not OK or HTML content too small.', { status: response.status, contentLength: htmlContent.length });
      throw new Error('Scraped content was invalid or the request was blocked.');
    }

    const { output } = await scraperPrompt({ url, htmlContent });

    if (!output) {
      throw new Error('AI model failed to extract structured data from the provided URL.');
    }

    return output;
  }
);

// This is the exported server action that the client will call.
export async function fetchTitleInfo(input: FetchTitleInfoInput): Promise<FetchTitleInfoOutput> {
  try {
    return await fetchTitleInfoFlow(input);
  } catch (error: any) {
    console.error(`[fetchTitleInfo Server Action] Error executing flow for URL ${input.url}:`, error);
    // Re-throw a user-friendly error to the client.
    throw new Error(`The AI failed to extract information. The URL may be private, incorrect, or the website might be blocking our service. Reason: ${error.message}`);
  }
}
