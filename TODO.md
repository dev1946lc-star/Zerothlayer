# Zerothlayer Development Roadmap

**Last Updated**: February 27, 2026

---

## Phase 0: Foundation ✅

**Goal**: Establish project vision and AI alignment before writing code.

- [x] README.md – Vision, differentiation, architecture
- [x] TODO.md – Phased roadmap
- [x] AI.md – AI behavior rules and prompt architecture

**Why this matters**: These three files keep the AI dev tools (and you) aligned as complexity grows.

---

## Phase 1: Project Setup ✅

**Goal**: Scaffold a production-ready Next.js foundation with all core dependencies.

### 1.1 Initialize Next.js Project
- [x] Run `npx create-next-app@latest` with App Router + TypeScript
- [x] Configure Tailwind CSS (ensure dark mode support)
- [x] Set up ESLint + Prettier for code quality
- [x] Create project folder structure:
  ```
  /app
  /components
  /lib
    /canvas
    /ai
    /utils
  /public
  /styles
  ```

### 1.2 Install Core Dependencies
- [x] `fabric` – Canvas manipulation
- [x] `zustand` – State management
- [x] `framer-motion` – Animations
- [x] `sharp` – Server-side image processing
- [x] `@aws-sdk/client-s3` or `@cloudflare/workers-types` – Cloud storage
- [x] `typescript` types for all packages

### 1.3 Environment Setup
- [x] Create `.env.local` for API keys and secrets
- [x] Configure cloud storage bucket (S3 or R2)
- [x] Set up basic API route structure in `/app/api`

### 1.4 Basic Canvas Proof of Concept
- [x] Create a simple Fabric.js canvas component
- [x] Render a placeholder image
- [x] Verify viewport controls (zoom, pan)

**Milestone**: You can load an image and interact with it on a canvas. ✅

---

## Phase 2: Core Photoshop Engine (Primitives)

**Goal**: Build the five foundational primitives that everything else depends on.

### 2.1 Canvas Architecture
- [x] Design canvas state schema:
  ```typescript
  {
    baseImage: Image;
    layers: Layer[];
    viewport: { zoom: number; pan: { x, y } };
  }
  ```
- [x] Implement Fabric.js canvas wrapper
- [x] Add zoom controls (mouse wheel, pinch, buttons)
- [x] Add pan controls (drag, arrow keys)
- [x] Ensure canvas resizes responsively

### 2.2 Layer System (Non-Destructive)
- [x] Define `Layer` data structure:
  ```typescript
  {
    id: string;
    imageBitmap: ImageData;
    mask?: ImageData;
    opacity: number;
    blendMode: string;
    transform: { x, y, scale, rotation };
    visible: boolean;
  }
  ```
- [x] Implement layer stack rendering (bottom-up compositing)
- [x] Add layer creation/deletion
- [x] Implement layer reordering (drag to reorder)
- [x] Support opacity and blend mode changes
- [x] Layer visibility toggle

### 2.3 Selection System v1 (Rectangle Only)
- [x] Implement rectangle selection tool
- [x] Display selection with animated "marching ants" border
- [x] Output selection data:
  - Bounding box `{ x, y, width, height }`
  - Binary mask (ImageData)
  - Feather value (default: 0)
- [x] Allow selection manipulation (resize, move)
- [x] Clear selection with Esc or click outside

### 2.4 Mask System
- [x] Create mask rendering pipeline
- [x] Support mask creation from selections
- [x] Implement mask preview (red overlay or checkerboard)
- [x] Allow mask feathering (Gaussian blur on edges)
- [x] Enable mask inversion

### 2.5 History Engine (Command Pattern)
- [x] Design `Action` interface:
  ```typescript
  interface Action {
    do(): void;
    undo(): void;
  }
  ```
- [x] Implement history stack (undo/redo)
- [x] Create actions for:
  - Add/delete layer
  - Modify layer properties
  - Change selection
- [x] Add keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)
- [x] Limit history depth (e.g., last 50 actions)

**Milestone**: You can load an image, create layers, make selections, and undo/redo changes.

---

## Phase 3: AI Integration Pipeline

**Goal**: Connect the AI editing pipeline so users can select + prompt = magic.

### 3.1 Backend Infrastructure
- [x] Create Next.js API route: `/api/ai-edit`
- [x] Set up image upload handler (multipart form data)
- [x] Implement Sharp-based image cropping
- [x] Configure cloud storage upload/download
- [x] Add error handling and validation

