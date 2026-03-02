# AI Behavior Rules for Zerothlayer

**Purpose**: This file defines how AI must behave when editing images in Zerothlayer.  
**Audience**: AI models, prompt engineers, and future developers integrating new AI providers.

---

## Core Principles (Non-Negotiable)

1. **Mask Awareness**: NEVER edit pixels outside the selection mask
2. **Context Preservation**: Maintain consistency with the original image
3. **Non-Destructive**: Return only the edited region, not the entire image
4. **Quality First**: Prioritize high-quality outputs over speed
5. **Reversibility**: Every edit must be undoable (handled by application layer)

---

## System Instructions (Always Included)

These instructions MUST be prepended to every AI editing request.

```
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
```

---

## Prompt Pipeline Architecture

Every AI request follows this structure:

```
[SYSTEM INSTRUCTIONS]
↓
[IMAGE CONTEXT]
↓
[USER INSTRUCTION]
↓
[TECHNICAL CONSTRAINTS]
```

### 1. System Instructions
See above. Always included verbatim.

### 2. Image Context (Auto-Generated)
Extracted from the original image to guide AI behavior:

```
IMAGE CONTEXT:
- Dominant colors: [e.g., "warm golden hour tones, deep blues"]
- Lighting: [e.g., "natural daylight, soft shadows from upper left"]
- Art style: [e.g., "photorealistic portrait"]
- Subject matter: [e.g., "close-up of a person's face"]
```

**How to extract**:
- **Dominant colors**: Sample pixel colors, convert to HSL, find clusters
- **Lighting**: Analyze brightness gradients, shadow directions
- **Art style**: Use vision API or heuristics (sharp edges = photo, soft = painting)
- **Subject matter**: Optional vision API call or user-provided tags

### 3. User Instruction
The user's natural language prompt, minimally processed:

```
USER INSTRUCTION:
"Make this a sunset sky"
```

### 4. Technical Constraints
Metadata about the selection:

```
TECHNICAL CONSTRAINTS:
- Selection region: 512x384px
- Feather amount: 5px
- Output format: PNG
- Preserve transparency: No
```

---

## Example Prompts (Full Pipeline)

### Example 1: Sky Replacement

**User selects**: Sky region in a landscape photo  
**User types**: "Make this a dramatic sunset"

**Final prompt sent to AI**:

```
You are an expert photo editor AI integrated into a professional image editing application.

CRITICAL RULES:
1. You are editing ONLY the selected region, not the entire image
2. The edited region MUST blend seamlessly with the surrounding context
3. Preserve the original image's lighting direction, color temperature, art style, and perspective
4. Do NOT add watermarks, signatures, or text unless explicitly requested
5. Do NOT change the aspect ratio or dimensions of the selected region
6. AVOID introducing artifacts, noise, or inconsistencies

Your goal: Make the edit look like it was always part of the original image.

---

IMAGE CONTEXT:
- Dominant colors: Muted blues and greens, natural tones
- Lighting: Overcast daylight, soft diffused shadows
- Art style: Photorealistic landscape
- Subject matter: Mountain landscape with cloudy sky

---

USER INSTRUCTION:
Make this a dramatic sunset

---

TECHNICAL CONSTRAINTS:
- Selection region: 1920x600px (sky area)
- Feather amount: 10px (soft edge blend)
- Output format: PNG
- Preserve original lighting direction (sunset should match terrain lighting)

---

INSTRUCTIONS:
Replace the selected sky region with a dramatic sunset. Ensure the sunset colors (warm oranges, pinks, purples) blend naturally with the mountain silhouette. Adjust the lighting on the mountains to reflect the warm sunset glow. Maintain photorealistic quality.
```

---

### Example 2: Object Removal

**User selects**: Person in background of photo  
**User types**: "Remove this person"

**Final prompt**:

```
[SYSTEM INSTRUCTIONS - same as above]

IMAGE CONTEXT:
- Dominant colors: Indoor warm lighting, beige walls, wooden furniture
- Lighting: Indoor ambient light from left side
- Art style: Photorealistic interior
- Subject matter: Living room with people

USER INSTRUCTION:
Remove this person

TECHNICAL CONSTRAINTS:
- Selection region: 300x450px
- Feather amount: 15px
- Output format: PNG
- Inpainting mode: Fill with surrounding context

INSTRUCTIONS:
Remove the selected person from the image. Fill the area with contextually appropriate background elements (wall, furniture, floor) that match the surrounding style, lighting, and perspective. Ensure no traces of the removed subject remain.
```

---

### Example 3: Style Transfer

**User selects**: Entire foreground subject  
**User types**: "Make this look like a watercolor painting"

**Final prompt**:

