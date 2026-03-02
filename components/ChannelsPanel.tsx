"use client";

import { useState } from "react";
import { useLayerStore } from "@/lib/store";
import { Layers, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChannelsPanelProps {
  className?: string;
  style?: React.CSSProperties;
  onCreateMask?: () => void;
  onInvertMask?: () => void;
  onFeatherMask?: (amount: number) => void;
}

type ColorModel = "rgb" | "cmyk";

export default function ChannelsPanel({ className, style, onCreateMask, onInvertMask, onFeatherMask }: ChannelsPanelProps) {
  const {
    layers,
    activeLayerId,
    setLayerFilter,
    updateLayer,
    maskPreviewMode,
    setMaskPreviewMode,
    setLayerMask,
  } = useLayerStore();
  const [colorModel, setColorModel] = useState<ColorModel>("rgb");
  const [featherAmount, setFeatherAmount] = useState(8);

  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const isLocked = Boolean(activeLayer?.locked);
  const getFilter = (key: string, def = 0) => activeLayer?.filters?.[key] ?? def;

  if (!activeLayer) {
    return (
      <div className={cn("flex flex-col overflow-hidden border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900", className)} style={style}>
        <div className="flex items-center justify-between border-b border-zinc-200 p-3 dark:border-zinc-800">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            <Layers className="h-4 w-4" />
            Channels
          </h3>
        </div>
        <div className="flex flex-1 items-center justify-center p-4 text-xs text-zinc-400">Select a layer to edit channels</div>
      </div>
    );
  }

  const redEnabled = getFilter("channelRedEnabled", 1) > 0;
  const greenEnabled = getFilter("channelGreenEnabled", 1) > 0;
  const blueEnabled = getFilter("channelBlueEnabled", 1) > 0;
  const cmykPreview = Math.round(getFilter("cmykPreview", 0));

  const setRgbChannel = (channel: "channelRedEnabled" | "channelGreenEnabled" | "channelBlueEnabled", enabled: boolean) => {
    setLayerFilter(activeLayer.id, channel, enabled ? 1 : 0);
    if (!enabled && !redEnabled && !greenEnabled && !blueEnabled) {
      setLayerFilter(activeLayer.id, channel, 1);
    }
  };

  return (
    <div className={cn("flex flex-col overflow-hidden border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900", className)} style={style}>
      <div className="flex items-center justify-between border-b border-zinc-200 p-3 dark:border-zinc-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <Layers className="h-4 w-4" />
          Channels
        </h3>
        <span className="rounded bg-zinc-100 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {activeLayer.type}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <section className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Color Model</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setColorModel("rgb")}
              className={cn(
                "rounded px-2 py-1.5 text-[10px] font-semibold transition-colors",
                colorModel === "rgb" ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              )}
            >
              RGB
            </button>
            <button
              onClick={() => setColorModel("cmyk")}
              className={cn(
                "rounded px-2 py-1.5 text-[10px] font-semibold transition-colors",
                colorModel === "cmyk" ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              )}
            >
              CMYK Preview
            </button>
          </div>
        </section>

        {colorModel === "rgb" ? (
          <section className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">RGB Channels</div>
              <button
                onClick={() => {
                  setLayerFilter(activeLayer.id, "channelRedEnabled", 1);
                  setLayerFilter(activeLayer.id, "channelGreenEnabled", 1);
                  setLayerFilter(activeLayer.id, "channelBlueEnabled", 1);
                  setLayerFilter(activeLayer.id, "cmykPreview", 0);
                }}
                disabled={isLocked}
                className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex items-center justify-between rounded bg-zinc-100 px-2 py-1.5 text-[10px] dark:bg-zinc-800">
                <span>R</span>
                <input type="checkbox" checked={redEnabled} disabled={isLocked} onChange={(e) => setRgbChannel("channelRedEnabled", e.target.checked)} />
              </label>
              <label className="flex items-center justify-between rounded bg-zinc-100 px-2 py-1.5 text-[10px] dark:bg-zinc-800">
                <span>G</span>
                <input type="checkbox" checked={greenEnabled} disabled={isLocked} onChange={(e) => setRgbChannel("channelGreenEnabled", e.target.checked)} />
              </label>
              <label className="flex items-center justify-between rounded bg-zinc-100 px-2 py-1.5 text-[10px] dark:bg-zinc-800">
                <span>B</span>
                <input type="checkbox" checked={blueEnabled} disabled={isLocked} onChange={(e) => setRgbChannel("channelBlueEnabled", e.target.checked)} />
              </label>
            </div>
          </section>
        ) : (
          <section className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">CMYK Channels</div>
            <div className="grid grid-cols-5 gap-1">
              {[
                { label: "All", value: 0 },
                { label: "C", value: 1 },
                { label: "M", value: 2 },
                { label: "Y", value: 3 },
                { label: "K", value: 4 },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => setLayerFilter(activeLayer.id, "cmykPreview", item.value)}
                  disabled={isLocked}
                  className={cn(
                    "rounded px-1 py-1.5 text-[10px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                    cmykPreview === item.value
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Preview mode approximates process channels for inspection.
            </div>
          </section>
        )}

        <section className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Alpha Mask</div>
            {activeLayer.mask ? (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Attached</span>
            ) : (
              <span className="text-[10px] text-zinc-500">None</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onCreateMask}
              disabled={isLocked}
              className="rounded bg-zinc-200 px-2 py-1.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
            <button
              onClick={() => setMaskPreviewMode(!maskPreviewMode)}
              disabled={!activeLayer.mask}
              className="rounded bg-zinc-200 px-2 py-1.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {maskPreviewMode ? "Hide Preview" : "Show Preview"}
            </button>
            <button
              onClick={onInvertMask}
              disabled={isLocked || !activeLayer.mask}
              className="rounded bg-zinc-200 px-2 py-1.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Invert
            </button>
            <button
              onClick={() => setLayerMask(activeLayer.id, null)}
              disabled={isLocked || !activeLayer.mask}
              className="rounded bg-zinc-200 px-2 py-1.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          </div>
          {activeLayer.mask && (
            <label className="flex items-center justify-between rounded bg-zinc-100 px-2 py-1.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              <span className="inline-flex items-center gap-1">
                {activeLayer.mask.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                Mask Visible
              </span>
              <input
                type="checkbox"
                checked={activeLayer.mask.visible}
                disabled={isLocked}
                onChange={(e) => updateLayer(activeLayer.id, { mask: { ...activeLayer.mask!, visible: e.target.checked } })}
              />
            </label>
          )}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={featherAmount}
              onChange={(e) => setFeatherAmount(Number(e.target.value) || 0)}
              className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-[10px] text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            />
            <button
              onClick={() => onFeatherMask?.(featherAmount)}
              disabled={isLocked || !activeLayer.mask}
              className="rounded bg-zinc-200 px-2 py-1.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Feather
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