### 3.2 AI Provider Integration
- [x] Choose initial provider (Gemini, Stable Diffusion, or Flux)
- [x] Create pluggable AI adapter pattern:
  ```typescript
  interface AIProvider {
    editImage(params: EditParams): Promise<Image>;
  }
  ```
- [x] Implement first provider adapter
- [x] Add retry logic and timeout handling
- [x] Log all AI requests for debugging

### 3.3 Prompt Architecture
- [x] Load system prompt from `AI.md`
- [x] Build context extractor:
  - Detect dominant colors
  - Identify subjects (optional: use vision API)
  - Extract lighting info
- [x] Create prompt builder:
  ```typescript
  const finalPrompt = `
    ${systemInstructions}
    
    User instruction: ${userPrompt}
    
    Context:
    - Art style: ${detectedStyle}
    - Lighting: ${detectedLighting}
    - Selection region: ${region}
  `;
  ```

### 3.4 AI Editing Workflow
- [x] User selects region on canvas
- [x] User types prompt in inline input
- [x] Frontend sends:
  - Original image
  - Selection mask
  - User prompt
- [x] Backend:
  - Crops region using mask
  - Sends to AI with structured prompt
  - Receives edited region
- [x] Frontend:
  - Creates new layer with AI result
  - Blends layer into canvas
  - Adds to history stack

**Milestone**: Select a region, type "make this a sunset", and see it happen non-destructively.

---

## Phase 4: UI/UX (Minimal by Default)

**Goal**: Build a Figma-inspired interface that stays out of the way.

### 4.1 Default Screen (Canvas Only)
- [x] Full-screen canvas view
- [x] Single top toolbar with:
  - Upload image
  - Undo/redo
  - Export
- [x] No sidebars or panels by default

### 4.2 Floating Context Toolbar
- [x] Detect when selection exists
- [x] Show floating toolbar near selection with:
  - "Edit with AI" button
  - "Adjust" (opacity, feather)
  - "Clear selection"
- [x] Position toolbar intelligently (avoid covering selection)
- [x] Animate in/out smoothly (Framer Motion)

### 4.3 Inline Prompt Input
- [x] Show text input when "Edit with AI" is clicked
- [x] Position input near selection
- [x] Add auto-suggestions (optional):
  - "Remove", "Replace with...", "Change color to..."
- [x] Submit on Enter, cancel on Esc

### 4.4 Layer Panel (Toggleable)
- [x] Create collapsible layer panel (right sidebar)
- [x] Show all layers with thumbnails
- [x] Support drag-to-reorder
- [x] Toggle visibility, adjust opacity
- [x] Delete layers

### 4.5 Keyboard Shortcuts
- [x] `R` – Rectangle select
- [x] `V` – Move/pan tool
- [x] `Ctrl+Z` – Undo
- [x] `Ctrl+Shift+Z` – Redo
- [x] `Ctrl+D` – Deselect
- [x] `Esc` – Cancel current operation

**Milestone**: The interface feels fast, minimal, and intentional—like using Figma, not Photoshop CS6.

---

## Phase 5: Advanced Features

**Goal**: Add Photoshop-killer features that leverage AI-native architecture.

### 5.1 Selection System v2
- [x] Lasso tool (freehand selection)
- [x] Magic select (AI-generated mask from rough selection)
- [x] Quick selection (edge-aware brush)

### 5.2 Selection System v3 (Semantic)
- [x] Semantic selection: user types "beard" or "background"
- [x] Use vision API to identify and select regions
- [x] Auto-generate mask for semantic selections

### 5.3 AI-Native Features
- [x] **Prompt history per layer**:
  - Store original prompt with each layer
  - Allow re-prompting to adjust results
- [x] **Prompt remix**:
  - "Make it subtler"
  - "Increase intensity"
  - "Match lighting to base image"
- [x] **Style transfer**:
  - "Apply this style to entire image"

### 5.4 Pro Editing Tools
- [x] Curves adjustment
- [x] Color balance
- [x] Brightness/contrast
- [x] Hue/saturation
- [x] Blend modes (multiply, screen, overlay, etc.)
- [x] Smart objects (non-destructive transforms)

### 5.5 Export Options
- [x] Export as PNG, JPEG, WebP
- [x] Export flattened or with layers (PSD-like format)
- [x] Export specific layers
- [x] Optimize for web (file size reduction)

