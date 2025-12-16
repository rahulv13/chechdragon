
import { genkit, type Genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Vercel-safe lazy initialization for Genkit
let _ai: Genkit | null = null;

function createGenkitInstance() {
  console.log('[Genkit] Initializing Genkit instance...');
  return genkit({
    plugins: [googleAI()],
    model: 'googleai/gemini-2.5-flash',
  });
}

/**
 * Lazily initializes and returns the Genkit AI instance.
 * This is crucial for Vercel's serverless environment to prevent cold start issues.
 */
export function getAI() {
  if (!_ai) {
    _ai = createGenkitInstance();
  }
  return _ai;
}

// The `ai` export is kept for any code that might still use it directly,
// but `getAI()` should be preferred in serverless functions.
export const ai = getAI();

// ✅ FORCE FLOW REGISTRATION (CRITICAL FOR VERCEL)
// These imports ensure that Vercel's bundler includes the flow definitions
// in the serverless function, preventing them from being tree-shaken away.
import './flows/fetch-title-info-flow';
import './flows/fetch-top-titles-flow';
import './flows/search-titles-flow';
