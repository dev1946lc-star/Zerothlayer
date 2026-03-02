"use client";

import {
    Pipette,
    Wand2,
    Crop,
    Move,
    RotateCw,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignCenterVertical,
    MoreVertical,
    Maximize2,
    Grid3x3,
    Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ToolboxPanelProps {
    activeTool?: string;
    onToolSelect?: (tool: string) => void;
    onColorPick?: (color: string) => void;
    onCropApply?: () => void;
    onTransformApply?: (mode: string) => void;
    onAlignApply?: (mode: string) => void;
    className?: string;
}

const tools = [
    { id: 'eyedropper', name: 'Eyedropper', icon: Pipette, category: 'sampling' },
    { id: 'magic-wand', name: 'Magic Wand', icon: Wand2, category: 'selection' },
    { id: 'color-range', name: 'Color Range', icon: Wand2, category: 'selection' },
    { id: 'crop', name: 'Crop Tool', icon: Crop, category: 'transform' },
    { id: 'perspective-crop', name: 'Perspective Crop', icon: Crop, category: 'transform' },
];

const transforms = [
    { id: 'flip-h', name: 'Flip Horizontal', label: '↔' },
    { id: 'flip-v', name: 'Flip Vertical', label: '↕' },
    { id: 'rotate-90', name: 'Rotate 90°', label: '↻90' },
    { id: 'rotate-180', name: 'Rotate 180°', label: '↻180' },
    { id: 'scale-up', name: 'Scale Up 10%', label: '⬆' },
    { id: 'scale-down', name: 'Scale Down 10%', label: '⬇' },
];

const alignModes = [
    { id: 'left', name: 'Align Left', icon: AlignLeft },
    { id: 'center-h', name: 'Align Center', icon: AlignCenter },
    { id: 'right', name: 'Align Right', icon: AlignRight },
    { id: 'middle', name: 'Align Middle', icon: AlignCenterVertical },
    { id: 'distribute-h', name: 'Distribute Horizontal', icon: Grid3x3 },
    { id: 'distribute-v', name: 'Distribute Vertical', icon: Grid3x3 },
];

export default function ToolboxPanel({
    activeTool,
    onToolSelect,
    onColorPick,
    onCropApply,
    onTransformApply,
    onAlignApply,
    className,
}: ToolboxPanelProps) {
    const [expandedSection, setExpandedSection] = useState<string | null>('tools');

    return (
        <div className={cn("flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 overflow-y-auto", className)}>
            {/* SAMPLING TOOLS */}
            <div className="border-b border-zinc-200 dark:border-zinc-800">
                <button
                    onClick={() => setExpandedSection(expandedSection === 'tools' ? null : 'tools')}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                    <h3 className="text-xs font-semibold uppercase text-zinc-700 dark:text-zinc-300">Tools</h3>
                    <span className="text-xs">{expandedSection === 'tools' ? '▼' : '▶'}</span>
                </button>
                {expandedSection === 'tools' && (
                    <div className="px-2 py-2 space-y-1 bg-zinc-50 dark:bg-zinc-900/50">
                        {tools.map(tool => {
                            const Icon = tool.icon;
                            return (
                                <button
                                    key={tool.id}
                                    onClick={() => onToolSelect?.(tool.id)}
                                    title={tool.name}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition-colors",
                                        activeTool === tool.id
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                                            : "text-zinc-700 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {tool.name}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* TRANSFORM TOOLS */}
            <div className="border-b border-zinc-200 dark:border-zinc-800">
                <button
                    onClick={() => setExpandedSection(expandedSection === 'transform' ? null : 'transform')}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                    <h3 className="text-xs font-semibold uppercase text-zinc-700 dark:text-zinc-300">Transform</h3>
                    <span className="text-xs">{expandedSection === 'transform' ? '▼' : '▶'}</span>
                </button>
                {expandedSection === 'transform' && (
                    <div className="px-2 py-2 space-y-1 bg-zinc-50 dark:bg-zinc-900/50">
                        {transforms.map(t => (
                            <button
                                key={t.id}
                                onClick={() => onTransformApply?.(t.id)}
                                title={t.name}
                                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium text-zinc-700 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <span>{t.name}</span>
                                <span className="font-bold text-zinc-500">{t.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ALIGNMENT TOOLS */}
            <div className="border-b border-zinc-200 dark:border-zinc-800">
                <button
                    onClick={() => setExpandedSection(expandedSection === 'align' ? null : 'align')}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                    <h3 className="text-xs font-semibold uppercase text-zinc-700 dark:text-zinc-300">Align & Distribute</h3>
                    <span className="text-xs">{expandedSection === 'align' ? '▼' : '▶'}</span>
                </button>
                {expandedSection === 'align' && (
                    <div className="px-2 py-2 grid grid-cols-3 gap-1 bg-zinc-50 dark:bg-zinc-900/50">
                        {alignModes.map(mode => {
                            const Icon = mode.icon;
                            return (
                                <button
                                    key={mode.id}
                                    onClick={() => onAlignApply?.(mode.id)}
                                    title={mode.name}
                                    className="flex items-center justify-center px-2 py-1.5 rounded text-xs font-medium text-zinc-700 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <Icon className="w-4 h-4" />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* TIPS */}
            <div className="flex-1 p-3 space-y-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                <div className="rounded border border-zinc-200 dark:border-zinc-700 p-2 space-y-1">
                    <div className="font-semibold text-zinc-600 dark:text-zinc-300">💡 Quick Tips</div>
                    <div>🎨 Eyedropper: Pick colors directly from canvas</div>
                    <div>🪄 Magic Wand: Select areas by color</div>
                    <div>✂️ Crop: Resize canvas to selection</div>
                    <div>↔️ Transform: Flip, rotate, scale</div>
                    <div>⚙️ Align: Position layers precisely</div>
                </div>
            </div>
        </div>
    );
}
