# Collaboration Engine

Zerothlayer uses a WebSocket-based sync engine (designed around PartyKit) to allow real-time multiplayer editing.

## Sync Model
1. **State Ownership**: Real-time state (layers, cursor positions) is owned by the Room server.
2. **Delta Syncing**: `store.ts` updates broadcast delta changes, rather than the entire canvas, to keep payload sizes small.
3. **Asset Syncing**: Uploaded images are stored in an S3 bucket; connected clients receive the signed S3 URLs, not base64 blobs over WS.

## Features (Phase 6)
- **Live Cursors**: Clients broadcast `(x, y)` relative to the canvas document origin.
- **Layer Locking**: When a user begins modifying a layer (e.g., applying a filter), the layer is temporarily locked for others.
- **Comments & Annotations**: Anchored to `(x, y)` coordinates on the canvas. These are stored locally in the UI state and persisted to the server.
