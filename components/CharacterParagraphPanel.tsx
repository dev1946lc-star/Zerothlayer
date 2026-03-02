"use client";

import { AlignCenter, AlignLeft, AlignRight, Type } from "lucide-react";
import { cn } from "@/lib/utils";

interface CharacterParagraphPanelProps {
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  textDraft: string;
  setTextDraft: (value: string) => void;
  fontSize: number;
  setFontSize: (value: number) => void;
  fontFamily: "sans" | "serif" | "mono";
  setFontFamily: (value: "sans" | "serif" | "mono") => void;
  fontWeight: 300 | 400 | 500 | 600 | 700;
  setFontWeight: (value: 300 | 400 | 500 | 600 | 700) => void;
  textItalic: boolean;
  setTextItalic: (value: boolean) => void;
  textUnderline: boolean;
  setTextUnderline: (value: boolean) => void;
  lineHeight: number;
  setLineHeight: (value: number) => void;
  tracking: number;
  setTracking: (value: number) => void;
  paragraphSpacing: number;
  setParagraphSpacing: (value: number) => void;
  paragraphIndent: number;
  setParagraphIndent: (value: number) => void;
  textAlign: "left" | "center" | "right";
  setTextAlign: (value: "left" | "center" | "right") => void;
  textDirection: "horizontal" | "vertical";
  setTextDirection: (value: "horizontal" | "vertical") => void;
  textWarp: number;
  setTextWarp: (value: number) => void;
  textWarpStyle: "arc" | "arch" | "bulge" | "flag" | "wave";
  setTextWarpStyle: (value: "arc" | "arch" | "bulge" | "flag" | "wave") => void;
  textWarpAxis: "horizontal" | "vertical";
  setTextWarpAxis: (value: "horizontal" | "vertical") => void;
  openTypeLiga: boolean;
  setOpenTypeLiga: (value: boolean) => void;
  openTypeDiscretionaryLiga: boolean;
  setOpenTypeDiscretionaryLiga: (value: boolean) => void;
  openTypeKerning: boolean;
  setOpenTypeKerning: (value: boolean) => void;
  openTypeOldStyleFigures: boolean;
  setOpenTypeOldStyleFigures: (value: boolean) => void;
  openTypeSmallCaps: boolean;
  setOpenTypeSmallCaps: (value: boolean) => void;
  onAddTypeLayer: () => void;
  onUpdateTypeLayer: () => void;
  onWarpText: () => void;
  onTextOnPath: () => void;
}

