
'use server';
/**
 * @fileOverview Fetches top anime, manga, and manhwa titles from AniList API.
 */

import { z } from 'genkit';

const FetchTopTitlesInputSchema = z.object({
  type: z.enum(['ANIME', 'MANGA', 'MANHWA']).describe('The type of media to look for.'),
});
export type FetchTopTitlesInput = z.infer<typeof FetchTopTitlesInputSchema>;

const TopTitleSchema = z.object({
  title: z.string().describe('The full title of the anime or manga.'),
  imageUrl: z.string().url().describe("The direct, absolute URL to the title's cover image."),
  total: z.number().nullable().describe('Total number of episodes or chapters.'),
  type: z.enum(['Anime', 'Manga', 'Manhwa']).describe('The type of media.'),
});

const FetchTopTitlesOutputSchema = z.array(TopTitleSchema);
export type FetchTopTitlesOutput = z.infer<typeof FetchTopTitlesOutputSchema>;

const fetchFromAnilist = async (
  type: 'ANIME' | 'MANGA',
  filter?: 'MANGA' | 'MANHWA'
): Promise<FetchTopTitlesOutput> => {
  const query = `
    query ($type: MediaType, $sort: [MediaSort], $country: CountryCode) {
      Page(page: 1, perPage: 5) {
        media(
          type: $type,
          sort: $sort,
          countryOfOrigin: $country,
          status_not_in: [NOT_YET_RELEASED]
        ) {
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          episodes
          chapters
          volumes
          nextAiringEpisode {
            episode
          }
          countryOfOrigin
          status
        }
      }
    }
  `;

  const variables: Record<string, any> = {
    type,
    sort: ['TRENDING_DESC', 'POPULARITY_DESC'],
  };
  
  if (filter === 'MANHWA') {
    variables.country = 'KR';
  } else if (filter === 'MANGA') {
    variables.country = 'JP';
  }


  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 3600 } // Cache for 1 hour
  });

  if (!res.ok) throw new Error(`Anilist fetch failed: ${res.statusText}`);

  const json = await res.json();
  const data = json.data?.Page?.media ?? [];

  return data.map((m: any) => {
    let total;
    if (type === 'ANIME') {
      total = m.episodes;
      // If anime is still releasing and episodes count is not up-to-date,
      // use the next airing episode number to get a better estimate.
      if (m.status === 'RELEASING' && m.nextAiringEpisode) {
        total = m.nextAiringEpisode.episode - 1;
      }
    } else { // MANGA or MANHWA
      total = m.chapters;
      // If chapter count is unknown (common for ongoing series), fall back to volumes.
      // This provides a better sense of length than '0'.
      if (!total && m.volumes) {
        total = m.volumes;
      }
    }
    
    const detectedType =
      type === 'ANIME'
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
  });
};

export async function fetchTopTitles(
  input: FetchTopTitlesInput
): Promise<FetchTopTitlesOutput> {
  try {
    switch (input.type) {
      case 'ANIME':
        return await fetchFromAnilist('ANIME');
      case 'MANGA':
        return await fetchFromAnilist('MANGA', 'MANGA');
      case 'MANHWA':
        return await fetchFromAnilist('MANGA', 'MANHWA');
      default:
        return [];
    }
  } catch (err) {
    console.error(`Error fetching top ${input.type}:`, err);
    return [];
  }
}
