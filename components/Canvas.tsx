"use client";

import {
    useEffect,
    useRef,
    useState,
    forwardRef,
    useImperativeHandle,
    useCallback,
} from "react";
import * as fabric from "fabric"; // Import full namespace for filters
import { Canvas as FabricCanvas, FabricImage, Rect, FabricObject, TMat2D } from "fabric";
import {
    HistoryManager,
    Action,
    CreateSelectionAction,
    ModifySelectionAction,
    ClearSelectionAction,
    CropAction, // Import CropAction
} from "@/lib/history";
import { SetMaskAction } from "@/lib/history/MaskActions"; // Direct import to avoid index issues
import { useLayerStore, Layer } from "@/lib/store";

export interface SelectionData {
    x: number;
    y: number;
    width: number;
    height: number;
    screenX?: number;
    screenY?: number;
    screenWidth?: number;
    screenHeight?: number;
}

export interface CanvasHandle {
    uploadImage: (file: File) => void;
    addImageLayer: (url: string, name: string, aiData?: any, options?: AddImageLayerOptions) => void;
    getSelection: () => SelectionData | null;
    setSelectionRect: (bounds: { x: number; y: number; width: number; height: number }) => void;
    clearSelection: () => void;
    createMask: () => void;
    invertMask: () => void;
    featherMask: (amount: number) => void;
    crop: (width: number, height: number, x: number, y: number) => void;
    getGenerationData: () => Promise<{ image: string; mask: string } | null>;
    getCanvasSnapshot: () => string | null;
    exportCanvas: (format?: 'png' | 'jpeg' | 'webp' | 'svg', quality?: number) => void;
    exportActiveLayer: (format?: 'png' | 'jpeg' | 'webp' | 'svg', quality?: number) => void;
    exportProjectWithLayers: () => void;
    getProjectPayload: () => any;
    loadProjectPayload: (payload: any) => Promise<void>;
    clearCanvas: () => void;
    getHistoryInfo: () => { undo: string[]; redo: string[]; canUndo: boolean; canRedo: boolean };
    getViewState: () => { zoom: number; panX: number; panY: number };
    getCanvasDimensions: () => { width: number; height: number };
    setZoom: (zoom: number) => void;
    panBy: (dx: number, dy: number) => void;
    resetView: () => void;
    transformActiveLayer: (opts: { scaleX?: number; scaleY?: number; angle?: number; skewX?: number; skewY?: number }) => void;
    alignActiveLayer: (mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
    replaceActiveLayerContents: (url: string, name?: string) => Promise<void>;
    applySemanticSelection: (query: string) => void;
    applySemanticMask: (maskDataUrl: string) => void;
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
}

export interface AddImageLayerOptions {
    left?: number;
    top?: number;
    blendMode?: string;
    addToHistory?: boolean;
    layerType?: Layer['type'];
    linkedAsset?: boolean;
    externalSrc?: string;
    smartObject?: boolean;
}



interface CanvasProps {
    onSelectionChange?: (selection: SelectionData | null) => void;
    onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
}

type ActiveTool = 'move' | 'select' | 'crop' | 'lasso' | 'semantic' | 'magic' | 'quick' | 'slice';

const Canvas = forwardRef<CanvasHandle, CanvasProps>(
    ({ onSelectionChange, onHistoryChange }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const fabricRef = useRef<FabricCanvas | null>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const selectionRectRef = useRef<Rect | null>(null);
        const lassoPathRef = useRef<fabric.Polyline | null>(null);
        const lassoPointsRef = useRef<{ x: number; y: number }[] | null>(null);
        const selectionMaskDataRef = useRef<string | null>(null);
        const quickSelectMaskRef = useRef<Uint8Array | null>(null);
        const quickSelectSeedRef = useRef<{ r: number; g: number; b: number } | null>(null);
        const quickSelectPixelsRef = useRef<{ width: number; height: number; data: Uint8ClampedArray } | null>(null);
        const historyRef = useRef<HistoryManager | null>(null);

        const { layers, addLayer, insertLayer, setLayerMask, updateLayer, activeLayerId, setActiveLayer, setLayers, activeTool, setActiveTool, maskPreviewMode, setLayerThumbnail, removeLayer } = useLayerStore();

        // Ref to track active layer ID for event handlers (avoiding stale closures)
        const activeLayerIdRef = useRef<string | null>(null);
        const activeToolRef = useRef<ActiveTool>('move');

        useEffect(() => {
            activeLayerIdRef.current = activeLayerId;
        }, [activeLayerId]);

        // Selection Animation Loop ("Marching Ants")
        useEffect(() => {
            let animationFrameId: number;

            const animate = () => {
                if (fabricRef.current) {
                    let needsRender = false;
                    const time = Date.now();
                    // Speed of marching ants
                    const offset = (time / 20) % 10; // Cycle every 10px (matches [5, 5] dash array)

                    // Animate active selection
                    if (selectionRectRef.current) {
                        // We invert direction by subtracting or just use -offset
                        selectionRectRef.current.set('strokeDashOffset', -offset);
                        needsRender = true;
                    }
                    if (lassoPathRef.current) {
                        lassoPathRef.current.set('strokeDashOffset', -offset);
                        needsRender = true;
                    }

                    // Animate drawing selection (temp rect)
                    const temp = (fabricRef.current as any)._tempSelection?.rect;
                    if (temp) {
                        temp.set('strokeDashOffset', -offset);
                        needsRender = true;
                    }
                    const tempLasso = (fabricRef.current as any)._tempLasso?.path;
                    if (tempLasso) {
                        tempLasso.set('strokeDashOffset', -offset);
                        needsRender = true;
                    }

                    if (needsRender) {
                        fabricRef.current.requestRenderAll();
                    }
                }
                animationFrameId = requestAnimationFrame(animate);
            };

            // Start animation loop
            animate();

            return () => cancelAnimationFrame(animationFrameId);
        }, []);

        useEffect(() => {
            activeToolRef.current = activeTool;

            // Clear quick-selection sampling state when leaving/entering tool modes.
            quickSelectSeedRef.current = null;
            quickSelectPixelsRef.current = null;

            if (activeTool !== 'quick') {
                quickSelectMaskRef.current = null;
            }

            if (fabricRef.current) {
                const lockedByLayerId = new Map(layers.map((layer) => [layer.id, Boolean(layer.locked)]));
                layerMapRef.current.forEach((obj, layerId) => {
                    const interactive = activeTool === 'move' && !lockedByLayerId.get(layerId);
                    obj.selectable = interactive;
                    obj.evented = interactive;
                });
                fabricRef.current.requestRenderAll();
            }
        }, [activeTool, layers]);

        const layerMapRef = useRef<Map<string, FabricImage>>(new Map());

        const selectionBeforeModifyRef = useRef<{
            left: number;
            top: number;
            scaleX: number;
            scaleY: number;
            width: number;
            height: number;
        } | null>(null);
        const [canvasSize, setCanvasSize] = useState<{
            width: number;
            height: number;
        } | null>(null);
        const canvasSizeRef = useRef(canvasSize);

        // Document origin: single source of truth for coordinate anchoring
        // All viewport transforms are computed deterministically from this origin
        const documentOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

        // Loading state for async operations
        const [isLoading, setIsLoading] = useState(false);

        useEffect(() => {
            canvasSizeRef.current = canvasSize;
        }, [canvasSize]);

        // Helper function to load an image from a URL
        const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });
        }, []);

        // Helper to apply filters
        const applyFiltersToImage = (fabImg: FabricImage, filters: Record<string, number>) => {
            const filterList: any[] = []; // Using any to avoid strict type issues with filter lists for now

            if (filters.brightness !== undefined && filters.brightness !== 0) {
                filterList.push(new fabric.filters.Brightness({ brightness: filters.brightness }));
            }
            if (filters.contrast !== undefined && filters.contrast !== 0) {
                filterList.push(new fabric.filters.Contrast({ contrast: filters.contrast }));
            }
            if (filters.saturation !== undefined && filters.saturation !== 0) {
                filterList.push(new fabric.filters.Saturation({ saturation: filters.saturation }));
            }
            if (filters.hue !== undefined && filters.hue !== 0) {
                filterList.push(new fabric.filters.HueRotation({ rotation: filters.hue }));
            }
            if (filters.curves !== undefined && filters.curves !== 0) {
                const gamma = Math.max(0.3, Math.min(2.5, 1 - filters.curves * 0.8));
                filterList.push(new fabric.filters.Gamma({ gamma: [gamma, gamma, gamma] }));
            }
            if (filters.levels !== undefined && filters.levels !== 0) {
                filterList.push(new fabric.filters.Contrast({ contrast: Math.max(-1, Math.min(1, filters.levels)) }));
            }
            if (filters.exposure !== undefined && filters.exposure !== 0) {
                filterList.push(new fabric.filters.Brightness({ brightness: Math.max(-1, Math.min(1, filters.exposure * 0.65)) }));
            }
            if (filters.vibrance !== undefined && filters.vibrance !== 0) {
                filterList.push(new fabric.filters.Vibrance({ vibrance: filters.vibrance }));
            }
            if (filters.blur !== undefined && filters.blur > 0) {
                filterList.push(new fabric.filters.Blur({ blur: filters.blur }));
            }
            if (filters.noise !== undefined && filters.noise > 0) {
                filterList.push(new fabric.filters.Noise({ noise: filters.noise }));
            }
            if (filters.pixelate !== undefined && filters.pixelate > 1) {
                filterList.push(new fabric.filters.Pixelate({ blocksize: filters.pixelate }));
            }
            if (filters.sepia !== undefined && filters.sepia !== 0) {
                // Fabric Sepia is boolean usually, but let's check if there's a sliding one?
                // Standard fabric.Image.filters.Sepia is boolean. 
                // But we can custom class or just toggle. Let's treat > 0.5 as on for now.
                // Actually Fabric v6 has new filters. Let's stick to simple boolean-like behavior 
                // or just instantiate it if value > 0.
                if (filters.sepia > 0.1) filterList.push(new fabric.filters.Sepia());
            }
            if (filters.grayscale !== undefined && filters.grayscale !== 0) {
                if (filters.grayscale > 0.1) filterList.push(new fabric.filters.Grayscale());
            }
            if (filters.invert !== undefined && filters.invert !== 0) {
                if (filters.invert > 0.1) filterList.push(new fabric.filters.Invert());
            }
            if (
                filters.redBalance !== undefined ||
                filters.greenBalance !== undefined ||
                filters.blueBalance !== undefined
            ) {
                const r = filters.redBalance ?? 0;
                const g = filters.greenBalance ?? 0;
                const b = filters.blueBalance ?? 0;
                if (r !== 0 || g !== 0 || b !== 0) {
                    const rm = 1 + r * 0.8;
                    const gm = 1 + g * 0.8;
                    const bm = 1 + b * 0.8;
                    filterList.push(new fabric.filters.ColorMatrix({
                        matrix: [
                            rm, 0, 0, 0, 0,
                            0, gm, 0, 0, 0,
                            0, 0, bm, 0, 0,
                            0, 0, 0, 1, 0
                        ]
                    }));
                }
            }
            const redEnabled = filters.channelRedEnabled === undefined ? 1 : (filters.channelRedEnabled > 0 ? 1 : 0);
            const greenEnabled = filters.channelGreenEnabled === undefined ? 1 : (filters.channelGreenEnabled > 0 ? 1 : 0);
            const blueEnabled = filters.channelBlueEnabled === undefined ? 1 : (filters.channelBlueEnabled > 0 ? 1 : 0);
            if (redEnabled !== 1 || greenEnabled !== 1 || blueEnabled !== 1) {
                filterList.push(new fabric.filters.ColorMatrix({
                    matrix: [
                        redEnabled, 0, 0, 0, 0,
                        0, greenEnabled, 0, 0, 0,
                        0, 0, blueEnabled, 0, 0,
                        0, 0, 0, 1, 0
                    ]
                }));
            }
            const cmykPreview = Math.round(filters.cmykPreview ?? 0);
            if (cmykPreview > 0) {
                let row: [number, number, number, number, number] = [-1, 0, 0, 0, 1];
                if (cmykPreview === 2) row = [0, -1, 0, 0, 1];
                if (cmykPreview === 3) row = [0, 0, -1, 0, 1];
                if (cmykPreview === 4) row = [-0.333, -0.333, -0.333, 0, 1];
                filterList.push(new fabric.filters.ColorMatrix({
                    matrix: [
                        row[0], row[1], row[2], row[3], row[4],
                        row[0], row[1], row[2], row[3], row[4],
                        row[0], row[1], row[2], row[3], row[4],
                        0, 0, 0, 1, 0
                    ]
                }));
            }
            if (filters.shadows !== undefined && filters.shadows !== 0) {
                const s = Math.max(-1, Math.min(1, filters.shadows));
                const lift = s * 0.12;
                filterList.push(new fabric.filters.ColorMatrix({
                    matrix: [
                        1, 0, 0, 0, lift,
                        0, 1, 0, 0, lift,
                        0, 0, 1, 0, lift,
                        0, 0, 0, 1, 0
                    ]
                }));
            }
            if (filters.highlights !== undefined && filters.highlights !== 0) {
                const h = Math.max(-1, Math.min(1, filters.highlights));
                const contrast = -h * 0.35;
                filterList.push(new fabric.filters.Contrast({ contrast }));
            }
            if (filters.selectiveColor !== undefined && filters.selectiveColor !== 0) {
                const s = Math.max(-1, Math.min(1, filters.selectiveColor));
                filterList.push(new fabric.filters.ColorMatrix({
                    matrix: [
                        1 + s * 0.1, 0, 0, 0, 0,
                        0, 1 - s * 0.05, 0, 0, 0,
                        0, 0, 1 + s * 0.1, 0, 0,
                        0, 0, 0, 1, 0
                    ]
                }));
            }
            if (filters.gradientMap !== undefined && filters.gradientMap !== 0) {
                const g = Math.max(-1, Math.min(1, filters.gradientMap));
                filterList.push(new fabric.filters.ColorMatrix({
                    matrix: [
                        0.9, 0.2 * g, 0.1, 0, 0,
                        0.2, 0.9, 0.1 * g, 0, 0,
                        0.1 * g, 0.2, 0.9, 0, 0,
                        0, 0, 0, 1, 0
                    ]
                }));
            }
            if (filters.photoFilter !== undefined && filters.photoFilter !== 0) {
                const p = Math.max(-1, Math.min(1, filters.photoFilter));
                filterList.push(new fabric.filters.ColorMatrix({
                    matrix: [
                        1 + p * 0.12, 0, 0, 0, 0,
                        0, 1, 0, 0, 0,
                        0, 0, 1 - p * 0.12, 0, 0,
                        0, 0, 0, 1, 0
                    ]
                }));
            }
            if (filters.channelMixer !== undefined && filters.channelMixer !== 0) {
                const m = Math.max(-1, Math.min(1, filters.channelMixer));
                filterList.push(new fabric.filters.ColorMatrix({
                    matrix: [
                        1, m * 0.15, m * 0.05, 0, 0,
                        m * 0.05, 1, m * 0.15, 0, 0,
                        m * 0.15, m * 0.05, 1, 0, 0,
                        0, 0, 0, 1, 0
                    ]
                }));
            }
            if (filters.lutPreset !== undefined && filters.lutPreset !== 0) {
                const lut = Math.round(filters.lutPreset);
                if (lut === 1) {
                    filterList.push(new fabric.filters.ColorMatrix({
                        matrix: [
                            1.05, 0, 0, 0, 0.02,
                            0, 1.03, 0, 0, 0.01,
                            0, 0, 0.95, 0, -0.01,
                            0, 0, 0, 1, 0
                        ]
                    }));
                } else if (lut === 2) {
                    filterList.push(new fabric.filters.ColorMatrix({
                        matrix: [
                            0.95, 0.05, 0, 0, 0,
                            0, 0.96, 0.04, 0, 0,
                            0.04, 0, 0.96, 0, 0,
                            0, 0, 0, 1, 0
                        ]
                    }));
                } else if (lut === 3) {
                    filterList.push(new fabric.filters.ColorMatrix({
                        matrix: [
                            1.08, 0, 0, 0, 0,
                            0, 0.95, 0, 0, 0,
                            0, 0, 0.9, 0, 0,
                            0, 0, 0, 1, 0
                        ]
                    }));
                }
            }

            fabImg.filters = filterList;
            fabImg.applyFilters();
        };

        // Sync Layer Filters
        useEffect(() => {
            if (!fabricRef.current) return;

            // We need to efficiently update filters only when they change.
            // Since this runs on every store update (which includes filter changes),
            // iterate active layers and check.

            layers.forEach(layer => {
                const fabImg = layerMapRef.current.get(layer.id);
                if (fabImg && layer.filters) {
                    // Optimization: In a real app we'd compare with current cache.
                    // Here we just re-apply. Fabric's applyFilters is somewhat expensive 
                    // but fine for individual image adjustments.
                    applyFiltersToImage(fabImg, layer.filters);
                }
            });

            fabricRef.current.requestRenderAll();

        }, [layers]); // Re-runs when layers (incl filters) change


        // Initialize Canvas
        useEffect(() => {
            if (!canvasRef.current || !containerRef.current) return;

            const container = containerRef.current;
            const canvas = new FabricCanvas(canvasRef.current, {
                width: container.clientWidth,
                height: container.clientHeight,
                backgroundColor: "#f4f4f5",
                selection: false, // We handle selection manually in 'select' mode
                preserveObjectStacking: true,
            });

            fabricRef.current = canvas;

            historyRef.current = new HistoryManager(50, () => {
                if (historyRef.current) {
                    onHistoryChange?.(
                        historyRef.current.canUndo(),
                        historyRef.current.canRedo()
                    );
                }
            });

            const resizeCanvas = () => {
                if (!containerRef.current || !fabricRef.current) return;

                // Only auto-resize if we don't have a fixed document size (cropped/loaded)
                if (!canvasSizeRef.current) {
                    const { clientWidth, clientHeight } = containerRef.current;
                    // Prevent collapsing to 0, but allow resizing down
                    if (clientWidth === 0 || clientHeight === 0) return;

                    fabricRef.current.setDimensions({ width: clientWidth, height: clientHeight });
                }
            };

            const resizeObserver = new ResizeObserver(() => {
                resizeCanvas();
            });
            resizeObserver.observe(containerRef.current);

            setupSelectionInteraction(canvas);

            return () => {
                resizeObserver.disconnect();
                // Clear layer map to prevent memory leaks
                layerMapRef.current.clear();
                canvas.dispose();
            };
        }, []);

        useEffect(() => {
            if (!fabricRef.current) return;
            const canvas = fabricRef.current;

            const currentIds = new Set(layers.map(l => l.id));
            layerMapRef.current.forEach((obj, id) => {
                if (!currentIds.has(id)) {
                    canvas.remove(obj);
                    layerMapRef.current.delete(id);
                }
            });

            const processLayers = async () => {
                for (let i = layers.length - 1; i >= 0; i--) {
                    const layer = layers[i];
                    let obj = layerMapRef.current.get(layer.id);

                    if (obj) {
                        if (obj.visible !== layer.visible) obj.visible = layer.visible;
                        const effectiveOpacity = (layer.opacity ?? 1) * (layer.fillOpacity ?? 1);
                        if (obj.opacity !== effectiveOpacity) obj.opacity = effectiveOpacity;
                        const compositeMode = layer.clippingMask ? 'source-atop' : (layer.blendMode || 'normal');
                        if ((obj as any).globalCompositeOperation !== compositeMode) {
                            (obj as any).globalCompositeOperation = compositeMode as GlobalCompositeOperation;
                        }

                        if (layer.layerStyle) {
                            const style = layer.layerStyle;
                            const blur = Math.max(0, style.dropShadow ?? 0) * 12;
                            const shadowAlpha = Math.max(0, style.dropShadow ?? 0) * 0.55;
                            obj.shadow = blur > 0
                                ? new fabric.Shadow({
                                    color: `rgba(0,0,0,${shadowAlpha.toFixed(2)})`,
                                    blur,
                                    offsetX: Math.round(blur * 0.18),
                                    offsetY: Math.round(blur * 0.24)
                                })
                                : null;

                            if ((style.glow ?? 0) > 0) {
                                const g = style.glow ?? 0;
                                obj.shadow = new fabric.Shadow({
                                    color: `rgba(255,255,255,${Math.min(0.65, g * 0.65).toFixed(2)})`,
                                    blur: Math.max(1, g * 16),
                                    offsetX: 0,
                                    offsetY: 0
                                });
                            }
                            const strokeStrength = Math.max(0, style.stroke ?? 0);
                            obj.set({
                                stroke: strokeStrength > 0 ? 'rgba(255,255,255,0.9)' : undefined,
                                strokeWidth: strokeStrength > 0 ? Math.max(1, strokeStrength * 6) : 0
                            });

                            const bevelStrength = Math.max(0, style.bevel ?? 0);
                            if (bevelStrength > 0 && !obj.shadow) {
                                obj.shadow = new fabric.Shadow({
                                    color: `rgba(255,255,255,${Math.min(0.45, bevelStrength * 0.35).toFixed(2)})`,
                                    blur: Math.max(1, bevelStrength * 8),
                                    offsetX: -Math.round(bevelStrength * 3),
                                    offsetY: -Math.round(bevelStrength * 3)
                                });
                            }
                        } else {
                            obj.shadow = null;
                            obj.set({
                                stroke: undefined,
                                strokeWidth: 0
                            });
                        }

                        if (layer.mask && layer.mask.visible) {
                            if ((obj as any)._maskDataUrl !== layer.mask.dataUrl) {
                                const maskImg = await FabricImage.fromURL(layer.mask.dataUrl);
                                maskImg.set({
                                    originX: 'left',
                                    originY: 'top',
                                    left: 0,
                                    top: 0,
                                    absolutePositioned: true
                                });
                                obj.clipPath = maskImg;
                                (obj as any)._hasMaskApplied = true;
                                (obj as any)._maskDataUrl = layer.mask.dataUrl;
                            }
                        } else {
                            obj.clipPath = undefined;
                            (obj as any)._hasMaskApplied = false;
                            (obj as any)._maskDataUrl = undefined;
                        }

                        // Ensure object follows tool mode
                        const interactive = activeToolRef.current === 'move' && !layer.locked;
                        obj.selectable = interactive;
                        obj.evented = interactive;

                        canvas.bringObjectToFront(obj);
                    }
                }

                if (selectionRectRef.current) {
                    canvas.bringObjectToFront(selectionRectRef.current);
                }
                if (lassoPathRef.current) {
                    canvas.bringObjectToFront(lassoPathRef.current);
                }

                canvas.requestRenderAll();
            };

            processLayers();

        }, [layers]);


        const getActiveImageObject = (): FabricImage | null => {
            if (activeLayerIdRef.current) {
                const activeLayer = layers.find((layer) => layer.id === activeLayerIdRef.current);
                const active = layerMapRef.current.get(activeLayerIdRef.current);
                if (active && active.visible !== false && !activeLayer?.locked) return active;
            }

            // Fallback: first visible and unlocked layer from current stack order.
            for (const layer of layers) {
                const img = layerMapRef.current.get(layer.id);
                if (img && img.visible !== false && !layer.locked) {
                    setActiveLayer(layer.id);
                    return img;
                }
            }
            return null;
        };

        // Removed duplicate useLayerStore here.
        // Also ensure maskPreviewMode is available in the top-level destructuring.


        // ... (existing refs)

        // Mask Preview Implementation
        useEffect(() => {
            if (!fabricRef.current) return;
            const canvas = fabricRef.current;

            // Remove existing preview
            const existingPreview = (canvas as any)._maskPreviewRect;
            if (existingPreview) {
                canvas.remove(existingPreview);
                (canvas as any)._maskPreviewRect = null;
            }

            if (maskPreviewMode && activeLayerIdRef.current) {
                const layer = layers.find(l => l.id === activeLayerIdRef.current);
                if (layer?.mask?.dataUrl) {
                    FabricImage.fromURL(layer.mask.dataUrl).then(maskImg => {
                        if (!fabricRef.current) return;

                        // Create a red overlay that is masked by the layer mask
                        // Effectively showing where the mask is "white" (visible) as red
                        // Wait, mask preview usually shows the mask itself.
                        // Common approach: Red overlay on masked-out areas? Or Red overlay on mask?
                        // Photoshop Quick Mask: Red = Masked Area (Hidden).
                        // Our mask: White = Visible, Black = Hidden.
                        // So we want Red = Black areas.

                        // Let's draw the full mask as a red overlay.
                        // We need to invert the mask image for the "Red = Hidden" metaphor?
                        // Or just show the mask grayscale?
                        // Let's stick to "Red Overlay = Masked Out (Hidden)" which is standard.

                        // Implementation:
                        // 1. Create a full red rectangle.
                        // 2. Apply the INVERTED mask as clipPath? 
                        // If Mask is White (Visible), we want NO Red.
                        // If Mask is Black (Hidden), we want Red.
                        // So we need to clip the Red Rectangle with the *inverse* of the mask.
                        // OR: simpler visual -> Just show the mask itself as a semi-transparent layer to check coverage.

                        // For MVP: Show the mask as a Grayscale Overlay to see what it is.
                        // If user wants Red Overlay, we need to invert.
                        // Let's just overlay the mask image with some opacity and blending.

                        maskImg.set({
                            left: 0,
                            top: 0,
                            opacity: 0.5,
                            originX: 'left',
                            originY: 'left',
                            selectable: false,
                            evented: false,
                            globalCompositeOperation: 'source-over', // Just float on top
                            scaleX: fabricRef.current!.width! / maskImg.width!,
                            scaleY: fabricRef.current!.height! / maskImg.height!
                        });

                        // Tint it red for visibility?
                        maskImg.filters = [new fabric.filters.BlendColor({ color: 'red', mode: 'multiply', alpha: 0.8 })];
                        // Note: Fabric filters might be tricky without webgl.
                        // Fallback: just show the grayscale mask.

                        (canvas as any)._maskPreviewRect = maskImg;
                        canvas.add(maskImg);
                        canvas.bringObjectToFront(maskImg);
                        canvas.requestRenderAll();
                    });
                }
            }
        }, [maskPreviewMode, layers, activeLayerId]);

        // Refactored mask generation with cleaner switch structure
        const generateMaskData = async (
            operation: 'selection' | 'invert' | 'feather',
            options: { featherAmount?: number } = {}
        ): Promise<string | null> => {
            if (!fabricRef.current || !activeLayerIdRef.current) return null;

            const width = fabricRef.current.width!;
            const height = fabricRef.current.height!;
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = width;
            maskCanvas.height = height;
            const ctx = maskCanvas.getContext('2d');
            if (!ctx) return null;

            // Fill background Black (Hidden) - standard for all operations
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);

            try {
                switch (operation) {
                    case 'selection': {
                        if (selectionMaskDataRef.current) {
                            if (!options.featherAmount) {
                                return selectionMaskDataRef.current;
                            }
                            const img = await loadImage(selectionMaskDataRef.current);
                            ctx.filter = `blur(${options.featherAmount}px)`;
                            ctx.drawImage(img, 0, 0, width, height);
                            break;
                        }

                        ctx.fillStyle = '#FFFFFF';
                        if (options.featherAmount) {
                            ctx.filter = `blur(${options.featherAmount}px)`;
                        }

                        if (lassoPointsRef.current && lassoPointsRef.current.length > 2) {
                            const points = lassoPointsRef.current;
                            ctx.beginPath();
                            ctx.moveTo(points[0].x, points[0].y);
                            for (let i = 1; i < points.length; i += 1) {
                                ctx.lineTo(points[i].x, points[i].y);
                            }
                            ctx.closePath();
                            ctx.fill();
                            break;
                        }

                        const selection = selectionRectRef.current;
                        if (!selection) return null;

                        ctx.fillRect(
                            selection.left!,
                            selection.top!,
                            selection.width! * selection.scaleX!,
                            selection.height! * selection.scaleY!
                        );
                        break;
                    }

                    case 'invert': {
                        const activeLayer = layers.find(l => l.id === activeLayerIdRef.current);
                        if (!activeLayer?.mask?.dataUrl) return null;

                        const currentMaskImg = await loadImage(activeLayer.mask.dataUrl);
                        ctx.drawImage(currentMaskImg, 0, 0, width, height);
                        ctx.globalCompositeOperation = 'difference';
                        ctx.fillStyle = 'white';
                        ctx.fillRect(0, 0, width, height);
                        break;
                    }

                    case 'feather': {
                        const activeLayer = layers.find(l => l.id === activeLayerIdRef.current);
                        if (!activeLayer?.mask?.dataUrl || !options.featherAmount) return null;

                        const currentMaskImg = await loadImage(activeLayer.mask.dataUrl);
                        ctx.filter = `blur(${options.featherAmount}px)`;
                        ctx.drawImage(currentMaskImg, 0, 0, width, height);
                        break;
                    }
                }
            } catch (error) {
                console.error('Failed to generate mask data:', error);
                return null;
            }

            // Reset filter before exporting
            ctx.filter = 'none';
            return maskCanvas.toDataURL('image/png');
        };

        const applyMaskAction = async (newMaskData: string | null) => {
            if (!activeLayerIdRef.current || !historyRef.current) return;

            const action = new SetMaskAction(
                activeLayerIdRef.current,
                layers.find(l => l.id === activeLayerIdRef.current)?.mask?.dataUrl,
                newMaskData,
                (id, data) => setLayerMask(id, data)
            );

            historyRef.current.execute(action);
        };

        const createMaskFromSelection = async () => {
            setIsLoading(true);
            try {
                const data = await generateMaskData('selection');
                if (data) {
                    await applyMaskAction(data);
                    clearSelectionWithHistory();
                }
            } catch (error) {
                console.error('Failed to create mask:', error);
            } finally {
                setIsLoading(false);
            }
        };

        const invertMask = async () => {
            const data = await generateMaskData('invert');
            if (data) await applyMaskAction(data);
        };

        const featherMask = async (amount: number) => {
            const data = await generateMaskData('feather', { featherAmount: amount });
            if (data) await applyMaskAction(data);
        };

        const centerAndScaleImage = (
            img: FabricImage,
            canvasWidth: number,
            canvasHeight: number
        ) => {
            const imgWidth = img.width || 1;
            const imgHeight = img.height || 1;
            const scaleX = canvasWidth / imgWidth;
            const scaleY = canvasHeight / imgHeight;
            const scale = Math.min(scaleX, scaleY) * 0.8;

            img.scale(scale);
            img.set({
                left: canvasWidth / 2,
                top: canvasHeight / 2,
                originX: "center",
                originY: "center",
            });
        };

        // Generate a small thumbnail from a FabricImage for layer preview
        const generateThumbnail = (img: FabricImage, layerId: string) => {
            try {
                const el = img.getElement() as any;
                if (!el) return;
                const thumbSize = 48;
                const offscreen = document.createElement('canvas');
                const w = el.naturalWidth || el.width || 1;
                const h = el.naturalHeight || el.height || 1;
                const scale = Math.min(thumbSize / w, thumbSize / h);
                offscreen.width = Math.round(w * scale);
                offscreen.height = Math.round(h * scale);
                const ctx = offscreen.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(el as HTMLImageElement, 0, 0, offscreen.width, offscreen.height);
                const dataUrl = offscreen.toDataURL('image/png');
                setLayerThumbnail(layerId, dataUrl);
            } catch (e) {
                // Silently fail - thumbnail is optional
            }
        };

        const captureCanvasPixels = async (): Promise<{ width: number; height: number; data: Uint8ClampedArray } | null> => {
            if (!fabricRef.current) return null;
            const width = fabricRef.current.width || 0;
            const height = fabricRef.current.height || 0;
            if (!width || !height) return null;

            const dataUrl = fabricRef.current.toDataURL({ format: 'png', multiplier: 1 });
            const img = await loadImage(dataUrl);
            const offscreen = document.createElement('canvas');
            offscreen.width = width;
            offscreen.height = height;
            const ctx = offscreen.getContext('2d');
            if (!ctx) return null;

            ctx.drawImage(img, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            return { width, height, data: imageData.data };
        };

        const buildMaskDataUrlFromBinary = (mask: Uint8Array, width: number, height: number): string => {
            const offscreen = document.createElement('canvas');
            offscreen.width = width;
            offscreen.height = height;
            const ctx = offscreen.getContext('2d');
            if (!ctx) return "";

            const imageData = ctx.createImageData(width, height);
            for (let i = 0; i < mask.length; i += 1) {
                const v = mask[i] ? 255 : 0;
                const idx = i * 4;
                imageData.data[idx] = v;
                imageData.data[idx + 1] = v;
                imageData.data[idx + 2] = v;
                imageData.data[idx + 3] = 255;
            }
            ctx.putImageData(imageData, 0, 0);
            return offscreen.toDataURL('image/png');
        };

        const performMagicSelection = async (seedX: number, seedY: number) => {
            const snapshot = await captureCanvasPixels();
            if (!snapshot) return;

            const { width, height, data } = snapshot;
            const x = Math.max(0, Math.min(width - 1, Math.round(seedX)));
            const y = Math.max(0, Math.min(height - 1, Math.round(seedY)));
            const startIndex = (y * width + x) * 4;
            const sr = data[startIndex];
            const sg = data[startIndex + 1];
            const sb = data[startIndex + 2];
            const tolerance = 40;

            const visited = new Uint8Array(width * height);
            const queued = new Uint8Array(width * height);
            const mask = new Uint8Array(width * height);
            const queue: number[] = [y * width + x];
            queued[y * width + x] = 1;

            for (let qHead = 0; qHead < queue.length; qHead += 1) {
                const idx = queue[qHead];
                if (visited[idx]) continue;
                visited[idx] = 1;

                const px = idx % width;
                const py = Math.floor(idx / width);
                const di = idx * 4;
                const dr = Math.abs(data[di] - sr);
                const dg = Math.abs(data[di + 1] - sg);
                const db = Math.abs(data[di + 2] - sb);
                const dist = dr + dg + db;

                if (dist > tolerance * 3) continue;
                mask[idx] = 1;

                const enqueue = (next: number) => {
                    if (!visited[next] && !queued[next]) {
                        queued[next] = 1;
                        queue.push(next);
                    }
                };

                if (px > 0) enqueue(idx - 1);
                if (px < width - 1) enqueue(idx + 1);
                if (py > 0) enqueue(idx - width);
                if (py < height - 1) enqueue(idx + width);
            }

            const maskData = buildMaskDataUrlFromBinary(mask, width, height);
            if (!maskData) return;
            quickSelectMaskRef.current = mask;
            await updateSelectionFromMaskDataUrl(maskData);
        };

        const initQuickSelectionSnapshot = async () => {
            const snapshot = await captureCanvasPixels();
            if (!snapshot) return false;
            quickSelectPixelsRef.current = snapshot;
            quickSelectSeedRef.current = null;
            const { width, height } = snapshot;
            if (!quickSelectMaskRef.current || quickSelectMaskRef.current.length !== width * height) {
                quickSelectMaskRef.current = new Uint8Array(width * height);
            }
            return true;
        };

        const applyQuickBrush = async (cx: number, cy: number, radius: number) => {
            if (!quickSelectPixelsRef.current) {
                const initialized = await initQuickSelectionSnapshot();
                if (!initialized) return;
            }
            const snapshot = quickSelectPixelsRef.current;
            if (!snapshot) return;
            const { width, height, data } = snapshot;
            if (!quickSelectMaskRef.current || quickSelectMaskRef.current.length !== width * height) {
                quickSelectMaskRef.current = new Uint8Array(width * height);
            }

            const seedX = Math.max(0, Math.min(width - 1, Math.round(cx)));
            const seedY = Math.max(0, Math.min(height - 1, Math.round(cy)));
            const seedIndex = (seedY * width + seedX) * 4;
            if (!quickSelectSeedRef.current) {
                quickSelectSeedRef.current = {
                    r: data[seedIndex],
                    g: data[seedIndex + 1],
                    b: data[seedIndex + 2]
                };
            }

            const seed = quickSelectSeedRef.current;
            const tolerance = 55;
            const rr = radius * radius;
            const minX = Math.max(0, Math.floor(cx - radius));
            const maxX = Math.min(width - 1, Math.ceil(cx + radius));
            const minY = Math.max(0, Math.floor(cy - radius));
            const maxY = Math.min(height - 1, Math.ceil(cy + radius));

            for (let y = minY; y <= maxY; y += 1) {
                for (let x = minX; x <= maxX; x += 1) {
                    const dx = x - cx;
                    const dy = y - cy;
                    if ((dx * dx) + (dy * dy) > rr) continue;
                    const idx = y * width + x;
                    const di = idx * 4;
                    const dr = Math.abs(data[di] - seed.r);
                    const dg = Math.abs(data[di + 1] - seed.g);
                    const db = Math.abs(data[di + 2] - seed.b);
                    if (dr + dg + db <= tolerance * 3) {
                        quickSelectMaskRef.current[idx] = 1;
                    }
                }
            }

            const maskData = buildMaskDataUrlFromBinary(quickSelectMaskRef.current, width, height);
            if (!maskData) return;
            await updateSelectionFromMaskDataUrl(maskData);
        };

        const updateSelectionFromMaskDataUrl = async (maskDataUrl: string) => {
            if (!fabricRef.current) return;
            const canvas = fabricRef.current;

            const maskImg = await loadImage(maskDataUrl);
            const width = canvas.width || 0;
            const height = canvas.height || 0;
            if (!width || !height) return;

            const offscreen = document.createElement('canvas');
            offscreen.width = width;
            offscreen.height = height;
            const ctx = offscreen.getContext('2d');
            if (!ctx) return;

            ctx.drawImage(maskImg, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            let minX = width;
            let minY = height;
            let maxX = -1;
            let maxY = -1;

            for (let y = 0; y < height; y += 1) {
                for (let x = 0; x < width; x += 1) {
                    const idx = (y * width + x) * 4;
                    if (data[idx] > 20 || data[idx + 3] > 20) {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }

            if (maxX < minX || maxY < minY) {
                onSelectionChange?.(null);
                return;
            }

            if (selectionRectRef.current) {
                canvas.remove(selectionRectRef.current);
            }

            const rect = new Rect({
                left: minX,
                top: minY,
                width: maxX - minX + 1,
                height: maxY - minY + 1,
                fill: "rgba(68, 138, 255, 0.1)",
                stroke: "#448AFF",
                strokeWidth: 2,
                strokeDashArray: [5, 5],
                selectable: true,
                hasControls: true,
                hasBorders: true,
                lockRotation: true,
            });

            selectionRectRef.current = rect;
            canvas.add(rect);
            canvas.bringObjectToFront(rect);
            selectionMaskDataRef.current = maskDataUrl;
            canvas.requestRenderAll();
            onSelectionChange?.(getSelectionData());
        };

        const handleImageUpload = (file: File) => {
            if (!fabricRef.current || !containerRef.current) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const imgUrl = e.target?.result as string;
                FabricImage.fromURL(imgUrl).then((img) => {
                    if (!fabricRef.current || !containerRef.current) return;

                    const canvasWidth = containerRef.current.clientWidth;
                    const canvasHeight = containerRef.current.clientHeight;
                    centerAndScaleImage(img, canvasWidth, canvasHeight);

                    const layerId = addLayer({
                        name: file.name,
                        type: 'image',
                    });

                    layerMapRef.current.set(layerId, img);
                    fabricRef.current.add(img);

                    // Set initial state based on active tool
                    img.selectable = activeToolRef.current === 'move';
                    img.evented = activeToolRef.current === 'move';

                    setActiveLayer(layerId);

                    fabricRef.current.renderAll();

                    // Generate thumbnail for the layer panel
                    generateThumbnail(img, layerId);
                });
            };
            reader.readAsDataURL(file);
        };

        const setupSelectionInteraction = (canvas: FabricCanvas) => {
            let isDrawing = false;
            let isDrawingLasso = false;
            let isQuickSelecting = false;
            let startX = 0;
            let startY = 0;

            canvas.on("mouse:down", (options) => {
                if (
                    activeToolRef.current !== 'select' &&
                    activeToolRef.current !== 'crop' &&
                    activeToolRef.current !== 'lasso' &&
                    activeToolRef.current !== 'semantic' &&
                    activeToolRef.current !== 'magic' &&
                    activeToolRef.current !== 'quick' &&
                    activeToolRef.current !== 'slice'
                ) return;

                const activeImg = getActiveImageObject();
                if (!activeImg) return;
                if (activeLayerIdRef.current) {
                    const currentLayer = layers.find((layer) => layer.id === activeLayerIdRef.current);
                    if (currentLayer?.locked) return;
                }

                // Configure canvas for selection/crop mode
                canvas.selection = true;
                canvas.defaultCursor = 'crosshair';

                // Allow selecting the selection rect itself to move it
                if (selectionRectRef.current) {
                    selectionRectRef.current.selectable = true;
                    selectionRectRef.current.evented = true;
                }

                // Disable object selection while in marquee/crop mode
                canvas.forEachObject((obj) => {
                    if (obj !== selectionRectRef.current) {
                        obj.selectable = false;
                        obj.evented = false;
                    }
                });

                if (activeToolRef.current === 'lasso') {
                    const pointer = canvas.getPointer(options.e);

                    if (selectionRectRef.current) {
                        canvas.remove(selectionRectRef.current);
                        selectionRectRef.current = null;
                    }
                    if (lassoPathRef.current) {
                        canvas.remove(lassoPathRef.current);
                        lassoPathRef.current = null;
                    }
                    lassoPointsRef.current = [{ x: pointer.x, y: pointer.y }];

                    const path = new fabric.Polyline(lassoPointsRef.current, {
                        fill: "rgba(68, 138, 255, 0.15)",
                        stroke: "#448AFF",
                        strokeWidth: 2,
                        strokeDashArray: [5, 5],
                        selectable: false,
                        evented: false
                    });

                    (canvas as any)._tempLasso = { path };
                    canvas.add(path);
                    isDrawingLasso = true;
                    onSelectionChange?.(null);
                    canvas.requestRenderAll();
                    return;
                }

                if (activeToolRef.current === 'magic') {
                    const pointer = canvas.getPointer(options.e);
                    void performMagicSelection(pointer.x, pointer.y);
                    return;
                }

                if (activeToolRef.current === 'quick') {
                    const pointer = canvas.getPointer(options.e);
                    isQuickSelecting = true;
                    quickSelectPixelsRef.current = null;
                    quickSelectSeedRef.current = null;
                    void applyQuickBrush(pointer.x, pointer.y, 20);
                    return;
                }

                // In crop mode, ensure selection rect is interactive
                if (activeToolRef.current === 'crop' && selectionRectRef.current) {
                    selectionRectRef.current.selectable = true;
                    selectionRectRef.current.evented = true;
                }

                const target = canvas.findTarget(options.e);
                if (target && target === selectionRectRef.current) {
                    const sel = selectionRectRef.current;
                    selectionBeforeModifyRef.current = {
                        left: sel.left || 0,
                        top: sel.top || 0,
                        scaleX: sel.scaleX || 1,
                        scaleY: sel.scaleY || 1,
                        width: sel.width || 0,
                        height: sel.height || 0,
                    };
                    return;
                }

                isDrawing = true;
                const pointer = canvas.getPointer(options.e);
                startX = pointer.x;
                startY = pointer.y;

                if (selectionRectRef.current) {
                    canvas.remove(selectionRectRef.current);
                    selectionRectRef.current = null;
                    onSelectionChange?.(null);
                }

                const rect = new Rect({
                    left: startX,
                    top: startY,
                    width: 0,
                    height: 0,
                    fill: "rgba(68, 138, 255, 0.1)",
                    stroke: "#448AFF",
                    strokeWidth: 2,
                    strokeDashArray: [5, 5],
                    selectable: true,
                    hasControls: true,
                    hasBorders: true,
                    lockRotation: true,
                });

                (canvas as any)._tempSelection = { rect };
                canvas.add(rect);
            });

            canvas.on("mouse:move", (options) => {
                if (isQuickSelecting) {
                    const pointer = canvas.getPointer(options.e);
                    void applyQuickBrush(pointer.x, pointer.y, 20);
                    return;
                }

                if (isDrawingLasso) {
                    const tempLasso = (canvas as any)._tempLasso;
                    if (!tempLasso || !lassoPointsRef.current) return;
                    const pointer = canvas.getPointer(options.e);
                    lassoPointsRef.current.push({ x: pointer.x, y: pointer.y });
                    tempLasso.path.set({ points: lassoPointsRef.current });
                    canvas.requestRenderAll();
                    return;
                }

                const temp = (canvas as any)._tempSelection;
                if (!isDrawing || !temp) return;
                const pointer = canvas.getPointer(options.e);
                const rect = temp.rect;
                let width = pointer.x - startX;
                let height = pointer.y - startY;

                if (width < 0) { rect.set({ left: pointer.x }); width = Math.abs(width); }
                if (height < 0) { rect.set({ top: pointer.y }); height = Math.abs(height); }

                rect.set({ width, height });
                canvas.requestRenderAll();
            });

            canvas.on("mouse:up", () => {
                if (isQuickSelecting) {
                    isQuickSelecting = false;
                    quickSelectSeedRef.current = null;
                    return;
                }

                if (isDrawingLasso) {
                    const tempLasso = (canvas as any)._tempLasso;
                    isDrawingLasso = false;

                    if (tempLasso?.path && lassoPointsRef.current && lassoPointsRef.current.length > 2) {
                        lassoPathRef.current = tempLasso.path;
                        onSelectionChange?.(getSelectionData());
                    } else {
                        if (tempLasso?.path) {
                            canvas.remove(tempLasso.path);
                        }
                        lassoPathRef.current = null;
                        lassoPointsRef.current = null;
                        onSelectionChange?.(null);
                    }

                    (canvas as any)._tempLasso = null;
                    canvas.requestRenderAll();
                    return;
                }

                const temp = (canvas as any)._tempSelection;
                if (isDrawing && temp && historyRef.current) {
                    isDrawing = false;
                    const rect = temp.rect;
                    if ((rect.width || 0) < 5 || (rect.height || 0) < 5) {
                        canvas.remove(rect);
                    } else {
                        selectionRectRef.current = rect;
                        const action = new CreateSelectionAction(
                            canvas,
                            rect,
                            null,
                            handleSelectionChangeInternal,
                            getSelectionData
                        );
                        canvas.remove(rect);
                        historyRef.current.execute(action);
                    }
                    (canvas as any)._tempSelection = null;
                }
            });

            canvas.on("object:modified", (options) => {
                if (options.target === selectionRectRef.current && selectionBeforeModifyRef.current) {
                    const sel = selectionRectRef.current!;
                    const newState = {
                        left: sel.left || 0,
                        top: sel.top || 0,
                        scaleX: sel.scaleX || 1,
                        scaleY: sel.scaleY || 1,
                        width: sel.width || 0,
                        height: sel.height || 0
                    };

                    // Execute ModifySelectionAction for proper undo/redo support
                    if (historyRef.current) {
                        const action = new ModifySelectionAction(
                            canvas,
                            selectionRectRef.current,
                            selectionBeforeModifyRef.current,
                            newState,
                            handleSelectionChangeInternal,
                            getSelectionData
                        );
                        historyRef.current.execute(action);
                    }

                    // Clear the before state after handling
                    selectionBeforeModifyRef.current = null;
                }
            });
        };

        const handleSelectionChangeInternal = (sel: Rect | null, data: SelectionData | null) => {
            selectionRectRef.current = sel;
            if (!sel) {
                lassoPointsRef.current = null;
                selectionMaskDataRef.current = null;
                quickSelectMaskRef.current = null;
                if (lassoPathRef.current && fabricRef.current) {
                    fabricRef.current.remove(lassoPathRef.current);
                }
                lassoPathRef.current = null;
            }
            onSelectionChange?.(data);
        };

        const clearSelectionWithHistory = () => {
            if (lassoPathRef.current && fabricRef.current) {
                fabricRef.current.remove(lassoPathRef.current);
                lassoPathRef.current = null;
                lassoPointsRef.current = null;
                selectionMaskDataRef.current = null;
                quickSelectMaskRef.current = null;
                fabricRef.current.requestRenderAll();
                onSelectionChange?.(null);
                return;
            }

            if (selectionRectRef.current && fabricRef.current && historyRef.current) {
                const action = new ClearSelectionAction(
                    fabricRef.current,
                    selectionRectRef.current,
                    handleSelectionChangeInternal
                );
                historyRef.current.execute(action);
            }
        };

        const getSelectionData = (): SelectionData | null => {
            if (!canvasRef.current || !fabricRef.current) return null;

            // Get canvas absolute position in viewport
            const canvasRect = canvasRef.current.getBoundingClientRect();

            if (lassoPathRef.current && lassoPointsRef.current && lassoPointsRef.current.length > 2) {
                const points = lassoPointsRef.current;
                let minX = points[0].x;
                let minY = points[0].y;
                let maxX = points[0].x;
                let maxY = points[0].y;

                for (let i = 1; i < points.length; i += 1) {
                    minX = Math.min(minX, points[i].x);
                    minY = Math.min(minY, points[i].y);
                    maxX = Math.max(maxX, points[i].x);
                    maxY = Math.max(maxY, points[i].y);
                }

                const bbox = lassoPathRef.current.getBoundingRect();
                return {
                    x: minX,
                    y: minY,
                    width: maxX - minX,
                    height: maxY - minY,
                    screenX: canvasRect.left + bbox.left,
                    screenY: canvasRect.top + bbox.top,
                    screenWidth: bbox.width,
                    screenHeight: bbox.height
                };
            }

            if (!selectionRectRef.current) return null;

            // Get selection bounding rect (in canvas coordinates, but accounting for zoom/pan?)
            // selection.getBoundingRect(true) returns coords in the canvas coordinate system including zoom/pan (viewport)
            // if absolute is false (default), it's in object's own transform?
            // Fabric v6: getBoundingRect() -> returns {left, top, width, height} in canvas coordinates.
            const boundingRect = selectionRectRef.current.getBoundingRect();

            return {
                x: selectionRectRef.current.left!,
                y: selectionRectRef.current.top!,
                width: selectionRectRef.current.width! * selectionRectRef.current.scaleX!,
                height: selectionRectRef.current.height! * selectionRectRef.current.scaleY!,
                screenX: canvasRect.left + boundingRect.left,
                screenY: canvasRect.top + boundingRect.top,
                screenWidth: boundingRect.width,
                screenHeight: boundingRect.height
            };
        };

        const undo = () => historyRef.current?.undo();
        const redo = () => historyRef.current?.redo();

        const getGenerationData = async (): Promise<{ image: string; mask: string } | null> => {
            if (!fabricRef.current || (!selectionRectRef.current && !lassoPointsRef.current)) return null;
            const image = fabricRef.current.toDataURL({ format: 'png', multiplier: 1 });

            // 2. Generate mask from current selection
            // We can reuse generateMaskData('selection') logic but we need to ensure it's black/white
            // Selection = White (Modify), Background = Black (Keep)
            const mask = await generateMaskData('selection');

            if (!image || !mask) return null;
            return { image, mask };
        };

        const crop = async (width: number, height: number, x: number, y: number) => {
            if (!fabricRef.current || !historyRef.current || !selectionRectRef.current) return;

            if (width <= 0 || height <= 0) {
                console.error("Invalid crop dimensions");
                return;
            }


            const canvas = fabricRef.current;
            const selection = selectionRectRef.current;

            // Active image we're cropping
            const activeImg = getActiveImageObject();

            // Capture OLD state
            const oldWidth = canvas.width!;
            const oldHeight = canvas.height!;
            const oldVpt = [...(canvas.viewportTransform || [1, 0, 0, 1, 0, 0])] as TMat2D;

            // Capture old document origin
            const oldDocOrigin = { ...documentOriginRef.current };

            // Calculate crop offset (how much we're cropping from the top-left)
            const cropOffsetX = x;
            const cropOffsetY = y;

            // Calculate new document origin (shift by crop offset)
            const newDocOrigin = {
                x: oldDocOrigin.x + cropOffsetX,
                y: oldDocOrigin.y + cropOffsetY
            };

            // Collect all objects (except selection) and their current positions for undo
            const objectPositions = canvas.getObjects()
                .filter(obj => obj !== selection)
                .map(obj => ({
                    object: obj,
                    left: obj.left || 0,
                    top: obj.top || 0
                }));

            // === PERFORM IMAGE CROP if we have an active image ===
            let newImg: FabricImage | null = null;
            let prevImg: FabricImage | null = null;

            if (activeImg) {
                prevImg = activeImg;

                // Temporarily hide all other objects so toDataURL captures only the
                // active image contents. Store visibility to restore later.
                const objs = canvas.getObjects().slice();
                const visibilityBackup = objs.map(o => ({ obj: o, visible: o.visible }));
                objs.forEach(o => {
                    if (o !== activeImg) o.visible = false;
                });

                // Generate cropped data URL from canvas coordinates
                const dataUrl = canvas.toDataURL({ format: 'png', left: x, top: y, width, height, multiplier: 1 });

                // Restore visibility
                visibilityBackup.forEach(b => b.obj.set({ visible: b.visible }));

                // Create new Fabric image from cropped data
                newImg = await FabricImage.fromURL(dataUrl) as FabricImage;
                newImg.set({ left: 0, top: 0, originX: 'left', originY: 'top' });
            }

            // DO NOT swap images here - CropAction.execute() handles the swap.
            // Just prepare the new image position for when execute() adds it.
            if (newImg) {
                newImg.set({ left: x, top: y, originX: 'left', originY: 'top' });
                newImg.selectable = activeToolRef.current === 'move';
                newImg.evented = activeToolRef.current === 'move';
            }

            // Keep viewport transform unchanged
            const newVpt = oldVpt;


            // Remove selection rect (CropAction.execute will also handle this,
            // but we clear the ref here so Canvas state is consistent)
            if (selectionRectRef.current) {
                // Don't remove from canvas here - CropAction.execute() does that
                selectionRectRef.current = null;
            }



            // === CREATE ACTION FOR Undo/Redo ===
            const action = new CropAction(
                canvas,
                oldVpt,
                newVpt,
                oldWidth,
                oldHeight,
                width,
                height,
                oldDocOrigin,
                newDocOrigin,
                objectPositions,
                cropOffsetX,
                cropOffsetY,
                (size: { width: number; height: number }) => setCanvasSize(size),
                (origin: { x: number; y: number }) => { documentOriginRef.current = origin; },
                selection,
                handleSelectionChangeInternal,
                getSelectionData,
                activeLayerIdRef.current,
                (layerId: string, img: FabricImage) => { layerMapRef.current.set(layerId, img); }
            );

            // Attach images so undo/redo will swap them as needed
            if (prevImg || newImg) {
                // @ts-ignore - CropAction exposes attachImages
                action.attachImages(prevImg, newImg);
            }

            historyRef.current.execute(action);
        };

        const applySemanticSelection = (query: string) => {
            if (!fabricRef.current) return;
            const normalized = query.trim().toLowerCase();
            const width = fabricRef.current.width || 0;
            const height = fabricRef.current.height || 0;
            if (!width || !height) return;

            const offscreen = document.createElement('canvas');
            offscreen.width = width;
            offscreen.height = height;
            const ctx = offscreen.getContext('2d');
            if (!ctx) return;

            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = '#fff';

            if (normalized.includes('background')) {
                ctx.fillRect(0, 0, width, height);
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath();
                ctx.ellipse(width / 2, height / 2, width * 0.26, height * 0.34, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (normalized.includes('entire') || normalized.includes('full image') || normalized.includes('whole image')) {
                ctx.fillRect(0, 0, width, height);
            } else if (normalized.includes('sky')) {
                ctx.fillRect(0, 0, width, Math.round(height * 0.45));
            } else if (normalized.includes('beard')) {
                ctx.beginPath();
                ctx.ellipse(width / 2, height * 0.68, width * 0.14, height * 0.1, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (normalized.includes('foreground') || normalized.includes('subject')) {
                ctx.beginPath();
                ctx.ellipse(width / 2, height / 2, width * 0.22, height * 0.32, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.ellipse(width / 2, height / 2, width * 0.2, height * 0.28, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            const dataUrl = offscreen.toDataURL('image/png');
            void updateSelectionFromMaskDataUrl(dataUrl);
        };

        const addImageLayerInternal = (
            url: string,
            name: string,
            aiData?: any,
            options?: AddImageLayerOptions
        ) => {
            if (!fabricRef.current || !containerRef.current) return;

            FabricImage.fromURL(url).then((img) => {
                if (!fabricRef.current || !containerRef.current) return;

                const canvas = fabricRef.current;
                const targetLeft = options?.left ?? 0;
                const targetTop = options?.top ?? 0;
                const blendMode = options?.blendMode ?? 'normal';

                img.set({
                    left: targetLeft,
                    top: targetTop,
                    originX: 'left',
                    originY: 'top',
                    selectable: activeToolRef.current === 'move',
                    evented: activeToolRef.current === 'move',
                    globalCompositeOperation: blendMode as GlobalCompositeOperation
                });

                const layerSnapshot: Layer = {
                    id: crypto.randomUUID(),
                    type: options?.layerType ?? 'image',
                    name,
                    visible: true,
                    locked: false,
                    opacity: 1,
                    fillOpacity: 1,
                    blendMode,
                    smartObject: options?.smartObject ?? false,
                    linkedAsset: options?.linkedAsset ?? false,
                    externalSrc: options?.externalSrc,
                    aiData
                };

                const addWithoutHistory = () => {
                    insertLayer(layerSnapshot, 0);
                    layerMapRef.current.set(layerSnapshot.id, img);
                    canvas.add(img);
                    canvas.requestRenderAll();
                    setActiveLayer(layerSnapshot.id);
                    generateThumbnail(img, layerSnapshot.id);
                };

                if (!options?.addToHistory || !historyRef.current) {
                    addWithoutHistory();
                    return;
                }

                const action: Action = {
                    execute: () => {
                        insertLayer(layerSnapshot, 0);
                        layerMapRef.current.set(layerSnapshot.id, img);
                        if (!canvas.getObjects().includes(img)) {
                            canvas.add(img);
                        }
                        setActiveLayer(layerSnapshot.id);
                        generateThumbnail(img, layerSnapshot.id);
                        canvas.requestRenderAll();
                    },
                    undo: () => {
                        canvas.remove(img);
                        layerMapRef.current.delete(layerSnapshot.id);
                        removeLayer(layerSnapshot.id);
                        canvas.requestRenderAll();
                    }
                };

                historyRef.current.execute(action);
            });
        };

        const buildProjectPayload = () => {
            if (!fabricRef.current) return null;
            return {
                version: 1,
                exportedAt: new Date().toISOString(),
                canvas: {
                    width: fabricRef.current.width || 0,
                    height: fabricRef.current.height || 0
                },
                preview: fabricRef.current.toDataURL({ format: 'png', multiplier: 1 }),
                layers: layers.map((layer) => {
                    const obj = layerMapRef.current.get(layer.id);
                    const element = obj?.getElement() as HTMLImageElement | HTMLCanvasElement | undefined;
                    let image: string | null = null;
                    if (element) {
                        const off = document.createElement('canvas');
                        const w = obj?.width ? Math.max(1, Math.round(obj.width * (obj.scaleX || 1))) : (element.width || 1);
                        const h = obj?.height ? Math.max(1, Math.round(obj.height * (obj.scaleY || 1))) : (element.height || 1);
                        off.width = w;
                        off.height = h;
                        const ctx = off.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(element as CanvasImageSource, 0, 0, w, h);
                            image = off.toDataURL('image/png');
                        }
                    }

                    return {
                        ...layer,
                        image,
                        transform: obj
                            ? {
                                left: obj.left ?? 0,
                                top: obj.top ?? 0,
                                scaleX: obj.scaleX ?? 1,
                                scaleY: obj.scaleY ?? 1,
                                angle: obj.angle ?? 0
                            }
                            : null
                    };
                })
            };
        };

        const loadProjectPayload = async (payload: any) => {
            if (!fabricRef.current || !payload?.layers) return;
            const canvas = fabricRef.current;
            const parsedLayers = Array.isArray(payload.layers) ? payload.layers : [];

            canvas.clear();
            canvas.backgroundColor = "#f4f4f5";
            layerMapRef.current.clear();
            selectionRectRef.current = null;
            lassoPathRef.current = null;
            lassoPointsRef.current = null;
            selectionMaskDataRef.current = null;

            const storeLayers: Layer[] = parsedLayers.map((layer: any) => {
                const { image, transform, ...rest } = layer || {};
                return {
                    visible: true,
                    locked: false,
                    opacity: 1,
                    blendMode: 'normal',
                    ...rest
                } as Layer;
            });

            setLayers(storeLayers);
            if (storeLayers.length > 0) {
                setActiveLayer(storeLayers[0].id);
            } else {
                setActiveLayer(null);
            }

            for (let i = parsedLayers.length - 1; i >= 0; i -= 1) {
                const layer = parsedLayers[i];
                if (!layer?.id || !layer?.image) continue;
                try {
                    const img = await FabricImage.fromURL(layer.image);
                    img.set({
                        left: Number(layer?.transform?.left ?? 0),
                        top: Number(layer?.transform?.top ?? 0),
                        scaleX: Number(layer?.transform?.scaleX ?? 1),
                        scaleY: Number(layer?.transform?.scaleY ?? 1),
                        angle: Number(layer?.transform?.angle ?? 0),
                        originX: 'left',
                        originY: 'top',
                        selectable: activeToolRef.current === 'move',
                        evented: activeToolRef.current === 'move',
                        opacity: Number(layer?.opacity ?? 1),
                        visible: layer?.visible !== false
                    });
                    layerMapRef.current.set(layer.id, img);
                    canvas.add(img);
                } catch (error) {
                    console.warn('[Canvas] Failed to load layer image from payload', error);
                }
            }

            canvas.requestRenderAll();
            onSelectionChange?.(null);
        };

        useImperativeHandle(ref, () => ({
            uploadImage: handleImageUpload,
            addImageLayer: (url: string, name: string, aiData?: any, options?: AddImageLayerOptions) =>
                addImageLayerInternal(url, name, aiData, options),
            getSelection: getSelectionData,
            setSelectionRect: (bounds: { x: number; y: number; width: number; height: number }) => {
                const canvas = fabricRef.current;
                if (!canvas) return;

                if (selectionRectRef.current) {
                    canvas.remove(selectionRectRef.current);
                    selectionRectRef.current = null;
                }
                if (lassoPathRef.current) {
                    canvas.remove(lassoPathRef.current);
                    lassoPathRef.current = null;
                }

                const rect = new Rect({
                    left: bounds.x,
                    top: bounds.y,
                    width: Math.max(1, bounds.width),
                    height: Math.max(1, bounds.height),
                    fill: "rgba(68, 138, 255, 0.1)",
                    stroke: "#448AFF",
                    strokeWidth: 2,
                    strokeDashArray: [5, 5],
                    selectable: true,
                    hasControls: true,
                    hasBorders: true,
                    lockRotation: true,
                });

                selectionRectRef.current = rect;
                selectionMaskDataRef.current = null;
                canvas.add(rect);
                canvas.bringObjectToFront(rect);
                canvas.requestRenderAll();
                onSelectionChange?.(getSelectionData());
            },
            clearSelection: clearSelectionWithHistory,
            createMask: createMaskFromSelection,
            invertMask: invertMask,
            featherMask: featherMask,
            crop: crop,
            getGenerationData: getGenerationData,
            getCanvasSnapshot: () => {
                if (!fabricRef.current) return null;
                return fabricRef.current.toDataURL({ format: 'png', multiplier: 1 });
            },
            exportCanvas: (format: 'png' | 'jpeg' | 'webp' | 'svg' = 'png', quality = 0.92) => {
                if (!fabricRef.current) return;
                const canvas = fabricRef.current;
                // Hide selection rect temporarily for clean export
                const selRect = selectionRectRef.current;
                if (selRect) selRect.visible = false;
                canvas.renderAll();

                let dataUrl = '';
                if (format === 'svg') {
                    const svg = canvas.toSVG();
                    dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
                } else {
                    dataUrl = canvas.toDataURL({
                        format: format as any,
                        multiplier: window.devicePixelRatio || 1,
                        quality: format === 'png' ? undefined : quality
                    });
                }

                // Restore selection visibility
                if (selRect) {
                    selRect.visible = true;
                    canvas.renderAll();
                }

                // Trigger download
                const link = document.createElement('a');
                link.download = `zerothlayer-export.${format}`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            },
            exportActiveLayer: (format: 'png' | 'jpeg' | 'webp' | 'svg' = 'png', quality = 0.9) => {
                const active = getActiveImageObject();
                if (!active) return;
                const el = active.getElement() as HTMLImageElement | HTMLCanvasElement;
                if (!el) return;

                const offscreen = document.createElement('canvas');
                const width = active.width ? Math.max(1, Math.round(active.width * (active.scaleX || 1))) : (el.width || 1);
                const height = active.height ? Math.max(1, Math.round(active.height * (active.scaleY || 1))) : (el.height || 1);
                offscreen.width = width;
                offscreen.height = height;
                const ctx = offscreen.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(el as CanvasImageSource, 0, 0, width, height);

                const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
                const dataUrl = format === 'svg'
                    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
                        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><image href="${offscreen.toDataURL('image/png')}" width="${width}" height="${height}" /></svg>`
                    )}`
                    : offscreen.toDataURL(mime, quality);
                const link = document.createElement('a');
                link.download = `zerothlayer-layer-${activeLayerIdRef.current || 'export'}.${format}`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            },
            exportProjectWithLayers: () => {
                const payload = buildProjectPayload();
                if (!payload) return;

                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `zerothlayer-project-${Date.now()}.zlayer`;
                link.href = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            },
            getProjectPayload: () => buildProjectPayload(),
            loadProjectPayload: async (payload: any) => {
                await loadProjectPayload(payload);
            },
            clearCanvas: () => {
                if (!fabricRef.current) return;
                fabricRef.current.clear();
                fabricRef.current.backgroundColor = "#f4f4f5";
                fabricRef.current.requestRenderAll();
                layerMapRef.current.clear();
                setLayers([]);
                setActiveLayer(null);
                selectionRectRef.current = null;
                lassoPathRef.current = null;
                lassoPointsRef.current = null;
                selectionMaskDataRef.current = null;
                onSelectionChange?.(null);
            },
            getHistoryInfo: () => {
                const entries = historyRef.current?.getEntries() || { undo: [], redo: [] };
                return {
                    undo: entries.undo,
                    redo: entries.redo,
                    canUndo: historyRef.current?.canUndo() ?? false,
                    canRedo: historyRef.current?.canRedo() ?? false
                };
            },
            getViewState: () => {
                const canvas = fabricRef.current;
                if (!canvas) return { zoom: 1, panX: 0, panY: 0 };
                const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
                return {
                    zoom: canvas.getZoom(),
                    panX: vpt[4] || 0,
                    panY: vpt[5] || 0
                };
            },
            getCanvasDimensions: () => {
                const canvas = fabricRef.current;
                if (!canvas) return { width: 0, height: 0 };
                return {
                    width: canvas.getWidth(),
                    height: canvas.getHeight()
                };
            },
            setZoom: (zoom: number) => {
                const canvas = fabricRef.current;
                if (!canvas) return;
                const target = Math.max(0.1, Math.min(8, zoom));
                const center = canvas.getCenterPoint();
                canvas.zoomToPoint(center, target);
                canvas.requestRenderAll();
            },
            panBy: (dx: number, dy: number) => {
                const canvas = fabricRef.current;
                if (!canvas) return;
                const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
                vpt[4] += dx;
                vpt[5] += dy;
                canvas.setViewportTransform(vpt);
                canvas.requestRenderAll();
            },
            resetView: () => {
                const canvas = fabricRef.current;
                if (!canvas) return;
                canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
                canvas.requestRenderAll();
            },
            transformActiveLayer: (opts: { scaleX?: number; scaleY?: number; angle?: number; skewX?: number; skewY?: number }) => {
                const canvas = fabricRef.current;
                const active = getActiveImageObject();
                if (!canvas || !active) return;
                if (opts.scaleX !== undefined) active.scaleX = Math.max(0.05, active.scaleX! * opts.scaleX);
                if (opts.scaleY !== undefined) active.scaleY = Math.max(0.05, active.scaleY! * opts.scaleY);
                if (opts.angle !== undefined) active.angle = (active.angle || 0) + opts.angle;
                if (opts.skewX !== undefined) active.skewX = (active.skewX || 0) + opts.skewX;
                if (opts.skewY !== undefined) active.skewY = (active.skewY || 0) + opts.skewY;
                active.setCoords();
                canvas.requestRenderAll();
            },
            alignActiveLayer: (mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
                const canvas = fabricRef.current;
                const active = getActiveImageObject();
                if (!canvas || !active) return;
                const cw = canvas.getWidth();
                const ch = canvas.getHeight();
                const bw = (active.width || 0) * (active.scaleX || 1);
                const bh = (active.height || 0) * (active.scaleY || 1);
                if (mode === 'left') active.left = 0;
                if (mode === 'center') active.left = (cw - bw) / 2;
                if (mode === 'right') active.left = cw - bw;
                if (mode === 'top') active.top = 0;
                if (mode === 'middle') active.top = (ch - bh) / 2;
                if (mode === 'bottom') active.top = ch - bh;
                active.setCoords();
                canvas.requestRenderAll();
            },
            replaceActiveLayerContents: async (url: string, name?: string) => {
                const canvas = fabricRef.current;
                const activeLayerId = activeLayerIdRef.current;
                if (!canvas || !activeLayerId) return;
                const existing = layerMapRef.current.get(activeLayerId);
                if (!existing) return;
                const previous = {
                    left: existing.left ?? 0,
                    top: existing.top ?? 0,
                    scaleX: existing.scaleX ?? 1,
                    scaleY: existing.scaleY ?? 1,
                    angle: existing.angle ?? 0,
                    opacity: existing.opacity ?? 1,
                    visible: existing.visible ?? true,
                    blend: (existing as any).globalCompositeOperation ?? 'normal'
                };
                const replacement = await FabricImage.fromURL(url);
                replacement.set({
                    left: previous.left,
                    top: previous.top,
                    scaleX: previous.scaleX,
                    scaleY: previous.scaleY,
                    angle: previous.angle,
                    opacity: previous.opacity,
                    visible: previous.visible,
                    originX: 'left',
                    originY: 'top',
                    selectable: activeToolRef.current === 'move',
                    evented: activeToolRef.current === 'move',
                    globalCompositeOperation: previous.blend as GlobalCompositeOperation
                });
                canvas.remove(existing);
                canvas.add(replacement);
                layerMapRef.current.set(activeLayerId, replacement);
                if (name) updateLayer(activeLayerId, { name });
                generateThumbnail(replacement, activeLayerId);
                canvas.requestRenderAll();
            },
            applySemanticSelection: (query: string) => applySemanticSelection(query),
            applySemanticMask: (maskDataUrl: string) => {
                void updateSelectionFromMaskDataUrl(maskDataUrl);
            },
            undo: undo,
            redo: redo,
            canUndo: () => historyRef.current?.canUndo() ?? false,
            canRedo: () => historyRef.current?.canRedo() ?? false
        }));

        return (
            <div ref={containerRef} className="h-full w-full bg-zinc-100 dark:bg-[#09090b] overflow-hidden relative flex items-center justify-center">
                <canvas ref={canvasRef} />
                {layers.length === 0 && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-50">
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-50 dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800">
                            <div className="text-4xl opacity-70">✦</div>
                        </div>
                        <div className="text-center space-y-1">
                            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-200 tracking-tight">
                                Canvas is Empty
                            </h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-500">
                                Drag and drop or upload an image
                            </p>
                        </div>
                    </div>
                )}
            </div>
        );
    }
);

Canvas.displayName = "Canvas";

export default Canvas;
