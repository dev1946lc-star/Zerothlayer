"use client";

import { Clapperboard, Pause, Play, Plus, StepBack, StepForward, Video } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelinePanelProps {
  className?: string;
  style?: React.CSSProperties;
  canEdit: boolean;
  frame: number;
  fps: number;
  durationFrames: number;
  isPlaying: boolean;
  includeAudio: boolean;
  audioMode: "tone" | "pulse" | "none";
  audioLevel: number;
  transitionStyle: "cut" | "fade" | "dissolve" | "wipe-left" | "zoom-fade";
  exportScale: 0.5 | 0.75 | 1;
  isExporting: boolean;
  isExportingGif: boolean;
  keyframes: number[];
  frameAnimationFrames: number[];
  videoLayerCount: number;
  onSetFrame: (value: number) => void;
  onSetFps: (value: number) => void;
  onSetDurationFrames: (value: number) => void;
  onTogglePlay: () => void;
  onStep: (delta: number) => void;
  onToggleKeyframe: () => void;
  onToggleAnimationFrame: () => void;
  onClearAnimationFrames: () => void;
  onPrevKeyframe: () => void;
  onNextKeyframe: () => void;
  onCreateVideoLayer: () => void;
  onExportVideo: () => void;
  onExportGif: () => void;
  onSetIncludeAudio: (value: boolean) => void;
  onSetAudioMode: (value: "tone" | "pulse" | "none") => void;
  onSetAudioLevel: (value: number) => void;
  onSetTransitionStyle: (value: "cut" | "fade" | "dissolve" | "wipe-left" | "zoom-fade") => void;
  onSetExportScale: (value: 0.5 | 0.75 | 1) => void;
}

