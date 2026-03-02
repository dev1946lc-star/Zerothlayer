"use strict";
import { useLayerStore, Layer } from "@/lib/store";
import { Eye, EyeOff, Lock, Unlock, Trash2, GripVertical, Image as ImageIcon, Scissors, MousePointer2, Crop } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface LayerPanelProps {
    onCreateMask?: () => void;
    onInvertMask?: () => void;
    onFeatherMask?: (amount: number) => void;
    onCrop?: () => void;
}

export default function LayerPanel({ onCreateMask, onInvertMask, onFeatherMask, onCrop }: LayerPanelProps) {
    const {
        layers,
        activeLayerId,
        setActiveLayer,
        updateLayer,
        removeLayer,
        reorderLayers,
        setLayerMask,
        toggleLayerMask,
        maskPreviewMode,
        setMaskPreviewMode
    } = useLayerStore();

    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData("text/plain", index.toString());
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const sourceIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
        if (isNaN(sourceIndex)) return;
        if (sourceIndex === targetIndex) return;
        reorderLayers(sourceIndex, targetIndex);
    };

    return (
        <div className="flex h-full w-full flex-col font-sans text-foreground">
            <div className="flex items-center justify-between px-4 py-3 shrink-0">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Layers</h3>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onCreateMask}
                        title="Create Mask from Selection"
                        className="rounded-full p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <Scissors className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                    </button>
                    <button
                        onClick={onCrop}
                        title="Crop to Selection"
                        className="rounded-full p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <Crop className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                    </button>
                    <span className="text-[10px] font-mono text-zinc-400 px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/50">{layers.length}</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2">
                {layers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-zinc-400">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center">
                            <ImageIcon className="h-3.5 w-3.5 opacity-50" />
                        </div>
                        <span className="text-xs opacity-50">No layers</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-0.5">
                        {layers.map((layer, index) => (
                            <div key={layer.id} className="space-y-2">
                                <div
                                    draggable={!layer.locked}
                                    onDragStart={(e: React.DragEvent) => handleDragStart(e, index)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, index)}
                                    onClick={() => setActiveLayer(layer.id)}
                                    className={cn(
                                        "group flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-all duration-200 border border-transparent",
                                        activeLayerId === layer.id
                                            ? "bg-blue-50/50 dark:bg-blue-500/10 border-blue-200/50 dark:border-blue-500/20"
                                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 border-transparent"
                                    )}
                                >
                                    <GripVertical className={cn("h-3.5 w-3.5 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-zinc-600", layer.locked ? "cursor-not-allowed" : "cursor-move")} />

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            updateLayer(layer.id, { visible: !layer.visible });
                                        }}
                                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                    >
                                        {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-zinc-300" />}
                                    </button>

                                    <div className="flex flex-1 items-center gap-2 overflow-hidden min-w-0">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white shadow-sm border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700/50 overflow-hidden">
                                            {layer.thumbnail ? (
                                                <img src={layer.thumbnail} alt={layer.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="h-3 w-3 text-zinc-400" />
                                            )}
                                        </div>

                                        {layer.mask && (
                                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-black dark:border-zinc-700/50 overflow-hidden relative">
                                                <div className="absolute inset-0 bg-white rounded-sm m-0.5" />
                                            </div>
                                        )}

                                        <span className={cn(
                                            "truncate text-xs font-medium",
                                            !layer.visible && "text-zinc-400 line-through decoration-zinc-300"
                                        )}>
                                            {layer.name}
                                        </span>
                                        <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                            {layer.type}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                        {layer.mask && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (layer.locked) return;
                                                    toggleLayerMask(layer.id);
                                                }}
                                                disabled={layer.locked}
                                                title={layer.mask.visible ? "Disable Mask" : "Enable Mask"}
                                                className={cn(
                                                    "rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed",
                                                    !layer.mask.visible && "text-red-500"
                                                )}
                                            >
                                                <MousePointer2 className="h-3 w-3" />
                                            </button>
                                        )}

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateLayer(layer.id, { locked: !layer.locked });
                                            }}
                                            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1"
                                        >
                                            {layer.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                                        </button>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (layer.locked) return;
                                                removeLayer(layer.id);
                                            }}
                                            disabled={layer.locked}
                                            className="text-zinc-400 hover:text-red-500 p-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-zinc-400"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                                {activeLayerId === layer.id && (
                                    <div className="px-2 pb-1">
                                        <div className="space-y-2 rounded-md bg-zinc-100/80 dark:bg-zinc-800/60 px-2 py-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] uppercase tracking-wide text-zinc-500">Opacity</span>
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={1}
                                                    step={0.01}
                                                    value={layer.opacity}
                                                    onChange={(e) => updateLayer(layer.id, { opacity: Number(e.target.value) })}
                                                    disabled={layer.locked}
                                                    className="flex-1 h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                                <span className="text-[10px] font-mono text-zinc-500 w-8 text-right">{Math.round(layer.opacity * 100)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] uppercase tracking-wide text-zinc-500">Fill</span>
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={1}
                                                    step={0.01}
                                                    value={layer.fillOpacity ?? 1}
                                                    onChange={(e) => updateLayer(layer.id, { fillOpacity: Number(e.target.value) })}
                                                    disabled={layer.locked}
                                                    className="flex-1 h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                                <span className="text-[10px] font-mono text-zinc-500 w-8 text-right">{Math.round((layer.fillOpacity ?? 1) * 100)}</span>
                                            </div>
                                            <label className="flex items-center justify-between text-[10px] text-zinc-500">
                                                <span>Clipping Mask</span>
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(layer.clippingMask)}
                                                    disabled={layer.locked}
                                                    onChange={(e) => updateLayer(layer.id, { clippingMask: e.target.checked })}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {activeLayerId && (
                <div className="border-t border-zinc-200 p-4 dark:border-zinc-800 backdrop-blur-sm bg-white/50 dark:bg-zinc-900/50">
                    {(() => {
                        const activeLayer = layers.find(l => l.id === activeLayerId);
                        if (!activeLayer) return null;

                        return (
                            <div className="space-y-4">


                                {activeLayer.mask && (
                                    <div className="space-y-2 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Mask</span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setMaskPreviewMode(!maskPreviewMode)}
                                                    className={cn(
                                                        "text-[10px] uppercase font-medium tracking-wide transition-colors",
                                                        maskPreviewMode ? "text-blue-500" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                                    )}
                                                >
                                                    {maskPreviewMode ? "Hide" : "Preview"}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (activeLayer.locked) return;
                                                        setLayerMask(activeLayer.id, null);
                                                    }}
                                                    disabled={activeLayer.locked}
                                                    className="text-[10px] uppercase font-medium tracking-wide text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={onInvertMask}
                                                disabled={activeLayer.locked}
                                                className="flex-1 rounded-md bg-zinc-100 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                Invert
                                            </button>
                                            <div className="flex flex-1 items-center gap-2 rounded-md bg-zinc-100 px-2 dark:bg-zinc-800">
                                                <span className="text-[10px] text-zinc-400">Feather</span>
                                                <input
                                                    type="number"
                                                    defaultValue={0}
                                                    disabled={activeLayer.locked}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            onFeatherMask?.(parseInt(e.currentTarget.value) || 0);
                                                        }
                                                    }}
                                                    className="w-full bg-transparent py-1 text-right text-xs outline-none disabled:opacity-50"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
