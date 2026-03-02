export interface AIContext {
    style: string;
    lighting: string;
    dominantColors: string[] | string;
    artStyle?: string;
    subjectMatter?: string;
    [key: string]: any;
}

export interface AIConstraints {
    regionBounds: { x: number; y: number; width: number; height: number };
    featherAmount: number;
    outputFormat: 'png' | 'jpeg' | 'webp';
}

export interface AIEditParams {
    image: Buffer;
    mask: Buffer;
    prompt: string;
    finalPrompt?: string;
    context?: AIContext;
    constraints?: AIConstraints;
    signal?: AbortSignal;
}

export interface AIEditResult {
    buffer: Buffer;
    seed?: number;
    metadata?: {
        modelUsed?: string;
        generationTime?: number;
        prompt?: string;
    };
}

export interface AIProvider {
    name: string;
    editImage(params: AIEditParams): Promise<AIEditResult>;
}

const providers: Map<string, AIProvider> = new Map();

export const registerProvider = (provider: AIProvider) => {
    providers.set(provider.name.toLowerCase(), provider);
};

export const getProvider = (name: string): AIProvider | undefined => {
    return providers.get(name.toLowerCase());
};

export const getDefaultProvider = (): AIProvider => {
    const gemini = providers.get('gemini');
    if (gemini) return gemini;

    // For now, if no actual providers are found, throw an error or return a mock.
    const fallback = Array.from(providers.values())[0];
    if (!fallback) throw new Error("No AI Providers Registered");
    return fallback;
};
