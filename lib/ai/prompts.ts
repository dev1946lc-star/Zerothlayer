import sharp from 'sharp';

export const SYSTEM_INSTRUCTIONS = `
You are an expert photo editor AI integrated into a professional image editing application.

CRITICAL RULES:
1. You are editing ONLY the selected region, not the entire image
2. The edited region MUST blend seamlessly with the surrounding context
3. Preserve the original image's:
   - Lighting direction and intensity
   - Color temperature and saturation
   - Art style (photorealistic, illustrated, painted, etc.)
   - Perspective and depth
4. Do NOT add watermarks, signatures, or text unless explicitly requested
5. Do NOT change the aspect ratio or dimensions of the selected region
6. AVOID introducing artifacts, noise, or inconsistencies

Your goal: Make the edit look like it was always part of the original image.
`;

export interface ImageContext {
    dominantColors: string;
    lighting: string;
    artStyle: string;
    subjectMatter: string;
}

export interface TechnicalConstraints {
    width: number;
    height: number;
    outputFormat: string;
}

export class PromptBuilder {
    static async extractContext(imageBuffer: Buffer): Promise<ImageContext> {
        // Basic heuristic extraction using Sharp
        try {
            const stats = await sharp(imageBuffer).stats();
            const { channels } = stats;
            const r = Math.round(channels[0].mean);
            const g = Math.round(channels[1].mean);
            const b = Math.round(channels[2].mean);

            // Very basic lighting estimation
            const brightness = (r + g + b) / 3;
            let lighting = "Neutral";
            if (brightness > 200) lighting = "High key, bright";
            if (brightness < 50) lighting = "Low key, dark";

            return {
                dominantColors: `Average RGB(${r}, ${g}, ${b})`,
                lighting: lighting,
                artStyle: "Unknown (auto)", // TODO: Use vision model for this
                subjectMatter: "Unknown (auto)" // TODO: Use vision model for this
            };
        } catch (error) {
            console.warn("Failed to extract context:", error);
            return {
                dominantColors: "Unknown",
                lighting: "Unknown",
                artStyle: "Unknown",
                subjectMatter: "Unknown"
            };
        }
    }

    static build(
        userPrompt: string,
        context: ImageContext,
        constraints: TechnicalConstraints
    ): string {
        return `
${SYSTEM_INSTRUCTIONS}

---

IMAGE CONTEXT:
- Dominant colors: ${context.dominantColors}
- Lighting: ${context.lighting}
- Art style: ${context.artStyle}
- Subject matter: ${context.subjectMatter}

---

USER INSTRUCTION:
"${userPrompt}"

---

TECHNICAL CONSTRAINTS:
- Selection region: ${constraints.width}x${constraints.height}px
- Output format: ${constraints.outputFormat}

---

INSTRUCTIONS:
Execute the user instruction while strictly adhering to the context and constraints.
`;
    }
}
