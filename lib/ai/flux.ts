import { AIProvider, AIEditParams } from './provider';

export class FluxProvider implements AIProvider {
    name = 'flux';

    async editImage(params: AIEditParams): Promise<{ buffer: Buffer; seed?: number }> {
        console.log(`[Flux] Processing prompt: ${params.prompt}`);
        // Stub for actual Flux integration
        // Returns the original image for now allowing the pipeline to succeed
        return { buffer: params.image, seed: Math.floor(Math.random() * 10000) };
    }
}
