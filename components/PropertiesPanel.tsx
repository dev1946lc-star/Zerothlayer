"use client";

import { useLayerStore } from "@/lib/store";
import { Sliders, Sun, Contrast, Droplet, Move, Zap, Eye, EyeOff } from "lucide-react";
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
    onReset
}: {
    label: string,
    icon: any,
    value: number,
    min: number,
    max: number,
    step?: number,
    defaultValue?: number,
    onUpdate: (val: number) => void,
    onReset: () => void
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
                    className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700"
                />
                <button
                    onClick={onReset}
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
}

export default function PropertiesPanel({ className, style }: PropertiesPanelProps) {
    const { layers, activeLayerId, setLayerFilter, updateLayer } = useLayerStore();

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

    const getVal = (key: string, def = 0) => {
        // @ts-ignore - safe dynamic access
        return activeLayer[key] ?? activeLayer.filters?.[key] ?? def;
    };
    const update = (key: string, val: number) => setLayerFilter(activeLayer.id, key, val);

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
                                onChange={(e) => updateLayer(activeLayer.id, { opacity: parseFloat(e.target.value) })}
                                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-zinc-900 dark:accent-white dark:bg-zinc-700"
                            />
                        </div>
                        <div className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 flex flex-col justify-between">
                            <div className="mb-1 text-[9px] uppercase tracking-wider opacity-70">Blend</div>
                            <select
                                value={activeLayer.blendMode}
                                onChange={(e) => updateLayer(activeLayer.id, { blendMode: e.target.value })}
                                className="w-full bg-transparent text-xs font-medium outline-none cursor-pointer"
                            >
                                <option value="normal">Normal</option>
                                <option value="multiply">Multiply</option>
                                <option value="screen">Screen</option>
                                <option value="overlay">Overlay</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Adjustments */}
                <div className="space-y-4">
                    <h4 className="flex items-center gap-2 text-[10px] font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-widest opacity-80">
                        <Sliders className="h-3 w-3" /> Adjustments
                    </h4>

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
