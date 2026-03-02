"use client";

import { useState } from "react";
import { Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FiltersPanelProps {
    onApplyFilter?: (filterName: string, value: number) => void;
    className?: string;
    style?: React.CSSProperties;
}

interface Filter {
    id: string;
    name: string;
    category: "blur" | "sharpen" | "distort" | "noise" | "stylize" | "render";
    min: number;
    max: number;
    default: number;
    description: string;
}

const filters: Filter[] = [
    // BLUR
    { id: "gaussian-blur", name: "Gaussian Blur", category: "blur", min: 0, max: 50, default: 5, description: "Smooths image by averaging pixels" },
    { id: "motion-blur", name: "Motion Blur", category: "blur", min: 0, max: 100, default: 20, description: "Creates directional blur effect" },
    { id: "radial-blur", name: "Radial Blur", category: "blur", min: 0, max: 50, default: 10, description: "Blur radiating from center" },
    { id: "zoom-blur", name: "Zoom Blur", category: "blur", min: 0, max: 100, default: 15, description: "Creates zoom motion effect" },

    // SHARPEN
    { id: "unsharp-mask", name: "Unsharp Mask", category: "sharpen", min: 0, max: 100, default: 50, description: "Enhances edges and details" },
    { id: "smart-sharpen", name: "Smart Sharpen", category: "sharpen", min: 0, max: 100, default: 40, description: "Intelligent edge detection" },
    { id: "high-pass", name: "High Pass", category: "sharpen", min: 0, max: 100, default: 30, description: "Extracts edge information" },

    // DISTORT
    { id: "liquify", name: "Liquify", category: "distort", min: 0, max: 100, default: 50, description: "Warps image like liquid" },
    { id: "ripple", name: "Ripple", category: "distort", min: 0, max: 100, default: 20, description: "Creates wave pattern" },
    { id: "twirl", name: "Twirl", category: "distort", min: 0, max: 360, default: 45, description: "Rotates pixels in circular pattern" },
    { id: "pinch", name: "Pinch", category: "distort", min: -50, max: 50, default: 20, description: "Pinches or bloats center" },

    // NOISE
    { id: "add-noise", name: "Add Noise", category: "noise", min: 0, max: 100, default: 30, description: "Adds grain texture" },
    { id: "reduce-noise", name: "Reduce Noise", category: "noise", min: 0, max: 100, default: 50, description: "Reduces grain and artifacts" },
    { id: "dust-scratches", name: "Dust & Scratches", category: "noise", min: 0, max: 100, default: 40, description: "Removes small defects" },

    // STYLIZE
    { id: "oil-paint", name: "Oil Paint", category: "stylize", min: 0, max: 100, default: 60, description: "Paint-like artistic effect" },
    { id: "emboss", name: "Emboss", category: "stylize", min: 0, max: 100, default: 50, description: "3D raised surface effect" },
    { id: "posterize", name: "Posterize", category: "stylize", min: 2, max: 256, default: 16, description: "Reduces color levels" },
    { id: "solarize", name: "Solarize", category: "stylize", min: 0, max: 100, default: 50, description: "Inverts tones like photo negative" },

    // RENDER
    { id: "lens-flare", name: "Lens Flare", category: "render", min: 0, max: 100, default: 70, description: "Light artifact effect" },
    { id: "lighting", name: "Lighting Effects", category: "render", min: 0, max: 100, default: 50, description: "3D directional lighting" },
    { id: "clouds", name: "Clouds", category: "render", min: 0, max: 100, default: 80, description: "Cloud texture generator" },
];

export default function FiltersPanel({
    onApplyFilter,
    className,
    style,
}: FiltersPanelProps) {
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
        blur: true,
        sharpen: false,
        distort: false,
        noise: false,
        stylize: false,
        render: false,
    });

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const categories = ["blur", "sharpen", "distort", "noise", "stylize", "render"] as const;

    return (
        <div className={cn("flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 overflow-hidden", className)} style={style}>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 p-3">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Filters
                </h3>
            </div>

            <div className="overflow-y-auto flex-1 p-3 space-y-2">
                {categories.map(category => {
                    const categoryFilters = filters.filter(f => f.category === category);
                    const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);

                    return (
                        <div key={category} className="space-y-1">
                            <button
                                onClick={() => toggleCategory(category)}
                                className="w-full flex items-center justify-between px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
                            >
                                <span>{categoryLabel}</span>
                                <ChevronDown className={cn(
                                    "h-3.5 w-3.5 transition-transform",
                                    expandedCategories[category] && "rotate-180"
                                )} />
                            </button>

                            {expandedCategories[category] && (
                                <div className="px-2 space-y-1">
                                    {categoryFilters.map(filter => (
                                        <div
                                            key={filter.id}
                                            className="p-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-1"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-400">
                                                    {filter.name}
                                                </span>
                            <span className="text-[8px] text-zinc-500 dark:text-zinc-600 ml-auto">
                                                    {filter.description}
                                                </span>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="range"
                                                    min={filter.min}
                                                    max={filter.max}
                                                    defaultValue={filter.default}
                                                    onChange={(e) => {
                                                        const value = parseFloat(e.target.value);
                                                        onApplyFilter?.(filter.id, value);
                                                    }}
                                                    className="flex-1 h-1 cursor-pointer appearance-none rounded-full bg-zinc-300 accent-cyan-500 dark:bg-zinc-700 disabled:opacity-50"
                                                />
                                                <button
                                                    onClick={() => onApplyFilter?.(filter.id, filter.default)}
                                                    className="px-1.5 py-0.5 rounded text-[8px] bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                                                    title="Apply filter"
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
