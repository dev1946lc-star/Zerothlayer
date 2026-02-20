
export interface AIEditParams {
    image: Buffer; // The full image or cropped region
    mask: Buffer;  // The mask (white = edit, black = keep)
    prompt: string;
}

export interface AIProvider {
    editImage(params: AIEditParams): Promise<Buffer>;
}

export class MockAIProvider implements AIProvider {
    async editImage(params: AIEditParams): Promise<Buffer> {
        console.log("MockAIProvider: Processing image with prompt:", params.prompt);
        // In a real mock, we might return a pre-generated image or just the original
        // For now, we'll return the input image as-is to simulate a "no-op" edit
        // or we could use Sharp here to draw a placeholder, but that's already in the route.
        return params.image;
    }
}
