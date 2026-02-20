import { AIProvider, AIEditRequest, AIEditResponse } from "./types";
import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiProvider implements AIProvider {
    private client: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string) {
        this.client = new GoogleGenerativeAI(apiKey);
        // Using 1.5 Flash as it's fast and supports multimodal
        this.model = this.client.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    async generateEdit(request: AIEditRequest): Promise<AIEditResponse> {
        try {
            console.log("Gemini generating for:", request.prompt);

            // Prepare Image Part
            // Input is "data:image/png;base64,..."
            const base64Image = request.image.split(',')[1];

            const imagePart = {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/png"
                }
            };

            // NOTE: Gemini 1.5 Flash is NOT an image generation model. 
            // It is a text generation model that accepts images.
            // As of now, standard SDK does not support "edit this image" and return image bytes.
            // But we implement this connector for completeness. 
            // If the user attempts to use this, it will likely return text describing the edit.

            // We'll ask it to describe the edit, just to prove connectivity.
            const result = await this.model.generateContent([
                "You are an AI photo editor. Describe specifically what you would change in this image based on the request: " + request.prompt,
                imagePart
            ]);

            const text = result.response.text();
            console.log("Gemini Response:", text);

            // Since we can't generate the image, we return the original 
            // but we log the text. 
            // To make this useful, maybe we overlay the text? 
            // For now, standard behavior: Echo image + Log.

            return {
                resultImage: request.image
            };

        } catch (error) {
            console.error("Gemini Provider Error:", error);
            throw error;
        }
    }
}
