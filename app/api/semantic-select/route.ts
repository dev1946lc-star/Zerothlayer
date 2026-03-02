import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { GoogleGenerativeAI } from '@google/generative-ai';

type RegionBounds = { x: number; y: number; width: number; height: number };

const decodeBase64Image = (value: string): Buffer => {
  const [, raw] = value.split(',');
  return Buffer.from(raw ?? value, 'base64');
};

const clampBounds = (b: RegionBounds, width: number, height: number): RegionBounds => {
  const x = Math.max(0, Math.min(Math.round(b.x), Math.max(0, width - 1)));
  const y = Math.max(0, Math.min(Math.round(b.y), Math.max(0, height - 1)));
  const w = Math.max(1, Math.min(Math.round(b.width), width - x));
  const h = Math.max(1, Math.min(Math.round(b.height), height - y));
  return { x, y, width: w, height: h };
};

const heuristicBounds = (query: string, width: number, height: number, regionHint?: RegionBounds | null): RegionBounds => {
  const baseWidth = regionHint?.width || width;
  const baseHeight = regionHint?.height || height;
  const offsetX = regionHint?.x || 0;
  const offsetY = regionHint?.y || 0;
  const q = query.toLowerCase();
  if (q.includes('background')) return { x: offsetX, y: offsetY, width: baseWidth, height: baseHeight };
  if (q.includes('sky')) return { x: offsetX, y: offsetY, width: baseWidth, height: Math.round(baseHeight * 0.45) };
  if (q.includes('beard')) {
    const w = Math.round(baseWidth * 0.22);
    const h = Math.round(baseHeight * 0.16);
    return { x: offsetX + Math.round((baseWidth - w) / 2), y: offsetY + Math.round(baseHeight * 0.62), width: w, height: h };
  }
  const w = Math.round(baseWidth * 0.4);
  const h = Math.round(baseHeight * 0.45);
  return { x: offsetX + Math.round((baseWidth - w) / 2), y: offsetY + Math.round((baseHeight - h) / 2), width: w, height: h };
};

const buildMask = async (bounds: RegionBounds, width: number, height: number): Promise<Buffer> => {
  const mask = Buffer.alloc(width * height, 0);
  for (let y = bounds.y; y < bounds.y + bounds.height; y += 1) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x += 1) {
      mask[y * width + x] = 255;
    }
  }

  return sharp(mask, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
};

const tryVisionBounds = async (
  imageBuffer: Buffer,
  query: string,
  width: number,
  height: number,
  regionHint?: RegionBounds | null
): Promise<RegionBounds | null> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const regionHintLine = regionHint
      ? `Focus your search inside this hint box first: x=${regionHint.x}, y=${regionHint.y}, width=${regionHint.width}, height=${regionHint.height}.`
      : '';
    const prompt = `
Return ONLY valid JSON with keys x,y,width,height (pixel integers).
Find the region matching this phrase in the image: "${query}".
Image size is ${width}x${height}. If uncertain, return central subject bounds.
${regionHintLine}
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/png',
          data: imageBuffer.toString('base64')
        }
      }
    ]);

    const text = result.response.text().trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd < 0 || jsonEnd <= jsonStart) return null;
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    if (
      typeof parsed?.x === 'number' &&
      typeof parsed?.y === 'number' &&
      typeof parsed?.width === 'number' &&
      typeof parsed?.height === 'number'
    ) {
      return clampBounds(parsed as RegionBounds, width, height);
    }
  } catch (error) {
    console.warn('[Semantic Select] Vision API fallback to heuristic', error);
  }

  return null;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image, query, regionHint } = body ?? {};
    if (!image || !query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Missing required fields: image, query' }, { status: 400 });
    }

    const imageBuffer = decodeBase64Image(image);
    const meta = await sharp(imageBuffer).metadata();
    const width = Number(meta.width ?? 0);
    const height = Number(meta.height ?? 0);
    if (!width || !height) {
      return NextResponse.json({ error: 'Invalid source image' }, { status: 400 });
    }

    const parsedHint = regionHint && typeof regionHint === 'object'
      ? clampBounds(
        {
          x: Number(regionHint.x ?? 0),
          y: Number(regionHint.y ?? 0),
          width: Number(regionHint.width ?? width),
          height: Number(regionHint.height ?? height)
        },
        width,
        height
      )
      : null;

    const vision = await tryVisionBounds(imageBuffer, query, width, height, parsedHint);
    const bounds = clampBounds(vision ?? heuristicBounds(query, width, height, parsedHint), width, height);
    const maskBuffer = await buildMask(bounds, width, height);

    return NextResponse.json({
      query,
      regionBounds: bounds,
      mask: `data:image/png;base64,${maskBuffer.toString('base64')}`,
      source: vision ? 'vision' : 'heuristic'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate semantic selection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
