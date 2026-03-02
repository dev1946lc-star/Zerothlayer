# Zerothlayer Architecture

## Core Principles
1. **Non-destructive Editing**: All image edits create new layers. The base image is never modified directly.
2. **Layer-Based**: Canvas elements are structured as an ordered stack of layers (raster, mask, adjustment).
3. **AI-Native**: Layers preserve generation metadata (prompt, seed, context, mask, provider) for remixing and tweaking.
4. **Figma-like UI**: Minimal interface, context-aware floating toolbars.

## Directory Structure
- `/app`: Next.js 14 App Router, containing `/api` routes and main pages.
- `/components`: UI widgets (Canvas, LayerPanel, PromptBar, FloatingToolbar).
- `/lib/ai`: Pluggable AI provider system (Gemini, Stable Diffusion, Flux), prompt extractors, and builders.
- `/lib/history`: Command pattern history stack (do/undo) for selections, cropping, masks, layer state.
- `/lib/canvas`: Engine logic (Fabric.js utilities, offscreen caching).
- `/lib/collab`: Collaboration components (WebSocket/Partykit integration).
- `/lib`: Global `store.ts` (Zustand) for application state.

## Systems
- **Canvas Engine**: Driven by Fabric.js. Uses a document origin anchored to the base image to handle deterministic crop and viewport shifts.
- **Selection System**: Marquee, Lasso (coming), Semantic AI (coming). Serialized to masks (white=keep, black=hidden).
- **AI Pipeline**: 
  - User draws mask -> Prompts
  - Frontend extracts cropped region -> Sends to `/api/ai-edit`
  - Backend uses `sharp` to process mask & image -> Passes to Provider Adapter
  - Provider Adapter returns edited image -> Frontend adds new Layer
- **Collaboration**: Live syncs the `store.ts` layers array and active cursors to all connected clients.