export default function CharacterParagraphPanel({
  className,
  style,
  disabled = false,
  textDraft,
  setTextDraft,
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily,
  fontWeight,
  setFontWeight,
  textItalic,
  setTextItalic,
  textUnderline,
  setTextUnderline,
  lineHeight,
  setLineHeight,
  tracking,
  setTracking,
  paragraphSpacing,
  setParagraphSpacing,
  paragraphIndent,
  setParagraphIndent,
  textAlign,
  setTextAlign,
  textDirection,
  setTextDirection,
  textWarp,
  setTextWarp,
  textWarpStyle,
  setTextWarpStyle,
  textWarpAxis,
  setTextWarpAxis,
  openTypeLiga,
  setOpenTypeLiga,
  openTypeDiscretionaryLiga,
  setOpenTypeDiscretionaryLiga,
  openTypeKerning,
  setOpenTypeKerning,
  openTypeOldStyleFigures,
  setOpenTypeOldStyleFigures,
  openTypeSmallCaps,
  setOpenTypeSmallCaps,
  onAddTypeLayer,
  onUpdateTypeLayer,
  onWarpText,
  onTextOnPath,
}: CharacterParagraphPanelProps) {
  return (
    <div className={cn("flex h-full flex-col overflow-hidden border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900", className)} style={style}>
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <Type className="h-4 w-4" />
          Character/Paragraph
        </h3>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Text</div>
          <textarea
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            rows={4}
            className="w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
          />
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Character</div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <label className="space-y-1">
              <span className="text-zinc-500">Font Family</span>
              <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value as "sans" | "serif" | "mono")} className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
                <option value="sans">Sans</option>
                <option value="serif">Serif</option>
                <option value="mono">Mono</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-zinc-500">Font Weight</span>
              <select value={fontWeight} onChange={(e) => setFontWeight(Number(e.target.value) as 300 | 400 | 500 | 600 | 700)} className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
                <option value={300}>300</option>
                <option value={400}>400</option>
                <option value={500}>500</option>
                <option value={600}>600</option>
                <option value={700}>700</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-zinc-500">Font Size</span>
              <input
                type="number"
                min={8}
                max={320}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value) || 8)}
                className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-zinc-500">Tracking</span>
              <input
                type="number"
                min={-100}
                max={400}
                value={tracking}
                onChange={(e) => setTracking(Number(e.target.value) || 0)}
                className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
          </div>
          <input
            type="range"
            min={-100}
            max={400}
            value={tracking}
            onChange={(e) => setTracking(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700"
          />
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={openTypeLiga} onChange={(e) => setOpenTypeLiga(e.target.checked)} />
              OpenType Ligatures
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={textItalic} onChange={(e) => setTextItalic(e.target.checked)} />
              Italic
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={openTypeSmallCaps} onChange={(e) => setOpenTypeSmallCaps(e.target.checked)} />
              Small Caps
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={textUnderline} onChange={(e) => setTextUnderline(e.target.checked)} />
              Underline
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={openTypeDiscretionaryLiga} onChange={(e) => setOpenTypeDiscretionaryLiga(e.target.checked)} />
              Discretionary Ligatures
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={openTypeKerning} onChange={(e) => setOpenTypeKerning(e.target.checked)} />
              Kerning
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={openTypeOldStyleFigures} onChange={(e) => setOpenTypeOldStyleFigures(e.target.checked)} />
              Oldstyle Figures
            </label>
          </div>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Paragraph</div>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setTextDirection("horizontal")}
              className={cn("rounded px-2 py-1 text-[10px] transition-colors", textDirection === "horizontal" ? "bg-blue-600 text-white" : "bg-zinc-200 dark:bg-zinc-800")}
              title="Horizontal Type"
            >
              Horizontal
            </button>
            <button
              onClick={() => setTextDirection("vertical")}
              className={cn("rounded px-2 py-1 text-[10px] transition-colors", textDirection === "vertical" ? "bg-blue-600 text-white" : "bg-zinc-200 dark:bg-zinc-800")}
              title="Vertical Type"
            >
              Vertical
            </button>
          </div>
          <label className="block space-y-1 text-[10px]">
            <span className="text-zinc-500">Line Height</span>
            <input
              type="number"
              min={0.6}
              max={4}
              step={0.1}
              value={lineHeight}
              onChange={(e) => setLineHeight(Number(e.target.value) || 1)}
              className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <label className="space-y-1">
              <span className="text-zinc-500">Paragraph Spacing</span>
              <input type="number" min={0} max={120} value={paragraphSpacing} onChange={(e) => setParagraphSpacing(Number(e.target.value) || 0)} className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
            </label>
            <label className="space-y-1">
              <span className="text-zinc-500">First-line Indent</span>
              <input type="number" min={0} max={240} value={paragraphIndent} onChange={(e) => setParagraphIndent(Number(e.target.value) || 0)} className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setTextAlign("left")}
              className={cn("rounded px-2 py-1 text-[10px] transition-colors", textAlign === "left" ? "bg-blue-600 text-white" : "bg-zinc-200 dark:bg-zinc-800")}
              title="Align Left"
            >
              <AlignLeft className="mx-auto h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setTextAlign("center")}
              className={cn("rounded px-2 py-1 text-[10px] transition-colors", textAlign === "center" ? "bg-blue-600 text-white" : "bg-zinc-200 dark:bg-zinc-800")}
              title="Align Center"
            >
              <AlignCenter className="mx-auto h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setTextAlign("right")}
              className={cn("rounded px-2 py-1 text-[10px] transition-colors", textAlign === "right" ? "bg-blue-600 text-white" : "bg-zinc-200 dark:bg-zinc-800")}
              title="Align Right"
            >
              <AlignRight className="mx-auto h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Warp</div>
          <label className="block space-y-1 text-[10px]">
            <span className="text-zinc-500">Amount: {(textWarp * 100).toFixed(0)}%</span>
            <input
              type="range"
              min={0}
              max={80}
              value={Math.round(textWarp * 100)}
              onChange={(e) => setTextWarp(Number(e.target.value) / 100)}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <label className="space-y-1">
              <span className="text-zinc-500">Style</span>
              <select
                value={textWarpStyle}
                onChange={(e) => setTextWarpStyle(e.target.value as "arc" | "arch" | "bulge" | "flag" | "wave")}
                className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="arc">Arc</option>
                <option value="arch">Arch</option>
                <option value="bulge">Bulge</option>
                <option value="flag">Flag</option>
                <option value="wave">Wave</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-zinc-500">Axis</span>
              <select
                value={textWarpAxis}
                onChange={(e) => setTextWarpAxis(e.target.value as "horizontal" | "vertical")}
                className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
              </select>
            </label>
          </div>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Actions</div>
          <div className="grid grid-cols-4 gap-1.5">
            <button onClick={onAddTypeLayer} disabled={disabled} className="rounded bg-zinc-200 px-2 py-1.5 text-[10px] font-medium dark:bg-zinc-800 disabled:opacity-40">Type Layer</button>
            <button onClick={onUpdateTypeLayer} disabled={disabled} className="rounded bg-zinc-200 px-2 py-1.5 text-[10px] font-medium dark:bg-zinc-800 disabled:opacity-40">Update Active</button>
            <button onClick={onWarpText} disabled={disabled} className="rounded bg-zinc-200 px-2 py-1.5 text-[10px] font-medium dark:bg-zinc-800 disabled:opacity-40">Warp Text</button>
            <button onClick={onTextOnPath} disabled={disabled} className="rounded bg-zinc-200 px-2 py-1.5 text-[10px] font-medium dark:bg-zinc-800 disabled:opacity-40">Text on Path</button>
          </div>
        </section>
      </div>
    </div>
  );
}
