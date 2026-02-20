import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Placeholder for AI provider interface - will migrate to separate file later
interface AIProvider {
    editImage(imageBuffer: Buffer, maskBuffer: Buffer, prompt: string): Promise<Buffer>;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const imageFile = formData.get('image') as File;
        const maskFile = formData.get('mask') as File;
        const prompt = formData.get('prompt') as string;

        if (!imageFile || !maskFile || !prompt) {
            return NextResponse.json(
                { error: 'Missing required fields: image, mask, or prompt' },
                { status: 400 }
            );
        }

        // Convert files to buffers
        const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
        const maskBuffer = Buffer.from(await maskFile.arrayBuffer());

        console.log(`Received request: ${prompt}`);
        console.log(`Image size: ${imageBuffer.length}, Mask size: ${maskBuffer.length}`);

        // Detect bounding box of the mask (the "selection" area)
        // We use .trim() on the mask to remove the black/transparent background
        // and get the info about the remaining (white) area.
        const mask = sharp(maskBuffer);
        const { data: trimmedMaskBuffer, info: trimInfo } = await mask
            .trim({ threshold: 10 }) // Trim "boring" black pixels
            .toBuffer({ resolveWithObject: true });

        if (!trimInfo) {
            return NextResponse.json(
                { error: 'Could not detect selection in mask' },
                { status: 400 }
            );
        }

        const { x, y, width, height } = {
            x: -trimInfo.trimOffsetLeft!, // trimOffsetLeft is negative of x
            y: -trimInfo.trimOffsetTop!,  // trimOffsetTop is negative of y
            width: trimInfo.width,
            height: trimInfo.height
        };

        // Sanity check
        if (!width || !height) {
            console.warn("Trim failed to find bounding box");
            // Return original image if we can't crop
            return NextResponse.json({
                image: `data:image/png;base64,${imageBuffer.toString('base64')}`
            });
        }

        console.log(`Cropping to selection: x=${x}, y=${y}, w=${width}, h=${height}`);

        // Crop the original image to this bounding box
        const croppedImageBuffer = await sharp(imageBuffer)
            .extract({ left: Math.abs(x), top: Math.abs(y), width, height })
            .toBuffer();

        // --- AI PROCESSING START ---
        // TODO: Pass croppedImageBuffer + trimmedMaskBuffer to AIProvider
        // For now, generate the overlay on the CROPPED area

        // Create magenta overlay for the specific crop size
        const overlay = await sharp({
            create: {
                width: width,
                height: height,
                channels: 4,
                background: { r: 255, g: 0, b: 255, alpha: 0.5 }
            }
        })
            .png()
            .toBuffer();

        // Composite overlay onto the cropped image, masking it with the trimmed mask
        const processedCrop = await sharp(croppedImageBuffer)
            .composite([
                {
                    input: await sharp(overlay)
                        .composite([{ input: trimmedMaskBuffer, blend: 'dest-in' }]) // Mask the overlay
                        .png()
                        .toBuffer(),
                    blend: 'over'
                }
            ])
            .png()
            .toBuffer();
        // --- AI PROCESSING END ---

        // Composite the processed crop back into the full original image
        const finalImageBuffer = await sharp(imageBuffer)
            .composite([{
                input: processedCrop,
                left: Math.abs(x),
                top: Math.abs(y)
            }])
            .png()
            .toBuffer();

        return NextResponse.json({
            image: `data:image/png;base64,${finalImageBuffer.toString('base64')}`
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Internal server error processing image' },
            { status: 500 }
        );
    }
}
