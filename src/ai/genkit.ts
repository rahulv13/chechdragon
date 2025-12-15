'use server';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// ✅ FORCE FLOW REGISTRATION (CRITICAL FOR VERCEL)
import './flows/fetch-title-info-flow';
import './flows/fetch-top-titles-flow';
import './flows/search-titles-flow';

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});
