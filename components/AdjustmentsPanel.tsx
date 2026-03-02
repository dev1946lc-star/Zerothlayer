"use client";

import { useState } from "react";
import { useLayerStore } from "@/lib/store";
import { Sliders, Sun, Contrast, Droplet, Zap, Palette, Eye, EyeOff, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdjustmentControlProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onUpdate: (val: number) => void;
  onReset: () => void;
  disabled?: boolean;
}

const AdjustmentControl = ({
  label,
  icon,
  value,
  min,
  max,
  step = 0.01,
  onUpdate,
  onReset,
  disabled = false,
}: AdjustmentControlProps) => {
  const percent = Math.round(((value - min) / (max - min)) * 100);
  return (
    <div className="space-y-1 py-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <span className="font-mono text-zinc-500">{percent}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onUpdate(parseFloat(e.target.value))}
          disabled={disabled}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-cyan-500 dark:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          onClick={onReset}
          disabled={disabled}
          className="rounded px-2 py-0.5 text-[10px] text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 dark:hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          title="Reset"
        >
          R
        </button>
      </div>
    </div>
  );
};

interface AdjustmentsPanelProps {
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULTS: Record<string, number> = {
  brightness: 0,
  contrast: 0,
  curves: 0,
  levels: 0,
  exposure: 0,
  shadows: 0,
  highlights: 0,
  hue: 0,
  saturation: 0,
  vibrance: 0,
  redBalance: 0,
  greenBalance: 0,
  blueBalance: 0,
  selectiveColor: 0,
  gradientMap: 0,
  photoFilter: 0,
  channelMixer: 0,
  lutPreset: 0,
};

export default function AdjustmentsPanel({ className, style }: AdjustmentsPanelProps) {
  const { layers, activeLayerId, setLayerFilter, updateLayer } = useLayerStore();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    tonal: true,
    color: true,
    special: true,
  });

  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const isLocked = Boolean(activeLayer?.locked);
  const isAdjustmentLayer = activeLayer?.type === "adjustment";

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getFilterValue = (filterName: string) => activeLayer?.filters?.[filterName] ?? DEFAULTS[filterName] ?? 0;
  const setFilterValue = (filterName: string, value: number) => {
    if (!activeLayerId) return;
    setLayerFilter(activeLayerId, filterName, value);
  };
  const resetSection = (filterNames: string[]) => {
    filterNames.forEach((name) => setFilterValue(name, DEFAULTS[name] ?? 0));
  };
  const resetAll = () => {
    Object.keys(DEFAULTS).forEach((name) => setFilterValue(name, DEFAULTS[name]));
  };

  const applyPreset = (preset: "pop" | "cinematic" | "neutralize") => {
    if (preset === "neutralize") {
      resetAll();
      return;
    }
    if (preset === "pop") {
      setFilterValue("contrast", 0.2);
      setFilterValue("vibrance", 0.3);
      setFilterValue("saturation", 0.12);
      setFilterValue("shadows", 0.1);
      setFilterValue("highlights", -0.05);
      setFilterValue("lutPreset", 1);
      return;
    }
    setFilterValue("contrast", 0.18);
    setFilterValue("vibrance", 0.2);
    setFilterValue("photoFilter", 0.24);
    setFilterValue("gradientMap", 0.2);
    setFilterValue("lutPreset", 3);
  };

  if (!activeLayerId || !activeLayer) {
    return (
      <div className={cn("flex flex-col overflow-hidden border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900", className)} style={style}>
        <div className="flex items-center justify-between border-b border-zinc-200 p-3 dark:border-zinc-800">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            <Sliders className="h-4 w-4" />
            Adjustments
          </h3>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-zinc-400">
          <Zap className="h-8 w-8 opacity-20" />
          <span className="text-center text-xs">Select a layer to adjust</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col overflow-hidden border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900", className)} style={style}>
      <div className="flex items-center justify-between border-b border-zinc-200 p-3 dark:border-zinc-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <Sliders className="h-4 w-4" />
          Adjustments
        </h3>
        <button
          onClick={resetAll}
          disabled={isLocked}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-3 w-3" />
          Reset All
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/70 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Target</div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">{activeLayer.name}</div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {isAdjustmentLayer ? "Adjustment layer" : "Pixel layer filters"}
              </div>
            </div>
            <button
              onClick={() => updateLayer(activeLayerId, { type: isAdjustmentLayer ? "image" : "adjustment" })}
              disabled={isLocked}
              className="rounded-md bg-zinc-200 px-2 py-1 text-[10px] font-medium text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAdjustmentLayer ? "Set Image" : "Set Adjustment"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/70 p-2 dark:border-zinc-800 dark:bg-zinc-900/40">
          <button
            onClick={() => applyPreset("pop")}
            disabled={isLocked}
            className="rounded-md bg-zinc-200 px-2 py-1.5 text-[10px] font-medium text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Pop
          </button>
          <button
            onClick={() => applyPreset("cinematic")}
            disabled={isLocked}
            className="rounded-md bg-zinc-200 px-2 py-1.5 text-[10px] font-medium text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cinematic
          </button>
          <button
            onClick={() => applyPreset("neutralize")}
            disabled={isLocked}
            className="rounded-md bg-zinc-200 px-2 py-1.5 text-[10px] font-medium text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Neutralize
          </button>
        </div>

        <div className="space-y-1">
          <button
            onClick={() => toggleSection("tonal")}
            className="flex w-full items-center justify-between rounded px-2 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <span className="flex items-center gap-2">
              <Sun className="h-3.5 w-3.5" />
              Tonal
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resetSection(["brightness", "contrast", "curves", "levels", "exposure", "shadows", "highlights"]);
                }}
                disabled={isLocked}
                className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset
              </button>
              <span className="text-xs">{expandedSections.tonal ? "v" : ">"}</span>
            </div>
          </button>
          {expandedSections.tonal && (
            <div className="space-y-1 px-2">
              <AdjustmentControl
                label="Brightness"
                icon={<Sun className="h-3 w-3" />}
                value={getFilterValue("brightness")}
                min={-1}
                max={1}
                onUpdate={(v) => setFilterValue("brightness", v)}
                onReset={() => setFilterValue("brightness", DEFAULTS.brightness)}
                disabled={isLocked}
              />
              <AdjustmentControl
                label="Contrast"
                icon={<Contrast className="h-3 w-3" />}
                value={getFilterValue("contrast")}
                min={-1}
                max={1}
                onUpdate={(v) => setFilterValue("contrast", v)}
                onReset={() => setFilterValue("contrast", DEFAULTS.contrast)}
                disabled={isLocked}
              />
              <AdjustmentControl
                label="Curves"
                icon={<Contrast className="h-3 w-3 opacity-70" />}
                value={getFilterValue("curves")}
                min={-1}
                max={1}
                onUpdate={(v) => setFilterValue("curves", v)}
                onReset={() => setFilterValue("curves", DEFAULTS.curves)}
                disabled={isLocked}
              />
              <AdjustmentControl
                label="Levels"
                icon={<Contrast className="h-3 w-3 opacity-70" />}
                value={getFilterValue("levels")}
                min={-1}
                max={1}
                onUpdate={(v) => setFilterValue("levels", v)}
                onReset={() => setFilterValue("levels", DEFAULTS.levels)}
                disabled={isLocked}
              />
              <AdjustmentControl
                label="Exposure"
                icon={<Zap className="h-3 w-3" />}
                value={getFilterValue("exposure")}
                min={-1}
                max={1}
                onUpdate={(v) => setFilterValue("exposure", v)}
                onReset={() => setFilterValue("exposure", DEFAULTS.exposure)}
                disabled={isLocked}
              />
              <AdjustmentControl
                label="Shadows"
                icon={<Eye className="h-3 w-3 opacity-60" />}
                value={getFilterValue("shadows")}
                min={-1}
                max={1}
                onUpdate={(v) => setFilterValue("shadows", v)}
                onReset={() => setFilterValue("shadows", DEFAULTS.shadows)}
                disabled={isLocked}
              />
              <AdjustmentControl
                label="Highlights"
                icon={<EyeOff className="h-3 w-3 opacity-80" />}
                value={getFilterValue("highlights")}
                min={-1}
                max={1}
                onUpdate={(v) => setFilterValue("highlights", v)}
                onReset={() => setFilterValue("highlights", DEFAULTS.highlights)}
                disabled={isLocked}
              />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <button
            onClick={() => toggleSection("color")}
            className="flex w-full items-center justify-between rounded px-2 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <span className="flex items-center gap-2">
              <Palette className="h-3.5 w-3.5" />
              Color
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resetSection(["hue", "saturation", "vibrance", "redBalance", "greenBalance", "blueBalance"]);
                }}
                disabled={isLocked}
                className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset
              </button>
              <span className="text-xs">{expandedSections.color ? "v" : ">"}</span>
            </div>
          </button>
          {expandedSections.color && (
            <div className="space-y-1 px-2">
              <AdjustmentControl
                label="Hue"
                icon={<Palette className="h-3 w-3" />}
                value={getFilterValue("hue")}
                min={-1}
                max={1}
                onUpdate={(v) => setFilterValue("hue", v)}
                onReset={() => setFilterValue("hue", DEFAULTS.hue)}
                disabled={isLocked}
              />
              <AdjustmentControl
                label="Saturation"
                icon={<Palette className="h-3 w-3 opacity-80" />}
                value={getFilterValue("saturation")}
                min={-1}
                max={1}
                onUpdate={(v) => setFilterValue("saturation", v)}
                onReset={() => setFilterValue("saturation", DEFAULTS.saturation)}
                disabled={isLocked}
              />
              <AdjustmentControl
                label="Vibrance"
                icon={<Droplet className="h-3 w-3" />}
                value={getFilterValue("vibrance")}
                min={-1}
                max={1}
                onUpdate={(v) => setFilterValue("vibrance", v)}
                onReset={() => setFilterValue("vibrance", DEFAULTS.vibrance)}
                disabled={isLocked}
              />
              <AdjustmentControl
                label="Red Balance"
                icon={<div className="h-2 w-2 rounded bg-red-500" />}
                value={getFilterValue("redBalance")}
                min={-1}
                max={1}
                onUpdate={(v) => setFilterValue("redBalance", v)}
                onReset={() => setFilterValue("redBalance", DEFAULTS.redBalance)}
                disabled={isLocked}
              />
              <AdjustmentControl
                label="Green Balance"
                icon={<div className="h-2 w-2 rounded bg-green-500" />}
                value={getFilterValue("greenBalance")}
                min={-1}
                max={1}
                onUpdate={(v) => setFilterValue("greenBalance", v)}
                onReset={() => setFilterValue("greenBalance", DEFAULTS.greenBalance)}
                disabled={isLocked}
              />
              <AdjustmentControl
                label="Blue Balance"
                icon={<div className="h-2 w-2 rounded bg-blue-500" />}
                value={getFilterValue("blueBalance")}
                min={-1}
                max={1}
                onUpdate={(v) => setFilterValue("blueBalance", v)}
                onReset={() => setFilterValue("blueBalance", DEFAULTS.blueBalance)}
                disabled={isLocked}
              />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <button
            onClick={() => toggleSection("special")}
            className="flex w-full items-center justify-between rounded px-2 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <span className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" />
              Special
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resetSection(["selectiveColor", "gradientMap", "photoFilter", "channelMixer", "lutPreset"]);
                }}
                disabled={isLocked}
                className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset
              </button>
              <span className="text-xs">{expandedSections.special ? "v" : ">"}</span>
            </div>
          </button>
          {expandedSections.special && (
            <div className="space-y-1 px-2">
              <AdjustmentControl
                label="Selective Color"
                icon={<Palette className="h-3 w-3" />}
                value={getFilterValue("selectiveColor")}
                min={-1}
                max={1}
                onUpdate={(v) => setFilterValue("selectiveColor", v)}
                onReset={() => setFilterValue("selectiveColor", DEFAULTS.selectiveColor)}
                disabled={isLocked}
              />
              <AdjustmentControl
                label="Gradient Map"
                icon={<Palette className="h-3 w-3 opacity-80" />}
                value={getFilterValue("gradientMap")}
                min={-1}
                max={1}
                onUpdate={(v) => setFilterValue("gradientMap", v)}
                onReset={() => setFilterValue("gradientMap", DEFAULTS.gradientMap)}
                disabled={isLocked}
              />
              <AdjustmentControl
                label="Photo Filter"
                icon={<Sun className="h-3 w-3" />}
                value={getFilterValue("photoFilter")}
                min={-1}
                max={1}
                onUpdate={(v) => setFilterValue("photoFilter", v)}
                onReset={() => setFilterValue("photoFilter", DEFAULTS.photoFilter)}
                disabled={isLocked}
              />
              <AdjustmentControl
                label="Channel Mixer"
                icon={<Sliders className="h-3 w-3" />}
                value={getFilterValue("channelMixer")}
                min={-1}
                max={1}
                onUpdate={(v) => setFilterValue("channelMixer", v)}
                onReset={() => setFilterValue("channelMixer", DEFAULTS.channelMixer)}
                disabled={isLocked}
              />
              <div className="space-y-1 py-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                    <Palette className="h-3 w-3" />
                    <span className="font-medium">Color Lookup (LUT)</span>
                  </div>
                </div>
                <select
                  value={Math.round(getFilterValue("lutPreset"))}
                  onChange={(e) => setFilterValue("lutPreset", Number(e.target.value))}
                  disabled={isLocked}
                  className="w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value={0}>None</option>
                  <option value={1}>Crisp Neutral</option>
                  <option value={2}>Cool Film</option>
                  <option value={3}>Warm Retro</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
