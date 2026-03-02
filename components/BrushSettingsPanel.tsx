"use client";

import { Brush } from "lucide-react";
import { cn } from "@/lib/utils";

export type BrushShape = "round" | "square" | "chalk";

interface BrushSettingsPanelProps {
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  brushSize: number;
  setBrushSize: (value: number) => void;
  brushHardness: number;
  setBrushHardness: (value: number) => void;
  brushSpacing: number;
  setBrushSpacing: (value: number) => void;
  brushShape: BrushShape;
  setBrushShape: (value: BrushShape) => void;
  brushFlow: number;
  setBrushFlow: (value: number) => void;
  brushJitter: number;
  setBrushJitter: (value: number) => void;
  brushTexture: number;
  setBrushTexture: (value: number) => void;
  brushTextureScale: number;
  setBrushTextureScale: (value: number) => void;
  onBrush: () => void;
  onPencil: () => void;
  onMixer: () => void;
}

export default function BrushSettingsPanel(props: BrushSettingsPanelProps) {
  const {
    className,
    style,
    disabled = false,
    brushSize,
    setBrushSize,
    brushHardness,
    setBrushHardness,
    brushSpacing,
    setBrushSpacing,
    brushShape,
    setBrushShape,
    brushFlow,
    setBrushFlow,
    brushJitter,
    setBrushJitter,
    brushTexture,
    setBrushTexture,
    brushTextureScale,
    setBrushTextureScale,
    onBrush,
    onPencil,
    onMixer,
  } = props;

  return (
    <div className={cn("flex h-full flex-col overflow-hidden border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900", className)} style={style}>
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <Brush className="h-4 w-4" />
          Brush Settings
        </h3>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 text-[10px]">
        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Shape</div>
          <div className="grid grid-cols-3 gap-1">
            {(["round", "square", "chalk"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setBrushShape(item)}
                className={cn("rounded px-2 py-1.5 font-semibold uppercase transition-colors", brushShape === item ? "bg-blue-600 text-white" : "bg-zinc-200 dark:bg-zinc-800")}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Stroke</div>
          <label className="block space-y-1">
            <div className="text-zinc-500">Size: {brushSize}px</div>
            <input type="range" min={1} max={256} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
          </label>
          <label className="block space-y-1">
            <div className="text-zinc-500">Hardness: {brushHardness}%</div>
            <input type="range" min={0} max={100} value={brushHardness} onChange={(e) => setBrushHardness(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
          </label>
          <label className="block space-y-1">
            <div className="text-zinc-500">Spacing: {brushSpacing}%</div>
            <input type="range" min={1} max={100} value={brushSpacing} onChange={(e) => setBrushSpacing(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
          </label>
          <label className="block space-y-1">
            <div className="text-zinc-500">Flow: {brushFlow}%</div>
            <input type="range" min={1} max={100} value={brushFlow} onChange={(e) => setBrushFlow(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
          </label>
          <label className="block space-y-1">
            <div className="text-zinc-500">Jitter: {brushJitter}%</div>
            <input type="range" min={0} max={100} value={brushJitter} onChange={(e) => setBrushJitter(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
          </label>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Texture</div>
          <label className="block space-y-1">
            <div className="text-zinc-500">Amount: {brushTexture}%</div>
            <input type="range" min={0} max={100} value={brushTexture} onChange={(e) => setBrushTexture(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
          </label>
          <label className="block space-y-1">
            <div className="text-zinc-500">Scale: {brushTextureScale}</div>
            <input type="range" min={2} max={20} value={brushTextureScale} onChange={(e) => setBrushTextureScale(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
          </label>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Tools</div>
          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={onBrush} disabled={disabled} className="rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">Brush</button>
            <button onClick={onPencil} disabled={disabled} className="rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">Pencil</button>
            <button onClick={onMixer} disabled={disabled} className="rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">Mixer</button>
          </div>
        </section>
      </div>
    </div>
  );
}
