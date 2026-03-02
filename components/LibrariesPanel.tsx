"use client";

import { Archive, Brush, Palette, Type, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type LibraryAsset =
  | { id: string; name: string; type: "color"; color: string }
  | { id: string; name: string; type: "gradient"; a: string; b: string }
  | {
      id: string;
      name: string;
      type: "textStyle";
      fontSize: number;
      fontFamily: "sans" | "serif" | "mono";
      fontWeight: 300 | 400 | 500 | 600 | 700;
      italic: boolean;
      underline: boolean;
      lineHeight: number;
      tracking: number;
      paragraphSpacing: number;
      paragraphIndent: number;
      textAlign: "left" | "center" | "right";
      textDirection: "horizontal" | "vertical";
      liga: boolean;
      discretionaryLiga: boolean;
      kerning: boolean;
      oldStyleFigures: boolean;
      smallCaps: boolean;
    }
  | {
      id: string;
      name: string;
      type: "brushPreset";
      size: number;
      hardness: number;
      spacing: number;
      shape: "round" | "square" | "chalk";
      flow: number;
      jitter: number;
      texture: number;
      textureScale: number;
    };

interface LibrariesPanelProps {
  className?: string;
  style?: React.CSSProperties;
  canEdit: boolean;
  assets: LibraryAsset[];
  onSaveColor: () => void;
  onSaveGradient: () => void;
  onSaveTextStyle: () => void;
  onSaveBrushPreset: () => void;
  onApplyAsset: (id: string) => void;
  onDeleteAsset: (id: string) => void;
}

export default function LibrariesPanel({
  className,
  style,
  canEdit,
  assets,
  onSaveColor,
  onSaveGradient,
  onSaveTextStyle,
  onSaveBrushPreset,
  onApplyAsset,
  onDeleteAsset,
}: LibrariesPanelProps) {
  return (
    <div className={cn("flex h-full flex-col overflow-hidden border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900", className)} style={style}>
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <Archive className="h-4 w-4" />
          Libraries
        </h3>
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{assets.length}</span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 text-[10px] dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Save Current</div>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={onSaveColor} disabled={!canEdit} className="rounded bg-zinc-200 px-2 py-1.5 dark:bg-zinc-800 disabled:opacity-40">Color</button>
            <button onClick={onSaveGradient} disabled={!canEdit} className="rounded bg-zinc-200 px-2 py-1.5 dark:bg-zinc-800 disabled:opacity-40">Gradient</button>
            <button onClick={onSaveTextStyle} disabled={!canEdit} className="rounded bg-zinc-200 px-2 py-1.5 dark:bg-zinc-800 disabled:opacity-40">Text Style</button>
            <button onClick={onSaveBrushPreset} disabled={!canEdit} className="rounded bg-zinc-200 px-2 py-1.5 dark:bg-zinc-800 disabled:opacity-40">Brush Preset</button>
          </div>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 text-[10px] dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Assets</div>
          <div className="space-y-1.5">
            {assets.map((asset) => (
              <div key={asset.id} className="rounded border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">
                    {asset.type === "color" && <Palette className="h-3.5 w-3.5" />}
                    {asset.type === "gradient" && <Palette className="h-3.5 w-3.5" />}
                    {asset.type === "textStyle" && <Type className="h-3.5 w-3.5" />}
                    {asset.type === "brushPreset" && <Brush className="h-3.5 w-3.5" />}
                  </span>
                  <span className="flex-1 truncate font-medium">{asset.name}</span>
                  <button onClick={() => onDeleteAsset(asset.id)} className="rounded p-0.5 text-zinc-400 hover:text-red-500" title="Delete">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="mt-1 text-zinc-500 dark:text-zinc-400">
                  {asset.type === "color" && <div className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded border border-zinc-300" style={{ backgroundColor: asset.color }} />{asset.color}</div>}
                  {asset.type === "gradient" && <div className="h-4 rounded border border-zinc-300" style={{ background: `linear-gradient(90deg, ${asset.a}, ${asset.b})` }} />}
                  {asset.type === "textStyle" && <div>{asset.fontFamily} {asset.fontWeight}{asset.italic ? " italic" : ""}{asset.underline ? " underline" : ""} / {asset.fontSize}px / {asset.lineHeight} lh / track {asset.tracking} / p {asset.paragraphSpacing}px i {asset.paragraphIndent}px / {asset.textDirection} / OT {asset.liga ? "liga" : "-"} {asset.discretionaryLiga ? "dlig" : "-"} {asset.kerning ? "kern" : "-"} {asset.oldStyleFigures ? "onum" : "-"}</div>}
                  {asset.type === "brushPreset" && <div>{asset.shape}, {asset.size}px, flow {asset.flow}%</div>}
                </div>
                <button onClick={() => onApplyAsset(asset.id)} className="mt-1.5 w-full rounded bg-zinc-200 px-2 py-1 text-[10px] font-medium dark:bg-zinc-800">
                  Apply
                </button>
              </div>
            ))}
            {assets.length === 0 && <div className="text-zinc-500">No library assets yet.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
