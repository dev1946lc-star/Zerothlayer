"use client";

import { useLayerStore } from "@/lib/store";
import { Sliders, Sun, Contrast, Droplet, Move, Zap, Eye, EyeOff, Sparkles, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

// Extracted outside to prevent re-mounting on every render
const FilterControl = ({
    label,
    icon: Icon,
    value,
    min,
    max,
    step = 0.01,
    defaultValue = 0,
    onUpdate,
    onReset,
    disabled = false
}: {
    label: string,
    icon: any,
    value: number,
    min: number,
    max: number,
    step?: number,
    defaultValue?: number,
    onUpdate: (val: number) => void,
    onReset: () => void,
    disabled?: boolean
}) => {
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                    <Icon className="h-3 w-3" />
                    <span>{label}</span>
                </div>
                <span className="font-medium text-zinc-500">{Math.round(value * 100)}</span>
            </div>
            <div className="flex gap-2">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onUpdate(parseFloat(e.target.value))}
                    disabled={disabled}
                    className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                    onClick={onReset}
                    disabled={disabled}
                    className="text-[10px] text-zinc-400 hover:text-blue-500"
                    title="Reset"
                >
                    R
                </button>
            </div>
        </div>
    );
};

interface PropertiesPanelProps {
    className?: string;
    style?: React.CSSProperties;
    onCreateMask?: () => void;
    onInvertMask?: () => void;
    onFeatherMask?: (amount: number) => void;
}

