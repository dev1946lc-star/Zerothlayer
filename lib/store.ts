import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface Layer {
    id: string;
    type: 'image';
    name: string;
    visible: boolean;
    locked: boolean;
    opacity: number;
    blendMode: string;
    canvasObjectId?: string;
    thumbnail?: string;
    mask?: {
        dataUrl: string; // White = visible, Black = hidden
        visible: boolean;
    };
    filters?: Record<string, number>; // e.g. { brightness: 0.1, contrast: -0.2 }
}

interface LayerState {
    layers: Layer[];
    activeLayerId: string | null;

    // Actions
    addLayer: (layer: Omit<Layer, 'id' | 'visible' | 'locked' | 'opacity' | 'blendMode'>) => string;
    removeLayer: (id: string) => void;
    updateLayer: (id: string, updates: Partial<Layer>) => void;
    setLayers: (layers: Layer[]) => void;
    setActiveLayer: (id: string | null) => void;
    reorderLayers: (fromIndex: number, toIndex: number) => void;

    // Mask Actions
    setLayerMask: (layerId: string, maskDataUrl: string | null) => void;
    toggleLayerMask: (layerId: string) => void;

    activeTool: 'move' | 'select' | 'crop';
    setActiveTool: (tool: 'move' | 'select' | 'crop') => void;

    maskPreviewMode: boolean;
    setMaskPreviewMode: (enabled: boolean) => void;

    // Adjustment Actions
    setLayerFilter: (layerId: string, filterName: string, value: number) => void;
    setLayerThumbnail: (layerId: string, thumbnailDataUrl: string) => void;
}

export interface LayerFilter {
    name: 'brightness' | 'contrast' | 'saturation' | 'vibrance' | 'hue' | 'blur' | 'noise' | 'pixelate' | 'sepia' | 'grayscale' | 'invert';
    value: number; // Normalized usually -1 to 1 or 0 to 1 depending on filter
}


export const useLayerStore = create<LayerState>((set: any) => ({
    layers: [],
    activeLayerId: null,

    addLayer: (layerData: Omit<Layer, 'id' | 'visible' | 'locked' | 'opacity' | 'blendMode'>) => {
        const newLayer: Layer = {
            id: uuidv4(),
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'normal',
            ...layerData,
        };

        set((state: LayerState) => ({
            layers: [newLayer, ...state.layers],
            activeLayerId: newLayer.id,
        }));

        return newLayer.id;
    },

    removeLayer: (id: string) =>
        set((state: LayerState) => {
            const newLayers = state.layers.filter((l: Layer) => l.id !== id);
            let newActiveId = state.activeLayerId;

            if (state.activeLayerId === id) {
                newActiveId = newLayers.length > 0 ? newLayers[0].id : null;
            }

            return {
                layers: newLayers,
                activeLayerId: newActiveId
            }
        }),

    updateLayer: (id: string, updates: Partial<Layer>) =>
        set((state: LayerState) => ({
            layers: state.layers.map((l: Layer) =>
                l.id === id ? { ...l, ...updates } : l
            ),
        })),

    setLayers: (layers: Layer[]) => set({ layers }),

    setActiveLayer: (id: string | null) => set({ activeLayerId: id }),

    reorderLayers: (fromIndex: number, toIndex: number) =>
        set((state: LayerState) => {
            const newLayers = [...state.layers];
            const [movedLayer] = newLayers.splice(fromIndex, 1);
            newLayers.splice(toIndex, 0, movedLayer);
            return { layers: newLayers };
        }),

    setLayerMask: (layerId: string, maskDataUrl: string | null) =>
        set((state: LayerState) => ({
            layers: state.layers.map((l: Layer) => {
                if (l.id !== layerId) return l;
                if (maskDataUrl === null) {
                    const { mask, ...rest } = l;
                    return rest as Layer;
                }
                return {
                    ...l,
                    mask: {
                        dataUrl: maskDataUrl,
                        visible: true
                    }
                };
            })
        })),

    toggleLayerMask: (layerId: string) =>
        set((state: LayerState) => ({
            layers: state.layers.map((l: Layer) => {
                if (l.id !== layerId || !l.mask) return l;
                return {
                    ...l,
                    mask: {
                        ...l.mask,
                        visible: !l.mask.visible
                    }
                };
            })
        })),

    activeTool: 'move',
    setActiveTool: (tool: 'move' | 'select' | 'crop') => set({ activeTool: tool }),

    maskPreviewMode: false,
    setMaskPreviewMode: (enabled: boolean) => set({ maskPreviewMode: enabled }),

    setLayerFilter: (layerId: string, filterName: string, value: number) =>
        set((state: LayerState) => ({
            layers: state.layers.map((l: Layer) => {
                if (l.id !== layerId) return l;
                return {
                    ...l,
                    filters: {
                        ...(l.filters || {}),
                        [filterName]: value
                    }
                };
            })
        })),

    setLayerThumbnail: (layerId: string, thumbnailDataUrl: string) =>
        set((state: LayerState) => ({
            layers: state.layers.map((l: Layer) =>
                l.id === layerId ? { ...l, thumbnail: thumbnailDataUrl } : l
            )
        })),
}));
