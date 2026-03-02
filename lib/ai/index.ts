import { registerProvider } from './provider';
import { GeminiProvider } from './GeminiProvider';
import { FluxProvider } from './flux';
import { StableDiffusionProvider } from './stable-diffusion';

// Initialize and register all available AI providers on import.
// This ensures `getDefaultProvider` and `getProvider` have instances
// ready whenever the AI module is used (e.g. in API routes).
(() => {
  try {
    registerProvider(new GeminiProvider());
  } catch (error) {
    console.warn('[AI] Failed to initialize GeminiProvider', error);
  }

  try {
    registerProvider(new FluxProvider());
  } catch (error) {
    console.warn('[AI] Failed to initialize FluxProvider', error);
  }

  try {
    registerProvider(new StableDiffusionProvider());
  } catch (error) {
    console.warn('[AI] Failed to initialize StableDiffusionProvider', error);
  }
})();

export * from './provider';
export * from './GeminiProvider';
export * from './MockProvider';
export * from './prompts';
export * from './stable-diffusion';
export * from './flux';
