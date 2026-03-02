"use client";

import { Link2, PenTool, Plus, Shapes, Type, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type PathMode = "add" | "subtract" | "intersect";

export interface PathNode {
  x: number;
  y: number;
  inX: number;
  inY: number;
  outX: number;
  outY: number;
  corner: boolean;
}

export interface PathItem {
  id: string;
  name: string;
  visible: boolean;
  kind: "work" | "selection" | "shape" | "pen" | "curvature";
  bounds?: { x: number; y: number; width: number; height: number };
  closed?: boolean;
  nodes?: PathNode[];
}

interface PathsPanelProps {
  className?: string;
  style?: React.CSSProperties;
  paths: PathItem[];
  activePathId: string | null;
  mode: PathMode;
  canEdit: boolean;
  hasSelection: boolean;
  onSetMode: (mode: PathMode) => void;
  onCreatePath: (kind: PathItem["kind"]) => void;
  onCreateFromSelection: () => void;
  onLoadAsSelection: (pathId: string) => void;
  onToggleVisible: (pathId: string, visible: boolean) => void;
  onRename: (pathId: string, name: string) => void;
  onDelete: (pathId: string) => void;
  onSelectPath: (pathId: string) => void;
  onCreateShapeFromSelection: () => void;
  onTextOnPath: () => void;
  onApplyOperation: () => void;
}

export default function PathsPanel({
  className,
  style,
  paths,
  activePathId,
  mode,
  canEdit,
  hasSelection,
  onSetMode,
  onCreatePath,
  onCreateFromSelection,
  onLoadAsSelection,
  onToggleVisible,
  onRename,
  onDelete,
  onSelectPath,
  onCreateShapeFromSelection,
  onTextOnPath,
  onApplyOperation,
}: PathsPanelProps) {
  return (
    <div className={cn("flex h-full flex-col overflow-hidden border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900", className)} style={style}>
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <Link2 className="h-4 w-4" />
          Paths
        </h3>
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {paths.length}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Path Operations</div>
          <div className="grid grid-cols-3 gap-1">
            {(["add", "subtract", "intersect"] as const).map((item) => (
              <button
                key={item}
                onClick={() => onSetMode(item)}
                className={cn(
                  "rounded px-2 py-1.5 text-[10px] font-semibold uppercase transition-colors",
                  mode === item ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            onClick={onApplyOperation}
            disabled={!canEdit}
            className="w-full rounded bg-zinc-200 px-2 py-1.5 text-[10px] font-semibold uppercase dark:bg-zinc-800 disabled:opacity-40"
          >
            Apply Operation
          </button>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Create</div>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => onCreatePath("work")} disabled={!canEdit} className="rounded bg-zinc-200 px-2 py-1.5 text-[10px] font-medium dark:bg-zinc-800 disabled:opacity-40">
              <Plus className="mr-1 inline h-3 w-3" />
              Work Path
            </button>
            <button onClick={() => onCreatePath("pen")} disabled={!canEdit} className="rounded bg-zinc-200 px-2 py-1.5 text-[10px] font-medium dark:bg-zinc-800 disabled:opacity-40">
              <PenTool className="mr-1 inline h-3 w-3" />
              Pen
            </button>
            <button onClick={() => onCreatePath("curvature")} disabled={!canEdit} className="rounded bg-zinc-200 px-2 py-1.5 text-[10px] font-medium dark:bg-zinc-800 disabled:opacity-40">
              Curvature
            </button>
            <button onClick={onCreateFromSelection} disabled={!canEdit || !hasSelection} className="rounded bg-zinc-200 px-2 py-1.5 text-[10px] font-medium dark:bg-zinc-800 disabled:opacity-40">
              Selection
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={onCreateShapeFromSelection} disabled={!canEdit || !hasSelection} className="rounded bg-zinc-200 px-2 py-1.5 text-[10px] font-medium dark:bg-zinc-800 disabled:opacity-40">
              <Shapes className="mr-1 inline h-3 w-3" />
              Shape Layer
            </button>
            <button onClick={onTextOnPath} disabled={!canEdit} className="rounded bg-zinc-200 px-2 py-1.5 text-[10px] font-medium dark:bg-zinc-800 disabled:opacity-40">
              <Type className="mr-1 inline h-3 w-3" />
              Text on Path
            </button>
          </div>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Path List</div>
          <div className="space-y-1">
            {paths.map((path) => (
              <div
                key={path.id}
                onClick={() => onSelectPath(path.id)}
                className={cn(
                  "space-y-1 rounded border px-2 py-1.5 transition-colors",
                  activePathId === path.id
                    ? "border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10"
                    : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                )}
              >
                <div className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={path.visible}
                    onChange={(e) => onToggleVisible(path.id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <input
                    value={path.name}
                    onChange={(e) => onRename(path.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="min-w-0 flex-1 bg-transparent text-[10px] outline-none"
                  />
                  <span className="rounded bg-zinc-100 px-1 py-0.5 text-[9px] uppercase text-zinc-500 dark:bg-zinc-800">
                    {path.kind}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(path.id);
                    }}
                    className="rounded p-0.5 text-zinc-400 hover:text-red-500"
                    title="Delete path"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                {path.bounds && (
                  <div className="flex items-center justify-between text-[9px] text-zinc-500">
                    <span>
                      {Math.round(path.bounds.width)}x{Math.round(path.bounds.height)} @ {Math.round(path.bounds.x)},{Math.round(path.bounds.y)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLoadAsSelection(path.id);
                      }}
                      className="rounded bg-zinc-200 px-1.5 py-0.5 text-[9px] dark:bg-zinc-800"
                    >
                      Load Selection
                    </button>
                  </div>
                )}
                {path.nodes && path.nodes.length > 0 && (
                  <div className="flex items-center justify-between text-[9px] text-zinc-500">
                    <span>
                      {path.nodes.length} nodes · {path.closed ? "Closed" : "Open"}
                    </span>
                    <span>{path.nodes.filter((node) => !node.corner).length} smooth</span>
                  </div>
                )}
              </div>
            ))}
            {paths.length === 0 && <div className="text-[10px] text-zinc-500">No paths yet.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
