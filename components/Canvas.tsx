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
    CreateSelectionAction,
    ModifySelectionAction,
    ClearSelectionAction,
    CropAction, // Import CropAction
} from "@/lib/history";
import { SetMaskAction } from "@/lib/history/MaskActions"; // Direct import to avoid index issues
import { useLayerStore } from "@/lib/store";

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
    addImageLayer: (url: string, name: string) => void;
    getSelection: () => SelectionData | null;
    clearSelection: () => void;
    createMask: () => void;
    invertMask: () => void;
    featherMask: (amount: number) => void;
    crop: (width: number, height: number, x: number, y: number) => void;
    getGenerationData: () => Promise<{ image: string; mask: string } | null>;
    exportCanvas: (format?: 'png' | 'jpeg' | 'webp') => void;
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
}



interface CanvasProps {
    onSelectionChange?: (selection: SelectionData | null) => void;
    onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
}

type ActiveTool = 'move' | 'select' | 'crop';

const Canvas = forwardRef<CanvasHandle, CanvasProps>(
    ({ onSelectionChange, onHistoryChange }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const fabricRef = useRef<FabricCanvas | null>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const selectionRectRef = useRef<Rect | null>(null);
        const historyRef = useRef<HistoryManager | null>(null);

        const { layers, addLayer, setLayerMask, updateLayer, activeLayerId, setActiveLayer, activeTool, maskPreviewMode, setLayerThumbnail } = useLayerStore();

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

                    // Animate drawing selection (temp rect)
                    const temp = (fabricRef.current as any)._tempSelection?.rect;
                    if (temp) {
                        temp.set('strokeDashOffset', -offset);
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

            if (fabricRef.current) {
                fabricRef.current.forEachObject((obj) => {
                    if (obj === selectionRectRef.current) return;
                    obj.selectable = activeTool === 'move';
                    obj.evented = activeTool === 'move';
                });
                fabricRef.current.requestRenderAll();
            }
        }, [activeTool]);

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

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === "Escape") {
                    clearSelectionWithHistory();
                } else if (e.ctrlKey && (e.key === "y" || e.key === "Y")) {
                    e.preventDefault();
                    redo();
                } else if (e.ctrlKey && e.shiftKey && e.key === "Z") {
                    e.preventDefault();
                    redo();
                } else if (e.ctrlKey && e.key === "z") {
                    e.preventDefault();
                    undo();
                }
            };

            window.addEventListener("keydown", handleKeyDown);

            setupSelectionInteraction(canvas);

            return () => {
                resizeObserver.disconnect();
                window.removeEventListener("keydown", handleKeyDown);
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
                        if (obj.opacity !== layer.opacity) obj.opacity = layer.opacity;
                        if ((obj as any).globalCompositeOperation !== layer.blendMode) {
                            (obj as any).globalCompositeOperation = layer.blendMode;
                        }

                        if (layer.mask && layer.mask.visible) {
                            if (!(obj as any)._hasMaskApplied) {
                                const maskImg = await FabricImage.fromURL(layer.mask.dataUrl);
                                maskImg.originX = 'center';
                                maskImg.originY = 'center';
                                obj.clipPath = maskImg;
                                (obj as any)._hasMaskApplied = true;
                            }
                        } else {
                            obj.clipPath = undefined;
                            (obj as any)._hasMaskApplied = false;
                        }

                        // Ensure object follows tool mode
                        obj.selectable = activeToolRef.current === 'move';
                        obj.evented = activeToolRef.current === 'move';

                        canvas.bringObjectToFront(obj);
                    }
                }

                if (selectionRectRef.current) {
                    canvas.bringObjectToFront(selectionRectRef.current);
                }

                canvas.requestRenderAll();
            };

            processLayers();

        }, [layers]);


        const getActiveImageObject = (): FabricImage | null => {
            if (!activeLayerIdRef.current) return null;
            return layerMapRef.current.get(activeLayerIdRef.current) || null;
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
                        const selection = selectionRectRef.current;
                        if (!selection) return null;

                        ctx.fillStyle = '#FFFFFF';
                        if (options.featherAmount) {
                            ctx.filter = `blur(${options.featherAmount}px)`;
                        }

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
                // Silently fail — thumbnail is optional
            }
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
            let startX = 0;
            let startY = 0;

            canvas.on("mouse:down", (options) => {
                if (activeToolRef.current !== 'select' && activeToolRef.current !== 'crop') return;

                const activeImg = getActiveImageObject();
                if (!activeImg) return;

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
            onSelectionChange?.(data);
        };

        const clearSelectionWithHistory = () => {
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
            if (!selectionRectRef.current || !canvasRef.current || !fabricRef.current) return null;

            // Get canvas absolute position in viewport
            const canvasRect = canvasRef.current.getBoundingClientRect();

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
            if (!fabricRef.current || !selectionRectRef.current) return null;
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

            console.log("=== CROP DEBUG ===");
            console.log("Input:", { width, height, x, y });

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

            // DO NOT swap images here — CropAction.execute() handles the swap.
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
                // Don't remove from canvas here — CropAction.execute() does that
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
            console.log("Crop completed. selection-sized image created at", { x, y, width, height });
        };

        useImperativeHandle(ref, () => ({
            uploadImage: handleImageUpload,
            addImageLayer: (url: string, name: string) => {
                if (!fabricRef.current || !containerRef.current) return;
                FabricImage.fromURL(url).then((img) => {
                    if (!fabricRef.current || !containerRef.current) return;

                    // We don't center/scale generated images by default as they should match canvas size
                    img.set({ left: 0, top: 0 });

                    const layerId = addLayer({
                        name: name,
                        type: 'image',
                    });

                    layerMapRef.current.set(layerId, img);
                    fabricRef.current.add(img);

                    img.selectable = activeToolRef.current === 'move';
                    img.evented = activeToolRef.current === 'move';

                    setActiveLayer(layerId);
                    fabricRef.current.renderAll();

                    // Generate thumbnail for the layer panel
                    generateThumbnail(img, layerId);
                });
            },
            getSelection: getSelectionData,
            clearSelection: clearSelectionWithHistory,
            createMask: createMaskFromSelection,
            invertMask: invertMask,
            featherMask: featherMask,
            crop: crop,
            getGenerationData: getGenerationData,
            exportCanvas: (format: 'png' | 'jpeg' | 'webp' = 'png') => {
                if (!fabricRef.current) return;
                const canvas = fabricRef.current;
                // Hide selection rect temporarily for clean export
                const selRect = selectionRectRef.current;
                if (selRect) selRect.visible = false;
                canvas.renderAll();

                const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
                const dataUrl = canvas.toDataURL({ format: format as any, multiplier: window.devicePixelRatio || 1 });

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
                            <div className="text-4xl grayscale opacity-50">✦</div>
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