export default function TimelinePanel({
  className,
  style,
  canEdit,
  frame,
  fps,
  durationFrames,
  isPlaying,
  includeAudio,
  audioMode,
  audioLevel,
  transitionStyle,
  exportScale,
  isExporting,
  isExportingGif,
  keyframes,
  frameAnimationFrames,
  videoLayerCount,
  onSetFrame,
  onSetFps,
  onSetDurationFrames,
  onTogglePlay,
  onStep,
  onToggleKeyframe,
  onToggleAnimationFrame,
  onClearAnimationFrames,
  onPrevKeyframe,
  onNextKeyframe,
  onCreateVideoLayer,
  onExportVideo,
  onExportGif,
  onSetIncludeAudio,
  onSetAudioMode,
  onSetAudioLevel,
  onSetTransitionStyle,
  onSetExportScale,
}: TimelinePanelProps) {
  const durationSec = Math.max(0.1, durationFrames / Math.max(1, fps));

  return (
    <div className={cn("flex h-full flex-col overflow-hidden border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900", className)} style={style}>
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <Clapperboard className="h-4 w-4" />
          Timeline
        </h3>
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {durationSec.toFixed(2)}s
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 text-[10px]">
        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Playback</div>
          <div className="text-zinc-500 dark:text-zinc-400">Frame {frame} / {durationFrames - 1} at {fps} fps</div>
          <input
            type="range"
            min={0}
            max={Math.max(1, durationFrames - 1)}
            value={Math.min(frame, Math.max(1, durationFrames - 1))}
            onChange={(e) => onSetFrame(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700"
          />
          <div className="grid grid-cols-5 gap-1">
            <button onClick={() => onStep(-1)} className="rounded bg-zinc-200 px-2 py-1 dark:bg-zinc-800" title="Previous Frame"><StepBack className="mx-auto h-3.5 w-3.5" /></button>
            <button onClick={onTogglePlay} className="rounded bg-zinc-200 px-2 py-1 dark:bg-zinc-800" title="Play/Pause">
              {isPlaying ? <Pause className="mx-auto h-3.5 w-3.5" /> : <Play className="mx-auto h-3.5 w-3.5" />}
            </button>
            <button onClick={() => onStep(1)} className="rounded bg-zinc-200 px-2 py-1 dark:bg-zinc-800" title="Next Frame"><StepForward className="mx-auto h-3.5 w-3.5" /></button>
            <button onClick={onPrevKeyframe} className="rounded bg-zinc-200 px-2 py-1 dark:bg-zinc-800" title="Previous Keyframe">K-</button>
            <button onClick={onNextKeyframe} className="rounded bg-zinc-200 px-2 py-1 dark:bg-zinc-800" title="Next Keyframe">K+</button>
          </div>
          <button onClick={onToggleKeyframe} disabled={!canEdit} className="w-full rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">
            <Plus className="mr-1 inline h-3 w-3" />
            Toggle Keyframe At Current Frame
          </button>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Timeline Settings</div>
          <label className="block space-y-1">
            <span className="text-zinc-500">FPS: {fps}</span>
            <input type="range" min={12} max={60} value={fps} onChange={(e) => onSetFps(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
          </label>
          <label className="block space-y-1">
            <span className="text-zinc-500">Duration (frames): {durationFrames}</span>
            <input type="range" min={24} max={600} value={durationFrames} onChange={(e) => onSetDurationFrames(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
          </label>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Video</div>
          <div className="text-zinc-500 dark:text-zinc-400">Video layers: {videoLayerCount}</div>
          <label className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
            <input type="checkbox" checked={includeAudio} onChange={(e) => onSetIncludeAudio(e.target.checked)} />
            Include audio track
          </label>
          <label className="block space-y-1">
            <span className="text-zinc-500">Transition</span>
            <select
              value={transitionStyle}
              onChange={(e) => onSetTransitionStyle(e.target.value as "cut" | "fade" | "dissolve" | "wipe-left" | "zoom-fade")}
              className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="cut">Cut</option>
              <option value="fade">Fade</option>
              <option value="dissolve">Dissolve</option>
              <option value="wipe-left">Wipe Left</option>
              <option value="zoom-fade">Zoom Fade</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-zinc-500">Audio mode</span>
            <select
              value={audioMode}
              onChange={(e) => onSetAudioMode(e.target.value as "tone" | "pulse" | "none")}
              className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="tone">Tone bed</option>
              <option value="pulse">Pulse clicks</option>
              <option value="none">None</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-zinc-500">Audio level: {audioLevel}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={audioLevel}
              onChange={(e) => onSetAudioLevel(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700"
              disabled={!includeAudio || audioMode === "none"}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-zinc-500">Export scale</span>
            <select
              value={String(exportScale)}
              onChange={(e) => onSetExportScale(Number(e.target.value) as 0.5 | 0.75 | 1)}
              className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="1">100%</option>
              <option value="0.75">75%</option>
              <option value="0.5">50%</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={onCreateVideoLayer} disabled={!canEdit} className="rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">
              <Video className="mr-1 inline h-3 w-3" />
              Add Video Layer
            </button>
            <button onClick={onExportVideo} disabled={isExporting} className="rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">
              {isExporting ? "Exporting..." : "Export .webm"}
            </button>
          </div>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Frame Animation (GIF)</div>
          <div className="text-zinc-500 dark:text-zinc-400">Animation frames: {frameAnimationFrames.length}</div>
          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={onToggleAnimationFrame} disabled={!canEdit} className="rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">
              Toggle Frame
            </button>
            <button onClick={onClearAnimationFrames} disabled={!canEdit || frameAnimationFrames.length === 0} className="rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">
              Clear
            </button>
            <button onClick={onExportGif} disabled={isExportingGif} className="rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">
              {isExportingGif ? "Exporting..." : "Export GIF"}
            </button>
          </div>
          {frameAnimationFrames.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {frameAnimationFrames.map((frameValue) => (
                <button
                  key={frameValue}
                  onClick={() => onSetFrame(frameValue)}
                  className={cn(
                    "rounded px-1.5 py-0.5 font-mono transition-colors",
                    frameValue === frame ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  )}
                >
                  {frameValue}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-1 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Keyframes</div>
          {keyframes.length === 0 ? (
            <div className="text-zinc-500 dark:text-zinc-400">No keyframes yet.</div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {keyframes.map((kf) => (
                <button
                  key={kf}
                  onClick={() => onSetFrame(kf)}
                  className={cn(
                    "rounded px-1.5 py-0.5 font-mono transition-colors",
                    kf === frame ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  )}
                >
                  {kf}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
