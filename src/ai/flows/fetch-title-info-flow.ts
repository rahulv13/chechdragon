
'use server';

import { getAI } from '@/ai/genkit'; // Use the lazy initializer
import { z } from 'genkit';

// Define schema types, but do not export them from this server module.
type FetchTitleInfoInput = z.infer<typeof FetchTitleInfoInputSchema>;
const FetchTitleInfoInputSchema = z.object({
  url: z.string().url().describe('The URL of the anime or manga page.'),
});

type FetchTitleInfoOutput = z.infer<typeof FetchTitleInfoOutputSchema>;
const FetchTitleInfoOutputSchema = z.object({
  title: z.string().describe('The official title of the anime or manga.'),
  imageUrl: z.string().url().describe('The direct, absolute URL for the cover image.'),
  total: z.number().describe('The total number of episodes or chapters available on the page.'),
  type: z.enum(['Anime', 'Manga', 'Manhwa']).describe("The media type, one of 'Anime', 'Manga', or 'Manhwa'."),
});


/**
 * The single, exported server action that the client calls.
 * This function wraps the Genkit flow and includes top-level error handling.
 */
export async function fetchTitleInfo(
  input: FetchTitleInfoInput
): Promise<FetchTitleInfoOutput> {
  console.log(`[Server Action] fetchTitleInfo called with URL: ${input.url}`);
  try {
    // Lazily get the AI instance inside the action
    const ai = getAI();

    // Define the Genkit flow within the server action scope
    const fetchTitleInfoFlow = ai.defineFlow(
      {
        name: 'fetchTitleInfoFlow_v2', // Use a unique name
        inputSchema: FetchTitleInfoInputSchema,
        outputSchema: FetchTitleInfoOutputSchema,
      },
      async ({ url }) => {
        const parsedUrl = new URL(url);

        // 1. MangaDex API Fast Path (Most Reliable)
        if (parsedUrl.hostname === 'mangadex.org') {
          try {
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

            return { title, imageUrl, total, type: 'Manga' };

          } catch (apiError: any) {
            console.warn(`[Flow] MangaDex API failed: ${apiError.message}. Falling back to generic scraper.`);
            // Fallback to generic scraper is handled outside this catch block
          }
        }

        // 2. Generic Scraper Fallback (Best Effort)
        console.log(`[Flow] Using generic AI scraper for ${url}`);
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}. The site may be blocking requests.`);
        }

        const htmlContent = await response.text();
        const ScraperPromptInputSchema = z.object({ url: z.string().url(), htmlContent: z.string() });

        const scraperPrompt = ai.definePrompt({
            name: 'fetchTitleInfoPrompt_v2',
            input: { schema: ScraperPromptInputSchema },
            output: { schema: FetchTitleInfoOutputSchema },
            prompt: `You are an expert web scraper. Analyze the provided HTML to extract information.
            URL: {{{url}}}
            HTML: \`\`\`html\n{{{htmlContent}}}\n\`\`\`
            Extract: title, imageUrl (must be absolute), total (episodes/chapters, default to 1 if not found), and type (Anime, Manga, or Manhwa).`,
        });

        const { output } = await scraperPrompt({ url, htmlContent });

        if (!output) {
          throw new Error('AI model failed to return structured output from the HTML content.');
        }

        if (output.imageUrl && !output.imageUrl.startsWith('http')) {
          output.imageUrl = new URL(output.imageUrl, `${parsedUrl.protocol}//${parsedUrl.hostname}`).href;
        }

        return output;
      }
    );

    // Execute the flow
    return await fetchTitleInfoFlow(input);

  } catch (error: any) {
    console.error(`[Server Action Error] fetchTitleInfo failed for URL ${input.url}:`, error);
    // Re-throw the error so the client-side `catch` block can handle it.
    throw new Error(error.message || 'An unexpected error occurred while fetching title information.');
  }
}