export default function PropertiesPanel({ className, style, onCreateMask, onInvertMask, onFeatherMask }: PropertiesPanelProps) {
    const {
        layers,
        activeLayerId,
        setLayerFilter,
        updateLayer,
        setAiPromptDraft,
        setLayerMask,
        maskPreviewMode,
        setMaskPreviewMode
    } = useLayerStore();

    if (!activeLayerId) {
        return (
            <div className={cn("flex flex-col bg-white p-4 dark:bg-zinc-900 overflow-y-auto overflow-x-hidden", className)} style={style}>
                <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Properties</h3>
                </div>
                <div className="flex flex-col items-center justify-center flex-1 text-zinc-400 gap-2">
                    <Sliders className="h-8 w-8 opacity-20" />
                    <span className="text-xs text-center">Select a layer</span>
                </div>
            </div>
        );
    }

    const activeLayer = layers.find(l => l.id === activeLayerId);

    if (!activeLayer) return null;
    const isLocked = Boolean(activeLayer.locked);
    const isAdjustmentLayer = activeLayer.type === 'adjustment';

    const getVal = (key: string, def = 0) => {
        // @ts-ignore - safe dynamic access
        return activeLayer[key] ?? activeLayer.filters?.[key] ?? def;
    };
    const update = (key: string, val: number) => {
        if (isLocked) return;
        setLayerFilter(activeLayer.id, key, val);
    };

    return (
        <div className={cn("flex flex-col h-full font-sans text-foreground", className)} style={style}>
            <div className="flex items-center justify-between border-b border-zinc-200/50 px-4 py-3 dark:border-zinc-800/50 shrink-0">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Properties</h3>
            </div>

            <div className="overflow-y-auto overflow-x-hidden p-4 space-y-6 flex-1">
                {/* Transform (Placeholder) */}
                <div className="space-y-3">
                    <h4 className="flex items-center gap-2 text-[10px] font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-widest opacity-80">
                        <Move className="h-3 w-3" /> Transform
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
                        <label className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
                            <div className="mb-1 text-[9px] uppercase tracking-wider opacity-70">Layer Name</div>
                            <input
                                type="text"
                                value={activeLayer.name}
                                disabled={isLocked}
                                onChange={(e) => {
                                    if (isLocked) return;
                                    updateLayer(activeLayer.id, { name: e.target.value });
                                }}
                                className="w-full bg-transparent text-xs font-medium outline-none disabled:opacity-50"
                            />
                        </label>
                        <label className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
                            <div className="mb-1 text-[9px] uppercase tracking-wider opacity-70">Layer Type</div>
                            <select
                                value={activeLayer.type}
                                disabled={isLocked}
                                onChange={(e) => {
                                    if (isLocked) return;
                                    updateLayer(activeLayer.id, { type: e.target.value as typeof activeLayer.type });
                                }}
                                className="w-full bg-transparent text-xs font-medium outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="image">Image</option>
                                <option value="adjustment">Adjustment</option>
                                <option value="smart">Smart</option>
                                <option value="group">Group</option>
                                <option value="text">Text</option>
                                <option value="shape">Shape</option>
                                <option value="video">Video</option>
                                <option value="threeD">3D</option>
                            </select>
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
                        <div className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-1">
                                <div className="text-[9px] uppercase tracking-wider opacity-70">Opacity</div>
                                <div className="font-mono text-[10px] text-zinc-500">{Math.round(activeLayer.opacity * 100)}%</div>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={activeLayer.opacity}
                                onChange={(e) => {
                                    if (isLocked) return;
                                    updateLayer(activeLayer.id, { opacity: parseFloat(e.target.value) });
                                }}
                                disabled={isLocked}
                                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-zinc-900 dark:accent-white dark:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                        <div className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 flex flex-col justify-between">
                            <div className="mb-1 text-[9px] uppercase tracking-wider opacity-70">Blend</div>
                                <select
                                    value={activeLayer.blendMode}
                                    onChange={(e) => {
                                        if (isLocked) return;
                                        updateLayer(activeLayer.id, { blendMode: e.target.value });
                                    }}
                                    disabled={isLocked}
                                    className="w-full bg-transparent text-xs font-medium outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                <option value="normal">Normal</option>
                                <option value="multiply">Multiply</option>
                                <option value="screen">Screen</option>
                                <option value="overlay">Overlay</option>
                                <option value="darken">Darken</option>
                                <option value="lighten">Lighten</option>
                                <option value="color-dodge">Color Dodge</option>
                                <option value="color-burn">Color Burn</option>
                                <option value="hard-light">Hard Light</option>
                                <option value="soft-light">Soft Light</option>
                                <option value="difference">Difference</option>
                                <option value="exclusion">Exclusion</option>
                            </select>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            if (isLocked) return;
                            updateLayer(activeLayer.id, { smartObject: !activeLayer.smartObject });
                        }}
                        disabled={isLocked}
                        className={cn(
                            "w-full rounded-lg border px-2.5 py-2 text-left text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                            activeLayer.smartObject
                                ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300"
                                : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-700/60"
                        )}
                    >
                        {activeLayer.smartObject ? "Smart Object Enabled" : "Convert to Smart Object"}
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
                            <div className="flex items-center justify-between mb-1 text-[9px] uppercase tracking-wider opacity-70">
                                <span>Fill Opacity</span>
                                <span className="font-mono text-[10px]">{Math.round((activeLayer.fillOpacity ?? 1) * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={activeLayer.fillOpacity ?? 1}
                                onChange={(e) => {
                                    if (isLocked) return;
                                    updateLayer(activeLayer.id, { fillOpacity: parseFloat(e.target.value) });
                                }}
                                disabled={isLocked}
                                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-zinc-900 dark:accent-white dark:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                        <label className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 text-[10px] text-zinc-600 dark:text-zinc-300 flex items-center justify-between">
                            <span className="uppercase tracking-wide">Clip To Below</span>
                            <input
                                type="checkbox"
                                checked={Boolean(activeLayer.clippingMask)}
                                disabled={isLocked}
                                onChange={(e) => {
                                    if (isLocked) return;
                                    updateLayer(activeLayer.id, { clippingMask: e.target.checked });
                                }}
                            />
                        </label>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-80">Layer Styles</h4>
                        <FilterControl
                            label="Drop Shadow"
                            icon={EyeOff}
                            value={activeLayer.layerStyle?.dropShadow ?? 0}
                            min={0}
                            max={1}
                            onUpdate={(v) => updateLayer(activeLayer.id, { layerStyle: { ...(activeLayer.layerStyle || {}), dropShadow: v } })}
                            onReset={() => updateLayer(activeLayer.id, { layerStyle: { ...(activeLayer.layerStyle || {}), dropShadow: 0 } })}
                        />
                        <FilterControl
                            label="Stroke"
                            icon={Contrast}
                            value={activeLayer.layerStyle?.stroke ?? 0}
                            min={0}
                            max={1}
                            onUpdate={(v) => updateLayer(activeLayer.id, { layerStyle: { ...(activeLayer.layerStyle || {}), stroke: v } })}
                            onReset={() => updateLayer(activeLayer.id, { layerStyle: { ...(activeLayer.layerStyle || {}), stroke: 0 } })}
                        />
                        <FilterControl
                            label="Glow"
                            icon={Sparkles}
                            value={activeLayer.layerStyle?.glow ?? 0}
                            min={0}
                            max={1}
                            onUpdate={(v) => updateLayer(activeLayer.id, { layerStyle: { ...(activeLayer.layerStyle || {}), glow: v } })}
                            onReset={() => updateLayer(activeLayer.id, { layerStyle: { ...(activeLayer.layerStyle || {}), glow: 0 } })}
                        />
                        <FilterControl
                            label="Bevel"
                            icon={Move}
                            value={activeLayer.layerStyle?.bevel ?? 0}
                            min={0}
                            max={1}
                            onUpdate={(v) => updateLayer(activeLayer.id, { layerStyle: { ...(activeLayer.layerStyle || {}), bevel: v } })}
                            onReset={() => updateLayer(activeLayer.id, { layerStyle: { ...(activeLayer.layerStyle || {}), bevel: 0 } })}
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="flex items-center gap-2 text-[10px] font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-widest opacity-80">
                        <Eye className="h-3 w-3" /> Mask
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={onCreateMask}
                            disabled={isLocked}
                            className="rounded-md px-2 py-1.5 text-[10px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Create from Selection
                        </button>
                        <button
                            type="button"
                            onClick={() => setMaskPreviewMode(!maskPreviewMode)}
                            disabled={!activeLayer.mask}
                            className="rounded-md px-2 py-1.5 text-[10px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {maskPreviewMode ? "Hide Preview" : "Show Preview"}
                        </button>
                        <button
                            type="button"
                            onClick={onInvertMask}
                            disabled={isLocked || !activeLayer.mask}
                            className="rounded-md px-2 py-1.5 text-[10px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Invert Mask
                        </button>
                        <button
                            type="button"
                            onClick={() => setLayerMask(activeLayer.id, null)}
                            disabled={isLocked || !activeLayer.mask}
                            className="rounded-md px-2 py-1.5 text-[10px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Delete Mask
                        </button>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
                        <div className="mb-1 text-[9px] uppercase tracking-wider opacity-70">Mask Feather (px)</div>
                        <input
                            type="number"
                            min={0}
                            defaultValue={0}
                            disabled={isLocked || !activeLayer.mask}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onFeatherMask?.(parseInt(e.currentTarget.value, 10) || 0);
                                }
                            }}
                            className="w-full bg-transparent text-xs font-medium outline-none disabled:opacity-50"
                        />
                    </div>
                </div>

                {/* AI Metadata (for AI-generated layers) */}
                {activeLayer.aiData && (
                    <div className="space-y-3">
                        <h4 className="flex items-center gap-2 text-[10px] font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-widest opacity-80">
                            <Sparkles className="h-3 w-3" /> AI
                        </h4>
                        <div className="rounded-lg border border-zinc-200/60 dark:border-zinc-700/70 bg-zinc-50/80 dark:bg-zinc-900/60 p-3 space-y-2">
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                <span className="font-semibold text-zinc-700 dark:text-zinc-200">Prompt:</span>{" "}
                                <span className="break-words">{activeLayer.aiData.prompt}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
                                <span>
                                    Provider: <span className="font-medium uppercase">{activeLayer.aiData.provider}</span>
                                </span>
                                {typeof activeLayer.aiData.seed === 'number' && (
                                    <span>Seed: <span className="font-mono">{activeLayer.aiData.seed}</span></span>
                                )}
                            </div>
                            {activeLayer.aiData.context && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                    {activeLayer.aiData.context.style && (
                                        <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-300">
                                            Style: {String(activeLayer.aiData.context.style)}
                                        </span>
                                    )}
                                    {activeLayer.aiData.context.lighting && (
                                        <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-300">
                                            Lighting: {String(activeLayer.aiData.context.lighting)}
                                        </span>
                                    )}
                                </div>
                            )}
                            {(() => {
                                const basePrompt = activeLayer.aiData?.prompt || "";
                                return (
                                    <>
                                        <div className="flex justify-end pt-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (activeLayer.aiData?.prompt) {
                                            setAiPromptDraft(activeLayer.aiData.prompt);
                                        }
                                    }}
                                    className="mr-2 text-[10px] font-medium px-2 py-1 rounded-md bg-blue-100 hover:bg-blue-200 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 transition-colors"
                                >
                                    Re-prompt
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (navigator?.clipboard && activeLayer.aiData) {
                                            navigator.clipboard.writeText(activeLayer.aiData.prompt).catch(() => { });
                                        }
                                    }}
                                    className="text-[10px] font-medium px-2 py-1 rounded-md bg-zinc-200/80 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors"
                                >
                                    Copy prompt
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setAiPromptDraft(`${basePrompt}. Make it subtler.`)}
                                    className="text-[10px] px-2 py-1 rounded-full bg-zinc-200/70 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors"
                                >
                                    Make it subtler
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAiPromptDraft(`${basePrompt}. Increase intensity.`)}
                                    className="text-[10px] px-2 py-1 rounded-full bg-zinc-200/70 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors"
                                >
                                    Increase intensity
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAiPromptDraft(`${basePrompt}. Match lighting to base image.`)}
                                    className="text-[10px] px-2 py-1 rounded-full bg-zinc-200/70 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors"
                                >
                                    Match lighting
                                </button>
                            </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* Adjustments */}
                <div className="space-y-4">
                    <h4 className="flex items-center gap-2 text-[10px] font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-widest opacity-80">
                        <Sliders className="h-3 w-3" /> Adjustments
                    </h4>
                    {isAdjustmentLayer && (
                        <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/70 px-3 py-2 text-[10px] text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                            Editing adjustment layer settings. Filters here are applied non-destructively.
                        </div>
                    )}

                    <div className="space-y-4">
                        <FilterControl
                            label="Brightness"
                            icon={Sun}
                            value={getVal('brightness')}
                            min={-1}
                            max={1}
                            onUpdate={(v) => update('brightness', v)}
                            onReset={() => update('brightness', 0)}
                        />
                        <FilterControl
                            label="Contrast"
                            icon={Contrast}
                            value={getVal('contrast')}
                            min={-1}
                            max={1}
                            onUpdate={(v) => update('contrast', v)}
                            onReset={() => update('contrast', 0)}
                        />
                        <FilterControl
                            label="Curves"
                            icon={Move}
                            value={getVal('curves')}
                            min={-1}
                            max={1}
                            onUpdate={(v) => update('curves', v)}
                            onReset={() => update('curves', 0)}
                        />
                        <FilterControl
                            label="Levels"
                            icon={Contrast}
                            value={getVal('levels')}
                            min={-1}
                            max={1}
                            onUpdate={(v) => update('levels', v)}
                            onReset={() => update('levels', 0)}
                        />
                        <FilterControl
                            label="Exposure"
                            icon={Sun}
                            value={getVal('exposure')}
                            min={-1}
                            max={1}
                            onUpdate={(v) => update('exposure', v)}
                            onReset={() => update('exposure', 0)}
                        />
                        <FilterControl
                            label="Shadows"
                            icon={Eye}
                            value={getVal('shadows')}
                            min={-1}
                            max={1}
                            onUpdate={(v) => update('shadows', v)}
                            onReset={() => update('shadows', 0)}
                        />
                        <FilterControl
                            label="Highlights"
                            icon={EyeOff}
                            value={getVal('highlights')}
                            min={-1}
                            max={1}
                            onUpdate={(v) => update('highlights', v)}
                            onReset={() => update('highlights', 0)}
                        />
                        <FilterControl
                            label="Saturation"
                            icon={Droplet}
                            value={getVal('saturation')}
                            min={-1}
                            max={1}
                            onUpdate={(v) => update('saturation', v)}
                            onReset={() => update('saturation', 0)}
                        />
                        <FilterControl
                            label="Vibrance"
                            icon={Zap}
                            value={getVal('vibrance')}
                            min={-1}
                            max={1}
                            onUpdate={(v) => update('vibrance', v)}
                            onReset={() => update('vibrance', 0)}
                        />
                        <FilterControl
                            label="Hue"
                            icon={Move}
                            value={getVal('hue')}
                            min={-1}
                            max={1}
                            onUpdate={(v) => update('hue', v)}
                            onReset={() => update('hue', 0)}
                        />
                        <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-3">
                            <h4 className="flex items-center gap-2 text-[10px] font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-widest opacity-80">
                                <Palette className="h-3 w-3" /> Color Balance
                            </h4>
                            <FilterControl
                                label="Red"
                                icon={Sun}
                                value={getVal('redBalance')}
                                min={-1}
                                max={1}
                                onUpdate={(v) => update('redBalance', v)}
                                onReset={() => update('redBalance', 0)}
                            />
                            <FilterControl
                                label="Green"
                                icon={Droplet}
                                value={getVal('greenBalance')}
                                min={-1}
                                max={1}
                                onUpdate={(v) => update('greenBalance', v)}
                                onReset={() => update('greenBalance', 0)}
                            />
                            <FilterControl
                                label="Blue"
                                icon={Contrast}
                                value={getVal('blueBalance')}
                                min={-1}
                                max={1}
                                onUpdate={(v) => update('blueBalance', v)}
                                onReset={() => update('blueBalance', 0)}
                            />
                        </div>
                        <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-3">
                            <h4 className="flex items-center gap-2 text-[10px] font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-widest opacity-80">
                                <Palette className="h-3 w-3" /> Color Tools
                            </h4>
                            <FilterControl
                                label="Selective Color"
                                icon={Palette}
                                value={getVal('selectiveColor')}
                                min={-1}
                                max={1}
                                onUpdate={(v) => update('selectiveColor', v)}
                                onReset={() => update('selectiveColor', 0)}
                            />
                            <FilterControl
                                label="Gradient Map"
                                icon={Palette}
                                value={getVal('gradientMap')}
                                min={-1}
                                max={1}
                                onUpdate={(v) => update('gradientMap', v)}
                                onReset={() => update('gradientMap', 0)}
                            />
                            <FilterControl
                                label="Photo Filter"
                                icon={Sun}
                                value={getVal('photoFilter')}
                                min={-1}
                                max={1}
                                onUpdate={(v) => update('photoFilter', v)}
                                onReset={() => update('photoFilter', 0)}
                            />
                            <FilterControl
                                label="Channel Mixer"
                                icon={Sliders}
                                value={getVal('channelMixer')}
                                min={-1}
                                max={1}
                                onUpdate={(v) => update('channelMixer', v)}
                                onReset={() => update('channelMixer', 0)}
                            />
                            <div className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
                                <div className="mb-1 text-[9px] uppercase tracking-wider opacity-70">Color Lookup (LUT)</div>
                                <select
                                    value={Math.round(getVal('lutPreset', 0))}
                                    onChange={(e) => update('lutPreset', Number(e.target.value))}
                                    className="w-full bg-transparent text-xs font-medium outline-none cursor-pointer"
                                >
                                    <option value={0}>None</option>
                                    <option value={1}>Crisp Neutral</option>
                                    <option value={2}>Cool Film</option>
                                    <option value={3}>Warm Retro</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => update('grayscale', getVal('grayscale') > 0 ? 0 : 1)}
                                    className="rounded-md px-2 py-1.5 text-[10px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                                >
                                    Black & White
                                </button>
                                <button
                                    type="button"
                                    onClick={() => update('selectiveColor', getVal('selectiveColor') === 0 ? 0.35 : 0)}
                                    className="rounded-md px-2 py-1.5 text-[10px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                                >
                                    Match/Replace Color
                                </button>
                            </div>
                        </div>
                        <FilterControl
                            label="Blur"
                            icon={EyeOff}
                            value={getVal('blur')}
                            min={0}
                            max={1}
                            step={0.01}
                            onUpdate={(v) => update('blur', v)}
                            onReset={() => update('blur', 0)}
                        />
                        <FilterControl
                            label="Noise"
                            icon={Eye}
                            value={getVal('noise')}
                            min={0}
                            max={100}
                            step={1}
                            onUpdate={(v) => update('noise', v)}
                            onReset={() => update('noise', 0)}
                        />
                        <FilterControl
                            label="Pixelate"
                            icon={Sliders}
                            value={getVal('pixelate', 1)}
                            min={1}
                            max={20}
                            step={1}
                            defaultValue={1}
                            onUpdate={(v) => update('pixelate', v)}
                            onReset={() => update('pixelate', 1)}
                        />
                        {/* Boolean-ish Filters acting as Toggles */}
                        <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50 grid grid-cols-2 gap-2">
                            <h4 className="col-span-2 text-[10px] font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-widest opacity-80 mb-2">Effects</h4>
                            <FilterControl
                                label="Sepia"
                                icon={Sun}
                                value={getVal('sepia')}
                                min={0}
                                max={1}
                                step={1}
                                onUpdate={(v) => update('sepia', v)}
                                onReset={() => update('sepia', 0)}
                            />
                            <FilterControl
                                label="B&W"
                                icon={Contrast}
                                value={getVal('grayscale')}
                                min={0}
                                max={1}
                                step={1}
                                onUpdate={(v) => update('grayscale', v)}
                                onReset={() => update('grayscale', 0)}
                            />
                            <FilterControl
                                label="Invert"
                                icon={Zap}
                                value={getVal('invert')}
                                min={0}
                                max={1}
                                step={1}
                                onUpdate={(v) => update('invert', v)}
                                onReset={() => update('invert', 0)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
