# AI Pipeline Architecture

## The Pluggable Provider System
Zerothlayer has an agnostic AI provider system in `/lib/ai/`. All providers implement the `AIProvider` interface.

```typescript
export interface AIContext {
    style: string;
    lighting: string;
    dominantColors: string[];
    [key: string]: any;
}

export interface AIProvider {
    name: string;
    editImage(params: {
        image: Buffer;
        mask: Buffer;
        prompt: string;
        context: AIContext;
    }): Promise<Buffer>;
}
```

## Supported Providers
1. **Gemini**: Primary provider for intelligent prompt extraction and guided region editing.
2. **Stable Diffusion**: Specialized in pure generative inpainting.
3. **Flux**: High-fidelity, rapid iteration generation stub.

## Extractor Workflow
The Context Extractor runs over the user's base image/selection mask before being sent to the AI, ensuring semantic consistency (e.g., maintaining "warm lighting" or "cyberpunk style").

1. **Upload**: User uploads image.
2. **Mask**: User draws region mask.
3. **Extractor**: Analyzes region surrounding the mask.
4. **Builder**: Composes the final prompt with structural cues (System, User, Context, Mask Description).
5. **Generation**: Returns a blended, feathered PNG.
