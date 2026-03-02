"use client";

import { useMemo, useState } from "react";
import { Copy, Palette, Pipette, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColorSwatchesPanelProps {
  className?: string;
  style?: React.CSSProperties;
  activeColor: string;
  onColorSelect: (color: string) => void;
  swatches: string[];
  onAddSwatch: (color: string) => void;
  onRemoveSwatch: (color: string) => void;
  gradientA: string;
  gradientB: string;
  onGradientAChange: (color: string) => void;
  onGradientBChange: (color: string) => void;
  onApplyGradient?: () => void;
  onApplyPaintBucket?: () => void;
  disabled?: boolean;
}

const gradientPresets = [
  { id: "sunset", name: "Sunset", a: "#ff7e5f", b: "#feb47b" },
  { id: "ocean", name: "Ocean", a: "#667eea", b: "#764ba2" },
  { id: "forest", name: "Forest", a: "#134e5e", b: "#71b280" },
  { id: "coral", name: "Coral", a: "#f093fb", b: "#f5576c" },
  { id: "aurora", name: "Aurora", a: "#06b6d4", b: "#4f46e5" },
];

export default function ColorSwatchesPanel(props: ColorSwatchesPanelProps) {
  const {
    className,
    style,
    activeColor,
    onColorSelect,
    swatches,
    onAddSwatch,
    onRemoveSwatch,
    gradientA,
    gradientB,
    onGradientAChange,
    onGradientBChange,
    onApplyGradient,
    onApplyPaintBucket,
    disabled = false,
  } = props;

  const [newSwatchName, setNewSwatchName] = useState("");

  const normalized = useMemo(() => activeColor.toUpperCase(), [activeColor]);

  const copyColorToClipboard = () => {
    if (!navigator?.clipboard) return;
    void navigator.clipboard.writeText(activeColor);
  };

  return (
    <div className={cn("flex h-full flex-col overflow-hidden border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900", className)} style={style}>
      <div className="flex items-center justify-between border-b border-zinc-200 p-3 dark:border-zinc-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <Palette className="h-4 w-4" />
          Colors
        </h3>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        <section className="space-y-2">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Current Color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={activeColor} onChange={(e) => onColorSelect(e.target.value)} className="h-12 w-12 cursor-pointer rounded border-2 border-zinc-300 dark:border-zinc-700" />
            <input
              type="text"
              value={normalized}
              onChange={(e) => {
                const v = e.target.value.trim();
                if (/^#[0-9a-fA-F]{6}$/.test(v)) onColorSelect(v);
              }}
              className="flex-1 rounded border border-zinc-200 bg-zinc-100 px-2 py-1.5 font-mono text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <button onClick={copyColorToClipboard} className="rounded p-1.5 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800" title="Copy hex">
              <Copy className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>
        </section>

        <section className="space-y-2 rounded border border-dashed border-zinc-300 p-2 dark:border-zinc-700">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Save Swatch</label>
          <input
            type="text"
            placeholder="Name (optional)"
            value={newSwatchName}
            onChange={(e) => setNewSwatchName(e.target.value)}
            className="w-full rounded border border-zinc-200 bg-zinc-100 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
          />
          <button
            onClick={() => {
              onAddSwatch(activeColor);
              setNewSwatchName("");
            }}
            className="flex w-full items-center justify-center gap-2 rounded border border-zinc-200 px-2 py-1.5 text-xs font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <Plus className="h-3 w-3" />
            Add Swatch
          </button>
        </section>

        <section>
          <label className="mb-2 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Swatches</label>
          <div className="grid grid-cols-6 gap-2">
            {swatches.map((color) => (
              <div key={color} className="flex flex-col items-center gap-1">
                <button
                  onClick={() => onColorSelect(color)}
                  className={cn(
                    "h-8 w-full rounded border-2 transition-all hover:scale-105",
                    activeColor.toLowerCase() === color.toLowerCase() ? "border-cyan-400 shadow-lg shadow-cyan-500/40" : "border-zinc-300 dark:border-zinc-700"
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
                <button onClick={() => onRemoveSwatch(color)} className="rounded p-0.5 transition-colors hover:bg-red-100 dark:hover:bg-red-900" title="Delete swatch">
                  <Trash2 className="h-3 w-3 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Gradient</label>
          <div className="flex items-center gap-2">
            <input type="color" value={gradientA} onChange={(e) => onGradientAChange(e.target.value)} className="h-8 w-8 rounded border border-zinc-300 dark:border-zinc-700" />
            <input type="color" value={gradientB} onChange={(e) => onGradientBChange(e.target.value)} className="h-8 w-8 rounded border border-zinc-300 dark:border-zinc-700" />
            <div className="h-8 flex-1 rounded border border-zinc-300 dark:border-zinc-700" style={{ background: `linear-gradient(90deg, ${gradientA}, ${gradientB})` }} />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={onApplyGradient} disabled={disabled} className="rounded bg-zinc-200 px-2 py-1.5 text-[10px] font-medium dark:bg-zinc-800 disabled:opacity-40">Apply Gradient</button>
            <button onClick={onApplyPaintBucket} disabled={disabled} className="rounded bg-zinc-200 px-2 py-1.5 text-[10px] font-medium dark:bg-zinc-800 disabled:opacity-40">Fill Color</button>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {gradientPresets.map((grad) => (
              <button
                key={grad.id}
                onClick={() => {
                  onGradientAChange(grad.a);
                  onGradientBChange(grad.b);
                }}
                className="flex items-center gap-2 rounded border border-zinc-200 px-2 py-1.5 text-left text-[10px] transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <div className="h-5 flex-1 rounded border border-zinc-300 dark:border-zinc-700" style={{ background: `linear-gradient(90deg, ${grad.a}, ${grad.b})` }} />
                <span className="w-12 text-zinc-600 dark:text-zinc-300">{grad.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-1">
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Harmony</label>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            <div><Pipette className="mr-1 inline h-3 w-3" />Use swatches for consistency across tools.</div>
            <div>Complementary: opposite hues for contrast.</div>
            <div>Analogous: nearby hues for softer palettes.</div>
          </div>
        </section>
      </div>
    </div>
  );
}
