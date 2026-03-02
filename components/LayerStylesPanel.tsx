"use client";

import { useState } from "react";
import { Layers, ChevronDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayerStyle {
    dropShadow?: { blur: number; offsetX: number; offsetY: number; spread: number; color: string; opacity: number };
    stroke?: { width: number; color: string; position: "outside" | "inside" | "center" };
    glow?: { blur: number; spread: number; color: string; opacity: number };
    bevel?: { depth: number; direction: "up" | "down"; size: number };
    innerShadow?: { blur: number; offsetX: number; offsetY: number; color: string; opacity: number };
}

interface LayerStylesPanelProps {
    onStyleChange?: (style: LayerStyle) => void;
    currentStyle?: LayerStyle;
    className?: string;
    style?: React.CSSProperties;
}

export default function LayerStylesPanel({
    onStyleChange,
    currentStyle = {},
    className,
    style,
}: LayerStylesPanelProps) {
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        dropShadow: true,
        stroke: true,
        glow: false,
        bevel: false,
        innerShadow: false,
    });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const updateStyle = (key: string, value: any) => {
        const newStyle = { ...currentStyle, [key]: value };
        onStyleChange?.(newStyle);
    };

    return (
        <div className={cn("flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 overflow-hidden", className)} style={style}>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 p-3">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Layer Styles
                </h3>
            </div>

            <div className="overflow-y-auto flex-1 p-3 space-y-2">
                {/* DROP SHADOW */}
                <div className="space-y-1">
                    <button
                        onClick={() => toggleSection('dropShadow')}
                        className="w-full flex items-center justify-between px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
                    >
                        <span>Drop Shadow</span>
                        <ChevronDown className={cn(
                            "h-3.5 w-3.5 transition-transform",
                            expandedSections.dropShadow && "rotate-180"
                        )} />
                    </button>
                    {expandedSections.dropShadow && (
                        <div className="px-2 space-y-2 py-2 bg-zinc-50 dark:bg-zinc-900/30 rounded">
                            <label className="space-y-1 text-[10px] block">
                                <span className="text-zinc-600 dark:text-zinc-400">Blur</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={50}
                                    value={currentStyle.dropShadow?.blur ?? 8}
                                    onChange={(e) => updateStyle('dropShadow', { ...currentStyle.dropShadow, blur: parseFloat(e.target.value) })}
                                    className="w-full h-1 cursor-pointer appearance-none rounded-full bg-zinc-300 accent-blue-500 dark:bg-zinc-700"
                                />
                            </label>
                            <label className="space-y-1 text-[10px] block">
                                <span className="text-zinc-600 dark:text-zinc-400">Spread</span>
                                <input
                                    type="range"
                                    min={-20}
                                    max={50}
                                    value={currentStyle.dropShadow?.spread ?? 0}
                                    onChange={(e) => updateStyle('dropShadow', { ...currentStyle.dropShadow, spread: parseFloat(e.target.value) })}
                                    className="w-full h-1 cursor-pointer appearance-none rounded-full bg-zinc-300 accent-blue-500 dark:bg-zinc-700"
                                />
                            </label>
                            <label className="space-y-1 text-[10px] block">
                                <span className="text-zinc-600 dark:text-zinc-400">Opacity</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={(currentStyle.dropShadow?.opacity ?? 0.7) * 100}
                                    onChange={(e) => updateStyle('dropShadow', { ...currentStyle.dropShadow, opacity: parseFloat(e.target.value) / 100 })}
                                    className="w-full h-1 cursor-pointer appearance-none rounded-full bg-zinc-300 accent-blue-500 dark:bg-zinc-700"
                                />
                            </label>
                            <label className="space-y-1 text-[10px] block">
                                <span className="text-zinc-600 dark:text-zinc-400">Color</span>
                                <input
                                    type="color"
                                    value={currentStyle.dropShadow?.color ?? '#000000'}
                                    onChange={(e) => updateStyle('dropShadow', { ...currentStyle.dropShadow, color: e.target.value })}
                                    className="w-full h-8 rounded border border-zinc-300 dark:border-zinc-700 cursor-pointer"
                                />
                            </label>
                        </div>
                    )}
                </div>

                {/* STROKE */}
                <div className="space-y-1">
                    <button
                        onClick={() => toggleSection('stroke')}
                        className="w-full flex items-center justify-between px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
                    >
                        <span>Stroke</span>
                        <ChevronDown className={cn(
                            "h-3.5 w-3.5 transition-transform",
                            expandedSections.stroke && "rotate-180"
                        )} />
                    </button>
                    {expandedSections.stroke && (
                        <div className="px-2 space-y-2 py-2 bg-zinc-50 dark:bg-zinc-900/30 rounded">
                            <label className="space-y-1 text-[10px] block">
                                <span className="text-zinc-600 dark:text-zinc-400">Width (px)</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={20}
                                    value={currentStyle.stroke?.width ?? 2}
                                    onChange={(e) => updateStyle('stroke', { ...currentStyle.stroke, width: parseFloat(e.target.value) })}
                                    className="w-full h-1 cursor-pointer appearance-none rounded-full bg-zinc-300 accent-blue-500 dark:bg-zinc-700"
                                />
                            </label>
                            <label className="space-y-1 text-[10px] block">
                                <span className="text-zinc-600 dark:text-zinc-400">Position</span>
                                <select
                                    value={currentStyle.stroke?.position ?? 'outside'}
                                    onChange={(e) => updateStyle('stroke', { ...currentStyle.stroke, position: e.target.value as any })}
                                    className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                                >
                                    <option value="outside">Outside</option>
                                    <option value="inside">Inside</option>
                                    <option value="center">Center</option>
                                </select>
                            </label>
                            <label className="space-y-1 text-[10px] block">
                                <span className="text-zinc-600 dark:text-zinc-400">Color</span>
                                <input
                                    type="color"
                                    value={currentStyle.stroke?.color ?? '#000000'}
                                    onChange={(e) => updateStyle('stroke', { ...currentStyle.stroke, color: e.target.value })}
                                    className="w-full h-8 rounded border border-zinc-300 dark:border-zinc-700 cursor-pointer"
                                />
                            </label>
                        </div>
                    )}
                </div>

                {/* GLOW (OUTER SHADOW) */}
                <div className="space-y-1">
                    <button
                        onClick={() => toggleSection('glow')}
                        className="w-full flex items-center justify-between px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
                    >
                        <span>Glow</span>
                        <ChevronDown className={cn(
                            "h-3.5 w-3.5 transition-transform",
                            expandedSections.glow && "rotate-180"
                        )} />
                    </button>
                    {expandedSections.glow && (
                        <div className="px-2 space-y-2 py-2 bg-zinc-50 dark:bg-zinc-900/30 rounded">
                            <label className="space-y-1 text-[10px] block">
                                <span className="text-zinc-600 dark:text-zinc-400">Blur</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={50}
                                    value={currentStyle.glow?.blur ?? 10}
                                    onChange={(e) => updateStyle('glow', { ...currentStyle.glow, blur: parseFloat(e.target.value) })}
                                    className="w-full h-1 cursor-pointer appearance-none rounded-full bg-zinc-300 accent-cyan-500 dark:bg-zinc-700"
                                />
                            </label>
                            <label className="space-y-1 text-[10px] block">
                                <span className="text-zinc-600 dark:text-zinc-400">Spread</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={50}
                                    value={currentStyle.glow?.spread ?? 5}
                                    onChange={(e) => updateStyle('glow', { ...currentStyle.glow, spread: parseFloat(e.target.value) })}
                                    className="w-full h-1 cursor-pointer appearance-none rounded-full bg-zinc-300 accent-cyan-500 dark:bg-zinc-700"
                                />
                            </label>
                            <label className="space-y-1 text-[10px] block">
                                <span className="text-zinc-600 dark:text-zinc-400">Color</span>
                                <input
                                    type="color"
                                    value={currentStyle.glow?.color ?? '#00ffff'}
                                    onChange={(e) => updateStyle('glow', { ...currentStyle.glow, color: e.target.value })}
                                    className="w-full h-8 rounded border border-zinc-300 dark:border-zinc-700 cursor-pointer"
                                />
                            </label>
                        </div>
                    )}
                </div>

                {/* BEVEL */}
                <div className="space-y-1">
                    <button
                        onClick={() => toggleSection('bevel')}
                        className="w-full flex items-center justify-between px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
                    >
                        <span>Bevel & Emboss</span>
                        <ChevronDown className={cn(
                            "h-3.5 w-3.5 transition-transform",
                            expandedSections.bevel && "rotate-180"
                        )} />
                    </button>
                    {expandedSections.bevel && (
                        <div className="px-2 space-y-2 py-2 bg-zinc-50 dark:bg-zinc-900/30 rounded">
                            <label className="space-y-1 text-[10px] block">
                                <span className="text-zinc-600 dark:text-zinc-400">Size (px)</span>
                                <input
                                    type="range"
                                    min={1}
                                    max={20}
                                    value={currentStyle.bevel?.size ?? 5}
                                    onChange={(e) => updateStyle('bevel', { ...currentStyle.bevel, size: parseFloat(e.target.value) })}
                                    className="w-full h-1 cursor-pointer appearance-none rounded-full bg-zinc-300 accent-blue-500 dark:bg-zinc-700"
                                />
                            </label>
                            <label className="space-y-1 text-[10px] block">
                                <span className="text-zinc-600 dark:text-zinc-400">Direction</span>
                                <select
                                    value={currentStyle.bevel?.direction ?? 'up'}
                                    onChange={(e) => updateStyle('bevel', { ...currentStyle.bevel, direction: e.target.value as any })}
                                    className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                                >
                                    <option value="up">Up</option>
                                    <option value="down">Down</option>
                                </select>
                            </label>
                            <label className="space-y-1 text-[10px] block">
                                <span className="text-zinc-600 dark:text-zinc-400">Depth</span>
                                <input
                                    type="range"
                                    min={-100}
                                    max={100}
                                    value={currentStyle.bevel?.depth ?? 100}
                                    onChange={(e) => updateStyle('bevel', { ...currentStyle.bevel, depth: parseFloat(e.target.value) })}
                                    className="w-full h-1 cursor-pointer appearance-none rounded-full bg-zinc-300 accent-blue-500 dark:bg-zinc-700"
                                />
                            </label>
                        </div>
                    )}
                </div>

                {/* INNER SHADOW */}
                <div className="space-y-1">
                    <button
                        onClick={() => toggleSection('innerShadow')}
                        className="w-full flex items-center justify-between px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
                    >
                        <span>Inner Shadow</span>
                        <ChevronDown className={cn(
                            "h-3.5 w-3.5 transition-transform",
                            expandedSections.innerShadow && "rotate-180"
                        )} />
                    </button>
                    {expandedSections.innerShadow && (
                        <div className="px-2 space-y-2 py-2 bg-zinc-50 dark:bg-zinc-900/30 rounded">
                            <label className="space-y-1 text-[10px] block">
                                <span className="text-zinc-600 dark:text-zinc-400">Blur</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={50}
                                    value={currentStyle.innerShadow?.blur ?? 8}
                                    onChange={(e) => updateStyle('innerShadow', { ...currentStyle.innerShadow, blur: parseFloat(e.target.value) })}
                                    className="w-full h-1 cursor-pointer appearance-none rounded-full bg-zinc-300 accent-blue-500 dark:bg-zinc-700"
                                />
                            </label>
                            <label className="space-y-1 text-[10px] block">
                                <span className="text-zinc-600 dark:text-zinc-400">Opacity</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={(currentStyle.innerShadow?.opacity ?? 0.5) * 100}
                                    onChange={(e) => updateStyle('innerShadow', { ...currentStyle.innerShadow, opacity: parseFloat(e.target.value) / 100 })}
                                    className="w-full h-1 cursor-pointer appearance-none rounded-full bg-zinc-300 accent-blue-500 dark:bg-zinc-700"
                                />
                            </label>
                        </div>
                    )}
                </div>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 p-3 space-y-2">
                <button className="w-full px-3 py-1.5 rounded text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors">
                    Apply Styles
                </button>
                <button className="w-full px-3 py-1.5 rounded text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    Reset
                </button>
            </div>
        </div>
    );
}
