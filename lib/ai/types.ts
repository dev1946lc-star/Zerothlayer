export interface AIEditRequest {
    image: string; // base64 data url
    mask: string; // base64 data url
    prompt: string;
}

export interface AIEditResponse {
    resultImage: string; // base64 data url
}

export interface AIProvider {
    generateEdit(request: AIEditRequest): Promise<AIEditResponse>;
}
