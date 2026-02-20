import { AIProvider, AIEditRequest, AIEditResponse } from "./types";
import sharp from "sharp";

export class MockAIProvider implements AIProvider {
    async generateEdit(request: AIEditRequest): Promise<AIEditResponse> {
        console.log("Mock AI generating for:", request.prompt);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            // Parse Base64 Input
            const imageBuffer = Buffer.from(request.image.split(',')[1], 'base64');
            const maskBuffer = Buffer.from(request.mask.split(',')[1], 'base64');

            // 1. Generate a "Generated Content" layer (e.g., a noise pattern or solid color)
            // Let's make a cool generated gradient or noise based on the prompt hash maybe?
            // For simplicity: A semi-transparent blue overlay to signify "AI Added This"

            const meta = await sharp(imageBuffer).metadata();
            const width = meta.width || 1024;
            const height = meta.height || 1024;

            // Create a "Generation" layer (e.g. Blue Noise)
            // We use the mask to cut it out.
            // Mask: White = Editable Area (Show Generation), Black = Protected (Hide Generation)

            // Generate a visual pattern (e.g. checkerboard or static)
            const noise = await sharp({
                create: {
                    width: width,
                    height: height,
                    channels: 4,
                    background: { r: 50, g: 100, b: 255, alpha: 1 }
                }
            })
                .composite([
                    // Overlay text maybe?
                    /* {
                        input: {
                            text: {
                                text: 'AI Generated',
                                font: 'sans',
                                rgba: true
                            }
                        },
                        gravity: 'center'
                    } */
                ])
                .png()
                .toBuffer();

            // Check if mask needs processing (it should be grayscale)
            // We want to use the mask to composite the Noise onto the Original Image.
            // Result = Original + (Noise * Mask)

            // Sharp composite with 'dest-in' or similar?
            // Easier: 
            // 1. Mask the Noise Layer using the Mask input.
            // 2. Composite Masked Noise over Original.

            // Ensure mask is same size
            const resizedMask = await sharp(maskBuffer)
                .resize(width, height)
                .toColourspace('b-w')
                .toBuffer();

            // Create "Masked Noise"
            const maskedNoise = await sharp(noise)
                .joinChannel(resizedMask) // Add mask as alpha? No, joinChannel adds channels.
                // Better: Use composite with input as mask.
                // Sharp supports 'input' with 'blend': 'dest-in' to use alpha from second image?
                // Actually, if mask is b/w image, we can use it as an alpha channel directly if we map it.

                // Let's try: Composite Noise over Image with Mask?
                // Does Sharp support 'mask' option in composite? 
                // No, standard composite takes images.

                // Pipeline:
                // 1. Take Noise.
                // 2. Apply Mask to Noise (Make opacity 0 where mask is black).
                // 3. Composite Result over Original.

                // To apply mask to noise in Sharp:
                // .ensureAlpha()
                // .composite([{ input: maskBuffer, blend: 'dest-in' }]) 
                // 'dest-in' keeps the destination (Noise) where the source (Mask) overlaps (is opaque).
                // Assuming Mask: White=Opaque, Black=Transparent. 
                // Our Mask from Canvas: White (Selected) = Opaque, Black = Transparent. 
                // YES. This matches 'dest-in'.

                .ensureAlpha()
                .composite([{ input: resizedMask, blend: 'dest-in' }])
                .toBuffer();

            // Final Composite
            const resultBuffer = await sharp(imageBuffer)
                .composite([{ input: maskedNoise, blend: 'over' }])
                .toBuffer();

            const base64Result = `data:image/png;base64,${resultBuffer.toString('base64')}`;

            return { resultImage: base64Result };

        } catch (error) {
            console.error("Mock Generation Failed:", error);
            // Fallback to echo
            return { resultImage: request.image };
        }
    }
}
