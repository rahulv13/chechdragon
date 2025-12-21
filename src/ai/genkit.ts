
import { genkit, type Genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Vercel-safe lazy initialization for Genkit
let _ai: Genkit | null = null;

function createGenkitInstance() {
  console.log('[Genkit] Initializing Genkit instance...');
  return genkit({
    plugins: [googleAI()],
    model: 'googleai/gemini-1.5-flash',
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
// We use a function to avoid circular dependency issues during module evaluation.
export function registerFlows() {
    if (typeof window === 'undefined') {
        require('./flows/fetch-title-info-flow');
        require('./flows/fetch-top-titles-flow');
        require('./flows/search-titles-flow');
        require('./flows/refresh-title-info-flow');
    }
}
// Call it immediately for side-effects to ensure registration
registerFlows();
