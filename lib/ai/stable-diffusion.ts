import { AIProvider, AIEditParams } from './provider';

export class StableDiffusionProvider implements AIProvider {
    name = 'stable-diffusion';

    async editImage(params: AIEditParams): Promise<{ buffer: Buffer; seed?: number }> {
        console.log(`[StableDiffusion] Processing prompt: ${params.prompt}`);
        // Stub for actual SD integration (e.g., via Replicate or local AUTOMATIC1111)
        // Returns the original image for now allowing the pipeline to succeed
        return { buffer: params.image, seed: Math.floor(Math.random() * 10000) };
    }
}
