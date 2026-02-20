import { Canvas as FabricCanvas, FabricImage, Rect } from "fabric";
import { Action } from "./HistoryManager";
import { SelectionData } from "@/components/Canvas";

/**
 * Command: Upload Image
 * Records image upload and allows undo to previous image
 */
export class UploadImageAction implements Action {
    private canvas: FabricCanvas;
    private previousImage: FabricImage | null;
    private previousSelection: Rect | null;
    private newImage: FabricImage;
    private onImageChange: (img: FabricImage | null) => void;
    private onSelectionChange: (sel: Rect | null) => void;

    constructor(
        canvas: FabricCanvas,
        previousImage: FabricImage | null,
        previousSelection: Rect | null,
        newImage: FabricImage,
        onImageChange: (img: FabricImage | null) => void,
        onSelectionChange: (sel: Rect | null) => void
    ) {
        this.canvas = canvas;
        this.previousImage = previousImage;
        this.previousSelection = previousSelection;
        this.newImage = newImage;
        this.onImageChange = onImageChange;
        this.onSelectionChange = onSelectionChange;
    }

    execute(): void {
        this.canvas.clear();
        this.canvas.backgroundColor = "#f4f4f5";
        this.canvas.add(this.newImage);
        this.canvas.renderAll();
        this.onImageChange(this.newImage);
        this.onSelectionChange(null);
    }

    undo(): void {
        this.canvas.clear();
        this.canvas.backgroundColor = "#f4f4f5";

        if (this.previousImage) {
            this.canvas.add(this.previousImage);
            if (this.previousSelection) {
                this.canvas.add(this.previousSelection);
            }
            this.onImageChange(this.previousImage);
            this.onSelectionChange(this.previousSelection);
        } else {
            this.onImageChange(null);
            this.onSelectionChange(null);
        }

        this.canvas.renderAll();
    }
}

/**
 * Command: Create Selection
 */
export class CreateSelectionAction implements Action {
    private canvas: FabricCanvas;
    private selection: Rect;
    private previousSelection: Rect | null;
    private onSelectionChange: (sel: Rect | null, data: SelectionData | null) => void;
    private getSelectionData: () => SelectionData | null;

    constructor(
        canvas: FabricCanvas,
        selection: Rect,
        previousSelection: Rect | null,
        onSelectionChange: (sel: Rect | null, data: SelectionData | null) => void,
        getSelectionData: () => SelectionData | null
    ) {
        this.canvas = canvas;
        this.selection = selection;
        this.previousSelection = previousSelection;
        this.onSelectionChange = onSelectionChange;
        this.getSelectionData = getSelectionData;
    }

    execute(): void {
        if (this.previousSelection) {
            this.canvas.remove(this.previousSelection);
        }
        this.canvas.add(this.selection);
        this.canvas.renderAll();
        this.onSelectionChange(this.selection, this.getSelectionData());
    }

    undo(): void {
        this.canvas.remove(this.selection);
        if (this.previousSelection) {
            this.canvas.add(this.previousSelection);
            this.onSelectionChange(this.previousSelection, this.getSelectionData());
        } else {
            this.onSelectionChange(null, null);
        }
        this.canvas.renderAll();
    }
}

/**
 * Command: Modify Selection (Move or Resize)
 */
export class ModifySelectionAction implements Action {
    private selection: Rect;
    private previousState: {
        left: number;
        top: number;
        scaleX: number;
        scaleY: number;
        width: number;
        height: number;
    };
    private newState: {
        left: number;
        top: number;
        scaleX: number;
        scaleY: number;
        width: number;
        height: number;
    };
    private canvas: FabricCanvas;
    private onSelectionChange: (sel: Rect | null, data: SelectionData | null) => void;
    private getSelectionData: () => SelectionData | null;

    constructor(
        canvas: FabricCanvas,
        selection: Rect,
        previousState: {
            left: number;
            top: number;
            scaleX: number;
            scaleY: number;
            width: number;
            height: number;
        },
        newState: {
            left: number;
            top: number;
            scaleX: number;
            scaleY: number;
            width: number;
            height: number;
        },
        onSelectionChange: (sel: Rect | null, data: SelectionData | null) => void,
        getSelectionData: () => SelectionData | null
    ) {
        this.canvas = canvas;
        this.selection = selection;
        this.previousState = previousState;
        this.newState = newState;
        this.onSelectionChange = onSelectionChange;
        this.getSelectionData = getSelectionData;
    }

    execute(): void {
        this.selection.set(this.newState);
        this.selection.setCoords();
        this.canvas.renderAll();
        this.onSelectionChange(this.selection, this.getSelectionData());
    }

    undo(): void {
        this.selection.set(this.previousState);
        this.selection.setCoords();
        this.canvas.renderAll();
        this.onSelectionChange(this.selection, this.getSelectionData());
    }
}

/**
 * Command: Clear Selection
 */
export class ClearSelectionAction implements Action {
    private canvas: FabricCanvas;
    private selection: Rect;
    private onSelectionChange: (sel: Rect | null, data: SelectionData | null) => void;

    constructor(
        canvas: FabricCanvas,
        selection: Rect,
        onSelectionChange: (sel: Rect | null, data: SelectionData | null) => void
    ) {
        this.canvas = canvas;
        this.selection = selection;
        this.onSelectionChange = onSelectionChange;
    }

    execute(): void {
        this.canvas.remove(this.selection);
        this.canvas.renderAll();
        this.onSelectionChange(null, null);
    }

    undo(): void {
        this.canvas.add(this.selection);
        this.canvas.renderAll();
        // Need to get selection data - pass null for now as it will be recalculated
        this.onSelectionChange(this.selection, null);
    }
}
