
'use server';
/**
 * @fileOverview Searches for anime and manga titles from AniList API.
 */

import { z } from 'genkit';

const SearchTitlesInputSchema = z.object({
  query: z.string().describe('The search query.'),
});
export type SearchTitlesInput = z.infer<typeof SearchTitlesInputSchema>;

const SearchResultSchema = z.object({
  title: z.string().describe('The full title of the anime or manga.'),
  imageUrl: z.string().url().describe("The direct, absolute URL to the title's cover image."),
  total: z.number().nullable().describe('Total number of episodes or chapters.'),
  type: z.enum(['Anime', 'Manga', 'Manhwa']).describe('The type of media.'),
  sourceUrl: z.string().url().optional().describe('The URL of the source page, if available.'),
});

const SearchTitlesOutputSchema = z.array(SearchResultSchema);
export type SearchTitlesOutput = z.infer<typeof SearchTitlesOutputSchema>;

const searchAnilist = async (
  query: string,
): Promise<SearchTitlesOutput> => {
  const apiQuery = `
    query ($search: String, $type: MediaType) {
      Page(page: 1, perPage: 10) {
        media(search: $search, type: $type, sort: [SEARCH_MATCH]) {
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          episodes
          chapters
          countryOfOrigin
          type
        }
      }
    }
  `;

  const variables: Record<string, any> = {
    search: query,
    type: 'MANGA', // We will search both and merge
  };

  const mangaPromise = fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query: apiQuery, variables: { ...variables, type: 'MANGA' } }),
    next: { revalidate: 3600 } // Cache for 1 hour
  });

  const animePromise = fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query: apiQuery, variables: { ...variables, type: 'ANIME' } }),
    next: { revalidate: 3600 } // Cache for 1 hour
  });

  const [mangaRes, animeRes] = await Promise.all([mangaPromise, animePromise]);
  
  if (!mangaRes.ok || !animeRes.ok) throw new Error(`Anilist search failed`);
  
  const mangaJson = await mangaRes.json();
  const animeJson = await animeRes.json();
  
  const mangaData = mangaJson.data?.Page?.media ?? [];
  const animeData = animeJson.data?.Page?.media ?? [];

  const combined = [...animeData, ...mangaData];


  return combined.map((m: any) => {
    let total;
    if (m.type === 'ANIME') {
      total = m.episodes;
    } else { // MANGA or MANHWA
      total = m.chapters;
    }
    
    const detectedType =
      m.type === 'ANIME'
        ? 'Anime'
        : m.countryOfOrigin === 'KR'
        ? 'Manhwa'
        : 'Manga';

    return {
      title: m.title.english || m.title.romaji,
      imageUrl: m.coverImage.large,
      total: total ?? 0,
      type: detectedType as 'Anime' | 'Manga' | 'Manhwa',
    };
  }).slice(0, 10); // Limit to 10 results total
};


import * as cheerio from 'cheerio';

const searchAsura = async (query: string): Promise<SearchTitlesOutput> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const res = await fetch(`https://asurascans.com/browse?search=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`Asura Scans returned status ${res.status}`);
      return [];
    }

    const html = await res.text();
    const results: SearchTitlesOutput = [];
    const blocks = html.split('<div class="series-card');

    for (const block of blocks.slice(1)) {
       const hrefMatch = block.match(/href="(\/comics\/[^"]+)"/);
       const imgMatch = block.match(/<img src="([^"]+)"/);
       const titleMatch = block.match(/<h3[^>]*>\s*([^<]+)\s*<\/h3>/);

       if (hrefMatch && titleMatch) {
           let chapters = 0;
           const cleanedBlock = block.replace(/<[^>]+>/g, ' ');
           const cleanMatch = cleanedBlock.match(/([0-9]+)\s+(?:Chs\.|Chapters)/i);
           if (cleanMatch) {
               chapters = parseInt(cleanMatch[1], 10);
           }

           let imageUrl = imgMatch ? imgMatch[1] : '';
           if (imageUrl && !imageUrl.startsWith('http')) {
                if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
                else if (imageUrl.startsWith('/')) imageUrl = 'https://asurascans.com' + imageUrl;
           }

           results.push({
               title: titleMatch[1].trim(),
               imageUrl: imageUrl,
               total: chapters,
               type: 'Manhwa',
               sourceUrl: 'https://asurascans.com' + hrefMatch[1]
           });
       }
    }

    return results.slice(0, 10);
  } catch (err) {
    console.error(`Error searching Asura for ${query}:`, err);
    return [];
  }
};


export async function searchTitles(
  input: SearchTitlesInput
): Promise<SearchTitlesOutput> {
  if (!input.query) {
    return [];
  }
  try {
    const [anilistRes, asuraRes] = await Promise.allSettled([
      searchAnilist(input.query),
      searchAsura(input.query)
    ]);


    const anilistResults = anilistRes.status === 'fulfilled' ? anilistRes.value : [];
    const rawAsuraResults = asuraRes.status === 'fulfilled' ? asuraRes.value : [];

    // Deduplicate Asura results by URL
    const asuraResults: SearchTitlesOutput = [];
    const seenAsuraUrls = new Set<string>();
    for (const item of rawAsuraResults) {
        if (item.sourceUrl && !seenAsuraUrls.has(item.sourceUrl)) {
            seenAsuraUrls.add(item.sourceUrl);
            asuraResults.push(item);
        }
    }

    const mergedResults: SearchTitlesOutput = [];


    // Normalize string for comparison
    const normalizeTitle = (title: string) => {
        return title.toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    // Keep track of which Asura titles we've merged
    const mergedAsuraUrls = new Set<string>();

    for (const aniItem of anilistResults) {
        const normalizedAniTitle = normalizeTitle(aniItem.title);

        // Find a matching title in Asura results
        const matchingAsura = asuraResults.find(a =>
             normalizeTitle(a.title) === normalizedAniTitle
        );

        if (matchingAsura) {
             mergedResults.push({
                 ...aniItem, // Keep AniList metadata like type, episodes if it was Anime etc
                 imageUrl: matchingAsura.imageUrl || aniItem.imageUrl, // Prioritize Asura cover
                 total: matchingAsura.total || aniItem.total, // Asura chapters if any, fallback to Anilist
                 sourceUrl: matchingAsura.sourceUrl
             });
             if (matchingAsura.sourceUrl) {
                 mergedAsuraUrls.add(matchingAsura.sourceUrl);
             }
        } else {
             mergedResults.push(aniItem);
        }
    }

    // Append remaining Asura results that didn't match anything in AniList
    for (const asuraItem of asuraResults) {
         if (asuraItem.sourceUrl && !mergedAsuraUrls.has(asuraItem.sourceUrl)) {
              mergedResults.push(asuraItem);
         }
    }

    // Ensure we don't return too many results overall, though both individually return up to 10
    return mergedResults.slice(0, 20);
  } catch (err) {
    console.error(`Error searching for ${input.query}:`, err);
    return [];
  }
}
