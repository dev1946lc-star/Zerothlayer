export interface CollaborativeUser {
    id: string;
    name: string;
    color: string;
    role?: 'viewer' | 'editor';
    cursor?: { x: number; y: number };
}

export class CollaborationEngine {
    private users: Map<string, CollaborativeUser> = new Map();
    private ws: WebSocket | null = null;
    private listeners: Array<(users: CollaborativeUser[]) => void> = [];

    constructor(private roomId: string, private token: string) {
        // In a real implementation this would connect to PartyKit or a WS server.
        console.log(`[Collab] Initializing for room ${roomId}`);
    }

    connect() {
        // Stub for WS Connection
        console.log('[Collab] Connected to room sync server');
    }

    updateCursor(x: number, y: number) {
        // Stub for broadcasting cursor movement
        const me = this.users.get(this.token);
        if (me) {
            me.cursor = { x, y };
            this.emit();
        }
    }

    broadcastLayerChange(layerId: string, diff: any) {
        // Stub for broadcasting a non-destructive layer state change (delta sync)
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }

    setLocalUser(user: CollaborativeUser) {
        this.users.set(this.token, user);
        this.emit();
    }

    upsertRemoteUser(user: CollaborativeUser) {
        this.users.set(user.id, user);
        this.emit();
    }

    subscribe(listener: (users: CollaborativeUser[]) => void) {
        this.listeners.push(listener);
        listener(Array.from(this.users.values()));
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }

    private emit() {
        const snapshot = Array.from(this.users.values());
        this.listeners.forEach((listener) => listener(snapshot));
    }
}