```
[SYSTEM INSTRUCTIONS - same as above]

IMAGE CONTEXT:
- Dominant colors: Natural skin tones, blue denim, white background
- Lighting: Studio portrait lighting, soft key light from right
- Art style: Photorealistic portrait
- Subject matter: Portrait of a person

USER INSTRUCTION:
Make this look like a watercolor painting

TECHNICAL CONSTRAINTS:
- Selection region: 800x1200px
- Feather amount: 0px (hard edge)
- Output format: PNG
- Style transfer mode: Watercolor

INSTRUCTIONS:
Transform the selected region into a watercolor painting style. Apply soft edges, visible brush strokes, color bleeding effects, and paper texture. Maintain the original composition and lighting but interpret it through the watercolor medium. Keep colors vibrant but slightly desaturated.
```

---

## Special Modes

### Inpainting Mode (Object Removal)
When user prompt includes "remove", "delete", "erase":

- Use AI inpainting models (e.g., Stable Diffusion Inpainting)
- Provide mask + inverse prompt ("remove person" → "wall and floor")
- Prioritize context-aware fill

### Outpainting Mode (Extend Image)
When selection extends beyond original image bounds:

- Generate content that continues the scene naturally
- Match edge pixels' colors and patterns
- Maintain perspective and lighting

### Enhancement Mode (Subtle Adjustments)
When user prompt includes "improve", "enhance", "fix":

- Apply subtle improvements (sharpen, denoise, color correction)
- Preserve original composition
- Avoid over-processing

---

## Quality Guardrails

### Pre-Generation Checks
- [ ] Selection mask is valid (non-empty, within bounds)
- [ ] User prompt is non-empty and safe (no harmful content)
- [ ] Image context extraction succeeded
- [ ] Technical constraints are feasible (e.g., not upscaling 100x100 to 10000x10000)

### Post-Generation Checks
- [ ] Output dimensions match expected size
- [ ] Output format is correct (PNG, JPEG, etc.)
- [ ] No obvious artifacts or corruption
- [ ] Colors are within reasonable range (not fully black/white unless intended)

### Fallback Strategies
If AI generation fails:
1. Retry with simplified prompt (remove context)
2. Reduce resolution temporarily, then upscale
3. Return error message to user (never show a broken image)

---

## AI Provider Adapter Interface

All AI providers MUST implement this interface:

```typescript
interface AIProvider {
  name: string; // "Gemini", "Stable Diffusion", "Flux"
  
  editImage(params: {
    baseImage: ImageData;        // Original full image
    selectionMask: ImageData;    // Binary mask of selected region
    userPrompt: string;          // User's instruction
    systemPrompt: string;        // System instructions
    imageContext: {              // Auto-extracted context
      dominantColors: string;
      lighting: string;
      artStyle: string;
      subjectMatter: string;
    };
    constraints: {
      regionBounds: { x, y, width, height };
      featherAmount: number;
      outputFormat: "png" | "jpeg" | "webp";
    };
  }): Promise<{
    editedRegion: ImageData;     // Only the edited region (cropped)
    metadata?: {
      modelUsed: string;
      generationTime: number;
      prompt: string;            // Final prompt sent to model
    };
  }>;
}
```

---

## Testing AI Behavior

### Test Cases (Manual Verification)

1. **Blend Quality**: Sky replacement should have no visible seam
2. **Context Preservation**: Editing a shirt color shouldn't change skin tone
3. **Mask Adherence**: Editing "just the eyes" shouldn't affect the nose
4. **Lighting Consistency**: Adding an object should match existing shadows
5. **Style Transfer**: Converting to painting should maintain composition

### Automated Checks (Future)

- Pixel diff analysis (edited region should differ, rest should be identical)
- Color histogram comparison (ensure dominant tones are preserved)
- Edge detection (check for hard seams)

---

## Model-Specific Notes

### Stable Diffusion
- Use `img2img` for edits, `inpainting` for removals
- `denoising_strength`: 0.4-0.7 for edits, 0.8-1.0 for complete replacements
- Include negative prompt: "blurry, low quality, artifacts, watermark"

### Gemini (Imagen)
- Use `editImage` API with mask
- Set `editMode: "inpaint"` or `editMode: "outpaint"`
- Provide both text prompt and reference image

### Flux
- Use mask-guided generation
- Emphasize context preservation in prompt
- Adjust `guidance_scale` based on edit subtlety (3-7 for subtle, 7-15 for dramatic)

---

## Future Enhancements

1. **Prompt Templates**: Pre-defined prompt structures for common tasks
   - "Make [subject] look like [style]"
   - "Change [attribute] to [new value]"
   - "Add [object] to [location]"

2. **Context-Aware Suggestions**: Analyze selection and suggest prompts
   - Selected sky → "Change to sunset", "Add clouds", "Make it night"

3. **Multi-Step Edits**: Chain multiple AI operations
   - "Remove person, then fill with forest"

4. **Style Memory**: Remember user's preferred styles across sessions
   - "Use my usual portrait style"

---

## Changelog

- **2026-02-03**: Initial AI behavior specification
- **Future**: Updates as new AI providers are integrated

---

**Key Takeaway**: AI in Zerothlayer is a tool that respects user intent, preserves context, and blends seamlessly. It's Photoshop-smart, not random-generator-chaotic.
