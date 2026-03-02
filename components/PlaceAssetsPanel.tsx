"use client";

import { Link2, PackageOpen, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaceAssetsPanelProps {
  className?: string;
  style?: React.CSSProperties;
  canEdit: boolean;
  linkedUrl: string;
  setLinkedUrl: (value: string) => void;
  embeddedSmartObject: boolean;
  setEmbeddedSmartObject: (value: boolean) => void;
  linkedSmartObject: boolean;
  setLinkedSmartObject: (value: boolean) => void;
  activeLinkedLayerName: string | null;
  activeLinkedSrc: string | null;
  linkedLayerCount: number;
  linkedBrokenCount: number;
  linkedRefreshSummary: string | null;
  isRefreshingLinkedAssets: boolean;
  onPlaceEmbedded: () => void;
  onPlaceLinked: () => void;
  onRelinkActive: () => void;
  onRefreshActive: () => void;
  onRefreshAll: () => void;
}

export default function PlaceAssetsPanel({
  className,
  style,
  canEdit,
  linkedUrl,
  setLinkedUrl,
  embeddedSmartObject,
  setEmbeddedSmartObject,
  linkedSmartObject,
  setLinkedSmartObject,
  activeLinkedLayerName,
  activeLinkedSrc,
  linkedLayerCount,
  linkedBrokenCount,
  linkedRefreshSummary,
  isRefreshingLinkedAssets,
  onPlaceEmbedded,
  onPlaceLinked,
  onRelinkActive,
  onRefreshActive,
  onRefreshAll,
}: PlaceAssetsPanelProps) {
  return (
    <div className={cn("flex h-full flex-col overflow-hidden border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900", className)} style={style}>
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <PackageOpen className="h-4 w-4" />
          Place Assets
        </h3>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 text-[10px]">
        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Place Embedded</div>
          <label className="flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
            <input type="checkbox" checked={embeddedSmartObject} onChange={(e) => setEmbeddedSmartObject(e.target.checked)} />
            Convert to Smart Object
          </label>
          <button onClick={onPlaceEmbedded} disabled={!canEdit} className="w-full rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">
            Choose Local File(s)
          </button>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Place Linked</div>
          <input
            value={linkedUrl}
            onChange={(e) => setLinkedUrl(e.target.value)}
            placeholder="https://example.com/image.png"
            className="w-full rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <label className="flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
            <input type="checkbox" checked={linkedSmartObject} onChange={(e) => setLinkedSmartObject(e.target.checked)} />
            Use Smart Object for linked layer
          </label>
          <button onClick={onPlaceLinked} disabled={!canEdit} className="w-full rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">
            <Link2 className="mr-1 inline h-3 w-3" />
            Place Linked URL
          </button>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Relink Active</div>
          <div className="text-zinc-500 dark:text-zinc-400">
            Layer: {activeLinkedLayerName || "No linked layer selected"}
          </div>
          {activeLinkedSrc && (
            <div className="truncate rounded bg-zinc-100 px-1.5 py-1 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {activeLinkedSrc}
            </div>
          )}
          <button onClick={onRelinkActive} disabled={!canEdit || !activeLinkedLayerName} className="w-full rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">
            <RefreshCw className="mr-1 inline h-3 w-3" />
            Relink Source
          </button>
          <button onClick={onRefreshActive} disabled={!canEdit || !activeLinkedLayerName || isRefreshingLinkedAssets} className="w-full rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">
            Refresh Active Link
          </button>
        </section>

        <section className="space-y-2 rounded border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Linked Assets</div>
          <div className="text-zinc-500 dark:text-zinc-400">
            Linked layers: {linkedLayerCount}
          </div>
          <div className="text-zinc-500 dark:text-zinc-400">
            Failed links: {linkedBrokenCount}
          </div>
          {linkedRefreshSummary && (
            <div className="rounded bg-zinc-100 px-1.5 py-1 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {linkedRefreshSummary}
            </div>
          )}
          <button onClick={onRefreshAll} disabled={!canEdit || linkedLayerCount === 0 || isRefreshingLinkedAssets} className="w-full rounded bg-zinc-200 px-2 py-1.5 font-medium dark:bg-zinc-800 disabled:opacity-40">
            {isRefreshingLinkedAssets ? "Refreshing..." : "Refresh All Linked"}
          </button>
        </section>
      </div>
    </div>
  );
}
