"use client";

import { Play, Plus, Radio, Square, Trash2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type MacroCommand =
  | "run-droplet"
  | "run-brush"
  | "run-pencil"
  | "run-mixer"
  | "run-gradient"
  | "run-paint-bucket"
  | "export-timeline";

export interface MacroAction {
  id: string;
  name: string;
  steps: number;
  commands: MacroCommand[];
  runCount?: number;
  lastRunAt?: string;
}

interface ActionsPanelProps {
  className?: string;
  style?: React.CSSProperties;
  canEdit: boolean;
  isRecording: boolean;
  recordingName: string;
  setRecordingName: (value: string) => void;
  recordedCommands: MacroCommand[];
  actions: MacroAction[];
  onToggleRecording: () => void;
  onDiscardRecording: () => void;
  onRunAction: (id: string) => void;
  onDeleteAction: (id: string) => void;
  onRunCommand: (cmd: MacroCommand) => void;
}

const commandLabels: Record<MacroCommand, string> = {
  "run-droplet": "Droplet",
  "run-brush": "Brush",
  "run-pencil": "Pencil",
  "run-mixer": "Mixer",
  "run-gradient": "Gradient",
  "run-paint-bucket": "Paint Bucket",
  "export-timeline": "Export Timeline",
};

export default function ActionsPanel({
  className,
  style,
  canEdit,
  isRecording,
  recordingName,
  setRecordingName,
  recordedCommands,
  actions,
  onToggleRecording,
  onDiscardRecording,
  onRunAction,
  onDeleteAction,
  onRunCommand,
}: ActionsPanelProps) {
  const quickCommands: MacroCommand[] = ["run-droplet", "run-brush", "run-pencil", "run-mixer", "run-gradient", "run-paint-bucket", "export-timeline"];

  return (
    <div className={cn("flex h-full flex-col overflow-hidden border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900", className)} style={style}>
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <Wand2 className="h-4 w-4" />
          Actions
        </h3>
        <button
          onClick={onToggleRecording}
          disabled={!canEdit}
          className={cn(
            "rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide disabled:opacity-40",
            isRecording ? "bg-red-600 text-white" : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          )}
        >
          {isRecording ? (
            <>
              <Square className="mr-1 inline h-3 w-3" />
              Stop
            </>
          ) : (
            <>
              <Radio className="mr-1 inline h-3 w-3" />
              Record
            </>
          )}
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 text-[10px]">
        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Macro Builder</div>
          <input
            value={recordingName}
            onChange={(e) => setRecordingName(e.target.value)}
            placeholder="Action name"
            className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="text-zinc-500 dark:text-zinc-400">
            Recorded steps: {recordedCommands.length}
          </div>
          {isRecording && recordedCommands.length > 0 && (
            <button onClick={onDiscardRecording} className="w-full rounded bg-zinc-200 px-2 py-1 text-[10px] font-medium dark:bg-zinc-800">
              Discard Recording
            </button>
          )}
          {recordedCommands.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recordedCommands.map((cmd, idx) => (
                <span key={`${cmd}-${idx}`} className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-800">
                  {idx + 1}. {commandLabels[cmd]}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Quick Commands</div>
          <div className="grid grid-cols-2 gap-1.5">
            {quickCommands.map((cmd) => (
              <button
                key={cmd}
                onClick={() => onRunCommand(cmd)}
                className="rounded bg-zinc-200 px-2 py-1.5 text-left font-medium dark:bg-zinc-800"
              >
                <Plus className="mr-1 inline h-3 w-3" />
                {commandLabels[cmd]}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Saved Actions</div>
          <div className="space-y-1.5">
            {actions.map((a) => (
              <div key={a.id} className="rounded border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-center gap-2">
                  <span className="flex-1 truncate font-medium">{a.name}</span>
                  <span className="text-zinc-500">{a.steps} steps</span>
                  <span className="text-zinc-500">{a.runCount ?? 0} runs</span>
                  <button onClick={() => onDeleteAction(a.id)} className="rounded p-0.5 text-zinc-400 hover:text-red-500" title="Delete action">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                {a.lastRunAt && <div className="mt-1 text-[9px] text-zinc-500">Last run: {new Date(a.lastRunAt).toLocaleString()}</div>}
                <div className="mt-1 flex flex-wrap gap-1">
                  {a.commands.map((cmd, idx) => (
                    <span key={`${a.id}-${idx}`} className="rounded bg-zinc-200 px-1.5 py-0.5 text-[9px] dark:bg-zinc-800">
                      {commandLabels[cmd]}
                    </span>
                  ))}
                </div>
                <button onClick={() => onRunAction(a.id)} className="mt-1.5 w-full rounded bg-zinc-200 px-2 py-1 text-[10px] font-medium dark:bg-zinc-800">
                  <Play className="mr-1 inline h-3 w-3" />
                  Run Action
                </button>
              </div>
            ))}
            {actions.length === 0 && <div className="text-zinc-500">No actions recorded yet.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
