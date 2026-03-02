# Layer System Deep Dive

## Data Structure
Each Layer in the `store.ts` maintains:
```typescript
interface Layer {
    id: string;
    type: 'image' | 'adjustment' | 'smart';
    name: string;
    visible: boolean;
    locked: boolean;
    opacity: number;
    blendMode: string; // normal, multiply, screen, overlay, etc.
    thumbnail?: string;
    mask?: {
        dataUrl: string; // White = visible, Black = hidden
        visible: boolean;
    };
    filters?: Record<string, number>; // Parametric (brightness, contrast)
    
    // AI Metadata (for AI-generated layers)
    aiData?: {
        prompt: string;
        seed: number;
        provider: string;
        context: Record<string, any>;
        originalMask: string;
    };
}
```

## Non-Destructive Operations
- **Adjustments**: Stored parametrically in `layer.filters`. Applied dynamically via Fabric.js filter pipeline on render.
- **Masks**: Added as a `clipPath` on the Fabric.js object using a generated image from `layer.mask.dataUrl`.
- **AI Edits**: Rather than replacing pixels, AI outputs are appended as new layers above the active layer. The mask used to guide the AI is applied to this new layer, allowing seamless blending and easy removal.
- **History**: Handled by storing lightweight delta patches of layer property changes or triggering do/undo blocks for Canvas-specific selections.
