"use client";

import { useRef, useState, useEffect } from "react";
import Canvas, { CanvasHandle, SelectionData } from "@/components/Canvas";
import LayerPanel from "@/components/LayerPanel";
import PropertiesPanel from "@/components/PropertiesPanel";
import PromptBar from "@/components/PromptBar";
import { useLayerStore } from "@/lib/store";
import { Move, MousePointer2, Crop, RotateCcw, RotateCw, Upload, Download, Scan } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const canvasRef = useRef<CanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState<SelectionData | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const { activeTool, setActiveTool, removeLayer, activeLayerId } = useLayerStore();

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleExport = () => {
    canvasRef.current?.exportCanvas('png');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      alert("Please upload a PNG or JPEG image");
      return;
    }

    canvasRef.current?.uploadImage(file);
  };

  const handleSelectionChange = (selectionData: SelectionData | null) => {
    setSelection(selectionData);
  };

  const handleHistoryChange = (canUndoNow: boolean, canRedoNow: boolean) => {
    setCanUndo(canUndoNow);
    setCanRedo(canRedoNow);
  };

  const handleUndo = () => canvasRef.current?.undo();
  const handleRedo = () => canvasRef.current?.redo();

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      if (ctrl && key === 'z') {
        e.preventDefault();
        shift ? handleRedo() : handleUndo();
      } else if (ctrl && key === 'd') {
        e.preventDefault();
        canvasRef.current?.clearSelection();
      } else if (ctrl && key === 's') {
        e.preventDefault();
        handleExport();
      } else if (key === 'escape') {
        canvasRef.current?.clearSelection();
        setActiveTool('move');
      } else if (key === 'delete' || key === 'backspace') {
        if (activeLayerId) {
          removeLayer(activeLayerId);
        }
      } else if (key === 'v') {
        setActiveTool('move');
      } else if (key === 'm') {
        setActiveTool('select');
      } else if (key === 'c') {
        setActiveTool('crop');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, activeLayerId]);

  const handleCreateMask = () => {
    canvasRef.current?.createMask();
  };

  const handleCrop = () => {
    if (canvasRef.current) {
      const selection = canvasRef.current.getSelection();
      if (selection) {
        canvasRef.current.crop(
          selection.width,
          selection.height,
          selection.x,
          selection.y
        );
      }
    }
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (prompt: string) => {
    if (!selection || !canvasRef.current) return;

    setIsGenerating(true);
    try {
      const genData = await canvasRef.current.getGenerationData();
      if (!genData) {
        alert("Failed to capture canvas data");
        setIsGenerating(false);
        return;
      }

      console.log("Sending generation request...");

      const response = await fetch('/api/ai-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: genData.image,
          mask: genData.mask,
          prompt
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generaton failed');
      }

      console.log("Generation successful");

      // Add the result as a new layer
      if (data.image) {
        canvasRef.current.addImageLayer(data.image, `AI: ${prompt}`);
        canvasRef.current.clearSelection();
      }

    } catch (error) {
      console.error(error);
      alert("Error generating image. Check console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [propertiesPanelHeight, setPropertiesPanelHeight] = useState(400);
  const [resizing, setResizing] = useState<'sidebar' | 'panel' | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;

      if (resizing === 'sidebar') {
        const newWidth = window.innerWidth - e.clientX;
        setSidebarWidth(Math.max(260, Math.min(newWidth, 500)));
      } else if (resizing === 'panel' && sidebarRef.current) {
        const sidebarRect = sidebarRef.current.getBoundingClientRect();
        const newHeight = e.clientY - sidebarRect.top;
        setPropertiesPanelHeight(Math.max(200, Math.min(newHeight, sidebarRect.height - 200)));
      }
    };

    const handleMouseUp = () => {
      setResizing(null);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = resizing === 'sidebar' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  return (
    <div className="flex h-screen w-screen bg-zinc-50 dark:bg-[#09090b] text-foreground overflow-hidden font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col relative h-full overflow-hidden">

        {/* Floating Toolbar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="glass flex items-center gap-1 p-1.5 rounded-2xl shadow-xl shadow-black/5 ring-1 ring-black/5 dark:ring-white/10">
            <div className="flex items-center gap-1 pr-2 border-r border-zinc-200 dark:border-zinc-800 mr-1">
              <ToolButton
                active={activeTool === 'move'}
                onClick={() => setActiveTool('move')}
                icon={Move}
                label="Move (V)"
              />
              <ToolButton
                active={activeTool === 'select'}
                onClick={() => setActiveTool('select')}
                icon={MousePointer2}
                label="Select (M)"
              />
              <ToolButton
                active={activeTool === 'crop'}
                onClick={() => setActiveTool('crop')}
                icon={Crop}
                label="Crop (C)"
              />
            </div>

            <div className="flex items-center gap-1">
              <IconButton onClick={handleUndo} disabled={!canUndo} icon={RotateCcw} label="Undo" />
              <IconButton onClick={handleRedo} disabled={!canRedo} icon={RotateCw} label="Redo" />
            </div>

            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

            <div className="flex items-center gap-1">
              {selection && (
                <button
                  onClick={handleCreateMask}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-sm shadow-blue-500/20"
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>Mask</span>
                </button>
              )}
              <IconButton onClick={handleUploadClick} icon={Upload} label="Upload" />
              <IconButton onClick={handleExport} icon={Download} label="Export (Ctrl+S)" />
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="relative flex-1 bg-zinc-100/50 dark:bg-black/20">
          <Canvas
            ref={canvasRef}
            onSelectionChange={handleSelectionChange}
            onHistoryChange={handleHistoryChange}
          />
        </div>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={() => setResizing('sidebar')}
        className="w-px hover:w-1 active:w-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-blue-500 active:bg-blue-500 cursor-col-resize transition-all z-20"
      />

      {/* Right Sidebar */}
      <div
        ref={sidebarRef}
        style={{ width: sidebarWidth }}
        className="flex flex-col bg-white dark:bg-zinc-900/50 border-l border-zinc-200 dark:border-zinc-800 backdrop-blur-xl h-full shrink-0 z-10"
      >
        <div style={{ height: propertiesPanelHeight }} className="flex flex-col overflow-hidden">
          <PropertiesPanel className="flex-1" />
        </div>

        <div
          onMouseDown={() => setResizing('panel')}
          className="h-px hover:h-1 active:h-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-blue-500 active:bg-blue-500 cursor-row-resize transition-all z-20 shrink-0"
        />

        <div className="flex-1 overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/30">
          <LayerPanel
            onCreateMask={handleCreateMask}
            onInvertMask={() => canvasRef.current?.invertMask()}
            onFeatherMask={(amount) => canvasRef.current?.featherMask(amount)}
            onCrop={handleCrop}
          />
        </div>
      </div>

      <PromptBar
        selection={selection}
        onGenerate={handleGenerate}
        onCancel={() => canvasRef.current?.clearSelection()}
        isGenerating={isGenerating}
        position={selection?.screenX !== undefined ? {
          x: (selection.screenX || 0) + (selection.screenWidth || 0) / 2,
          y: (selection.screenY || 0) + (selection.screenHeight || 0) + 16 // 16px padding below selection
        } : undefined}
      />

      {/* Crop Confirmation Overlay */}
      {activeTool === 'crop' && selection && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 glass px-4 py-3 rounded-xl shadow-2xl flex gap-3 animation-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center pr-2 border-r border-zinc-200 dark:border-zinc-700">
            {Math.round(selection.width)} × {Math.round(selection.height)}
          </div>
          <button
            onClick={() => {
              canvasRef.current?.crop(selection.width, selection.height, selection.x, selection.y);
              setActiveTool('move');
            }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/20"
          >
            Crop Canvas
          </button>
          <button
            onClick={() => {
              canvasRef.current?.clearSelection();
              setActiveTool('move');
            }}
            className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function ToolButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "p-2 rounded-xl transition-all duration-200 group relative",
        active
          ? "bg-zinc-100 dark:bg-zinc-800 text-foreground shadow-sm"
          : "text-zinc-500 hover:text-foreground hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"
      )}
    >
      <Icon className="w-4 h-4" />
      {active && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
      )}
    </button>
  );
}

function IconButton({ onClick, disabled, icon: Icon, label }: { onClick: () => void, disabled?: boolean, icon: any, label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="p-2 rounded-xl text-zinc-500 hover:text-foreground hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
