/**
 * Command Pattern Interface
 * Every user action implements this interface
 */
export interface Action {
    execute(): void;
    undo(): void;
}

/**
 * History Manager
 * Manages undo and redo stacks
 */
export class HistoryManager {
    private undoStack: Action[] = [];
    private redoStack: Action[] = [];
    private maxHistorySize: number;
    private onHistoryChange?: () => void;

    constructor(maxHistorySize: number = 50, onHistoryChange?: () => void) {
        this.maxHistorySize = maxHistorySize;
        this.onHistoryChange = onHistoryChange;
    }

    /**
     * Execute and record an action
     */
    execute(action: Action): void {
        action.execute();
        this.undoStack.push(action);

        // Limit stack size
        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }

        // Clear redo stack when new action is executed
        this.redoStack = [];

        this.notifyChange();
    }

    /**
     * Undo the last action
     */
    undo(): void {
        const action = this.undoStack.pop();
        if (action) {
            action.undo();
            this.redoStack.push(action);
            this.notifyChange();
        }
    }

    /**
     * Redo the last undone action
     */
    redo(): void {
        const action = this.redoStack.pop();
        if (action) {
            action.execute();
            this.undoStack.push(action);
            this.notifyChange();
        }
    }

    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    /**
     * Check if redo is available
     */
    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    /**
     * Clear all history
     */
    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
        this.notifyChange();
    }

    /**
     * Get history state for debugging
     */
    getState(): { undoCount: number; redoCount: number } {
        return {
            undoCount: this.undoStack.length,
            redoCount: this.redoStack.length,
        };
    }

    private notifyChange(): void {
        this.onHistoryChange?.();
    }
}
