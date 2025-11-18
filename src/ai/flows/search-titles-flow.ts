
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
      type: detectedType,
    };
  }).slice(0, 10); // Limit to 10 results total
};

export async function searchTitles(
  input: SearchTitlesInput
): Promise<SearchTitlesOutput> {
  if (!input.query) {
    return [];
  }
  try {
    return await searchAnilist(input.query);
  } catch (err) {
    console.error(`Error searching for ${input.query}:`, err);
    return [];
  }
}
