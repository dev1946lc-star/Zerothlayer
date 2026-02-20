
"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SelectionData } from "./Canvas";

interface PromptBarProps {
    selection: SelectionData | null;
    onGenerate: (prompt: string) => void;
    onCancel: () => void;
    isGenerating: boolean;
    position?: { x: number, y: number };
}

export default function PromptBar(props: PromptBarProps) {
    const { selection, onGenerate, onCancel, isGenerating } = props;
    const [prompt, setPrompt] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when selection appears
    useEffect(() => {
        if (selection && inputRef.current) {
            inputRef.current.focus();
        }
    }, [selection]);

    if (!selection) return null;

    // If position is provided, use it. Otherwise, default to bottom-center.
    const style: React.CSSProperties = props.position ? {
        position: 'fixed',
        left: props.position.x,
        top: props.position.y,
        transform: 'translate(-50%, 0)', // Center horizontally relative to the point
        zIndex: 50
    } : {
        // Default bottom center
        position: 'fixed' as 'fixed', // Explicit cast for TS
        bottom: '2rem',
        left: '50%',
        transform: 'translate(-50%, 0)',
        zIndex: 50,
        width: '100%',
        maxWidth: '32rem',
        paddingLeft: '1rem',
        paddingRight: '1rem'

    };

    return (
        <div style={style}>
            <div className="glass flex items-center gap-1 p-2 rounded-2xl shadow-2xl shadow-black/10 ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 hover:scale-[1.01] hover:shadow-black/20 bg-white/80 dark:bg-black/80 backdrop-blur-xl">
                <div className="flex bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl p-2 shrink-0 shadow-lg shadow-purple-500/20">
                    <Sparkles className={cn("h-4 w-4 text-white", isGenerating && "animate-spin")} />
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && prompt.trim()) {
                            onGenerate(prompt);
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
                    <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />
                    <button
                        onClick={() => prompt.trim() && onGenerate(prompt)}
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
        </div>
    );
}
