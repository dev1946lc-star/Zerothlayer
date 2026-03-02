import { NextResponse } from 'next/server';
import { getDefaultProvider, getProvider } from '@/lib/ai';
import sharp from 'sharp';
import { PromptBuilder } from '@/lib/ai/prompts';

export const maxDuration = 60; // Max execution time for Vercel/Next.js

type OutputFormat = 'png' | 'jpeg' | 'webp';
type RegionBounds = { x: number; y: number; width: number; height: number };

const decodeBase64Image = (value: string, fieldName: string): Buffer => {
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`Invalid ${fieldName}: expected base64 image string`);
    }

    const [, raw] = value.split(',');
    const payload = raw ?? value;

    try {
        const buffer = Buffer.from(payload, 'base64');
        if (!buffer.length) {
            throw new Error('Decoded payload is empty');
        }
        return buffer;
    } catch {
        throw new Error(`Invalid ${fieldName}: failed to decode base64`);
    }
};

const withTimeout = async <T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> => {
    const timeoutPromise = new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
            clearTimeout(timer);
            reject(new Error(`AI provider timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    return Promise.race([fn(), timeoutPromise]);
};

const withRetry = async <T>(fn: (attempt: number) => Promise<T>, retries: number): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= retries; attempt += 1) {
        try {
            return await fn(attempt);
        } catch (error) {
            lastError = error;
            if (attempt < retries) {
                await new Promise((resolve) => setTimeout(resolve, attempt * 300));
            }
        }
    }

    throw lastError;
};

const clampRegionBounds = (bounds: RegionBounds, imageWidth: number, imageHeight: number): RegionBounds => {
    const x = Math.max(0, Math.min(bounds.x, Math.max(0, imageWidth - 1)));
    const y = Math.max(0, Math.min(bounds.y, Math.max(0, imageHeight - 1)));
    const width = Math.max(1, Math.min(bounds.width, imageWidth - x));
    const height = Math.max(1, Math.min(bounds.height, imageHeight - y));
    return { x, y, width, height };
};

export async function POST(req: Request) {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();

    try {
        const body = await req.json();
        const { image, mask, prompt, metadata, providerName } = body;

        if (!image || !mask || !prompt || typeof prompt !== 'string' || !prompt.trim()) {
            return NextResponse.json({ error: 'Missing required fields (image, mask, prompt)' }, { status: 400 });
        }

        const imageBuffer = decodeBase64Image(image, 'image');
        const maskBuffer = decodeBase64Image(mask, 'mask');

        // Determine provider with fallback
        let provider = providerName ? getProvider(providerName) : getDefaultProvider();
        if (!provider) {
            console.warn(`Provider ${providerName} not found, falling back to default.`);
            provider = getDefaultProvider();
        }

        const imageMeta = await sharp(imageBuffer).metadata();
        const imageWidth = Number(imageMeta.width ?? 0);
        const imageHeight = Number(imageMeta.height ?? 0);
        const width = Number(metadata?.regionBounds?.width ?? imageWidth);
        const height = Number(metadata?.regionBounds?.height ?? imageHeight);
        const outputFormat: OutputFormat = metadata?.outputFormat ?? 'png';
        const featherAmount = Number(metadata?.featherAmount ?? 0);

        if (!imageWidth || !imageHeight || !width || !height) {
            return NextResponse.json({ error: 'Invalid image dimensions for AI edit request' }, { status: 400 });
        }

        const requestedBounds: RegionBounds = {
            x: Number(metadata?.regionBounds?.x ?? 0),
            y: Number(metadata?.regionBounds?.y ?? 0),
            width,
            height
        };
        const regionBounds = clampRegionBounds(requestedBounds, imageWidth, imageHeight);

        const constraints = {
            regionBounds,
            featherAmount,
            outputFormat
        } as const;

        const croppedImage = await sharp(imageBuffer)
            .extract({
                left: regionBounds.x,
                top: regionBounds.y,
                width: regionBounds.width,
                height: regionBounds.height
            })
            .png()
            .toBuffer();

        const croppedMask = await sharp(maskBuffer)
            .extract({
                left: regionBounds.x,
                top: regionBounds.y,
                width: regionBounds.width,
                height: regionBounds.height
            })
            .greyscale()
            .threshold(16)
            .png()
            .toBuffer();

        const context = await PromptBuilder.extractContext(imageBuffer);
        const finalPrompt = PromptBuilder.build(prompt.trim(), context, {
            width: constraints.regionBounds.width,
            height: constraints.regionBounds.height,
            outputFormat: constraints.outputFormat,
            featherAmount: constraints.featherAmount
        });

        console.info('[AI-Edit] Request started', {
            requestId,
            provider: provider.name,
            width: constraints.regionBounds.width,
            height: constraints.regionBounds.height
        });

        const result = await withRetry(
            async (attempt) =>
                withTimeout(
                    () =>
                        provider.editImage({
                            image: croppedImage,
                            mask: croppedMask,
                            prompt: prompt.trim(),
                            finalPrompt,
                            context: {
                                style: context.artStyle,
                                lighting: context.lighting,
                                dominantColors: context.dominantColors
                            },
                            constraints
                        }),
                    30_000
                ).catch((error) => {
                    console.warn('[AI-Edit] Provider attempt failed', {
                        requestId,
                        provider: provider.name,
                        attempt,
                        error: error instanceof Error ? error.message : String(error)
                    });
                    throw error;
                }),
            2
        );

        const maskedRegionBuffer = await sharp(result.buffer)
            .resize(regionBounds.width, regionBounds.height, { fit: 'fill' })
            .removeAlpha()
            .joinChannel(croppedMask)
            .png()
            .toBuffer();

        const outBase64 = `data:image/png;base64,${maskedRegionBuffer.toString('base64')}`;

        console.info('[AI-Edit] Request finished', {
            requestId,
            provider: provider.name,
            durationMs: Date.now() - startedAt
        });

        return NextResponse.json({
            image: outBase64,
            regionBounds,
            seed: result.seed,
            provider: provider.name,
            context,
            requestId,
            metadata: {
                ...(result.metadata || {}),
                generationTime: Date.now() - startedAt,
                prompt: finalPrompt
            }
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('[AI-Edit API Error]', { requestId, error: message });
        return NextResponse.json({ error: message, requestId }, { status: 500 });
    }
}