**Milestone**: Zerothlayer can now handle professional-grade editing tasks.

---

## Phase 6: Future Features (Post-MVP)

**Goal**: Build collaboration and sharing features that make Zerothlayer a platform.

### 6.1 Collaboration
- [x] Real-time multiplayer editing (WebSockets or Partykit)
- [x] Cursors with user names
- [x] Live layer updates

### 6.2 Comments and Annotations
- [x] Pin comments to specific regions
- [x] Thread discussions on layers
- [x] Resolve/unresolve comment threads

### 6.3 Version Snapshots
- [x] Save named snapshots of entire canvas state
- [x] Restore to previous snapshots
- [x] Compare before/after versions

### 6.4 Share Links
- [x] Generate shareable URLs for projects
- [x] View-only vs. edit permissions
- [x] Embed edited images in external sites

### 6.5 Cloud Projects
- [x] User accounts (auth)
- [x] Save projects to cloud
- [x] Project library/dashboard

**Vision**: Zerothlayer becomes the "Figma of AI image editing".

---

## Development Principles

1. **Build primitives first, features second**
   - Layers before AI, selections before semantic selection
2. **Non-negotiable: non-destructive editing**
   - If it can't be undone, don't ship it
3. **Test each phase before moving on**
   - Don't scaffold Phase 2 until Phase 1 works
4. **Iterate on UX constantly**
   - If it feels clunky, it is clunky
5. **AI alignment through documentation**
   - README, TODO, and AI.md keep us on track

---

## Success Metrics

- **Phase 1**: Can load and render an image ✅
- **Phase 2**: Can create layers, select regions, and undo ✅
- **Phase 3**: Can AI-edit a selected region ✅
- **Phase 4**: Interface feels as good as Figma ✅
- **Phase 5**: Can replace basic Photoshop workflows ✅
- **Phase 6**: Can collaborate with others ✅

---

# Feature Backlog / Detailed Specification (Added February 2026)

## 1. Workspace & Interface
### Panels
- [x] Layers Panel – Manage layers, groups, masks, blending.
- [x] Properties Panel – Edit selected layer/mask/adjustment settings.
- [x] Adjustments Panel – Add color & tonal corrections.
- [x] History Panel – Undo/redo steps.
- [x] Navigator Panel – Zoom & move around canvas.
- [x] Channels Panel – RGB/CMYK channels, alpha masks.
- [x] Paths Panel – Vector paths for selections & shapes.
- [x] Character/Paragraph Panels – Text formatting.
- [x] Brush/Brush Settings – Brush shape, dynamics, texture.
- [x] Color/Swatches/Gradients – Choose colors & gradients.
- [x] Libraries Panel – Store reusable assets.
- [x] Timeline Panel – Animation & video editing.
- [x] Actions Panel – Record automation macros.

## 2. File Operations
- [x] New/Open/Save/Export – Create and output files.
- [x] Save for Web / Export As – Optimized web images.
- [x] Place Embedded/Linked – Import external graphics.
- [x] Scripts & Automate (Batch, Image Processor) – Bulk processing.

## 3. Selection Tools
### Basic
- [x] Marquee Tools – Rectangle, ellipse selections.
- [x] Lasso Tools – Freehand or polygon selection.
- [x] Quick Selection Tool – AI edge detection.
- [x] Magic Wand – Select by color similarity.
### Advanced
- [x] Select Subject – AI automatic subject detection.
- [x] Select & Mask Workspace – Refine hair, edges, transparency.
- [x] Color Range / Focus Area – Select by color or depth.
- [x] Object Selection Tool – Draw box → AI finds object.

## 4. Move, Crop & Measure
- [x] Move Tool – Position layers.
- [x] Artboard Tool – Multi-screen layouts.
- [x] Crop / Perspective Crop – Trim or fix perspective.
- [x] Slice Tool – Web slicing.
- [x] Eyedropper / Ruler / Note / Count – Sampling & measurement.

## 5. Retouching & Healing
- [x] Spot Healing Brush – Remove small blemishes automatically.
- [x] Healing Brush – Blend texture from another area.
- [x] Patch Tool – Replace damaged region.
- [x] Content-Aware Fill/Move – AI reconstruction.
- [x] Clone Stamp – Manual copying pixels.
- [x] Red Eye Tool – Fix flash eyes.

