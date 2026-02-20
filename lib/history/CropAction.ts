import { Canvas as FabricCanvas, Rect, TMat2D, FabricObject, Image as FabricImage } from "fabric";
import { Action } from "./HistoryManager";
import { SelectionData } from "@/components/Canvas";

/**
 * Document Origin: The single source of truth for coordinate anchoring.
 * All viewport transforms are computed deterministically from this origin.
 */
export interface DocumentOrigin {
    x: number;
    y: number;
}

/**
 * Stored object data for undo/redo
 */
export interface ObjectPositionData {
    object: FabricObject;
    left: number;
    top: number;
}

export class CropAction implements Action {
    private canvas: FabricCanvas;

    // Viewport state (TMat2D is [scaleX, skewY, skewX, scaleY, translateX, translateY])
    private oldViewportTransform: TMat2D;
    private newViewportTransform: TMat2D;

    // Canvas dimensions
    private oldWidth: number;
    private oldHeight: number;
    private newWidth: number;
    private newHeight: number;

    // Document origin (world coordinates) - the authoritative anchor
    private oldDocOrigin: DocumentOrigin;
    private newDocOrigin: DocumentOrigin;

    // Object positions for undo/redo
    private objectPositions: ObjectPositionData[];
    private cropOffsetX: number;
    private cropOffsetY: number;
    // Image swap for crop (previous image replaced by cropped image)
    private previousImage: FabricImage | null;
    private newImage: FabricImage | null;

    // Layer map management
    private activeLayerId: string | null;
    private updateLayerMap: (layerId: string, img: FabricImage) => void;

    // Callbacks
    private setCanvasSize: (size: { width: number; height: number }) => void;
    private setDocumentOrigin: (origin: DocumentOrigin) => void;

    // Selection handling
    private selection: Rect;
    private onSelectionChange: (sel: Rect | null, data: SelectionData | null) => void;
    private getSelectionData: () => SelectionData | null;

    constructor(
        canvas: FabricCanvas,
        oldViewportTransform: TMat2D,
        newViewportTransform: TMat2D,
        oldWidth: number,
        oldHeight: number,
        newWidth: number,
        newHeight: number,
        oldDocOrigin: DocumentOrigin,
        newDocOrigin: DocumentOrigin,
        objectPositions: ObjectPositionData[],
        cropOffsetX: number,
        cropOffsetY: number,
        setCanvasSize: (size: { width: number; height: number }) => void,
        setDocumentOrigin: (origin: DocumentOrigin) => void,
        selection: Rect,
        onSelectionChange: (sel: Rect | null, data: SelectionData | null) => void,
        getSelectionData: () => SelectionData | null,
        activeLayerId: string | null,
        updateLayerMap: (layerId: string, img: FabricImage) => void
    ) {
        this.canvas = canvas;
        // Clone arrays as TMat2D tuples to prevent mutation
        this.oldViewportTransform = [...oldViewportTransform] as TMat2D;
        this.newViewportTransform = [...newViewportTransform] as TMat2D;
        this.oldWidth = oldWidth;
        this.oldHeight = oldHeight;
        this.newWidth = newWidth;
        this.newHeight = newHeight;
        this.oldDocOrigin = { ...oldDocOrigin };
        this.newDocOrigin = { ...newDocOrigin };
        this.objectPositions = objectPositions;
        this.cropOffsetX = cropOffsetX;
        this.cropOffsetY = cropOffsetY;
        this.setCanvasSize = setCanvasSize;
        this.setDocumentOrigin = setDocumentOrigin;
        this.selection = selection;
        this.onSelectionChange = onSelectionChange;
        this.getSelectionData = getSelectionData;
        this.activeLayerId = activeLayerId;
        this.updateLayerMap = updateLayerMap;
        this.previousImage = null;
        this.newImage = null;
    }

    // Allow attaching image swap info after construction (optional)
    attachImages(prev: FabricImage | null, next: FabricImage | null) {
        this.previousImage = prev;
        this.newImage = next;
    }

    execute(): void {
        // 1. Clear selection
        try { this.canvas.remove(this.selection); } catch (e) { }
        this.onSelectionChange(null, null);

        // 2. Swap images: remove old, add new
        if (this.previousImage && this.newImage) {
            try {
                this.canvas.remove(this.previousImage);
            } catch (e) { }
            this.canvas.add(this.newImage);
            // Update layer map so the layer points to the new image
            if (this.activeLayerId) {
                this.updateLayerMap(this.activeLayerId, this.newImage);
            }
        }

        // 3. Update rendering
        this.canvas.calcOffset();
        this.canvas.requestRenderAll();
    }

    undo(): void {
        // 1. Swap images back: remove new (cropped), add old (original)
        if (this.previousImage && this.newImage) {
            try {
                this.canvas.remove(this.newImage);
            } catch (e) { }
            this.canvas.add(this.previousImage);
            // Restore layer map to point to original image
            if (this.activeLayerId) {
                this.updateLayerMap(this.activeLayerId, this.previousImage);
            }
        }

        // 2. Restore selection
        this.canvas.add(this.selection);
        this.selection.setCoords();
        const selData = {
            x: this.selection.left || 0,
            y: this.selection.top || 0,
            width: (this.selection.width || 0) * (this.selection.scaleX || 1),
            height: (this.selection.height || 0) * (this.selection.scaleY || 1)
        };
        this.onSelectionChange(this.selection, selData);

        // 3. Update rendering
        this.canvas.calcOffset();
        this.canvas.requestRenderAll();
    }
}
