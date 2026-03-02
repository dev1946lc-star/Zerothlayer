"use client";

import { Bot, Play, Settings2, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BatchOptions {
  format: "png" | "jpeg" | "webp";
  quality: number;
  maxSide: number;
  autoDownload: boolean;
}

export interface BatchStatus {
  running: boolean;
  total: number;
  processed: number;
  success: number;
  failed: number;
  currentFile: string | null;
  lastSummary: string | null;
}

export interface DropletPreset {
  id: string;
  name: string;
  filters: Record<string, number>;
  runCount: number;
  lastRunAt?: string;
}

interface AutomationPanelProps {
  className?: string;
  style?: React.CSSProperties;
  canEdit: boolean;
  batchOptions: BatchOptions;
  setBatchOptions: (next: BatchOptions) => void;
  batchStatus: BatchStatus;
  dropletPresets: DropletPreset[];
  activeDropletId: string | null;
  setActiveDropletId: (id: string) => void;
  canSaveDropletFromActive: boolean;
  scriptLanguage: "javascript" | "vbscript";
  setScriptLanguage: (value: "javascript" | "vbscript") => void;
  scriptBody: string;
  setScriptBody: (value: string) => void;
  scriptOutput: string;
  dataRows: string;
  setDataRows: (value: string) => void;
  dataTemplate: string;
  setDataTemplate: (value: string) => void;
  dataDrivenMode: "single" | "rows";
  setDataDrivenMode: (value: "single" | "rows") => void;
  dataDrivenSummary: string | null;
  onPickBatchFiles: () => void;
  onDownloadBatchReport: () => void;
  onRunDroplet: () => void;
  onSaveDropletFromActive: () => void;
  onDeleteActiveDroplet: () => void;
  onRunScript: () => void;
  onRunDataDriven: () => void;
}

export default function AutomationPanel({
  className,
  style,
  canEdit,
  batchOptions,
  setBatchOptions,
  batchStatus,
  dropletPresets,
  activeDropletId,
  setActiveDropletId,
  canSaveDropletFromActive,
  scriptLanguage,
  setScriptLanguage,
  scriptBody,
  setScriptBody,
  scriptOutput,
  dataRows,
  setDataRows,
  dataTemplate,
  setDataTemplate,
  dataDrivenMode,
  setDataDrivenMode,
  dataDrivenSummary,
  onPickBatchFiles,
  onDownloadBatchReport,
  onRunDroplet,
  onSaveDropletFromActive,
  onDeleteActiveDroplet,
  onRunScript,
  onRunDataDriven,
}: AutomationPanelProps) {
  return (
    <div className={cn("flex h-full flex-col overflow-hidden border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900", className)} style={style}>
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <Settings2 className="h-4 w-4" />
          Scripts & Automate
        </h3>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 text-[10px]">
        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Image Processor (Batch)</div>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="space-y-1">
              <span className="text-zinc-500">Format</span>
              <select
                value={batchOptions.format}
                onChange={(e) => setBatchOptions({ ...batchOptions, format: e.target.value as "png" | "jpeg" | "webp" })}
                className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="webp">WebP</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-zinc-500">Quality</span>
              <input
                type="number"
                min={1}
                max={100}
                value={batchOptions.quality}
                disabled={batchOptions.format === "png"}
                onChange={(e) => setBatchOptions({ ...batchOptions, quality: Math.max(1, Math.min(100, Number(e.target.value) || 88)) })}
                className="w-full rounded border border-zinc-200 bg-white px-2 py-1 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-zinc-500">Max side (px, 0 = keep original)</span>
            <input
              type="number"
              min={0}
              value={batchOptions.maxSide}
              onChange={(e) => setBatchOptions({ ...batchOptions, maxSide: Math.max(0, Number(e.target.value) || 0) })}
              className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={batchOptions.autoDownload}
              onChange={(e) => setBatchOptions({ ...batchOptions, autoDownload: e.target.checked })}
            />
            Auto download each output
          </label>
          <button onClick={onPickBatchFiles} disabled={!canEdit || batchStatus.running} className="w-full rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">
            <Play className="mr-1 inline h-3 w-3" />
            {batchStatus.running ? "Running Batch..." : "Run Batch Processor"}
          </button>
          <button onClick={onDownloadBatchReport} disabled={!batchStatus.lastSummary} className="w-full rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">
            Download Last Batch Report
          </button>
          <div className="space-y-1 rounded border border-zinc-200 bg-white px-2 py-1.5 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            <div>Total: {batchStatus.total} • Processed: {batchStatus.processed}</div>
            <div>Success: {batchStatus.success} • Failed: {batchStatus.failed}</div>
            {batchStatus.currentFile && <div className="truncate">Current: {batchStatus.currentFile}</div>}
            {batchStatus.lastSummary && <div>{batchStatus.lastSummary}</div>}
          </div>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Droplets</div>
          <label className="space-y-1 block">
            <span className="text-zinc-500">Preset</span>
            <select
              value={activeDropletId ?? ""}
              onChange={(e) => setActiveDropletId(e.target.value)}
              className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {dropletPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} ({preset.runCount} runs)
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={onRunDroplet} disabled={!canEdit || !activeDropletId} className="rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">
              Run
            </button>
            <button onClick={onSaveDropletFromActive} disabled={!canEdit || !canSaveDropletFromActive} className="rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">
              Save Active
            </button>
            <button onClick={onDeleteActiveDroplet} disabled={!canEdit || !activeDropletId} className="rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">
              Delete
            </button>
          </div>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Variables / Data-driven</div>
          <label className="space-y-1 block">
            <span className="text-zinc-500">Mode</span>
            <select
              value={dataDrivenMode}
              onChange={(e) => setDataDrivenMode(e.target.value as "single" | "rows")}
              className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="single">Single Combined Graphic</option>
              <option value="rows">One Layer Per Row</option>
            </select>
          </label>
          <textarea
            value={dataRows}
            onChange={(e) => setDataRows(e.target.value)}
            className="h-20 w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <textarea
            value={dataTemplate}
            onChange={(e) => setDataTemplate(e.target.value)}
            placeholder="Template supports {{column}} placeholders"
            className="h-16 w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          />
          {dataDrivenSummary && <div className="rounded bg-zinc-100 px-2 py-1 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{dataDrivenSummary}</div>}
          <button onClick={onRunDataDriven} disabled={!canEdit} className="w-full rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">
            <Table2 className="mr-1 inline h-3 w-3" />
            Apply Data-driven Graphic
          </button>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Scripts</div>
          <select
            value={scriptLanguage}
            onChange={(e) => setScriptLanguage(e.target.value as "javascript" | "vbscript")}
            className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="javascript">JavaScript</option>
            <option value="vbscript">VBScript (compatible subset)</option>
          </select>
          <textarea
            value={scriptBody}
            onChange={(e) => setScriptBody(e.target.value)}
            className="h-24 w-full rounded border border-zinc-200 bg-white px-2 py-1 font-mono text-[10px] dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="rounded border border-zinc-200 bg-white px-2 py-1 text-[9px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            {scriptOutput || "No script output yet."}
          </div>
          <input
            value={scriptLanguage === "javascript" ? 'api.command("filters vintage")' : 'COMMAND filters vintage'}
            readOnly
            placeholder="ai sky | filters vintage | export assets | batch open | video export"
            className="w-full rounded border border-zinc-200 bg-zinc-100 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800"
          />
          <button onClick={onRunScript} disabled={!canEdit} className="w-full rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">
            <Bot className="mr-1 inline h-3 w-3" />
            Run Script
          </button>
        </section>
      </div>
    </div>
  );
}