## 6. Painting & Drawing
- [x] Brush Tool – Digital painting.
- [x] Pencil Tool – Hard pixel drawing.
- [x] Mixer Brush – Real paint blending.
- [x] Color Replacement Tool – Change colors.
- [x] Gradient Tool – Smooth color transitions.
- [x] Paint Bucket – Fill area with color/pattern.

## 7. Blur, Sharpen & Smudge
- [x] Blur Tool – Soften pixels.
- [x] Sharpen Tool – Increase edge contrast.
- [x] Smudge Tool – Push pixels like finger painting.

## 8. Dodge, Burn & Sponge
- [x] Dodge – Lighten areas.
- [x] Burn – Darken areas.
- [x] Sponge – Adjust saturation.

## 9. Vector & Shape Tools
- [ ] Pen Tool – Precise Bézier paths.
- [x] Freeform Pen / Curvature Pen – Easier drawing.
- [x] Shape Tools – Rectangle, ellipse, polygon, custom shapes.
- [x] Path Operations – Combine, subtract, intersect shapes.

## 10. Text & Typography
- [x] Horizontal/Vertical Type Tool
- [x] Warp Text
- [x] OpenType Features
- [x] Paragraph/Character styling
- [x] Text on Path

## 11. Layers System (Core of Photoshop)
### Layer Types
- [x] Raster layers
- [x] Adjustment layers
- [x] Smart objects
- [x] Text layers
- [x] Shape layers
- [x] Video layers
- [x] 3D layers (legacy)
### Layer Functions
- [x] Masks – Hide/reveal parts.
- [x] Clipping Masks – Constrain effect to layer below.
- [x] Blending Modes – Multiply, Screen, Overlay, etc.
- [x] Opacity/Fill – Transparency control.
- [x] Layer Styles – Drop shadow, stroke, glow, bevel.

## 12. Adjustments & Color Correction
### Tonal
- [x] Brightness/Contrast
- [x] Levels
- [x] Curves
- [x] Exposure
- [x] Shadows/Highlights
### Color
- [x] Hue/Saturation
- [x] Color Balance
- [x] Vibrance
- [x] Selective Color
- [x] Gradient Map
- [x] Photo Filter
- [x] Black & White
### Special
- [x] Match Color
- [x] Replace Color
- [x] Channel Mixer
- [x] Color Lookup (LUTs)

## 13. Filters
### Blur
- [x] Gaussian, Motion, Lens, Surface, Field, Tilt-Shift.
### Sharpen
- [x] Unsharp Mask, Smart Sharpen, High Pass.
### Noise
- [x] Add Noise, Reduce Noise, Dust & Scratches.
### Distort
- [x] Liquify, Warp, Twirl, Ripple, Polar Coordinates.
### Render
- [x] Clouds, Lighting Effects, Lens Flare.
### Stylize
- [x] Oil Paint, Emboss, Find Edges, Glowing Edges.
### Camera Raw Filter
- [x] Professional RAW-style editing inside Photoshop.

## 14. Transform & Alignment
- [x] Free Transform (scale, rotate, skew, warp)
- [x] Perspective Warp
- [x] Puppet Warp
- [x] Align & Distribute layers

## 15. Smart Objects & Non-Destructive Editing
- [x] Preserve original quality.
- [x] Apply Smart Filters editable later.
- [x] Linked external assets.
- [x] Replace contents easily.

## 16. Automation & Productivity
- [x] Actions recording
- [x] Batch processing
- [x] Droplets
- [x] Variables & Data-driven graphics
- [x] Scripts (JavaScript, VBScript)

## 17. AI & Generative Features (Modern Photoshop)
- [x] Generative Fill
- [x] Generative Expand
- [x] Neural Filters (skin smoothing, colorize, style transfer, etc.)
- [x] Sky Replacement
- [x] Remove Background (one click)
- [x] Super Resolution
- [x] Object Selection AI

## 18. Video, Animation & Timeline
- [x] Frame animation (GIFs)
- [x] Video layer editing
- [x] Transitions, audio, export video.

## 19. 3D & AR (Legacy but notable)
- [x] 3D objects, materials, lighting.
- [x] UV texture editing.

## 20. Export, Print & Web
- [x] Print settings & color profiles.
- [x] Export PNG/JPG/SVG.
- [x] Generate image assets automatically.
- [x] Slices for web UI.

## 21. Plugins & Extensions
- [x] Camera Raw
- [x] Neural plugins
- [x] Third-party filters, brushes, AI tools.
