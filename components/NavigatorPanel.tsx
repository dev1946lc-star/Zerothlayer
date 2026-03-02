"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import { Navigation, ZoomIn, ZoomOut, Move } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigatorPanelProps {
  canvasWidth?: number;
  canvasHeight?: number;
  zoom: number;
  panX: number;
  panY: number;
  onZoomChange: (zoom: number) => void;
  onPan: (dx: number, dy: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

const PREVIEW_WIDTH = 240;
const PREVIEW_HEIGHT = 168;

export default function NavigatorPanel({
  canvasWidth = 800,
  canvasHeight = 600,
  zoom,
  panX,
  panY,
  onZoomChange,
  onPan,
  className,
  style,
}: NavigatorPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDraggingViewport, setIsDraggingViewport] = useState(false);

  const layout = useMemo(() => {
    const safeCanvasWidth = Math.max(1, canvasWidth);
    const safeCanvasHeight = Math.max(1, canvasHeight);
    const scale = Math.min(PREVIEW_WIDTH / safeCanvasWidth, PREVIEW_HEIGHT / safeCanvasHeight);
    const drawW = safeCanvasWidth * scale;
    const drawH = safeCanvasHeight * scale;
    const offsetX = (PREVIEW_WIDTH - drawW) / 2;
    const offsetY = (PREVIEW_HEIGHT - drawH) / 2;

    const viewportW = Math.min(drawW, drawW / Math.max(zoom, 0.1));
    const viewportH = Math.min(drawH, drawH / Math.max(zoom, 0.1));
    const rawViewportX = offsetX + (-panX / Math.max(zoom, 0.1)) * scale;
    const rawViewportY = offsetY + (-panY / Math.max(zoom, 0.1)) * scale;
    const viewportX = Math.max(offsetX, Math.min(rawViewportX, offsetX + drawW - viewportW));
    const viewportY = Math.max(offsetY, Math.min(rawViewportY, offsetY + drawH - viewportH));

    return {
      scale,
      drawW,
      drawH,
      offsetX,
      offsetY,
      viewportW,
      viewportH,
      viewportX,
      viewportY,
    };
  }, [canvasWidth, canvasHeight, zoom, panX, panY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    ctx.fillStyle = "#171717";
    ctx.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    ctx.strokeStyle = "#3f3f46";
    ctx.strokeRect(0.5, 0.5, PREVIEW_WIDTH - 1, PREVIEW_HEIGHT - 1);

    ctx.fillStyle = "#27272a";
    ctx.fillRect(layout.offsetX, layout.offsetY, layout.drawW, layout.drawH);
    ctx.strokeStyle = "#71717a";
    ctx.strokeRect(layout.offsetX, layout.offsetY, layout.drawW, layout.drawH);

    ctx.fillStyle = "rgba(14, 165, 233, 0.12)";
    ctx.fillRect(layout.viewportX, layout.viewportY, layout.viewportW, layout.viewportH);
    ctx.strokeStyle = "#0ea5e9";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(layout.viewportX, layout.viewportY, layout.viewportW, layout.viewportH);
  }, [layout]);

  const panToPreviewPoint = (previewX: number, previewY: number) => {
    const clampedX = Math.max(layout.offsetX, Math.min(previewX, layout.offsetX + layout.drawW));
    const clampedY = Math.max(layout.offsetY, Math.min(previewY, layout.offsetY + layout.drawH));
    const canvasX = (clampedX - layout.offsetX) / layout.scale;
    const canvasY = (clampedY - layout.offsetY) / layout.scale;
    const viewportCenterCanvasX = canvasWidth / (2 * Math.max(zoom, 0.1));
    const viewportCenterCanvasY = canvasHeight / (2 * Math.max(zoom, 0.1));

    const targetPanX = -(canvasX - viewportCenterCanvasX) * zoom;
    const targetPanY = -(canvasY - viewportCenterCanvasY) * zoom;
    onPan(targetPanX - panX, targetPanY - panY);
  };

  const handlePreviewPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * PREVIEW_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * PREVIEW_HEIGHT;
    const withinViewport =
      x >= layout.viewportX &&
      x <= layout.viewportX + layout.viewportW &&
      y >= layout.viewportY &&
      y <= layout.viewportY + layout.viewportH;

    setIsDraggingViewport(withinViewport);
    panToPreviewPoint(x, y);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePreviewPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingViewport) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * PREVIEW_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * PREVIEW_HEIGHT;
    panToPreviewPoint(x, y);
  };

  const handlePreviewPointerUp = () => {
    setIsDraggingViewport(false);
  };

  const handleZoomIn = () => onZoomChange(Math.min(zoom * 1.2, 8));
  const handleZoomOut = () => onZoomChange(Math.max(zoom / 1.2, 0.1));
  const handleZoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (!Number.isNaN(value)) onZoomChange(Math.max(0.1, Math.min(value / 100, 8)));
  };
  const handleFitToScreen = () => onZoomChange(1);

  return (
    <div className={cn("flex flex-col overflow-hidden border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900", className)} style={style}>
      <div className="flex items-center justify-between border-b border-zinc-200 p-3 dark:border-zinc-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <Navigation className="h-4 w-4" />
          Navigator
        </h3>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        <div className="flex flex-1 items-center justify-center rounded border border-zinc-700 bg-zinc-800">
          <canvas
            ref={canvasRef}
            width={PREVIEW_WIDTH}
            height={PREVIEW_HEIGHT}
            onPointerDown={handlePreviewPointerDown}
            onPointerMove={handlePreviewPointerMove}
            onPointerUp={handlePreviewPointerUp}
            onPointerCancel={handlePreviewPointerUp}
            className={cn(
              "h-full w-full transition-opacity",
              isDraggingViewport ? "cursor-grabbing opacity-90" : "cursor-grab hover:opacity-90"
            )}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="rounded p-1.5 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </button>
            <input
              type="number"
              value={Math.round(zoom * 100)}
              onChange={handleZoomInputChange}
              min={10}
              max={800}
              className="flex-1 rounded border border-zinc-200 bg-zinc-100 px-2 py-1 text-center text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <span className="w-6 text-right text-xs text-zinc-500 dark:text-zinc-400">%</span>
            <button
              onClick={handleZoomIn}
              className="rounded p-1.5 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>

          <button
            onClick={handleFitToScreen}
            className="w-full rounded border border-zinc-200 px-2 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Fit to Screen
          </button>
        </div>

        <div className="space-y-1 border-t border-zinc-200 pt-2 text-xs dark:border-zinc-700">
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span>Canvas:</span>
            <span className="font-mono">
              {Math.round(canvasWidth)}x{Math.round(canvasHeight)}
            </span>
          </div>
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <Move className="h-3 w-3" />
              Pan
            </span>
            <span className="font-mono">
              ({Math.round(panX)}, {Math.round(panY)})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
