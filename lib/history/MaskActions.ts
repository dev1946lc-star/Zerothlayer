import { Action } from "./HistoryManager";

export class SetMaskAction implements Action {
    private layerId: string;
    private oldMaskData: string | null;
    private newMaskData: string | null;
    private setLayerMask: (id: string, data: string | null) => void;

    constructor(
        layerId: string,
        oldMaskData: string | undefined, // undefined if no mask existed
        newMaskData: string | null, // null if deleting
        setLayerMask: (id: string, data: string | null) => void
    ) {
        this.layerId = layerId;
        this.oldMaskData = oldMaskData || null;
        this.newMaskData = newMaskData;
        this.setLayerMask = setLayerMask;
    }

    execute(): void {
        this.setLayerMask(this.layerId, this.newMaskData);
    }

    undo(): void {
        this.setLayerMask(this.layerId, this.oldMaskData);
    }
}

export class ToggleMaskAction implements Action {
    private layerId: string;
    private toggleLayerMask: (id: string) => void;

    constructor(
        layerId: string,
        toggleLayerMask: (id: string) => void
    ) {
        this.layerId = layerId;
        this.toggleLayerMask = toggleLayerMask;
    }

    execute(): void {
        this.toggleLayerMask(this.layerId);
    }

    undo(): void {
        this.toggleLayerMask(this.layerId);
    }
}
