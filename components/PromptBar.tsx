
"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SelectionData } from "./Canvas";
import { useLayerStore } from "@/lib/store";

interface PromptBarProps {
    selection: SelectionData | null;
    open: boolean;
    onGenerate: (prompt: string) => void;
    onStyleTransfer?: () => void;
    onCancel: () => void;
    isGenerating: boolean;
    position?: { x: number, y: number };
    providerName: string;
    onProviderChange: (name: string) => void;
}

export default function PromptBar(props: PromptBarProps) {
    const { selection, open, onGenerate, onStyleTransfer, onCancel, isGenerating, providerName, onProviderChange } = props;
    const { aiPromptDraft, setAiPromptDraft } = useLayerStore();
    const [prompt, setPrompt] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestions = ["Remove", "Replace with...", "Change color to..."];

    // Focus input when selection appears
    useEffect(() => {
        if (selection && open && inputRef.current) {
            inputRef.current.focus();
        }
    }, [selection, open]);

    useEffect(() => {
        if (!open) {
            setPrompt("");
        }
    }, [open]);

    useEffect(() => {
        if (open && aiPromptDraft) {
            setPrompt(aiPromptDraft);
            setAiPromptDraft(null);
        }
    }, [open, aiPromptDraft, setAiPromptDraft]);

    if (!selection || !open) return null;

    // If position is provided, use it. Otherwise, default to bottom-center.
    const estimatedHalfWidth = 260;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
    const clampedX = props.position && viewportWidth > 0
        ? Math.min(
            Math.max(props.position.x, estimatedHalfWidth),
            Math.max(estimatedHalfWidth, viewportWidth - estimatedHalfWidth)
        )
        : props.position?.x;

    const style: React.CSSProperties = props.position ? {
        position: 'fixed',
        left: clampedX,
        top: props.position.y,
        transform: 'translate(-50%, 0)', // Center horizontally relative to the point
        zIndex: 50,
        width: 'min(92vw, 840px)'
    } : {
        // Default bottom center
        position: 'fixed' as 'fixed', // Explicit cast for TS
        bottom: '2rem',
        left: '50%',
        transform: 'translate(-50%, 0)',
        zIndex: 50,
        width: '100%',
        maxWidth: '48rem',
        paddingLeft: '1rem',
        paddingRight: '1rem'

    };

    return (
        <div style={style}>
            <div className="glass flex items-center gap-1.5 p-2 rounded-2xl shadow-2xl shadow-black/10 ring-1 ring-black/5 dark:ring-white/10 transition-all duration-200 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
                <div className="flex rounded-xl p-2 shrink-0 bg-blue-600 shadow-lg shadow-blue-500/20">
                    <Sparkles className={cn("h-4 w-4 text-white", isGenerating && "animate-spin")} />
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && prompt.trim()) {
                            onGenerate(prompt.trim());
                        }
                        if (e.key === 'Escape') {
                            onCancel();
                        }
                    }}
                    placeholder="Describe changes with AI..."
                    className="flex-1 bg-transparent px-3 text-sm font-medium text-zinc-900 placeholder:text-zinc-500 focus:outline-none dark:text-zinc-100 min-w-[200px]"
                    disabled={isGenerating}
                />

                <div className="flex items-center gap-1 pr-1">
                    {/* Provider selector */}
                    <select
                        value={providerName}
                        onChange={(e) => onProviderChange(e.target.value)}
                        disabled={isGenerating}
                        className="text-[10px] font-medium rounded-lg bg-zinc-100/80 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-300 px-2 py-1 outline-none border border-zinc-200/60 dark:border-zinc-700/60 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
                    >
                        <option value="gemini">Gemini</option>
                        <option value="flux">Flux</option>
                        <option value="stable-diffusion">Stable Diffusion</option>
                    </select>
                    <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />
                    <button
                        onClick={() => prompt.trim() && onGenerate(prompt.trim())}
                        disabled={!prompt.trim() || isGenerating}
                        className="rounded-xl p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Generate"
                    >
                        <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                        onClick={onCancel}
                        className="rounded-xl p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
                        title="Cancel"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 px-2">
                <button
                    type="button"
                    onClick={() => {
                        setPrompt("Apply this style to entire image: ");
                        onStyleTransfer?.();
                    }}
                    className="rounded-full border border-zinc-200/70 bg-blue-50/90 px-2.5 py-1 text-[10px] font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-zinc-700 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/20"
                >
                    Style Transfer
                </button>
                {suggestions.map((item) => (
                    <button
                        key={item}
                        type="button"
                        onClick={() => setPrompt(item)}
                        className="rounded-full border border-zinc-200/70 bg-white/80 px-2.5 py-1 text-[10px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        {item}
                    </button>
                ))}
            </div>
        </div>
    );
}
