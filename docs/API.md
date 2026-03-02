# API Architecture

Zerothlayer relies heavily on local state and Fabric.js for frontend logic, but interactions involving intensive processing or protected credentials live in Next.js API Routes.

## `POST /api/ai-edit`
**Description**: Takes a base64 encoded region and mask + user prompt, returns an AI-inpainted image.

**Request Payload**:
```json
{
  "image": "data:image/png;base64,...",
  "mask": "data:image/png;base64,...",
  "prompt": "Make this a sunset",
  "provider": "gemini" // Optional
}
```

**Workflow Steps**:
1. Frontend calls `getGenerationData()` yielding canvas slice and b&w mask.
2. Backend receives `image` and `mask`.
3. Validates and scales inputs.
4. Determines Context via Extractor (if applicable).
5. Invokes AI ProviderAdapter.
6. Returns `Buffer` (PNG) representing the inpainted region.
7. Frontend adds the new Layer (`type: image`), storing the prompt/seed in `Layer.aiData`.

## Future Endpoints
- `/api/collab/auth`: Returns WebSockets token.
- `/api/projects/sync`: Full snapshot saving for Workspace serialization.
