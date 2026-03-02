"use client";

import { Download, Gauge, ImageDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExportAsOptions {
  target: "flattened" | "active-layer";
  format: "png" | "jpeg" | "webp";
  quality: number;
  width: number;
  height: number;
  maintainAspect: boolean;
}

interface ExportAsPanelProps {
  className?: string;
  style?: React.CSSProperties;
  canExport: boolean;
  options: ExportAsOptions;
  originalWidth: number;
  originalHeight: number;
  estimateBytes: number | null;
  estimating: boolean;
  onOptionsChange: (next: ExportAsOptions) => void;
  onResetDimensions: () => void;
  onExport: () => void;
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function ExportAsPanel({
  className,
  style,
  canExport,
  options,
  originalWidth,
  originalHeight,
  estimateBytes,
  estimating,
  onOptionsChange,
  onResetDimensions,
  onExport,
}: ExportAsPanelProps) {
  const aspect = Math.max(0.0001, (originalWidth || 1) / (originalHeight || 1));

  const setWidth = (value: number) => {
    const width = Math.max(1, Math.round(value));
    if (!options.maintainAspect) {
      onOptionsChange({ ...options, width });
      return;
    }
    onOptionsChange({ ...options, width, height: Math.max(1, Math.round(width / aspect)) });
  };

  const setHeight = (value: number) => {
    const height = Math.max(1, Math.round(value));
    if (!options.maintainAspect) {
      onOptionsChange({ ...options, height });
      return;
    }
    onOptionsChange({ ...options, height, width: Math.max(1, Math.round(height * aspect)) });
  };

  return (
    <div className={cn("flex h-full flex-col overflow-hidden border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900", className)} style={style}>
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <ImageDown className="h-4 w-4" />
          Export As
        </h3>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 text-[10px]">
        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Output</div>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="space-y-1">
              <span className="text-zinc-500">Target</span>
              <select
                value={options.target}
                onChange={(e) => onOptionsChange({ ...options, target: e.target.value as "flattened" | "active-layer" })}
                className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="flattened">Flattened</option>
                <option value="active-layer">Active Layer</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-zinc-500">Format</span>
              <select
                value={options.format}
                onChange={(e) => onOptionsChange({ ...options, format: e.target.value as "png" | "jpeg" | "webp" })}
                className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="webp">WebP</option>
              </select>
            </label>
          </div>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between">
            <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Dimensions</div>
            <button onClick={onResetDimensions} className="rounded bg-zinc-200 px-2 py-1 dark:bg-zinc-800">Reset</button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="space-y-1">
              <span className="text-zinc-500">Width</span>
              <input
                type="number"
                min={1}
                value={options.width}
                disabled={options.target === "active-layer"}
                onChange={(e) => setWidth(Number(e.target.value) || 1)}
                className="w-full rounded border border-zinc-200 bg-white px-2 py-1 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-zinc-500">Height</span>
              <input
                type="number"
                min={1}
                value={options.height}
                disabled={options.target === "active-layer"}
                onChange={(e) => setHeight(Number(e.target.value) || 1)}
                className="w-full rounded border border-zinc-200 bg-white px-2 py-1 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
          </div>
          <label className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={options.maintainAspect}
              disabled={options.target === "active-layer"}
              onChange={(e) => onOptionsChange({ ...options, maintainAspect: e.target.checked })}
            />
            Maintain aspect ratio
          </label>
          <div className="text-zinc-500 dark:text-zinc-400">Original: {originalWidth}x{originalHeight}</div>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Compression</div>
          <label className="block space-y-1">
            <span className="text-zinc-500">Quality: {options.quality}%</span>
            <input
              type="range"
              min={40}
              max={100}
              step={1}
              value={options.quality}
              disabled={options.format === "png"}
              onChange={(e) => onOptionsChange({ ...options, quality: Number(e.target.value) })}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 disabled:opacity-50 dark:bg-zinc-700"
            />
          </label>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Preview</div>
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5" />
              Estimated size
            </span>
            <span>
              {estimating ? "Calculating..." : estimateBytes === null ? "N/A" : formatBytes(estimateBytes)}
            </span>
          </div>
        </section>

        <button
          onClick={onExport}
          disabled={!canExport}
          className="w-full rounded bg-blue-600 px-2 py-2 text-[11px] font-semibold text-white disabled:opacity-40"
        >
          <Download className="mr-1 inline h-3.5 w-3.5" />
          Export Optimized
        </button>
      </div>
    </div>
  );
}
