"use client";

import { useRef, useState, useEffect } from "react";
import Canvas, { CanvasHandle, SelectionData } from "@/components/Canvas";
import LayerPanel from "@/components/LayerPanel";
import PropertiesPanel from "@/components/PropertiesPanel";
import AdjustmentsPanel from "@/components/AdjustmentsPanel";
import NavigatorPanel from "@/components/NavigatorPanel";
import ColorSwatchesPanel from "@/components/ColorSwatchesPanel";
import ToolboxPanel from "@/components/ToolboxPanel";
import FiltersPanel from "@/components/FiltersPanel";
import LayerStylesPanel from "@/components/LayerStylesPanel";
import ChannelsPanel from "@/components/ChannelsPanel";
import PathsPanel, { PathItem, PathMode } from "@/components/PathsPanel";
import CharacterParagraphPanel from "@/components/CharacterParagraphPanel";
import BrushSettingsPanel, { BrushShape } from "@/components/BrushSettingsPanel";
import LibrariesPanel, { LibraryAsset } from "@/components/LibrariesPanel";
import TimelinePanel from "@/components/TimelinePanel";
import ActionsPanel, { MacroAction, MacroCommand } from "@/components/ActionsPanel";
import ExportAsPanel, { ExportAsOptions } from "@/components/ExportAsPanel";
import PlaceAssetsPanel from "@/components/PlaceAssetsPanel";
import AutomationPanel, { BatchOptions, BatchStatus, DropletPreset } from "@/components/AutomationPanel";

type NewLibraryAsset =
  | Omit<Extract<LibraryAsset, { type: "color" }>, "id">
  | Omit<Extract<LibraryAsset, { type: "gradient" }>, "id">
  | Omit<Extract<LibraryAsset, { type: "textStyle" }>, "id">
  | Omit<Extract<LibraryAsset, { type: "brushPreset" }>, "id">;
import PromptBar from "@/components/PromptBar";
import { useLayerStore } from "@/lib/store";
import { Move, MousePointer2, Crop, RotateCcw, RotateCw, Upload, Download, Scan, PanelRightOpen, PanelRightClose, Sparkles, SlidersHorizontal, X, PenTool, Wand2, Brush, Brain, History, Navigation, Palette, UserCircle2, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollaborationEngine, CollaborativeUser } from "@/lib/collab";

type CommentThread = {
  id: string;
  text: string;
  x: number;
  y: number;
  selection?: { x: number; y: number; width: number; height: number };
  resolved: boolean;
  replies: Array<{ id: string; text: string; createdAt: string }>;
  createdAt: string;
};

type ArtboardItem = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type ArtboardPreset = {
  id: "iphone" | "android" | "tablet" | "desktop" | "story";
  label: string;
  width: number;
  height: number;
};

type SliceItem = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type NoteItem = {
  id: string;
  text: string;
  x: number;
  y: number;
  createdAt: string;
};

const ARTBOARD_PRESETS: ArtboardPreset[] = [
  { id: "iphone", label: "iPhone 15", width: 1179, height: 2556 },
  { id: "android", label: "Android", width: 1080, height: 2400 },
  { id: "tablet", label: "Tablet", width: 2048, height: 2732 },
  { id: "desktop", label: "Desktop", width: 1920, height: 1080 },
  { id: "story", label: "Story", width: 1080, height: 1920 }
];

const ACTIONS_STORAGE_KEY = "zerothlayer.actions.v1";
const DROPLETS_STORAGE_KEY = "zerothlayer.droplets.v1";

const isMacroCommand = (value: unknown): value is MacroCommand =>
  value === "run-droplet" ||
  value === "run-brush" ||
  value === "run-pencil" ||
  value === "run-mixer" ||
  value === "run-gradient" ||
  value === "run-paint-bucket" ||
  value === "export-timeline";

const isDropletPresetRecord = (value: unknown): value is Omit<DropletPreset, "runCount"> & { runCount?: number } => {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.name !== "string") return false;
  if (!row.filters || typeof row.filters !== "object" || Array.isArray(row.filters)) return false;
  return true;
};

export default function Home() {
  const canvasRef = useRef<CanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const placeEmbeddedInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState<SelectionData | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showPromptBar, setShowPromptBar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'properties' | 'layers' | 'project' | 'workspace' | 'adjustments' | 'navigator' | 'colors' | 'tools' | 'filters' | 'styles' | 'channels' | 'paths' | 'character' | 'brush' | 'libraries' | 'timeline' | 'actions' | 'exportas' | 'place' | 'automate'>('layers');

  const {
    activeTool,
    setActiveTool,
    removeLayer,
    updateLayer,
    setActiveLayer,
    setLayerFilter,
    activeLayerId,
    aiPromptDraft,
    setAiPromptDraft,
    layers,
    maskPreviewMode,
    setMaskPreviewMode
  } = useLayerStore();
  const selectedLayer = activeLayerId ? layers.find((layer) => layer.id === activeLayerId) ?? null : null;

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [exportQuality, setExportQuality] = useState(90);
  const [exportAsOptions, setExportAsOptions] = useState<ExportAsOptions>({
    target: "flattened",
    format: "webp",
    quality: 82,
    width: 0,
    height: 0,
    maintainAspect: true
  });
  const [exportAsEstimateBytes, setExportAsEstimateBytes] = useState<number | null>(null);
  const [isEstimatingExportAs, setIsEstimatingExportAs] = useState(false);
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticSource, setSemanticSource] = useState<string | null>(null);
  const [collabEnabled, setCollabEnabled] = useState(false);
  const [collabRole, setCollabRole] = useState<'viewer' | 'editor'>('editor');
  const [collabUsers, setCollabUsers] = useState<CollaborativeUser[]>([]);
  const [localUser, setLocalUser] = useState<CollaborativeUser | null>(null);
  const collabRef = useRef<CollaborationEngine | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string>("default");
  const [projects, setProjects] = useState<any[]>([]);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [embedSnippet, setEmbedSnippet] = useState<string>("");
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [comparePreview, setComparePreview] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [snapshotName, setSnapshotName] = useState("");
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<CommentThread[]>([]);
  const [authUser, setAuthUser] = useState<{ id: string; name: string } | null>(null);
  const [historyInfo, setHistoryInfo] = useState<{ undo: string[]; redo: string[]; canUndo: boolean; canRedo: boolean }>({ undo: [], redo: [], canUndo: false, canRedo: false });
  const [viewState, setViewState] = useState<{ zoom: number; panX: number; panY: number }>({ zoom: 1, panX: 0, panY: 0 });
  const [canvasDims, setCanvasDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [swatches, setSwatches] = useState<string[]>(["#111827", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6"]);
  const [activeColor, setActiveColor] = useState("#3b82f6");
  const [gradientA, setGradientA] = useState("#0ea5e9");
  const [gradientB, setGradientB] = useState("#6366f1");
  const [gradientType, setGradientType] = useState<"linear" | "radial" | "reflected" | "diamond">("linear");
  const [gradientAngle, setGradientAngle] = useState(35);
  const [gradientOpacity, setGradientOpacity] = useState(86);
  const [paintBucketTolerance, setPaintBucketTolerance] = useState(46);
  const [paintBucketMode, setPaintBucketMode] = useState<"color" | "pattern">("color");
  const [paintBucketPattern, setPaintBucketPattern] = useState<"checker" | "stripes" | "dots">("checker");
  const [blurToolStrength, setBlurToolStrength] = useState(36);
  const [blurToolPreserveEdges, setBlurToolPreserveEdges] = useState(true);
  const [sharpenToolAmount, setSharpenToolAmount] = useState(62);
  const [sharpenToolRadius, setSharpenToolRadius] = useState(2);
  const [sharpenToolThreshold, setSharpenToolThreshold] = useState(18);
  const [smudgeToolStrength, setSmudgeToolStrength] = useState(58);
  const [smudgeToolFingerWidth, setSmudgeToolFingerWidth] = useState(18);
  const [smudgeToolDirection, setSmudgeToolDirection] = useState(28);
  const [dodgeToolStrength, setDodgeToolStrength] = useState(44);
  const [dodgeToolRange, setDodgeToolRange] = useState<"shadows" | "midtones" | "highlights">("midtones");
  const [dodgeProtectHighlights, setDodgeProtectHighlights] = useState(true);
  const [burnToolStrength, setBurnToolStrength] = useState(42);
  const [burnToolRange, setBurnToolRange] = useState<"shadows" | "midtones" | "highlights">("midtones");
  const [burnProtectShadows, setBurnProtectShadows] = useState(true);
  const [spongeToolStrength, setSpongeToolStrength] = useState(46);
  const [spongeToolMode, setSpongeToolMode] = useState<"saturate" | "desaturate">("saturate");
  const [spongeProtectSkin, setSpongeProtectSkin] = useState(true);
  const [selectMaskFeather, setSelectMaskFeather] = useState(8);
  const [colorRangeColor, setColorRangeColor] = useState("#3b82f6");
  const [colorRangeTolerance, setColorRangeTolerance] = useState(60);
  const [focusStrength, setFocusStrength] = useState(62);
  const [channels, setChannels] = useState({ r: true, g: true, b: true, a: true });
  const [paths, setPaths] = useState<PathItem[]>([
    { id: crypto.randomUUID(), name: "Work Path", visible: true, kind: "work" }
  ]);
  const [pathMode, setPathMode] = useState<PathMode>('add');
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(20);
  const [brushHardness, setBrushHardness] = useState(70);
  const [brushSpacing, setBrushSpacing] = useState(12);
  const [brushShape, setBrushShape] = useState<BrushShape>("round");
  const [brushFlow, setBrushFlow] = useState(78);
  const [brushJitter, setBrushJitter] = useState(12);
  const [brushTexture, setBrushTexture] = useState(28);
  const [brushTextureScale, setBrushTextureScale] = useState(7);
  const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[]>([]);
  const [fontSize, setFontSize] = useState(36);
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>('sans');
  const [fontWeight, setFontWeight] = useState<300 | 400 | 500 | 600 | 700>(500);
  const [textItalic, setTextItalic] = useState(false);
  const [textUnderline, setTextUnderline] = useState(false);
  const [lineHeight, setLineHeight] = useState(1.3);
  const [tracking, setTracking] = useState(0);
  const [paragraphSpacing, setParagraphSpacing] = useState(10);
  const [paragraphIndent, setParagraphIndent] = useState(0);
  const [timelineFrame, setTimelineFrame] = useState(0);
  const [timelineFps, setTimelineFps] = useState(24);
  const [timelineDurationFrames, setTimelineDurationFrames] = useState(240);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const [timelineKeyframes, setTimelineKeyframes] = useState<number[]>([]);
  const [videoEditInFrame, setVideoEditInFrame] = useState(0);
  const [videoEditOutFrame, setVideoEditOutFrame] = useState(239);
  const [videoEditSpeed, setVideoEditSpeed] = useState(1);
  const [videoEditLoop, setVideoEditLoop] = useState(true);
  const [videoEditTransition, setVideoEditTransition] = useState<"cut" | "fade" | "dissolve">("cut");
  const [frameAnimationFrames, setFrameAnimationFrames] = useState<number[]>([]);
  const [isExportingGif, setIsExportingGif] = useState(false);
  const [isActionRecording, setIsActionRecording] = useState(false);
  const [actions, setActions] = useState<MacroAction[]>([
    { id: crypto.randomUUID(), name: "Quick Retouch", steps: 1, commands: ["run-droplet"], runCount: 0 }
  ]);
  const [dropletPresets, setDropletPresets] = useState<DropletPreset[]>([
    {
      id: crypto.randomUUID(),
      name: "Quick Retouch Droplet",
      filters: { contrast: 0.22, vibrance: 0.28, shadows: 0.18 },
      runCount: 0
    }
  ]);
  const [activeDropletId, setActiveDropletId] = useState<string | null>(null);
  const [actionNameDraft, setActionNameDraft] = useState("My Action");
  const [recordedCommands, setRecordedCommands] = useState<MacroCommand[]>([]);
  const [artboards, setArtboards] = useState<ArtboardItem[]>([]);
  const [slices, setSlices] = useState<SliceItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [counts, setCounts] = useState<Array<{ id: string; x: number; y: number }>>([]);
  const [sampledColor, setSampledColor] = useState<{ hex: string; r: number; g: number; b: number; a: number } | null>(null);
  const [textDraft, setTextDraft] = useState("Zerothlayer");
  const [textWarp, setTextWarp] = useState(0.28);
  const [textWarpStyle, setTextWarpStyle] = useState<'arc' | 'arch' | 'bulge' | 'flag' | 'wave'>('arc');
  const [textWarpAxis, setTextWarpAxis] = useState<'horizontal' | 'vertical'>('horizontal');
  const [openTypeLiga, setOpenTypeLiga] = useState(true);
  const [openTypeDiscretionaryLiga, setOpenTypeDiscretionaryLiga] = useState(false);
  const [openTypeKerning, setOpenTypeKerning] = useState(true);
  const [openTypeOldStyleFigures, setOpenTypeOldStyleFigures] = useState(false);
  const [openTypeSmallCaps, setOpenTypeSmallCaps] = useState(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [textDirection, setTextDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [vectorShape, setVectorShape] = useState<'rectangle' | 'ellipse' | 'polygon' | 'custom'>('rectangle');
  const [customShapePreset, setCustomShapePreset] = useState<'star' | 'arrow' | 'diamond' | 'speech'>('star');
  const [polygonSides, setPolygonSides] = useState(6);
  const [cameraRawStrength, setCameraRawStrength] = useState(0.35);
  const [cameraRawProfile, setCameraRawProfile] = useState<"adobe-color" | "portrait" | "landscape" | "vivid" | "bw">("adobe-color");
  const [cameraRawTemperature, setCameraRawTemperature] = useState(0);
  const [cameraRawTint, setCameraRawTint] = useState(0);
  const [cameraRawExposure, setCameraRawExposure] = useState(0);
  const [cameraRawContrast, setCameraRawContrast] = useState(8);
  const [cameraRawHighlights, setCameraRawHighlights] = useState(-12);
  const [cameraRawShadows, setCameraRawShadows] = useState(14);
  const [cameraRawWhites, setCameraRawWhites] = useState(6);
  const [cameraRawBlacks, setCameraRawBlacks] = useState(-6);
  const [cameraRawTexture, setCameraRawTexture] = useState(8);
  const [cameraRawClarity, setCameraRawClarity] = useState(10);
  const [cameraRawDehaze, setCameraRawDehaze] = useState(8);
  const [cameraRawVibrance, setCameraRawVibrance] = useState(12);
  const [cameraRawSaturation, setCameraRawSaturation] = useState(0);
  const [adjustmentLayerPreset, setAdjustmentLayerPreset] = useState<'brightness-contrast' | 'cinematic' | 'black-white' | 'vibrance-pop' | 'teal-orange'>('brightness-contrast');
  const [adjustmentLayerStrength, setAdjustmentLayerStrength] = useState(72);
  const [adjustmentLayerSource, setAdjustmentLayerSource] = useState<'merged' | 'active'>('merged');
  const [smartFilterPreset, setSmartFilterPreset] = useState<'brightness-contrast' | 'cinematic' | 'black-white' | 'vibrance-pop' | 'teal-orange'>('cinematic');
  const [smartFilterStrength, setSmartFilterStrength] = useState(64);
  const [generativeExpandPercent, setGenerativeExpandPercent] = useState(12);
  const [generativeExpandDirection, setGenerativeExpandDirection] = useState<"all" | "horizontal" | "vertical" | "left" | "right" | "top" | "bottom">("all");
  const [generativeExpandFill, setGenerativeExpandFill] = useState<"gradient" | "mirror" | "blur">("gradient");
  const [generativeExpandSource, setGenerativeExpandSource] = useState<"merged" | "active">("merged");
  const [skyReplacementStyle, setSkyReplacementStyle] = useState<"sunset" | "clear" | "storm" | "twilight">("sunset");
  const [skyReplacementIntensity, setSkyReplacementIntensity] = useState(72);
  const [skyReplacementHorizon, setSkyReplacementHorizon] = useState(46);
  const [skyReplacementClouds, setSkyReplacementClouds] = useState(54);
  const [removeBgFeather, setRemoveBgFeather] = useState(28);
  const [removeBgSubjectScale, setRemoveBgSubjectScale] = useState(54);
  const [removeBgDecontaminate, setRemoveBgDecontaminate] = useState(36);
  const [removeBgSource, setRemoveBgSource] = useState<"merged" | "active">("active");
  const [superResScale, setSuperResScale] = useState<2 | 3 | 4>(2);
  const [superResSharpen, setSuperResSharpen] = useState(46);
  const [superResDenoise, setSuperResDenoise] = useState(24);
  const [superResSource, setSuperResSource] = useState<"merged" | "active">("merged");
  const [scriptCommand, setScriptCommand] = useState("");
  const [scriptLanguage, setScriptLanguage] = useState<"javascript" | "vbscript">("javascript");
  const [scriptBody, setScriptBody] = useState(
    [
      'await api.command("filters vintage");',
      'await api.command("ai sky");',
      'api.log("Script finished.");'
    ].join("\n")
  );
  const [scriptOutput, setScriptOutput] = useState("");
  const [dataRows, setDataRows] = useState("title,subtitle\nSummer Drop,Limited Edition\nStudio Pack,Now Shipping");
  const [dataTemplate, setDataTemplate] = useState("{{title}}\n{{subtitle}}");
  const [dataDrivenMode, setDataDrivenMode] = useState<"single" | "rows">("rows");
  const [dataDrivenSummary, setDataDrivenSummary] = useState<string | null>(null);
  const [selectedPlugin, setSelectedPlugin] = useState<'vintage-fx' | 'watercolor-brush' | 'bg-ai-remix' | 'film-grain-pro' | 'comic-ink-brush' | 'object-cutout-ai'>('vintage-fx');
  const [installedThirdPartyPlugins, setInstalledThirdPartyPlugins] = useState<Record<'vintage-fx' | 'watercolor-brush' | 'bg-ai-remix' | 'film-grain-pro' | 'comic-ink-brush' | 'object-cutout-ai', boolean>>({
    'vintage-fx': true,
    'watercolor-brush': true,
    'bg-ai-remix': true,
    'film-grain-pro': false,
    'comic-ink-brush': false,
    'object-cutout-ai': false
  });
  const [thirdPartyPluginStrength, setThirdPartyPluginStrength] = useState(64);
  const [thirdPartyPluginDetail, setThirdPartyPluginDetail] = useState(52);
  const [thirdPartyPluginUseAiAssist, setThirdPartyPluginUseAiAssist] = useState(true);
  const [thirdPartyPluginStatus, setThirdPartyPluginStatus] = useState<string | null>(null);
  const [neuralPluginModel, setNeuralPluginModel] = useState<"skin-smooth" | "portrait-light" | "colorize" | "style-transfer" | "depth-blur">("skin-smooth");
  const [neuralPluginStrength, setNeuralPluginStrength] = useState(58);
  const [neuralPluginDetail, setNeuralPluginDetail] = useState(52);
  const [neuralPluginPreserveColor, setNeuralPluginPreserveColor] = useState(true);
  const [neuralPluginAutoMask, setNeuralPluginAutoMask] = useState(true);
  const [includeTimelineAudio, setIncludeTimelineAudio] = useState(true);
  const [timelineAudioMode, setTimelineAudioMode] = useState<"tone" | "pulse" | "none">("tone");
  const [timelineAudioLevel, setTimelineAudioLevel] = useState(40);
  const [timelineTransitionStyle, setTimelineTransitionStyle] = useState<"cut" | "fade" | "dissolve" | "wipe-left" | "zoom-fade">("fade");
  const [timelineExportScale, setTimelineExportScale] = useState<0.5 | 0.75 | 1>(1);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [legacy3DDepth, setLegacy3DDepth] = useState(46);
  const [legacy3DTilt, setLegacy3DTilt] = useState(28);
  const [legacy3DWireframe, setLegacy3DWireframe] = useState(16);
  const [legacy3DGlow, setLegacy3DGlow] = useState(42);
  const [legacy3DObject, setLegacy3DObject] = useState<"cube" | "sphere" | "cylinder" | "torus" | "plane">("cube");
  const [legacy3DMaterial, setLegacy3DMaterial] = useState<"matte" | "metal" | "glass" | "emissive">("matte");
  const [legacy3DRoughness, setLegacy3DRoughness] = useState(46);
  const [legacy3DMetalness, setLegacy3DMetalness] = useState(36);
  const [legacy3DLightAzimuth, setLegacy3DLightAzimuth] = useState(32);
  const [legacy3DLightElevation, setLegacy3DLightElevation] = useState(38);
  const [legacy3DLightIntensity, setLegacy3DLightIntensity] = useState(68);
  const [uvPreviewEnabled, setUvPreviewEnabled] = useState(true);
  const [uvGridDensity, setUvGridDensity] = useState(12);
  const [uvSeamStrength, setUvSeamStrength] = useState(62);
  const [uvCheckerOpacity, setUvCheckerOpacity] = useState(24);
  const [uvDistortion, setUvDistortion] = useState(28);
  const [isRefreshingLinkedAssets, setIsRefreshingLinkedAssets] = useState(false);
  const [linkedRefreshSummary, setLinkedRefreshSummary] = useState<string | null>(null);
  const [placeLinkedUrl, setPlaceLinkedUrl] = useState("");
  const [placeEmbeddedSmartObject, setPlaceEmbeddedSmartObject] = useState(true);
  const [placeLinkedSmartObject, setPlaceLinkedSmartObject] = useState(true);
  const [batchOptions, setBatchOptions] = useState<BatchOptions>({
    format: "webp",
    quality: 88,
    maxSide: 0,
    autoDownload: true
  });
  const [batchStatus, setBatchStatus] = useState<BatchStatus>({
    running: false,
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    currentFile: null,
    lastSummary: null
  });
  const [lastBatchReport, setLastBatchReport] = useState<{
    createdAt: string;
    options: BatchOptions;
    totals: { total: number; success: number; failed: number };
    files: Array<{ name: string; status: "success" | "failed"; outputWidth?: number; outputHeight?: number; error?: string }>;
  } | null>(null);
  const [sliceExportFormat, setSliceExportFormat] = useState<"png" | "jpeg" | "webp">("webp");
  const [sliceExportQuality, setSliceExportQuality] = useState(84);
  const [sliceExportScales, setSliceExportScales] = useState<Array<1 | 2 | 3>>([1, 2]);
  const [sliceWebNaming, setSliceWebNaming] = useState<"kebab" | "preserve">("kebab");
  const [sliceWebPathPrefix, setSliceWebPathPrefix] = useState("assets/ui/");
  const [sliceWebClassPrefix, setSliceWebClassPrefix] = useState("ui-");
  const [sliceWebReport, setSliceWebReport] = useState<string | null>(null);
  const [assetGenSource, setAssetGenSource] = useState<"slices" | "artboards" | "both">("both");
  const [assetGenFormats, setAssetGenFormats] = useState<Array<"png" | "jpeg" | "webp">>(["png", "webp"]);
  const [assetGenScales, setAssetGenScales] = useState<Array<1 | 2 | 3 | 4>>([1, 2]);
  const [assetGenQuality, setAssetGenQuality] = useState(84);
  const [assetGenPrefix, setAssetGenPrefix] = useState("");
  const [assetGenIncludeSourceTag, setAssetGenIncludeSourceTag] = useState(true);
  const [assetGenStatus, setAssetGenStatus] = useState<{ running: boolean; total: number; done: number; last: string | null }>({
    running: false,
    total: 0,
    done: 0,
    last: null
  });
  const [assetGenReport, setAssetGenReport] = useState<string | null>(null);
  const [printColorProfile, setPrintColorProfile] = useState<"srgb" | "display-p3" | "adobe-rgb" | "cmyk-coated" | "gracol">("srgb");
  const [printIntent, setPrintIntent] = useState<"perceptual" | "relative-colorimetric" | "saturation" | "absolute-colorimetric">("relative-colorimetric");
  const [printPaperSize, setPrintPaperSize] = useState<"a4" | "letter" | "a3" | "tabloid">("a4");
  const [printOrientation, setPrintOrientation] = useState<"portrait" | "landscape">("portrait");
  const [printScalePercent, setPrintScalePercent] = useState(100);
  const [printBleedMm, setPrintBleedMm] = useState(3);
  const [printShowMarks, setPrintShowMarks] = useState(true);
  const [printFlattenImage, setPrintFlattenImage] = useState(true);
  const [printSimulateCmyk, setPrintSimulateCmyk] = useState(false);
  const [lastPrintSummary, setLastPrintSummary] = useState<string | null>(null);
  const [cloneStampOffsetX, setCloneStampOffsetX] = useState(32);
  const [cloneStampOffsetY, setCloneStampOffsetY] = useState(14);
  const [cloneStampOpacity, setCloneStampOpacity] = useState(78);
  const [redEyeStrength, setRedEyeStrength] = useState(72);
  const [colorReplaceTolerance, setColorReplaceTolerance] = useState(36);
  const [colorReplaceStrength, setColorReplaceStrength] = useState(74);
  const replayingActionRef = useRef(false);

  const handleExport = (format: 'png' | 'jpeg' | 'webp' | 'svg' = 'png', target: 'flattened' | 'active-layer' = 'flattened') => {
    const quality = Math.max(0.1, Math.min(1, exportQuality / 100));
    if (target === 'active-layer') {
      canvasRef.current?.exportActiveLayer(format, quality);
    } else {
      canvasRef.current?.exportCanvas(format, quality);
    }
    setShowExportMenu(false);
  };

  const buildOptimizedExportBlob = async (opts: ExportAsOptions): Promise<Blob | null> => {
    if (!canvasRef.current) return null;
    if (opts.target === "active-layer") return null;
    const snapshot = canvasRef.current.getCanvasSnapshot();
    if (!snapshot) return null;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Unable to load canvas snapshot for export"));
      i.src = snapshot;
    });

    const outW = Math.max(1, Math.round(opts.width || img.naturalWidth));
    const outH = Math.max(1, Math.round(opts.height || img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, outW, outH);

    const mimeType = opts.format === "jpeg" ? "image/jpeg" : opts.format === "webp" ? "image/webp" : "image/png";
    const quality = Math.max(0.1, Math.min(1, opts.quality / 100));
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), mimeType, opts.format === "png" ? undefined : quality);
    });
    return blob;
  };

  const handleExportAsOptimized = async () => {
    if (!canvasRef.current) return;
    const opts = exportAsOptions;
    if (opts.target === "active-layer") {
      const prev = exportQuality;
      setExportQuality(opts.quality);
      handleExport(opts.format, "active-layer");
      setExportQuality(prev);
      return;
    }
    const blob = await buildOptimizedExportBlob(opts);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `zerothlayer-web-${opts.width}x${opts.height}-${Date.now()}.${opts.format === "jpeg" ? "jpg" : opts.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/)) {
      alert("Please upload a PNG, JPEG, or WebP image");
      return;
    }

    canvasRef.current?.uploadImage(file);
  };

  const handlePlaceEmbedded = () => {
    placeEmbeddedInputRef.current?.click();
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error(`Unable to read file: ${file.name}`));
      reader.readAsDataURL(file);
    });

  const handlePlaceEmbeddedFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !canvasRef.current) return;

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const dataUrl = await fileToDataUrl(file);
        canvasRef.current.addImageLayer(
          dataUrl,
          file.name,
          { embedded: true, sourceName: file.name, importedAt: new Date().toISOString() },
          { addToHistory: true, linkedAsset: false, smartObject: placeEmbeddedSmartObject, layerType: 'image' }
        );
      } catch (error) {
        console.error(error);
      }
    }

    if (placeEmbeddedInputRef.current) {
      placeEmbeddedInputRef.current.value = "";
    }
  };

  const handlePlaceLinked = async (urlInput?: string) => {
    if (!canvasRef.current) return;
    const url = (urlInput ?? placeLinkedUrl).trim() || prompt("Enter public image URL");
    if (!url) return;
    const normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      alert("Use a full URL starting with http:// or https://");
      return;
    }
    const name = normalized.split("/").pop() || "linked-image";
    canvasRef.current.addImageLayer(
      normalized,
      name,
      { linked: true, src: normalized, linkedStatus: "ok", linkedUpdatedAt: new Date().toISOString() },
      { addToHistory: true, linkedAsset: true, externalSrc: normalized, smartObject: placeLinkedSmartObject }
    );
    setPlaceLinkedUrl(normalized);
  };

  const handleRelinkActiveLayer = async () => {
    if (!canvasRef.current || !activeLayerId) return;
    const active = layers.find((l) => l.id === activeLayerId);
    if (!active || !active.linkedAsset) {
      alert("Select a linked layer first.");
      return;
    }
    const next = prompt("Enter new source URL", active.externalSrc || placeLinkedUrl || "");
    if (!next) return;
    const normalized = next.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      alert("Use a full URL starting with http:// or https://");
      return;
    }
    try {
      await canvasRef.current.replaceActiveLayerContents(normalized, active.name);
      updateLayer(active.id, {
        linkedAsset: true,
        externalSrc: normalized,
        smartObject: active.smartObject ?? placeLinkedSmartObject,
        aiData: {
          ...(active.aiData as any),
          linked: true,
          src: normalized,
          linkedStatus: "ok",
          linkedUpdatedAt: new Date().toISOString()
        } as any
      });
    } catch {
      updateLayer(active.id, {
        aiData: {
          ...(active.aiData as any),
          linkedStatus: "error",
          linkedError: "Failed to relink source."
        } as any
      });
      alert("Failed to load linked source. Check URL/CORS and try again.");
      return;
    }
    setPlaceLinkedUrl(normalized);
  };

  const refreshLinkedLayerFromSource = async (layerId: string, sourceUrl: string) => {
    if (!canvasRef.current) return false;
    try {
      await canvasRef.current.replaceActiveLayerContents(sourceUrl);
      const latest = useLayerStore.getState().layers.find((layer) => layer.id === layerId);
      updateLayer(layerId, {
        linkedAsset: true,
        externalSrc: sourceUrl,
        smartObject: latest?.smartObject ?? true,
        aiData: {
          ...((latest?.aiData as any) || {}),
          linked: true,
          src: sourceUrl,
          linkedStatus: "ok",
          linkedError: undefined,
          linkedUpdatedAt: new Date().toISOString()
        } as any
      });
      return true;
    } catch {
      const latest = useLayerStore.getState().layers.find((layer) => layer.id === layerId);
      updateLayer(layerId, {
        aiData: {
          ...((latest?.aiData as any) || {}),
          linkedStatus: "error",
          linkedError: "Failed to refresh linked source.",
          linkedUpdatedAt: new Date().toISOString()
        } as any
      });
      return false;
    }
  };

  const handleRefreshActiveLinkedLayer = async () => {
    if (!canvasRef.current || !activeLayerId) return;
    const active = layers.find((layer) => layer.id === activeLayerId);
    if (!active?.linkedAsset || !active.externalSrc) {
      alert("Select a linked layer first.");
      return;
    }
    if (!/^https?:\/\//i.test(active.externalSrc)) {
      alert("Linked layer source must use http(s).");
      return;
    }
    setIsRefreshingLinkedAssets(true);
    const ok = await refreshLinkedLayerFromSource(active.id, active.externalSrc);
    setIsRefreshingLinkedAssets(false);
    setLinkedRefreshSummary(ok ? `Refreshed ${active.name}` : `Failed to refresh ${active.name}`);
    if (!ok) alert("Failed to refresh linked layer source.");
  };

  const handleRefreshAllLinkedLayers = async () => {
    if (!canvasRef.current) return;
    const linkedLayers = layers.filter((layer) => layer.linkedAsset && typeof layer.externalSrc === "string" && /^https?:\/\//i.test(layer.externalSrc || ""));
    if (!linkedLayers.length) {
      alert("No linked layers with valid URLs found.");
      return;
    }
    const previousActiveId = activeLayerId;
    setIsRefreshingLinkedAssets(true);
    let okCount = 0;
    let failCount = 0;
    for (const layer of linkedLayers) {
      setActiveLayer(layer.id);
      await new Promise((resolve) => setTimeout(resolve, 25));
      const ok = await refreshLinkedLayerFromSource(layer.id, String(layer.externalSrc));
      if (ok) okCount += 1;
      else failCount += 1;
    }
    if (previousActiveId) {
      setActiveLayer(previousActiveId);
    }
    setIsRefreshingLinkedAssets(false);
    setLinkedRefreshSummary(`Linked refresh: ${okCount} updated, ${failCount} failed`);
    if (failCount > 0) {
      alert(`Some linked assets failed to refresh (${failCount}).`);
    }
  };

  const handleBatchProcess = () => {
    if (batchStatus.running) return;
    batchInputRef.current?.click();
  };

  const handleBatchFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;

    const format = batchOptions.format;
    const quality = Math.max(0.1, Math.min(1, batchOptions.quality / 100));
    const maxSide = Number.isFinite(batchOptions.maxSide) ? Math.max(0, Math.round(batchOptions.maxSide)) : 0;

    const loadImageFromFile = (file: File) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error(`Failed to load image: ${file.name}`));
        };
        img.src = objectUrl;
      });

    const toBlob = (canvas: HTMLCanvasElement, mimeType: string, q?: number) =>
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Failed to export image"));
            return;
          }
          resolve(blob);
        }, mimeType, q);
      });

    const mimeType = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
    let successCount = 0;
    let failedCount = 0;
    const reportFiles: Array<{ name: string; status: "success" | "failed"; outputWidth?: number; outputHeight?: number; error?: string }> = [];
    setBatchStatus({
      running: true,
      total: files.length,
      processed: 0,
      success: 0,
      failed: 0,
      currentFile: files[0]?.name || null,
      lastSummary: null
    });

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      setBatchStatus((prev) => ({
        ...prev,
        currentFile: file.name
      }));
      try {
        const img = await loadImageFromFile(file);
        let outW = img.naturalWidth;
        let outH = img.naturalHeight;

        if (maxSide > 0 && (outW > maxSide || outH > maxSide)) {
          const scale = Math.min(maxSide / outW, maxSide / outH);
          outW = Math.max(1, Math.round(outW * scale));
          outH = Math.max(1, Math.round(outH * scale));
        }

        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        ctx.drawImage(img, 0, 0, outW, outH);

        const blob = await toBlob(canvas, mimeType, format === "png" ? undefined : quality);
        if (batchOptions.autoDownload) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          const baseName = file.name.replace(/\.[^.]+$/, "");
          link.download = `${baseName}.${format === "jpeg" ? "jpg" : format}`;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else if (canvasRef.current) {
          const baseName = file.name.replace(/\.[^.]+$/, "");
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("Failed to read processed blob"));
            reader.readAsDataURL(blob);
          });
          canvasRef.current.addImageLayer(
            dataUrl,
            `Batch: ${baseName}`,
            { automation: "batch", source: file.name, format, quality, maxSide, generatedAt: new Date().toISOString() },
            { addToHistory: true, layerType: 'image', smartObject: true }
          );
        }
        successCount += 1;
        reportFiles.push({ name: file.name, status: "success", outputWidth: outW, outputHeight: outH });
      } catch (error) {
        console.error("[BatchProcess] failed:", error);
        failedCount += 1;
        reportFiles.push({
          name: file.name,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown batch error"
        });
      }
      setBatchStatus((prev) => ({
        ...prev,
        processed: index + 1,
        success: successCount,
        failed: failedCount
      }));
    }

    const summary = `Batch complete: ${successCount}/${files.length} processed${failedCount > 0 ? `, ${failedCount} failed` : ""}.`;
    const report = {
      createdAt: new Date().toISOString(),
      options: { ...batchOptions },
      totals: { total: files.length, success: successCount, failed: failedCount },
      files: reportFiles
    };
    setLastBatchReport(report);
    setBatchStatus((prev) => ({
      ...prev,
      running: false,
      currentFile: null,
      lastSummary: summary
    }));

    alert(summary);

    if (batchInputRef.current) {
      batchInputRef.current.value = "";
    }
  };

  const handleDownloadLastBatchReport = () => {
    if (!lastBatchReport) return;
    const blob = new Blob([JSON.stringify(lastBatchReport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `zerothlayer-batch-report-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenProject = () => {
    projectFileInputRef.current?.click();
  };

  const handleProjectFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvasRef.current) return;
    try {
      const lower = file.name.toLowerCase();
      const isProjectFile = lower.endsWith('.zlayer') || lower.endsWith('.json');
      const isImageFile = file.type.startsWith('image/');

      if (isImageFile && !isProjectFile) {
        canvasRef.current.uploadImage(file);
        return;
      }

      const text = await file.text();
      const payload = JSON.parse(text);
      await canvasRef.current.loadProjectPayload(payload);
    } catch (error) {
      console.error(error);
      alert("Unable to open file. Use .zlayer/.json project files, or image files.");
    } finally {
      if (projectFileInputRef.current) {
        projectFileInputRef.current.value = "";
      }
    }
  };

  const handleSaveProject = () => {
    if (!canvasRef.current) return;
    const payload = canvasRef.current.getProjectPayload();
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `zerothlayer-project-${Date.now()}.zlayer`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleNewProject = () => {
    if (!canvasRef.current) return;
    if (!confirm("Create a new project? Unsaved changes will be lost.")) return;
    canvasRef.current.clearCanvas();
  };

  const handleSelectionChange = (selectionData: SelectionData | null) => {
    setSelection(selectionData);
    if (!selectionData) {
      setShowPromptBar(false);
    }
  };

  const handleHistoryChange = (canUndoNow: boolean, canRedoNow: boolean) => {
    setCanUndo(canUndoNow);
    setCanRedo(canRedoNow);
    if (canvasRef.current) {
      setHistoryInfo(canvasRef.current.getHistoryInfo());
    }
  };

  const handleUndo = () => canvasRef.current?.undo();
  const handleRedo = () => canvasRef.current?.redo();

  const refreshViewState = () => {
    if (!canvasRef.current) return;
    setViewState(canvasRef.current.getViewState());
    setCanvasDims(canvasRef.current.getCanvasDimensions());
  };

  useEffect(() => {
    if (canvasDims.width <= 0 || canvasDims.height <= 0) return;
    setExportAsOptions((prev) => {
      if (prev.width > 0 && prev.height > 0) return prev;
      return {
        ...prev,
        width: Math.max(1, Math.round(canvasDims.width)),
        height: Math.max(1, Math.round(canvasDims.height))
      };
    });
  }, [canvasDims.width, canvasDims.height]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (!canvasRef.current) return;
      if (exportAsOptions.target === "active-layer") {
        if (!cancelled) setExportAsEstimateBytes(null);
        return;
      }
      setIsEstimatingExportAs(true);
      try {
        const blob = await buildOptimizedExportBlob(exportAsOptions);
        if (!cancelled) {
          setExportAsEstimateBytes(blob ? blob.size : null);
        }
      } catch {
        if (!cancelled) setExportAsEstimateBytes(null);
      } finally {
        if (!cancelled) setIsEstimatingExportAs(false);
      }
    }, 260);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [exportAsOptions, canvasDims.width, canvasDims.height]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const isViewer = collabRole === 'viewer';

      if (ctrl && key === 'z') {
        e.preventDefault();
        shift ? handleRedo() : handleUndo();
      } else if (ctrl && key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (ctrl && key === 'd') {
        e.preventDefault();
        canvasRef.current?.clearSelection();
      } else if (ctrl && key === 's') {
        e.preventDefault();
        handleExport('png');
      } else if (ctrl && key === 'o') {
        e.preventDefault();
        handleOpenProject();
      } else if (ctrl && key === 'n') {
        e.preventDefault();
        handleNewProject();
      } else if (key === 'escape') {
        canvasRef.current?.clearSelection();
        setActiveTool('move');
      } else if (key === 'delete' || key === 'backspace') {
        if (isViewer) return;
        if (activeLayerId) {
          removeLayer(activeLayerId);
        }
      } else if (key === 'v') {
        setActiveTool('move');
      } else if (key === 'r') {
        if (isViewer) return;
        setActiveTool('select');
      } else if (key === 'c') {
        if (isViewer) return;
        setActiveTool('crop');
      } else if (key === 'l') {
        if (isViewer) return;
        setActiveTool('lasso');
      } else if (key === 'w') {
        if (isViewer) return;
        setActiveTool('magic');
      } else if (key === 'q') {
        if (isViewer) return;
        setActiveTool('quick');
      } else if (key === 'k') {
        if (isViewer) return;
        setActiveTool('slice');
      } else if (key === 's' && !ctrl) {
        if (isViewer) return;
        setActiveTool('semantic');
      } else if (key === 'p') {
        setShowSidebar((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, activeLayerId, collabRole]);

  const handleCreateMask = () => {
    if (collabRole === 'viewer') return;
    canvasRef.current?.createMask();
  };

  const runSemanticSelection = async (query: string, regionHint?: SelectionData | null) => {
    if (!query.trim() || !canvasRef.current) return;

    const snapshot = canvasRef.current.getCanvasSnapshot();
    if (!snapshot) return;

    try {
      const res = await fetch('/api/semantic-select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: snapshot,
          query: query.trim(),
          regionHint: regionHint
            ? { x: regionHint.x, y: regionHint.y, width: regionHint.width, height: regionHint.height }
            : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Semantic selection failed');
      }
      if (data.mask) {
        canvasRef.current.applySemanticMask(data.mask);
        setSemanticSource(data.source || null);
      } else {
        canvasRef.current.applySemanticSelection(query.trim());
        setSemanticSource('heuristic');
      }
    } catch {
      canvasRef.current.applySemanticSelection(query.trim());
      setSemanticSource('heuristic');
    }
  };

  const handleApplySemanticSelection = () => {
    if (!semanticQuery.trim()) return;
    const run = async () => {
      await runSemanticSelection(semanticQuery.trim());
    };

    void run();
  };

  const handleSelectSubject = () => {
    setSemanticQuery("subject");
    void runSemanticSelection("subject");
  };

  const handleObjectSelection = () => {
    if (!selection) {
      alert("Draw a selection box first.");
      return;
    }
    const query = semanticQuery.trim() || "object";
    setSemanticQuery(query);
    void runSemanticSelection(query, selection);
  };

  const handleColorRangeSelection = async () => {
    if (!canvasRef.current) return;
    const snapshot = canvasRef.current.getCanvasSnapshot();
    if (!snapshot) return;

    const hexToRgb = (hex: string) => {
      const sanitized = hex.replace("#", "");
      const full = sanitized.length === 3
        ? sanitized.split("").map((s) => `${s}${s}`).join("")
        : sanitized;
      const num = parseInt(full, 16);
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
      };
    };

    const target = hexToRgb(colorRangeColor);
    const tolerance = Math.max(0, Math.min(255, colorRangeTolerance));

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Unable to load snapshot"));
      i.src = snapshot;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;
    const mask = maskCtx.createImageData(maskCanvas.width, maskCanvas.height);

    for (let i = 0; i < data.length; i += 4) {
      const dr = Math.abs(data[i] - target.r);
      const dg = Math.abs(data[i + 1] - target.g);
      const db = Math.abs(data[i + 2] - target.b);
      const within = (dr + dg + db) / 3 <= tolerance;
      const v = within ? 255 : 0;
      mask.data[i] = v;
      mask.data[i + 1] = v;
      mask.data[i + 2] = v;
      mask.data[i + 3] = 255;
    }
    maskCtx.putImageData(mask, 0, 0);
    canvasRef.current.applySemanticMask(maskCanvas.toDataURL("image/png"));
    setSemanticSource("color-range");
  };

  const handleFocusAreaSelection = async () => {
    if (!canvasRef.current) return;
    const snapshot = canvasRef.current.getCanvasSnapshot();
    if (!snapshot) return;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Unable to load snapshot"));
      i.src = snapshot;
    });

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = img.naturalWidth;
    maskCanvas.height = img.naturalHeight;
    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    const focusScale = Math.max(0.2, Math.min(1, focusStrength / 100));
    const cx = selection ? selection.x + selection.width / 2 : maskCanvas.width / 2;
    const cy = selection ? selection.y + selection.height / 2 : maskCanvas.height / 2;
    const rx = selection ? selection.width / 2 : (maskCanvas.width * 0.32 * focusScale);
    const ry = selection ? selection.height / 2 : (maskCanvas.height * 0.28 * focusScale);

    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, Math.max(rx, ry));
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(8, rx), Math.max(8, ry), 0, 0, Math.PI * 2);
    ctx.fill();

    canvasRef.current.applySemanticMask(maskCanvas.toDataURL("image/png"));
    setSemanticSource("focus-area");
  };

  const handleCrop = () => {
    if (collabRole === 'viewer') return;
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

  const handlePerspectiveCrop = async (strength = 0.22) => {
    if (collabRole === 'viewer' || !canvasRef.current) return;
    const sel = canvasRef.current.getSelection();
    if (!sel) return;

    const snapshot = canvasRef.current.getCanvasSnapshot();
    if (!snapshot) return;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Unable to load canvas snapshot"));
      i.src = snapshot;
    });

    const sx = Math.max(0, Math.round(sel.x));
    const sy = Math.max(0, Math.round(sel.y));
    const sw = Math.max(1, Math.round(sel.width));
    const sh = Math.max(1, Math.round(sel.height));

    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = sw;
    srcCanvas.height = sh;
    const srcCtx = srcCanvas.getContext("2d");
    if (!srcCtx) return;
    srcCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    const outCanvas = document.createElement("canvas");
    outCanvas.width = sw;
    outCanvas.height = sh;
    const outCtx = outCanvas.getContext("2d");
    if (!outCtx) return;

    // Simple keystone correction approximation by row-wise horizontal rescaling.
    const clamped = Math.max(-0.45, Math.min(0.45, strength));
    for (let y = 0; y < sh; y += 1) {
      const t = sh <= 1 ? 0 : y / (sh - 1);
      const scale = clamped >= 0 ? (1 - clamped * (1 - t)) : (1 + Math.abs(clamped) * (1 - t));
      const dw = Math.max(1, Math.round(sw * scale));
      const dx = Math.round((sw - dw) / 2);
      outCtx.drawImage(srcCanvas, 0, y, sw, 1, dx, y, dw, 1);
    }

    canvasRef.current.addImageLayer(
      outCanvas.toDataURL("image/png"),
      "Perspective Crop",
      { transform: "perspective-crop", strength: clamped },
      { left: sx, top: sy, addToHistory: true }
    );
    canvasRef.current.clearSelection();
  };

  const createArtboard = (name: string, x: number, y: number, width: number, height: number): ArtboardItem => ({
    id: crypto.randomUUID(),
    name,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height))
  });

  const handleFocusArtboard = (artboard: ArtboardItem) => {
    canvasRef.current?.setSelectionRect({
      x: artboard.x,
      y: artboard.y,
      width: artboard.width,
      height: artboard.height
    });
    setActiveTool("select");
  };

  const handleAddArtboardFromSelection = () => {
    const sel = canvasRef.current?.getSelection();
    setArtboards((prev) => {
      const nextName = `Artboard ${prev.length + 1}`;
      const next = sel
        ? createArtboard(nextName, sel.x, sel.y, sel.width, sel.height)
        : createArtboard(nextName, 0, 0, 1024, 768);
      return [next, ...prev];
    });
  };

  const handleAddArtboardPreset = (preset: ArtboardPreset) => {
    setArtboards((prev) => {
      const spacing = 64;
      const maxRight = prev.reduce((max, board) => Math.max(max, board.x + board.width), 0);
      const x = prev.length ? maxRight + spacing : 0;
      const next = createArtboard(`${preset.label} ${prev.length + 1}`, x, 0, preset.width, preset.height);
      return [next, ...prev];
    });
  };

  const handleDuplicateArtboard = (id: string) => {
    setArtboards((prev) => {
      const target = prev.find((a) => a.id === id);
      if (!target) return prev;
      const copy = createArtboard(`${target.name} Copy`, target.x + 36, target.y + 36, target.width, target.height);
      return [copy, ...prev];
    });
  };

  const handleRenameArtboard = (id: string) => {
    const target = artboards.find((a) => a.id === id);
    if (!target) return;
    const name = prompt("Artboard name", target.name)?.trim();
    if (!name) return;
    setArtboards((prev) => prev.map((a) => (a.id === id ? { ...a, name } : a)));
  };

  const handleAddSliceFromSelection = () => {
    const sel = canvasRef.current?.getSelection();
    if (!sel) {
      alert("Create a selection first to add a slice.");
      return;
    }
    setSlices((prev) => [
      {
        id: crypto.randomUUID(),
        name: `Slice ${prev.length + 1}`,
        x: Math.round(sel.x),
        y: Math.round(sel.y),
        width: Math.max(1, Math.round(sel.width)),
        height: Math.max(1, Math.round(sel.height))
      },
      ...prev
    ]);
  };

  const handleSliceFromCurrentSelection = () => {
    handleAddSliceFromSelection();
    canvasRef.current?.clearSelection();
  };

  const toggleSliceScale = (scale: 1 | 2 | 3) => {
    setSliceExportScales((prev) => {
      if (prev.includes(scale)) {
        const next = prev.filter((s) => s !== scale);
        return next.length ? next : [1];
      }
      return [...prev, scale].sort((a, b) => a - b) as Array<1 | 2 | 3>;
    });
  };

  const toggleAssetGenScale = (scale: 1 | 2 | 3 | 4) => {
    setAssetGenScales((prev) => {
      if (prev.includes(scale)) {
        const next = prev.filter((s) => s !== scale);
        return next.length ? next : [1];
      }
      return [...prev, scale].sort((a, b) => a - b) as Array<1 | 2 | 3 | 4>;
    });
  };

  const toggleAssetGenFormat = (format: "png" | "jpeg" | "webp") => {
    setAssetGenFormats((prev) => {
      if (prev.includes(format)) {
        const next = prev.filter((f) => f !== format);
        return next.length ? next : ["png"];
      }
      return [...prev, format];
    });
  };

  const exportRegion = async (
    bounds: { x: number; y: number; width: number; height: number },
    fileBaseName: string,
    opts?: { format?: "png" | "jpeg" | "webp"; quality?: number; scale?: number }
  ) => {
    const snapshot = canvasRef.current?.getCanvasSnapshot();
    if (!snapshot) return;
    const format = opts?.format ?? "png";
    const quality = Math.max(0.1, Math.min(1, (opts?.quality ?? 92) / 100));
    const scale = Math.max(1, opts?.scale ?? 1);

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Unable to load canvas snapshot"));
      i.src = snapshot;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bounds.width * scale));
    canvas.height = Math.max(1, Math.round(bounds.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(
      img,
      Math.round(bounds.x),
      Math.round(bounds.y),
      Math.round(bounds.width),
      Math.round(bounds.height),
      0,
      0,
      canvas.width,
      canvas.height
    );
    const mime = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
    const url = format === "png" ? canvas.toDataURL(mime) : canvas.toDataURL(mime, quality);
    const link = document.createElement("a");
    const ext = format === "jpeg" ? "jpg" : format;
    link.download = `${fileBaseName.replace(/\s+/g, "-").toLowerCase()}.${ext}`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSlice = async (slice: SliceItem) =>
    exportRegion(slice, slice.name, { format: sliceExportFormat, quality: sliceExportQuality, scale: 1 });

  const exportArtboard = async (artboard: ArtboardItem) => exportRegion(artboard, artboard.name);

  const getSliceWebBaseName = (slice: SliceItem) => {
    const raw = slice.name.trim();
    if (sliceWebNaming === "preserve") return raw;
    return raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `slice-${slice.id.slice(0, 6)}`;
  };

  const buildSliceWebFilename = (slice: SliceItem, scale: 1 | 2 | 3, format: "png" | "jpeg" | "webp") => {
    const base = getSliceWebBaseName(slice);
    const ext = format === "jpeg" ? "jpg" : format;
    return `${base}${scale === 1 ? "" : `@${scale}x`}.${ext}`;
  };

  const downloadTextFile = (filename: string, text: string, mime = "text/plain;charset=utf-8") => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportSliceForWeb = async (slice: SliceItem) => {
    for (const scale of sliceExportScales) {
      const base = buildSliceWebFilename(slice, scale as 1 | 2 | 3, sliceExportFormat).replace(/\.(png|jpg|jpeg|webp)$/i, "");
      await exportRegion(slice, base, {
        format: sliceExportFormat,
        quality: sliceExportQuality,
        scale
      });
    }
  };

  const handleExportAllSlicesForWeb = async () => {
    if (!slices.length) {
      alert("Create at least one slice first.");
      return;
    }
    for (const s of slices) {
      await exportSliceForWeb(s);
    }
    setSliceWebReport(`Exported ${slices.length} slices in ${sliceExportScales.length} scale(s) as ${sliceExportFormat.toUpperCase()}.`);
  };

  const handleExportSliceManifest = () => {
    if (!slices.length) {
      alert("Create at least one slice first.");
      return;
    }
    const prefix = sliceWebPathPrefix.trim();
    const normalizedPrefix = prefix.length ? (prefix.endsWith("/") ? prefix : `${prefix}/`) : "";
    const manifest = {
      generatedAt: new Date().toISOString(),
      format: sliceExportFormat,
      quality: sliceExportQuality,
      scales: sliceExportScales,
      slices: slices.map((slice) => ({
        id: slice.id,
        name: slice.name,
        baseName: getSliceWebBaseName(slice),
        x: slice.x,
        y: slice.y,
        width: slice.width,
        height: slice.height,
        assets: sliceExportScales.map((scale) => ({
          scale,
          width: Math.max(1, Math.round(slice.width * scale)),
          height: Math.max(1, Math.round(slice.height * scale)),
          file: `${normalizedPrefix}${buildSliceWebFilename(slice, scale as 1 | 2 | 3, sliceExportFormat)}`
        }))
      }))
    };
    downloadTextFile("slices-manifest.json", JSON.stringify(manifest, null, 2), "application/json;charset=utf-8");
    setSliceWebReport(`Exported slices-manifest.json with ${manifest.slices.length} entries.`);
  };

  const handleExportSliceCss = () => {
    if (!slices.length) {
      alert("Create at least one slice first.");
      return;
    }
    const prefix = sliceWebPathPrefix.trim();
    const normalizedPrefix = prefix.length ? (prefix.endsWith("/") ? prefix : `${prefix}/`) : "";
    const classPrefix = sliceWebClassPrefix.trim();
    const scales = [...sliceExportScales].sort((a, b) => a - b);
    const cssBlocks = slices.map((slice) => {
      const baseName = getSliceWebBaseName(slice);
      const className = `${classPrefix}${baseName}`.replace(/\s+/g, "-");
      const oneXFile = `${normalizedPrefix}${buildSliceWebFilename(slice, 1, sliceExportFormat)}`;
      const hiResRules = scales
        .filter((scale) => scale > 1)
        .map((scale) => {
          const file = `${normalizedPrefix}${buildSliceWebFilename(slice, scale as 1 | 2 | 3, sliceExportFormat)}`;
          return `@media (min-resolution: ${scale}dppx) {\n  .${className} { background-image: url("${file}"); }\n}`;
        })
        .join("\n");
      return [
        `.${className} {`,
        `  width: ${slice.width}px;`,
        `  height: ${slice.height}px;`,
        `  background-image: url("${oneXFile}");`,
        `  background-size: ${slice.width}px ${slice.height}px;`,
        `  background-repeat: no-repeat;`,
        `}`,
        hiResRules
      ].filter(Boolean).join("\n");
    });
    const css = `/* Auto-generated slice CSS */\n${cssBlocks.join("\n\n")}\n`;
    downloadTextFile("slices.css", css, "text/css;charset=utf-8");
    setSliceWebReport(`Exported slices.css for ${slices.length} slice classes.`);
  };

  const handleCreateSlicesFromArtboards = () => {
    if (!artboards.length) {
      alert("Create at least one artboard first.");
      return;
    }
    setSlices((prev) => {
      const existing = new Set(prev.map((s) => s.name.toLowerCase()));
      const additions = artboards
        .map((a) => {
          const base = `Slice ${a.name}`;
          let candidate = base;
          let n = 2;
          while (existing.has(candidate.toLowerCase())) {
            candidate = `${base} ${n}`;
            n += 1;
          }
          existing.add(candidate.toLowerCase());
          return {
            id: crypto.randomUUID(),
            name: candidate,
            x: a.x,
            y: a.y,
            width: a.width,
            height: a.height
          };
        });
      return [...additions, ...prev];
    });
  };

  const handleExportAllArtboards = async () => {
    if (!artboards.length) {
      alert("Create at least one artboard first.");
      return;
    }
    for (const artboard of artboards) {
      await exportArtboard(artboard);
    }
  };

  const handleEyedropperFromSelection = async () => {
    if (!canvasRef.current) return;
    const sel = canvasRef.current.getSelection();
    if (!sel) {
      alert("Create a selection first to sample color.");
      return;
    }
    const snapshot = canvasRef.current.getCanvasSnapshot();
    if (!snapshot) return;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Unable to load canvas snapshot"));
      i.src = snapshot;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const sx = Math.max(0, Math.min(canvas.width - 1, Math.round(sel.x + sel.width / 2)));
    const sy = Math.max(0, Math.min(canvas.height - 1, Math.round(sel.y + sel.height / 2)));
    const px = ctx.getImageData(sx, sy, 1, 1).data;
    const hex = `#${[px[0], px[1], px[2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    setSampledColor({ hex, r: px[0], g: px[1], b: px[2], a: Number((px[3] / 255).toFixed(2)) });
    setActiveColor(hex);
  };

  const handleAddNote = () => {
    const text = prompt("Note text")?.trim();
    if (!text) return;
    const sel = canvasRef.current?.getSelection();
    const x = sel ? Math.round(sel.x + sel.width / 2) : 0;
    const y = sel ? Math.round(sel.y + sel.height / 2) : 0;
    setNotes((prev) => [{ id: crypto.randomUUID(), text, x, y, createdAt: new Date().toISOString() }, ...prev]);
  };

  const handleAddCountMarker = () => {
    const sel = canvasRef.current?.getSelection();
    if (!sel) {
      alert("Create a selection first to place a count marker.");
      return;
    }
    setCounts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        x: Math.round(sel.x + sel.width / 2),
        y: Math.round(sel.y + sel.height / 2)
      }
    ]);
  };

  const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

  const hexToRgb = (hex: string) => {
    const raw = hex.replace("#", "");
    const normalized = raw.length === 3
      ? raw.split("").map((ch) => `${ch}${ch}`).join("")
      : raw.padEnd(6, "0").slice(0, 6);
    const num = Number.parseInt(normalized, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  };

  const rgbToHsl = (r: number, g: number, b: number) => {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h /= 6;
    return { h, s, l };
  };

  const hslToRgb = (h: number, s: number, l: number) => {
    if (s === 0) {
      const v = clamp255(l * 255);
      return { r: v, g: v, b: v };
    }
    const hue2rgb = (p: number, q: number, tInput: number) => {
      let t = tInput;
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return {
      r: clamp255(hue2rgb(p, q, h + 1 / 3) * 255),
      g: clamp255(hue2rgb(p, q, h) * 255),
      b: clamp255(hue2rgb(p, q, h - 1 / 3) * 255)
    };
  };

  const loadSnapshotImage = async () => {
    const snapshot = canvasRef.current?.getCanvasSnapshot();
    if (!snapshot) return null;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const node = new Image();
      node.onload = () => resolve(node);
      node.onerror = () => reject(new Error("Unable to load snapshot"));
      node.src = snapshot;
    });
    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = img.naturalWidth;
    fullCanvas.height = img.naturalHeight;
    const fullCtx = fullCanvas.getContext("2d");
    if (!fullCtx) return null;
    fullCtx.drawImage(img, 0, 0);
    return { fullCanvas, fullCtx };
  };

  const getWorkingBounds = (canvasWidth: number, canvasHeight: number, requireSelection = true) => {
    if (selection) {
      const x = Math.max(0, Math.floor(selection.x));
      const y = Math.max(0, Math.floor(selection.y));
      const width = Math.max(1, Math.min(canvasWidth - x, Math.ceil(selection.width)));
      const height = Math.max(1, Math.min(canvasHeight - y, Math.ceil(selection.height)));
      return { x, y, width, height };
    }
    if (!requireSelection) {
      return { x: 0, y: 0, width: canvasWidth, height: canvasHeight };
    }
    return null;
  };

  const commitRegionLayer = (
    regionCanvas: HTMLCanvasElement,
    name: string,
    left: number,
    top: number,
    meta?: Record<string, unknown>
  ) => {
    const layerType = (meta?.layerType as ('image' | 'adjustment' | 'smart' | 'group' | 'text' | 'shape' | 'video' | 'threeD') | undefined) ?? 'image';
    canvasRef.current?.addImageLayer(
      regionCanvas.toDataURL("image/png"),
      name,
      meta,
      { left, top, addToHistory: true, layerType }
    );
  };

  const applyKernel = (imgData: ImageData, kernel: number[], divisor = 1, bias = 0) => {
    const { width, height, data } = imgData;
    const out = new ImageData(width, height);
    const dst = out.data;
    const side = Math.round(Math.sqrt(kernel.length));
    const half = Math.floor(side / 2);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        for (let ky = 0; ky < side; ky += 1) {
          for (let kx = 0; kx < side; kx += 1) {
            const px = Math.min(width - 1, Math.max(0, x + kx - half));
            const py = Math.min(height - 1, Math.max(0, y + ky - half));
            const srcIdx = (py * width + px) * 4;
            const k = kernel[ky * side + kx];
            r += data[srcIdx] * k;
            g += data[srcIdx + 1] * k;
            b += data[srcIdx + 2] * k;
            a += data[srcIdx + 3] * k;
          }
        }
        const idx = (y * width + x) * 4;
        dst[idx] = clamp255(r / divisor + bias);
        dst[idx + 1] = clamp255(g / divisor + bias);
        dst[idx + 2] = clamp255(b / divisor + bias);
        dst[idx + 3] = clamp255(a / divisor);
      }
    }
    return out;
  };

  const withRegionCanvas = async (
    name: string,
    mutate: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
    opts?: { requireSelection?: boolean; meta?: Record<string, unknown> }
  ) => {
    if (!canvasRef.current || collabRole === "viewer") return;
    const loaded = await loadSnapshotImage();
    if (!loaded) return;
    const bounds = getWorkingBounds(loaded.fullCanvas.width, loaded.fullCanvas.height, opts?.requireSelection ?? true);
    if (!bounds) {
      alert("Create a selection first.");
      return;
    }
    const region = document.createElement("canvas");
    region.width = bounds.width;
    region.height = bounds.height;
    const regionCtx = region.getContext("2d");
    if (!regionCtx) return;
    regionCtx.drawImage(
      loaded.fullCanvas,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      0,
      0,
      bounds.width,
      bounds.height
    );
    mutate(regionCtx, bounds.width, bounds.height);
    commitRegionLayer(region, name, bounds.x, bounds.y, opts?.meta);
  };

  const handleSpotHealing = () => withRegionCanvas(
    "Spot Healing",
    (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h);
      const src = img.data;
      const total = w * h;

      const luminance = new Float32Array(total);
      for (let i = 0, px = 0; i < src.length; i += 4, px += 1) {
        luminance[px] = src[i] * 0.2126 + src[i + 1] * 0.7152 + src[i + 2] * 0.0722;
      }

      const outlierMask = new Uint8Array(total);
      const threshold = 30;

      for (let y = 1; y < h - 1; y += 1) {
        for (let x = 1; x < w - 1; x += 1) {
          const idx = y * w + x;
          const samples = [
            luminance[idx - w - 1], luminance[idx - w], luminance[idx - w + 1],
            luminance[idx - 1], luminance[idx], luminance[idx + 1],
            luminance[idx + w - 1], luminance[idx + w], luminance[idx + w + 1]
          ].sort((a, b) => a - b);

          const median = samples[4];
          const delta = Math.abs(luminance[idx] - median);
          if (delta < threshold) continue;

          const gradX = Math.abs(luminance[idx + 1] - luminance[idx - 1]);
          const gradY = Math.abs(luminance[idx + w] - luminance[idx - w]);
          const edgeStrength = gradX + gradY;
          if (edgeStrength < 50) {
            outlierMask[idx] = 1;
          }
        }
      }

      // Keep only small components so we heal blemishes, not larger structures.
      const visited = new Uint8Array(total);
      const queue = new Int32Array(total);
      const component = new Int32Array(total);
      const maxComponentArea = Math.max(24, Math.round((Math.min(w, h) * 0.06) ** 2));

      for (let i = 0; i < total; i += 1) {
        if (!outlierMask[i] || visited[i]) continue;
        let qh = 0;
        let qt = 0;
        let count = 0;
        queue[qt++] = i;
        visited[i] = 1;

        while (qh < qt) {
          const cur = queue[qh++];
          component[count++] = cur;
          const cx = cur % w;
          const cy = Math.floor(cur / w);
          const neighbors = [cur - 1, cur + 1, cur - w, cur + w];

          for (let n = 0; n < neighbors.length; n += 1) {
            const next = neighbors[n];
            if (next < 0 || next >= total) continue;
            const nx = next % w;
            const ny = Math.floor(next / w);
            if (Math.abs(nx - cx) + Math.abs(ny - cy) !== 1) continue;
            if (!outlierMask[next] || visited[next]) continue;
            visited[next] = 1;
            queue[qt++] = next;
          }
        }

        if (count > maxComponentArea) {
          for (let c = 0; c < count; c += 1) {
            outlierMask[component[c]] = 0;
          }
        }
      }

      const healed = new Uint8ClampedArray(src);
      const radius = 2;
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const idx = y * w + x;
          if (!outlierMask[idx]) continue;

          let sr = 0;
          let sg = 0;
          let sb = 0;
          let sa = 0;
          let weightSum = 0;

          for (let dy = -radius; dy <= radius; dy += 1) {
            for (let dx = -radius; dx <= radius; dx += 1) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
              const nIdx = ny * w + nx;
              if (outlierMask[nIdx]) continue;
              const distSq = dx * dx + dy * dy;
              const weight = 1 / (1 + distSq);
              const p = nIdx * 4;
              sr += healed[p] * weight;
              sg += healed[p + 1] * weight;
              sb += healed[p + 2] * weight;
              sa += healed[p + 3] * weight;
              weightSum += weight;
            }
          }

          if (weightSum > 0) {
            const p = idx * 4;
            healed[p] = clamp255(sr / weightSum);
            healed[p + 1] = clamp255(sg / weightSum);
            healed[p + 2] = clamp255(sb / weightSum);
            healed[p + 3] = clamp255(sa / weightSum);
          }
        }
      }

      img.data.set(healed);
      ctx.putImageData(img, 0, 0);
    }
  );

  const handleHealingBrush = () => withRegionCanvas(
    "Healing Brush",
    (ctx, w, h) => {
      const original = ctx.getImageData(0, 0, w, h);
      const src = original.data;
      const out = new Uint8ClampedArray(src);

      const oxBase = Math.max(6, Math.round(w * 0.16));
      const oyBase = Math.max(6, Math.round(h * 0.12));
      const sourceOffsetCandidates = [
        { ox: oxBase, oy: oyBase },
        { ox: -oxBase, oy: oyBase },
        { ox: oxBase, oy: -oyBase },
        { ox: -oxBase, oy: -oyBase },
        { ox: Math.round(oxBase * 1.35), oy: 0 },
        { ox: 0, oy: Math.round(oyBase * 1.35) }
      ];

      const centerX = w / 2;
      const centerY = h / 2;
      const radiusX = Math.max(6, w * 0.44);
      const radiusY = Math.max(6, h * 0.44);

      const luminanceAt = (r: number, g: number, b: number) => r * 0.2126 + g * 0.7152 + b * 0.0722;
      const blurSample = (x: number, y: number) => {
        let r = 0;
        let g = 0;
        let b = 0;
        let c = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = Math.max(0, Math.min(w - 1, x + dx));
            const ny = Math.max(0, Math.min(h - 1, y + dy));
            const i = (ny * w + nx) * 4;
            r += src[i];
            g += src[i + 1];
            b += src[i + 2];
            c += 1;
          }
        }
        return { r: r / c, g: g / c, b: b / c };
      };

      // Pick a source offset whose destination/source average luma is most compatible.
      let chosen = sourceOffsetCandidates[0];
      let bestScore = Number.POSITIVE_INFINITY;
      for (let c = 0; c < sourceOffsetCandidates.length; c += 1) {
        const candidate = sourceOffsetCandidates[c];
        let dLum = 0;
        let sLum = 0;
        let count = 0;
        for (let i = 0; i < 18; i += 1) {
          const px = Math.round((i % 6) * (w - 1) / 5);
          const py = Math.round(Math.floor(i / 6) * (h - 1) / 2);
          const sx = Math.max(0, Math.min(w - 1, px + candidate.ox));
          const sy = Math.max(0, Math.min(h - 1, py + candidate.oy));
          const di = (py * w + px) * 4;
          const si = (sy * w + sx) * 4;
          dLum += luminanceAt(src[di], src[di + 1], src[di + 2]);
          sLum += luminanceAt(src[si], src[si + 1], src[si + 2]);
          count += 1;
        }
        const score = Math.abs(dLum / Math.max(1, count) - sLum / Math.max(1, count));
        if (score < bestScore) {
          bestScore = score;
          chosen = candidate;
        }
      }

      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const tx = (x - centerX) / radiusX;
          const ty = (y - centerY) / radiusY;
          const radial = tx * tx + ty * ty;
          if (radial > 1) continue;

          const destI = (y * w + x) * 4;
          const sx = Math.max(0, Math.min(w - 1, x + chosen.ox));
          const sy = Math.max(0, Math.min(h - 1, y + chosen.oy));
          const srcI = (sy * w + sx) * 4;

          const dBlur = blurSample(x, y);
          const sBlur = blurSample(sx, sy);
          const dLum = luminanceAt(dBlur.r, dBlur.g, dBlur.b);
          const sLum = luminanceAt(sBlur.r, sBlur.g, sBlur.b);
          const gain = Math.max(0.65, Math.min(1.35, dLum / Math.max(1, sLum)));

          // Texture from source, tone from destination.
          const sr = clamp255(src[srcI] * gain);
          const sg = clamp255(src[srcI + 1] * gain);
          const sb = clamp255(src[srcI + 2] * gain);

          const feather = Math.max(0, Math.min(1, 1 - radial));
          const blend = 0.45 + feather * 0.4;
          out[destI] = clamp255(src[destI] * (1 - blend) + sr * blend);
          out[destI + 1] = clamp255(src[destI + 1] * (1 - blend) + sg * blend);
          out[destI + 2] = clamp255(src[destI + 2] * (1 - blend) + sb * blend);
          out[destI + 3] = src[destI + 3];
        }
      }

      original.data.set(out);
      ctx.putImageData(original, 0, 0);
    }
  );

  const handlePatchTool = () => withRegionCanvas(
    "Patch Tool",
    (ctx, w, h) => {
      const image = ctx.getImageData(0, 0, w, h);
      const src = image.data;
      const out = new Uint8ClampedArray(src);

      const pw = Math.max(8, Math.round(w * 0.58));
      const ph = Math.max(8, Math.round(h * 0.58));
      const px = Math.max(0, Math.round((w - pw) / 2));
      const py = Math.max(0, Math.round((h - ph) / 2));

      const luminance = (r: number, g: number, b: number) => r * 0.2126 + g * 0.7152 + b * 0.0722;
      const sampleLum = (x: number, y: number) => {
        const i = (y * w + x) * 4;
        return luminance(src[i], src[i + 1], src[i + 2]);
      };

      const candidates = [
        { x: Math.max(0, px - Math.round(pw * 0.72)), y: py },
        { x: Math.min(w - pw, px + Math.round(pw * 0.72)), y: py },
        { x: px, y: Math.max(0, py - Math.round(ph * 0.72)) },
        { x: px, y: Math.min(h - ph, py + Math.round(ph * 0.72)) },
        { x: Math.max(0, px - Math.round(pw * 0.52)), y: Math.max(0, py - Math.round(ph * 0.52)) },
        { x: Math.min(w - pw, px + Math.round(pw * 0.52)), y: Math.max(0, py - Math.round(ph * 0.52)) },
        { x: Math.max(0, px - Math.round(pw * 0.52)), y: Math.min(h - ph, py + Math.round(ph * 0.52)) },
        { x: Math.min(w - pw, px + Math.round(pw * 0.52)), y: Math.min(h - ph, py + Math.round(ph * 0.52)) }
      ];

      const borderError = (sx: number, sy: number) => {
        let err = 0;
        let n = 0;
        for (let x = 0; x < pw; x += 1) {
          const txTop = px + x;
          const tyTop = py;
          const txBottom = px + x;
          const tyBottom = py + ph - 1;
          const sxTop = sx + x;
          const syTop = sy;
          const sxBottom = sx + x;
          const syBottom = sy + ph - 1;
          err += Math.abs(sampleLum(txTop, tyTop) - sampleLum(sxTop, syTop));
          err += Math.abs(sampleLum(txBottom, tyBottom) - sampleLum(sxBottom, syBottom));
          n += 2;
        }
        for (let y = 1; y < ph - 1; y += 1) {
          const txLeft = px;
          const tyLeft = py + y;
          const txRight = px + pw - 1;
          const tyRight = py + y;
          const sxLeft = sx;
          const syLeft = sy + y;
          const sxRight = sx + pw - 1;
          const syRight = sy + y;
          err += Math.abs(sampleLum(txLeft, tyLeft) - sampleLum(sxLeft, syLeft));
          err += Math.abs(sampleLum(txRight, tyRight) - sampleLum(sxRight, syRight));
          n += 2;
        }
        return err / Math.max(1, n);
      };

      let chosen = candidates[0];
      let best = Number.POSITIVE_INFINITY;
      for (let i = 0; i < candidates.length; i += 1) {
        const c = candidates[i];
        if (c.x === px && c.y === py) continue;
        const score = borderError(c.x, c.y);
        if (score < best) {
          best = score;
          chosen = c;
        }
      }

      // Replace with feathered blend so seams are less visible.
      const featherX = Math.max(3, Math.round(pw * 0.14));
      const featherY = Math.max(3, Math.round(ph * 0.14));
      for (let y = 0; y < ph; y += 1) {
        for (let x = 0; x < pw; x += 1) {
          const dx = px + x;
          const dy = py + y;
          const sx = chosen.x + x;
          const sy = chosen.y + y;

          const distLeft = x;
          const distRight = pw - 1 - x;
          const distTop = y;
          const distBottom = ph - 1 - y;
          const edgeFactorX = Math.min(1, Math.min(distLeft, distRight) / featherX);
          const edgeFactorY = Math.min(1, Math.min(distTop, distBottom) / featherY);
          const blend = 0.35 + 0.65 * Math.min(edgeFactorX, edgeFactorY);

          const di = (dy * w + dx) * 4;
          const si = (sy * w + sx) * 4;
          out[di] = clamp255(src[di] * (1 - blend) + src[si] * blend);
          out[di + 1] = clamp255(src[di + 1] * (1 - blend) + src[si + 1] * blend);
          out[di + 2] = clamp255(src[di + 2] * (1 - blend) + src[si + 2] * blend);
          out[di + 3] = src[di + 3];
        }
      }

      image.data.set(out);
      ctx.putImageData(image, 0, 0);
    }
  );

  const extractSelectionDataUrl = async (sel: SelectionData): Promise<string | null> => {
    const snapshot = canvasRef.current?.getCanvasSnapshot();
    if (!snapshot) return null;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Unable to load canvas snapshot"));
      i.src = snapshot;
    });
    const sx = Math.max(0, Math.round(sel.x));
    const sy = Math.max(0, Math.round(sel.y));
    const sw = Math.max(1, Math.round(sel.width));
    const sh = Math.max(1, Math.round(sel.height));
    const region = document.createElement("canvas");
    region.width = sw;
    region.height = sh;
    const rctx = region.getContext("2d");
    if (!rctx) return null;
    rctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    return region.toDataURL("image/png");
  };

  const handleContentAwareFill = async () => {
    if (!selection || !canvasRef.current) {
      alert("Create a selection first.");
      return;
    }

    const mode = prompt('Content-Aware mode: "fill" or "move dx,dy"', "fill")?.trim().toLowerCase();
    if (!mode) return;

    if (mode.startsWith("move")) {
      const pair = mode.replace("move", "").trim();
      const [dxRaw, dyRaw] = pair ? pair.split(",") : ["80", "0"];
      const dx = Number(dxRaw ?? 80);
      const dy = Number(dyRaw ?? 0);
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
        alert('Use "move dx,dy" e.g. move 120,0');
        return;
      }

      const moved = await extractSelectionDataUrl(selection);
      if (!moved) return;
      canvasRef.current.addImageLayer(
        moved,
        "Content-Aware Move",
        { transform: "content-aware-move", offset: { dx, dy } },
        {
          left: Math.round(selection.x + dx),
          top: Math.round(selection.y + dy),
          addToHistory: true
        }
      );
      await handleGenerate("Fill and reconstruct the original selected area naturally after object move, preserving surrounding background texture and lighting.");
      return;
    }

    await handleGenerate("Fill and reconstruct the selected area naturally while matching surrounding texture and lighting.");
  };

  const handleCloneStamp = () => withRegionCanvas(
    "Clone Stamp",
    (ctx, w, h) => {
      const image = ctx.getImageData(0, 0, w, h);
      const src = image.data;
      const out = new Uint8ClampedArray(src);
      const ox = Math.round(cloneStampOffsetX);
      const oy = Math.round(cloneStampOffsetY);
      const opacity = Math.max(0.05, Math.min(1, cloneStampOpacity / 100));
      const featherX = Math.max(4, Math.round(w * 0.22));
      const featherY = Math.max(4, Math.round(h * 0.22));

      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const sx = x + ox;
          const sy = y + oy;
          if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;

          const di = (y * w + x) * 4;
          const si = (sy * w + sx) * 4;

          const edgeX = Math.min(x, w - 1 - x);
          const edgeY = Math.min(y, h - 1 - y);
          const edgeBlend = Math.min(
            1,
            Math.min(edgeX / featherX, edgeY / featherY)
          );
          const blend = opacity * (0.35 + 0.65 * edgeBlend);

          out[di] = clamp255(src[di] * (1 - blend) + src[si] * blend);
          out[di + 1] = clamp255(src[di + 1] * (1 - blend) + src[si + 1] * blend);
          out[di + 2] = clamp255(src[di + 2] * (1 - blend) + src[si + 2] * blend);
          out[di + 3] = src[di + 3];
        }
      }

      image.data.set(out);
      ctx.putImageData(image, 0, 0);
    }
  );

  const handleRedEye = () => withRegionCanvas(
    "Red Eye Fix",
    (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const total = w * h;
      const strength = Math.max(0.2, Math.min(1, redEyeStrength / 100));
      const candidate = new Uint8Array(total);

      for (let p = 0; p < total; p += 1) {
        const i = p * 4;
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const dominantGap = r - Math.max(g, b);
        const rednessRatio = r / Math.max(1, (g + b) * 0.5);

        // Bias toward flash-eye candidates (strong red dominance, medium/dark tone).
        if (
          r > 60 &&
          g < 180 &&
          b < 180 &&
          lum > 20 &&
          lum < 230 &&
          dominantGap > 22 &&
          rednessRatio > 1.28
        ) {
          candidate[p] = 1;
        }
      }

      // Keep clusters to avoid recoloring single red pixels.
      const clusterMask = new Uint8Array(total);
      for (let y = 1; y < h - 1; y += 1) {
        for (let x = 1; x < w - 1; x += 1) {
          const idx = y * w + x;
          if (!candidate[idx]) continue;
          let neighbors = 0;
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              if (dx === 0 && dy === 0) continue;
              const n = (y + dy) * w + (x + dx);
              neighbors += candidate[n] ? 1 : 0;
            }
          }
          if (neighbors >= 2) {
            clusterMask[idx] = 1;
          }
        }
      }

      for (let p = 0; p < total; p += 1) {
        if (!clusterMask[p]) continue;
        const i = p * 4;
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const neutral = (g + b) * 0.5;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const highlightProtect = Math.max(0.45, Math.min(1, (255 - lum) / 210));
        const amount = strength * highlightProtect;

        d[i] = clamp255(r * (1 - amount) + neutral * amount);
        d[i + 1] = clamp255(g * (1 - amount * 0.2) + neutral * (amount * 0.2));
        d[i + 2] = clamp255(b * (1 - amount * 0.2) + neutral * (amount * 0.2));
        if (d[i] > 210) {
          d[i] = clamp255(210 + (d[i] - 210) * 0.25);
        }
      }
      ctx.putImageData(img, 0, 0);
    }
  );

  const handleBrushTool = () => withRegionCanvas(
    "Brush Paint",
    (ctx, w, h) => {
      maybeRecordMacroCommand("run-brush");
      const radius = Math.max(2, Math.min(Math.min(w, h) * 0.22, brushSize));
      const hardness = Math.max(0, Math.min(1, brushHardness / 100));
      const baseFlow = Math.max(0.08, Math.min(1, brushFlow / 100));
      const spacingPx = Math.max(1.5, radius * Math.max(0.08, brushSpacing / 100));
      const jitterPx = radius * (brushJitter / 100) * 0.7;
      const strokeCount = Math.max(
        1,
        Math.min(12, Math.round((w * h) / Math.max(6000, radius * 800)))
      );

      const dab = (cx: number, cy: number, sizeScale: number, alphaScale: number) => {
        const r = Math.max(1, radius * sizeScale);
        const innerR = Math.max(0.5, r * (0.22 + hardness * 0.68));
        ctx.globalAlpha = Math.max(0.02, Math.min(1, baseFlow * alphaScale));

        if (brushShape === "square") {
          const size = r * 1.6;
          const feather = Math.max(1, Math.round((1 - hardness) * size * 0.35));
          ctx.fillStyle = activeColor;
          ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
          if (feather > 1) {
            ctx.globalAlpha *= 0.45;
            ctx.filter = `blur(${Math.max(0.5, feather / 4)}px)`;
            ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
            ctx.filter = "none";
          }
          return;
        }

        if (brushShape === "chalk") {
          const specks = Math.max(20, Math.round(r * 2.4));
          for (let s = 0; s < specks; s += 1) {
            const ang = Math.random() * Math.PI * 2;
            const dist = Math.random() * r;
            const px = cx + Math.cos(ang) * dist;
            const py = cy + Math.sin(ang) * dist;
            const rr = Math.max(0.4, r * 0.08 * Math.random());
            ctx.globalAlpha = Math.max(0.02, baseFlow * (0.15 + Math.random() * 0.75) * alphaScale);
            ctx.fillStyle = activeColor;
            ctx.beginPath();
            ctx.arc(px, py, rr, 0, Math.PI * 2);
            ctx.fill();
          }
          return;
        }

        const grad = ctx.createRadialGradient(cx, cy, innerR * 0.18, cx, cy, r);
        grad.addColorStop(0, activeColor);
        grad.addColorStop(Math.min(0.95, 0.35 + hardness * 0.4), activeColor);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      };

      const paintStroke = (x1: number, y1: number, x2: number, y2: number) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.ceil(dist / spacingPx));
        for (let i = 0; i <= steps; i += 1) {
          const t = i / steps;
          const baseX = x1 + dx * t;
          const baseY = y1 + dy * t;
          const jx = (Math.random() * 2 - 1) * jitterPx;
          const jy = (Math.random() * 2 - 1) * jitterPx;
          const sizeScale = 0.84 + Math.random() * 0.34;
          const alphaScale = 0.78 + Math.random() * 0.42;
          dab(baseX + jx, baseY + jy, sizeScale, alphaScale);
        }
      };

      ctx.save();
      for (let s = 0; s < strokeCount; s += 1) {
        const margin = radius * 0.6;
        const sx = margin + Math.random() * Math.max(1, w - margin * 2);
        const sy = margin + Math.random() * Math.max(1, h - margin * 2);
        const ang = Math.random() * Math.PI * 2;
        const len = Math.max(radius * 2.2, Math.min(Math.max(w, h) * 0.8, radius * (6 + Math.random() * 10)));
        const ex = Math.max(0, Math.min(w, sx + Math.cos(ang) * len));
        const ey = Math.max(0, Math.min(h, sy + Math.sin(ang) * len));
        paintStroke(sx, sy, ex, ey);
      }

      if (brushTexture > 0) {
        const img = ctx.getImageData(0, 0, w, h);
        const d = img.data;
        const step = Math.max(1, Math.round(brushTextureScale));
        const cut = (brushTexture / 100) * 0.38;
        for (let y = 0; y < h; y += step) {
          for (let x = 0; x < w; x += step) {
            if (Math.random() > cut) continue;
            const i = (y * w + x) * 4;
            const grain = 0.85 + Math.random() * 0.28;
            d[i] = clamp255(d[i] * grain);
            d[i + 1] = clamp255(d[i + 1] * grain);
            d[i + 2] = clamp255(d[i + 2] * grain);
            d[i + 3] = clamp255(d[i + 3] * (0.72 + Math.random() * 0.28));
          }
        }
        ctx.putImageData(img, 0, 0);
      }

      ctx.restore();
    }
  );

  const handlePencilTool = () => withRegionCanvas(
    "Pencil Paint",
    (ctx, w, h) => {
      maybeRecordMacroCommand("run-pencil");
      const pixelSize = Math.max(1, Math.round(brushSize * 0.22));
      const spacingPx = Math.max(1, Math.round(pixelSize * Math.max(0.5, brushSpacing / 100)));
      const jitterPx = Math.max(0, Math.round((brushJitter / 100) * Math.max(1, pixelSize)));
      const strokeCount = Math.max(1, Math.min(14, Math.round((w * h) / Math.max(3500, pixelSize * 420))));

      ctx.fillStyle = activeColor;
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 1;

      const drawHardDab = (x: number, y: number) => {
        const px = Math.round(x / pixelSize) * pixelSize;
        const py = Math.round(y / pixelSize) * pixelSize;
        if (brushShape === "round") {
          const r = Math.max(1, Math.round(pixelSize * 0.55));
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
          return;
        }
        ctx.fillRect(px - Math.floor(pixelSize / 2), py - Math.floor(pixelSize / 2), pixelSize, pixelSize);
      };

      const drawHardStroke = (x1: number, y1: number, x2: number, y2: number) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.ceil(dist / spacingPx));
        for (let i = 0; i <= steps; i += 1) {
          const t = i / steps;
          const bx = x1 + dx * t;
          const by = y1 + dy * t;
          const jx = jitterPx ? Math.round((Math.random() * 2 - 1) * jitterPx) : 0;
          const jy = jitterPx ? Math.round((Math.random() * 2 - 1) * jitterPx) : 0;
          drawHardDab(bx + jx, by + jy);
        }
      };

      for (let s = 0; s < strokeCount; s += 1) {
        const margin = pixelSize;
        const sx = margin + Math.random() * Math.max(1, w - margin * 2);
        const sy = margin + Math.random() * Math.max(1, h - margin * 2);
        const ang = Math.random() * Math.PI * 2;
        const len = Math.max(pixelSize * 2, Math.min(Math.max(w, h) * 0.85, pixelSize * (7 + Math.random() * 14)));
        const ex = Math.max(0, Math.min(w, sx + Math.cos(ang) * len));
        const ey = Math.max(0, Math.min(h, sy + Math.sin(ang) * len));
        drawHardStroke(sx, sy, ex, ey);
      }
    }
  );

  const handleMixerBrush = () => withRegionCanvas(
    "Mixer Brush",
    (ctx, w, h) => {
      maybeRecordMacroCommand("run-mixer");
      const img = ctx.getImageData(0, 0, w, h);
      const src = new Uint8ClampedArray(img.data);
      const out = img.data;
      const paint = hexToRgb(activeColor);

      const radius = Math.max(2, Math.min(Math.min(w, h) * 0.18, brushSize * 0.7));
      const spacingPx = Math.max(1.2, radius * Math.max(0.08, brushSpacing / 100));
      const jitterPx = radius * (brushJitter / 100) * 0.55;
      const strokeCount = Math.max(1, Math.min(10, Math.round((w * h) / Math.max(7000, radius * 900))));
      const flow = Math.max(0.05, Math.min(1, brushFlow / 100));
      const wet = Math.max(0.08, Math.min(1, brushTexture / 100));
      const load = 0.28 + flow * 0.5;

      const idxFor = (x: number, y: number) => (y * w + x) * 4;
      const sampleColor = (x: number, y: number) => {
        const nx = Math.max(0, Math.min(w - 1, Math.round(x)));
        const ny = Math.max(0, Math.min(h - 1, Math.round(y)));
        const i = idxFor(nx, ny);
        return { r: src[i], g: src[i + 1], b: src[i + 2] };
      };

      const layDab = (cx: number, cy: number, reservoir: { r: number; g: number; b: number }) => {
        const minX = Math.max(0, Math.floor(cx - radius));
        const maxX = Math.min(w - 1, Math.ceil(cx + radius));
        const minY = Math.max(0, Math.floor(cy - radius));
        const maxY = Math.min(h - 1, Math.ceil(cy + radius));
        const hard = 0.2 + (brushHardness / 100) * 0.7;
        for (let y = minY; y <= maxY; y += 1) {
          for (let x = minX; x <= maxX; x += 1) {
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.hypot(dx, dy);
            if (dist > radius) continue;
            const falloff = Math.max(0, 1 - dist / radius);
            const brushWeight = Math.pow(falloff, 1 + (1 - hard) * 1.8) * flow;
            const i = idxFor(x, y);
            out[i] = clamp255(out[i] * (1 - brushWeight) + reservoir.r * brushWeight);
            out[i + 1] = clamp255(out[i + 1] * (1 - brushWeight) + reservoir.g * brushWeight);
            out[i + 2] = clamp255(out[i + 2] * (1 - brushWeight) + reservoir.b * brushWeight);
          }
        }
      };

      const paintStroke = (x1: number, y1: number, x2: number, y2: number) => {
        const startSample = sampleColor(x1, y1);
        const reservoir = {
          r: startSample.r * (1 - load) + paint.r * load,
          g: startSample.g * (1 - load) + paint.g * load,
          b: startSample.b * (1 - load) + paint.b * load
        };
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.ceil(dist / spacingPx));
        for (let i = 0; i <= steps; i += 1) {
          const t = i / steps;
          const bx = x1 + dx * t + (Math.random() * 2 - 1) * jitterPx;
          const by = y1 + dy * t + (Math.random() * 2 - 1) * jitterPx;
          const under = sampleColor(bx, by);
          reservoir.r = reservoir.r * (1 - wet) + under.r * wet;
          reservoir.g = reservoir.g * (1 - wet) + under.g * wet;
          reservoir.b = reservoir.b * (1 - wet) + under.b * wet;
          layDab(bx, by, reservoir);
        }
      };

      for (let s = 0; s < strokeCount; s += 1) {
        const margin = radius * 0.6;
        const sx = margin + Math.random() * Math.max(1, w - margin * 2);
        const sy = margin + Math.random() * Math.max(1, h - margin * 2);
        const ang = Math.random() * Math.PI * 2;
        const len = Math.max(radius * 2.5, Math.min(Math.max(w, h) * 0.75, radius * (6 + Math.random() * 9)));
        const ex = Math.max(0, Math.min(w - 1, sx + Math.cos(ang) * len));
        const ey = Math.max(0, Math.min(h - 1, sy + Math.sin(ang) * len));
        paintStroke(sx, sy, ex, ey);
      }

      ctx.putImageData(img, 0, 0);
    }
  );

  const handleColorReplacementTool = () => withRegionCanvas(
    "Color Replacement",
    (ctx, w, h) => {
      const targetRgb = hexToRgb(activeColor);
      const target = rgbToHsl(targetRgb.r, targetRgb.g, targetRgb.b);
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const strength = Math.max(0.1, Math.min(1, colorReplaceStrength / 100));
      const tolerance = Math.max(4, Math.min(100, colorReplaceTolerance));

      let refHue = target.h;
      let bestScore = Number.POSITIVE_INFINITY;
      for (let i = 0; i < d.length; i += 4) {
        const hsl = rgbToHsl(d[i], d[i + 1], d[i + 2]);
        if (hsl.s < 0.07) continue;
        const satPenalty = 1 - hsl.s;
        const lightPenalty = Math.abs(hsl.l - target.l) * 0.7;
        const hueDist = Math.min(Math.abs(hsl.h - target.h), 1 - Math.abs(hsl.h - target.h));
        const score = hueDist + satPenalty * 0.55 + lightPenalty * 0.25;
        if (score < bestScore) {
          bestScore = score;
          refHue = hsl.h;
        }
      }

      const hueTol = tolerance / 360;
      const satTol = 0.08 + tolerance / 180;
      const lumTol = 0.14 + tolerance / 160;

      for (let i = 0; i < d.length; i += 4) {
        const hsl = rgbToHsl(d[i], d[i + 1], d[i + 2]);
        if (hsl.s < 0.03) continue;
        const hueDist = Math.min(Math.abs(hsl.h - refHue), 1 - Math.abs(hsl.h - refHue));
        const satDist = Math.abs(hsl.s - target.s);
        const lumDist = Math.abs(hsl.l - target.l);
        if (hueDist > hueTol || satDist > satTol || lumDist > lumTol) continue;

        const hueW = Math.max(0, 1 - hueDist / Math.max(0.0001, hueTol));
        const satW = Math.max(0, 1 - satDist / Math.max(0.0001, satTol));
        const lumW = Math.max(0, 1 - lumDist / Math.max(0.0001, lumTol));
        const localStrength = strength * (hueW * 0.65 + satW * 0.25 + lumW * 0.1);

        const nextHue = hsl.h * (1 - localStrength) + target.h * localStrength;
        const nextSat = hsl.s * (1 - localStrength * 0.85) + Math.min(1, target.s * 1.05) * (localStrength * 0.85);
        const nextLum = hsl.l * (1 - localStrength * 0.25) + target.l * (localStrength * 0.25);
        const replaced = hslToRgb(nextHue, Math.max(0, Math.min(1, nextSat)), Math.max(0, Math.min(1, nextLum)));
        d[i] = replaced.r;
        d[i + 1] = replaced.g;
        d[i + 2] = replaced.b;
      }
      ctx.putImageData(img, 0, 0);
    }
  );

  const handleGradientTool = () => withRegionCanvas(
    "Gradient Fill",
    (ctx, w, h) => {
      maybeRecordMacroCommand("run-gradient");
      const overlay = document.createElement("canvas");
      overlay.width = w;
      overlay.height = h;
      const octx = overlay.getContext("2d");
      if (!octx) return;

      const angle = (gradientAngle * Math.PI) / 180;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.sqrt(w * w + h * h) * 0.5;
      const ax = Math.cos(angle);
      const ay = Math.sin(angle);

      if (gradientType === "diamond") {
        const a = hexToRgb(gradientA);
        const b = hexToRgb(gradientB);
        const img = octx.createImageData(w, h);
        const dd = img.data;
        const maxD = Math.max(1, w * 0.5 + h * 0.5);
        for (let y = 0; y < h; y += 1) {
          for (let x = 0; x < w; x += 1) {
            const rx = (x - cx) * ax + (y - cy) * ay;
            const ry = -(x - cx) * ay + (y - cy) * ax;
            const t = Math.max(0, Math.min(1, (Math.abs(rx) + Math.abs(ry)) / maxD));
            const i = (y * w + x) * 4;
            dd[i] = clamp255(a.r + (b.r - a.r) * t);
            dd[i + 1] = clamp255(a.g + (b.g - a.g) * t);
            dd[i + 2] = clamp255(a.b + (b.b - a.b) * t);
            dd[i + 3] = 255;
          }
        }
        octx.putImageData(img, 0, 0);
      } else {
        const x1 = cx - ax * radius;
        const y1 = cy - ay * radius;
        const x2 = cx + ax * radius;
        const y2 = cy + ay * radius;
        const grad = gradientType === "radial"
          ? octx.createRadialGradient(cx, cy, 0, cx, cy, radius)
          : octx.createLinearGradient(x1, y1, x2, y2);

        if (gradientType === "reflected") {
          grad.addColorStop(0, gradientA);
          grad.addColorStop(0.5, gradientB);
          grad.addColorStop(1, gradientA);
        } else {
          grad.addColorStop(0, gradientA);
          grad.addColorStop(1, gradientB);
        }

        octx.fillStyle = grad;
        octx.fillRect(0, 0, w, h);
      }

      const alpha = Math.max(0.05, Math.min(1, gradientOpacity / 100));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(overlay, 0, 0);
      ctx.restore();
    }
  );

  const handlePaintBucket = () => withRegionCanvas(
    "Paint Bucket",
    (ctx, w, h) => {
      maybeRecordMacroCommand("run-paint-bucket");
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const total = w * h;
      const seedX = Math.max(0, Math.min(w - 1, Math.round(w / 2)));
      const seedY = Math.max(0, Math.min(h - 1, Math.round(h / 2)));
      const seedIdx = (seedY * w + seedX) * 4;
      const sr = d[seedIdx];
      const sg = d[seedIdx + 1];
      const sb = d[seedIdx + 2];
      const sa = d[seedIdx + 3];

      const fillRgb = hexToRgb(activeColor);
      const patA = hexToRgb(gradientA);
      const patB = hexToRgb(gradientB);
      const tol = Math.max(0, Math.min(255, paintBucketTolerance * 2.55));
      const visited = new Uint8Array(total);
      const queue = new Int32Array(total);
      let qh = 0;
      let qt = 0;
      const alphaScale = Math.max(0.05, Math.min(1, brushFlow / 100));

      const colorDist = (i: number) => {
        const dr = d[i] - sr;
        const dg = d[i + 1] - sg;
        const db = d[i + 2] - sb;
        const da = d[i + 3] - sa;
        return Math.sqrt(dr * dr + dg * dg + db * db + da * da * 0.45);
      };

      const patternColor = (x: number, y: number) => {
        if (paintBucketPattern === "checker") {
          const cell = Math.max(4, Math.round(brushTextureScale * 1.6));
          const even = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0;
          return even ? patA : patB;
        }
        if (paintBucketPattern === "stripes") {
          const step = Math.max(6, Math.round(brushTextureScale * 2.2));
          return Math.floor((x + y) / step) % 2 === 0 ? patA : patB;
        }
        const step = Math.max(5, Math.round(brushTextureScale * 1.5));
        const dot = ((x % step) - step / 2) ** 2 + ((y % step) - step / 2) ** 2 < (step * step * 0.12);
        return dot ? patA : patB;
      };

      queue[qt++] = seedY * w + seedX;
      visited[seedY * w + seedX] = 1;

      while (qh < qt) {
        const p = queue[qh++];
        const x = p % w;
        const y = Math.floor(p / w);
        const i = p * 4;
        if (colorDist(i) > tol) continue;

        const fill = paintBucketMode === "color" ? fillRgb : patternColor(x, y);
        d[i] = clamp255(d[i] * (1 - alphaScale) + fill.r * alphaScale);
        d[i + 1] = clamp255(d[i + 1] * (1 - alphaScale) + fill.g * alphaScale);
        d[i + 2] = clamp255(d[i + 2] * (1 - alphaScale) + fill.b * alphaScale);

        const neighbors = [p - 1, p + 1, p - w, p + w];
        for (let n = 0; n < neighbors.length; n += 1) {
          const np = neighbors[n];
          if (np < 0 || np >= total || visited[np]) continue;
          const nx = np % w;
          const ny = Math.floor(np / w);
          if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue;
          visited[np] = 1;
          queue[qt++] = np;
        }
      }

      ctx.putImageData(img, 0, 0);
    }
  );

  const handleBlurTool = () => withRegionCanvas(
    "Blur Tool",
    (ctx, w, h) => {
      const blurPx = Math.max(1, Math.round((blurToolStrength / 100) * 9));
      if (!blurToolPreserveEdges) {
        const copy = document.createElement("canvas");
        copy.width = w;
        copy.height = h;
        const cctx = copy.getContext("2d");
        if (!cctx) return;
        cctx.drawImage(ctx.canvas, 0, 0);
        ctx.filter = `blur(${blurPx}px)`;
        ctx.drawImage(copy, 0, 0);
        ctx.filter = "none";
        return;
      }

      // Lightweight bilateral-like smoothing to soften noise while preserving edges.
      const srcImg = ctx.getImageData(0, 0, w, h);
      const src = srcImg.data;
      let work = new Uint8ClampedArray(src);
      const passes = Math.max(1, Math.min(4, Math.round(blurPx / 2)));
      const radius = Math.max(1, Math.min(4, Math.round(blurPx / 3) + 1));
      const sigmaColor = 18 + blurPx * 5;

      for (let pass = 0; pass < passes; pass += 1) {
        const out = new Uint8ClampedArray(work.length);
        for (let y = 0; y < h; y += 1) {
          for (let x = 0; x < w; x += 1) {
            const centerIdx = (y * w + x) * 4;
            const cr = work[centerIdx];
            const cg = work[centerIdx + 1];
            const cb = work[centerIdx + 2];
            let sr = 0;
            let sg = 0;
            let sb = 0;
            let sa = 0;
            let sw = 0;

            for (let dy = -radius; dy <= radius; dy += 1) {
              const ny = y + dy;
              if (ny < 0 || ny >= h) continue;
              for (let dx = -radius; dx <= radius; dx += 1) {
                const nx = x + dx;
                if (nx < 0 || nx >= w) continue;
                const i = (ny * w + nx) * 4;
                const dr = work[i] - cr;
                const dg = work[i + 1] - cg;
                const db = work[i + 2] - cb;
                const spatial = 1 / (1 + dx * dx + dy * dy);
                const colorDelta = Math.sqrt(dr * dr + dg * dg + db * db);
                const colorW = Math.exp(-(colorDelta * colorDelta) / (2 * sigmaColor * sigmaColor));
                const weight = spatial * colorW;
                sr += work[i] * weight;
                sg += work[i + 1] * weight;
                sb += work[i + 2] * weight;
                sa += work[i + 3] * weight;
                sw += weight;
              }
            }

            out[centerIdx] = clamp255(sr / Math.max(0.0001, sw));
            out[centerIdx + 1] = clamp255(sg / Math.max(0.0001, sw));
            out[centerIdx + 2] = clamp255(sb / Math.max(0.0001, sw));
            out[centerIdx + 3] = clamp255(sa / Math.max(0.0001, sw));
          }
        }
        work = out;
      }

      srcImg.data.set(work);
      ctx.putImageData(srcImg, 0, 0);
    }
  );

  const handleSharpenTool = () => withRegionCanvas(
    "Sharpen Tool",
    (ctx, w, h) => {
      const amount = Math.max(0, Math.min(2.5, sharpenToolAmount / 100));
      const radius = Math.max(1, Math.min(6, Math.round(sharpenToolRadius)));
      const threshold = Math.max(0, Math.min(64, sharpenToolThreshold));

      const srcImg = ctx.getImageData(0, 0, w, h);
      const src = srcImg.data;
      const blurred = new Uint8ClampedArray(src);
      const tmp = new Uint8ClampedArray(src.length);

      // Box blur approximation used as unsharp-mask base.
      for (let pass = 0; pass < radius; pass += 1) {
        // Horizontal
        for (let y = 0; y < h; y += 1) {
          for (let x = 0; x < w; x += 1) {
            let sr = 0;
            let sg = 0;
            let sb = 0;
            let sa = 0;
            let count = 0;
            for (let k = -1; k <= 1; k += 1) {
              const nx = Math.max(0, Math.min(w - 1, x + k));
              const i = (y * w + nx) * 4;
              sr += blurred[i];
              sg += blurred[i + 1];
              sb += blurred[i + 2];
              sa += blurred[i + 3];
              count += 1;
            }
            const o = (y * w + x) * 4;
            tmp[o] = clamp255(sr / count);
            tmp[o + 1] = clamp255(sg / count);
            tmp[o + 2] = clamp255(sb / count);
            tmp[o + 3] = clamp255(sa / count);
          }
        }
        // Vertical
        for (let y = 0; y < h; y += 1) {
          for (let x = 0; x < w; x += 1) {
            let sr = 0;
            let sg = 0;
            let sb = 0;
            let sa = 0;
            let count = 0;
            for (let k = -1; k <= 1; k += 1) {
              const ny = Math.max(0, Math.min(h - 1, y + k));
              const i = (ny * w + x) * 4;
              sr += tmp[i];
              sg += tmp[i + 1];
              sb += tmp[i + 2];
              sa += tmp[i + 3];
              count += 1;
            }
            const o = (y * w + x) * 4;
            blurred[o] = clamp255(sr / count);
            blurred[o + 1] = clamp255(sg / count);
            blurred[o + 2] = clamp255(sb / count);
            blurred[o + 3] = clamp255(sa / count);
          }
        }
      }

      for (let i = 0; i < src.length; i += 4) {
        const dr = src[i] - blurred[i];
        const dg = src[i + 1] - blurred[i + 1];
        const db = src[i + 2] - blurred[i + 2];
        const edge = (Math.abs(dr) + Math.abs(dg) + Math.abs(db)) / 3;
        if (edge < threshold) continue;
        src[i] = clamp255(src[i] + dr * amount);
        src[i + 1] = clamp255(src[i + 1] + dg * amount);
        src[i + 2] = clamp255(src[i + 2] + db * amount);
      }

      ctx.putImageData(srcImg, 0, 0);
    }
  );

  const handleSmudgeTool = () => withRegionCanvas(
    "Smudge Tool",
    (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h);
      const src = new Uint8ClampedArray(img.data);
      const out = img.data;
      const strength = Math.max(0.08, Math.min(1, smudgeToolStrength / 100));
      const radius = Math.max(2, Math.min(64, Math.round(smudgeToolFingerWidth)));
      const angle = (smudgeToolDirection * Math.PI) / 180;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const sweep = Math.max(2, Math.round(radius * (0.8 + strength * 1.2)));

      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const cx = x;
          const cy = y;
          let sr = 0;
          let sg = 0;
          let sb = 0;
          let sa = 0;
          let sw = 0;

          for (let s = 0; s <= sweep; s += 1) {
            const t = s / Math.max(1, sweep);
            const sx = Math.round(cx - dx * s);
            const sy = Math.round(cy - dy * s);
            if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
            const radial = Math.max(0.15, 1 - t);
            const i = (sy * w + sx) * 4;
            const wgt = radial;
            sr += src[i] * wgt;
            sg += src[i + 1] * wgt;
            sb += src[i + 2] * wgt;
            sa += src[i + 3] * wgt;
            sw += wgt;
          }

          if (sw <= 0) continue;
          const i = (y * w + x) * 4;
          const mr = sr / sw;
          const mg = sg / sw;
          const mb = sb / sw;
          const ma = sa / sw;

          // Mask by finger width around local center line.
          const localX = ((x % (radius * 2 + 1)) - radius) / Math.max(1, radius);
          const localY = ((y % (radius * 2 + 1)) - radius) / Math.max(1, radius);
          const mask = Math.max(0.2, 1 - Math.min(1, localX * localX + localY * localY));
          const blend = strength * mask;

          out[i] = clamp255(src[i] * (1 - blend) + mr * blend);
          out[i + 1] = clamp255(src[i + 1] * (1 - blend) + mg * blend);
          out[i + 2] = clamp255(src[i + 2] * (1 - blend) + mb * blend);
          out[i + 3] = clamp255(src[i + 3] * (1 - blend) + ma * blend);
        }
      }

      img.data.set(out);
      ctx.putImageData(img, 0, 0);
    }
  );

  const handleDodge = () => withRegionCanvas(
    "Dodge",
    (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const strength = Math.max(0.05, Math.min(1, dodgeToolStrength / 100));
      const rangeCenter = dodgeToolRange === "shadows" ? 0.22 : dodgeToolRange === "highlights" ? 0.82 : 0.52;
      const sigma = dodgeToolRange === "midtones" ? 0.28 : 0.22;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const tonalWeight = Math.exp(-((lum - rangeCenter) ** 2) / (2 * sigma * sigma));
        const highlightProtect = dodgeProtectHighlights ? Math.max(0.18, 1 - lum * lum) : 1;
        const amount = strength * tonalWeight * highlightProtect;

        d[i] = clamp255(r + (255 - r) * amount);
        d[i + 1] = clamp255(g + (255 - g) * amount);
        d[i + 2] = clamp255(b + (255 - b) * amount);
      }
      ctx.putImageData(img, 0, 0);
    }
  );

  const handleBurn = () => withRegionCanvas(
    "Burn",
    (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const strength = Math.max(0.05, Math.min(1, burnToolStrength / 100));
      const rangeCenter = burnToolRange === "shadows" ? 0.22 : burnToolRange === "highlights" ? 0.82 : 0.52;
      const sigma = burnToolRange === "midtones" ? 0.28 : 0.22;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const tonalWeight = Math.exp(-((lum - rangeCenter) ** 2) / (2 * sigma * sigma));
        const shadowProtect = burnProtectShadows ? Math.max(0.16, lum * lum) : 1;
        const amount = strength * tonalWeight * shadowProtect;

        d[i] = clamp255(r * (1 - amount));
        d[i + 1] = clamp255(g * (1 - amount));
        d[i + 2] = clamp255(b * (1 - amount));
      }
      ctx.putImageData(img, 0, 0);
    }
  );

  const handleSponge = () => withRegionCanvas(
    "Sponge",
    (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const strength = Math.max(0.05, Math.min(1, spongeToolStrength / 100));
      for (let i = 0; i < d.length; i += 4) {
        const hsl = rgbToHsl(d[i], d[i + 1], d[i + 2]);
        const isSkinTone = hsl.h >= 0.02 && hsl.h <= 0.13 && hsl.s >= 0.14 && hsl.s <= 0.68 && hsl.l >= 0.2 && hsl.l <= 0.9;
        const guard = spongeProtectSkin && isSkinTone ? 0.35 : 1;
        const amount = strength * guard;

        let nextS = hsl.s;
        if (spongeToolMode === "saturate") {
          // Increase saturation strongest in mid-sat range, gentler at extremes.
          const satWeight = 1 - Math.abs(hsl.s - 0.5) * 1.2;
          nextS = hsl.s + (1 - hsl.s) * amount * Math.max(0.2, satWeight);
        } else {
          // Pull saturation down while preserving some chroma.
          nextS = hsl.s * (1 - amount * 0.92);
        }

        const mapped = hslToRgb(hsl.h, Math.max(0, Math.min(1, nextS)), hsl.l);
        d[i] = mapped.r;
        d[i + 1] = mapped.g;
        d[i + 2] = mapped.b;
      }
      ctx.putImageData(img, 0, 0);
    }
  );

  const handleCreateShape = async () => {
    if (!canvasRef.current || collabRole === "viewer") return;
    const loaded = await loadSnapshotImage();
    if (!loaded) return;
    const bounds = getWorkingBounds(loaded.fullCanvas.width, loaded.fullCanvas.height, true);
    if (!bounds) {
      alert("Create a selection first.");
      return;
    }
    const shapeLayerPayload = buildCurrentShapeLayerPayload(bounds.width, bounds.height);
    const rendered = renderShapeLayerCanvas(shapeLayerPayload);
    if (!rendered) return;
    const shapeNodes = rendered.nodes.map((node) => ({
      ...node,
      x: bounds.x + node.x,
      y: bounds.y + node.y,
      inX: bounds.x + node.inX,
      inY: bounds.y + node.inY,
      outX: bounds.x + node.outX,
      outY: bounds.y + node.outY
    }));
    commitRegionLayer(rendered.layer, "Shape Layer", bounds.x, bounds.y, { layerType: 'shape', shapeLayer: shapeLayerPayload });
    const pathId = crypto.randomUUID();
    setPaths((prev) => [
      {
        id: pathId,
        name: `Shape Path (${vectorShape === "custom" ? customShapePreset : vectorShape})`,
        visible: true,
        kind: "shape",
        closed: true,
        bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
        nodes: shapeNodes
      },
      ...prev
    ]);
    setActivePathId(pathId);
  };

  const handleUpdateActiveShapeLayer = async () => {
    if (!canvasRef.current || collabRole === "viewer" || !activeLayerId) return;
    if (!selectedLayer || selectedLayer.type !== "shape") {
      alert("Select a shape layer first.");
      return;
    }
    const currentPayload = (selectedLayer.aiData as any)?.shapeLayer as { width?: number; height?: number } | undefined;
    const width = Math.max(1, Math.round(currentPayload?.width || selection?.width || canvasDims.width * 0.4 || 360));
    const height = Math.max(1, Math.round(currentPayload?.height || selection?.height || canvasDims.height * 0.3 || 240));
    const nextPayload = buildCurrentShapeLayerPayload(width, height);
    const rendered = renderShapeLayerCanvas(nextPayload);
    if (!rendered) return;
    await canvasRef.current.replaceActiveLayerContents(rendered.layer.toDataURL("image/png"), selectedLayer.name);
    updateLayer(activeLayerId, {
      type: "shape",
      aiData: {
        ...(selectedLayer.aiData as any),
        shapeLayer: nextPayload
      } as any
    });
  };

  const buildOpenTypeGlyphs = (value: string) => {
    const glyphs: string[] = [];
    for (let i = 0; i < value.length;) {
      if (openTypeLiga) {
        const ffi = value.slice(i, i + 3);
        if (ffi === "ffi") {
          glyphs.push("ﬃ");
          i += 3;
          continue;
        }
        const ffl = value.slice(i, i + 3);
        if (ffl === "ffl") {
          glyphs.push("ﬄ");
          i += 3;
          continue;
        }
        const pair = value.slice(i, i + 2);
        if (pair === "fi") {
          glyphs.push("ﬁ");
          i += 2;
          continue;
        }
        if (pair === "fl") {
          glyphs.push("ﬂ");
          i += 2;
          continue;
        }
        if (pair === "ff") {
          glyphs.push("ﬀ");
          i += 2;
          continue;
        }
      }
      if (openTypeDiscretionaryLiga) {
        const pair = value.slice(i, i + 2);
        if (pair === "st") {
          glyphs.push("ﬆ");
          i += 2;
          continue;
        }
      }
      glyphs.push(value[i]);
      i += 1;
    }
    return glyphs;
  };

  const oldStyleFigureOffset = (glyph: string) => {
    if (!openTypeOldStyleFigures || glyph.length !== 1 || !/\d/.test(glyph)) return 0;
    if (glyph === "3" || glyph === "4" || glyph === "5" || glyph === "7" || glyph === "9") return fontSize * 0.12;
    if (glyph === "6" || glyph === "8") return fontSize * 0.06;
    return 0;
  };

  const resolveFontFamily = () => {
    if (fontFamily === "serif") return `"Times New Roman", "Georgia", serif`;
    if (fontFamily === "mono") return `"Cascadia Mono", "Consolas", monospace`;
    return `"Segoe UI", "Arial", sans-serif`;
  };

  const buildFontValue = () => {
    const italicPart = textItalic ? "italic " : "";
    return `${italicPart}${fontWeight} ${fontSize}px ${resolveFontFamily()}`;
  };

  const drawGlyph = (ctx: CanvasRenderingContext2D, glyph: string, x: number, y: number) => {
    const adjusted = openTypeSmallCaps ? glyph.toUpperCase() : glyph;
    const yOffset = oldStyleFigureOffset(adjusted);
    ctx.fillText(adjusted, x, y + yOffset);
    if (textUnderline) {
      const width = ctx.measureText(adjusted).width;
      const underlineY = y + fontSize * 0.94 + yOffset;
      ctx.beginPath();
      ctx.moveTo(x, underlineY);
      ctx.lineTo(x + width, underlineY);
      ctx.lineWidth = Math.max(1, fontSize * 0.05);
      ctx.strokeStyle = activeColor;
      ctx.stroke();
    }
    return adjusted;
  };

  const buildCurrentTextLayerPayload = (width: number, height: number, textOverride?: string) => ({
    text: (textOverride ?? textDraft).trim(),
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
    fontSize,
    fontFamily,
    fontWeight,
    textItalic,
    textUnderline,
    lineHeight,
    tracking,
    paragraphSpacing,
    paragraphIndent,
    textAlign,
    textDirection,
    openType: {
      liga: openTypeLiga,
      discretionaryLiga: openTypeDiscretionaryLiga,
      kerning: openTypeKerning,
      oldStyleFigures: openTypeOldStyleFigures,
      smallCaps: openTypeSmallCaps
    }
  });

  const renderTextLayerCanvas = (payload: ReturnType<typeof buildCurrentTextLayerPayload>) => {
    const layer = document.createElement("canvas");
    layer.width = payload.width;
    layer.height = payload.height;
    const ctx = layer.getContext("2d");
    if (!ctx) return null;

    const resolveFamily = () => {
      if (payload.fontFamily === "serif") return `"Times New Roman", "Georgia", serif`;
      if (payload.fontFamily === "mono") return `"Cascadia Mono", "Consolas", monospace`;
      return `"Segoe UI", "Arial", sans-serif`;
    };
    const buildFont = () => `${payload.textItalic ? "italic " : ""}${payload.fontWeight} ${payload.fontSize}px ${resolveFamily()}`;

    const openTypeGlyphs = (value: string) => {
      const glyphs: string[] = [];
      for (let i = 0; i < value.length;) {
        if (payload.openType.liga) {
          const ffi = value.slice(i, i + 3);
          if (ffi === "ffi") { glyphs.push("ﬃ"); i += 3; continue; }
          const ffl = value.slice(i, i + 3);
          if (ffl === "ffl") { glyphs.push("ﬄ"); i += 3; continue; }
          const pair = value.slice(i, i + 2);
          if (pair === "fi") { glyphs.push("ﬁ"); i += 2; continue; }
          if (pair === "fl") { glyphs.push("ﬂ"); i += 2; continue; }
          if (pair === "ff") { glyphs.push("ﬀ"); i += 2; continue; }
        }
        if (payload.openType.discretionaryLiga && value.slice(i, i + 2) === "st") {
          glyphs.push("ﬆ");
          i += 2;
          continue;
        }
        glyphs.push(value[i]);
        i += 1;
      }
      return glyphs;
    };

    const figureOffset = (glyph: string) => {
      if (!payload.openType.oldStyleFigures || glyph.length !== 1 || !/\d/.test(glyph)) return 0;
      if (glyph === "3" || glyph === "4" || glyph === "5" || glyph === "7" || glyph === "9") return payload.fontSize * 0.12;
      if (glyph === "6" || glyph === "8") return payload.fontSize * 0.06;
      return 0;
    };

    const drawGlyphLocal = (glyph: string, x: number, y: number) => {
      const adjusted = payload.openType.smallCaps ? glyph.toUpperCase() : glyph;
      const yOffset = figureOffset(adjusted);
      ctx.fillText(adjusted, x, y + yOffset);
      if (payload.textUnderline) {
        const width = ctx.measureText(adjusted).width;
        const underlineY = y + payload.fontSize * 0.94 + yOffset;
        ctx.beginPath();
        ctx.moveTo(x, underlineY);
        ctx.lineTo(x + width, underlineY);
        ctx.lineWidth = Math.max(1, payload.fontSize * 0.05);
        ctx.strokeStyle = activeColor;
        ctx.stroke();
      }
      return adjusted;
    };

    (ctx as CanvasRenderingContext2D & { fontKerning?: "auto" | "normal" | "none" }).fontKerning = payload.openType.kerning ? "normal" : "none";
    ctx.fillStyle = activeColor;
    ctx.textAlign = payload.textAlign;
    ctx.textBaseline = "top";
    ctx.font = buildFont();
    const lines = payload.text.split("\n");
    const letterAdvanceAdjust = payload.tracking * 0.05 + (payload.openType.kerning ? 0 : 0.8) + (payload.openType.liga ? 0 : 0.6);
    const measureLine = (line: string) => {
      let width = 0;
      let count = 0;
      for (const glyph of openTypeGlyphs(line)) {
        const out = payload.openType.smallCaps ? glyph.toUpperCase() : glyph;
        width += ctx.measureText(out).width + letterAdvanceAdjust;
        count += 1;
      }
      if (count > 0) width -= letterAdvanceAdjust;
      return Math.max(0, width);
    };

    if (payload.textDirection === "horizontal") {
      let y = 0;
      lines.forEach((line, index) => {
        const lineWidth = measureLine(line);
        const isParagraphStart = index === 0 || lines[index - 1].trim().length === 0;
        const indent = isParagraphStart ? payload.paragraphIndent : 0;
        let x = payload.textAlign === "left"
          ? indent
          : payload.textAlign === "center"
            ? Math.max(0, (payload.width - lineWidth) / 2)
            : Math.max(0, payload.width - lineWidth);
        for (const glyph of openTypeGlyphs(line)) {
          const measured = drawGlyphLocal(glyph, x, y);
          x += ctx.measureText(measured).width + letterAdvanceAdjust;
        }
        y += payload.fontSize * payload.lineHeight + (line.trim().length === 0 ? payload.paragraphSpacing : 0);
      });
    } else {
      const rowStep = payload.fontSize * payload.lineHeight + payload.paragraphSpacing * 0.25;
      const columnGap = letterAdvanceAdjust;
      const columnWidths = lines.map((line) => {
        let width = 0;
        for (const glyph of openTypeGlyphs(line)) {
          const out = payload.openType.smallCaps ? glyph.toUpperCase() : glyph;
          width = Math.max(width, ctx.measureText(out).width);
        }
        return Math.max(width, payload.fontSize * 0.5);
      });
      const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, lines.length - 1) * columnGap;
      let cursorX = payload.textAlign === "left" ? 0 : payload.textAlign === "center" ? Math.max(0, (payload.width - totalWidth) / 2) : Math.max(0, payload.width - totalWidth);
      lines.forEach((line, columnIndex) => {
        const columnWidth = columnWidths[columnIndex] || payload.fontSize;
        let y = 0;
        for (const glyph of openTypeGlyphs(line)) {
          const out = payload.openType.smallCaps ? glyph.toUpperCase() : glyph;
          const charWidth = ctx.measureText(out).width;
          const x = cursorX + Math.max(0, (columnWidth - charWidth) / 2);
          drawGlyphLocal(glyph, x, y);
          y += rowStep;
        }
        cursorX += columnWidth + columnGap;
      });
    }

    return layer;
  };

  const buildCurrentShapeLayerPayload = (width: number, height: number) => ({
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
    shape: vectorShape,
    customShape: customShapePreset,
    sides: Math.max(3, Math.min(12, polygonSides)),
    fill: activeColor
  });

  const renderShapeLayerCanvas = (payload: ReturnType<typeof buildCurrentShapeLayerPayload>) => {
    const layer = document.createElement("canvas");
    layer.width = payload.width;
    layer.height = payload.height;
    const ctx = layer.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = payload.fill;
    ctx.strokeStyle = payload.fill;
    ctx.lineWidth = 2;

    const pointNodes = (points: Array<{ x: number; y: number }>): NonNullable<PathItem["nodes"]> =>
      points.map((point) => ({
        x: point.x,
        y: point.y,
        inX: point.x,
        inY: point.y,
        outX: point.x,
        outY: point.y,
        corner: true
      }));

    const drawClosedPoints = (points: Array<{ x: number; y: number }>) => {
      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fill();
    };

    let nodes: NonNullable<PathItem["nodes"]>;
    if (payload.shape === "rectangle") {
      ctx.fillRect(0, 0, payload.width, payload.height);
      nodes = pointNodes([
        { x: 0, y: 0 },
        { x: payload.width, y: 0 },
        { x: payload.width, y: payload.height },
        { x: 0, y: payload.height }
      ]);
    } else if (payload.shape === "ellipse") {
      const rx = payload.width / 2;
      const ry = payload.height / 2;
      const cx = rx;
      const cy = ry;
      const k = 0.5522847498;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      nodes = [
        { x: cx, y: 0, inX: cx - rx * k, inY: 0, outX: cx + rx * k, outY: 0, corner: false },
        { x: payload.width, y: cy, inX: payload.width, inY: cy - ry * k, outX: payload.width, outY: cy + ry * k, corner: false },
        { x: cx, y: payload.height, inX: cx + rx * k, inY: payload.height, outX: cx - rx * k, outY: payload.height, corner: false },
        { x: 0, y: cy, inX: 0, inY: cy + ry * k, outX: 0, outY: cy - ry * k, corner: false }
      ];
    } else {
      const cx = payload.width / 2;
      const cy = payload.height / 2;
      const radius = Math.min(payload.width, payload.height) / 2;
      let points: Array<{ x: number; y: number }> = [];
      if (payload.shape === "polygon") {
        for (let i = 0; i < payload.sides; i += 1) {
          const angle = (-Math.PI / 2) + (Math.PI * 2 * i) / payload.sides;
          points.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
        }
      } else if (payload.customShape === "star") {
        const spikes = 5;
        const inner = radius * 0.45;
        for (let i = 0; i < spikes * 2; i += 1) {
          const angle = (-Math.PI / 2) + (Math.PI * i) / spikes;
          const r = i % 2 === 0 ? radius : inner;
          points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
        }
      } else if (payload.customShape === "diamond") {
        points = [
          { x: cx, y: 0 },
          { x: payload.width, y: cy },
          { x: cx, y: payload.height },
          { x: 0, y: cy }
        ];
      } else if (payload.customShape === "arrow") {
        points = [
          { x: payload.width * 0.08, y: cy - payload.height * 0.18 },
          { x: payload.width * 0.5, y: cy - payload.height * 0.18 },
          { x: payload.width * 0.5, y: payload.height * 0.08 },
          { x: payload.width * 0.94, y: cy },
          { x: payload.width * 0.5, y: payload.height * 0.92 },
          { x: payload.width * 0.5, y: cy + payload.height * 0.18 },
          { x: payload.width * 0.08, y: cy + payload.height * 0.18 }
        ];
      } else {
        points = [
          { x: payload.width * 0.1, y: payload.height * 0.1 },
          { x: payload.width * 0.9, y: payload.height * 0.1 },
          { x: payload.width * 0.9, y: payload.height * 0.72 },
          { x: payload.width * 0.58, y: payload.height * 0.72 },
          { x: payload.width * 0.42, y: payload.height * 0.94 },
          { x: payload.width * 0.42, y: payload.height * 0.72 },
          { x: payload.width * 0.1, y: payload.height * 0.72 }
        ];
      }
      drawClosedPoints(points);
      nodes = pointNodes(points);
    }

    return { layer, nodes };
  };

  const handleAddTypeLayer = async () => {
    if (!canvasRef.current || collabRole === "viewer") return;
    const loaded = await loadSnapshotImage();
    if (!loaded) return;
    const bounds = getWorkingBounds(loaded.fullCanvas.width, loaded.fullCanvas.height, false);
    if (!bounds) return;

    const text = textDraft.trim();
    if (!text) {
      alert("Enter text first.");
      return;
    }

    const textLayerPayload = buildCurrentTextLayerPayload(bounds.width, bounds.height, text);
    const layer = renderTextLayerCanvas(textLayerPayload);
    if (!layer) return;
    commitRegionLayer(layer, "Text Layer", bounds.x, bounds.y, {
      layerType: 'text',
      textLayer: textLayerPayload
    });
  };

  const handleUpdateActiveTextLayer = async () => {
    if (!canvasRef.current || collabRole === "viewer" || !activeLayerId) return;
    const active = layers.find((layer) => layer.id === activeLayerId);
    if (!active || active.type !== "text") {
      alert("Select a text layer first.");
      return;
    }
    const text = textDraft.trim();
    if (!text) {
      alert("Enter text first.");
      return;
    }
    const currentPayload = (active.aiData as any)?.textLayer as { width?: number; height?: number } | undefined;
    const width = Math.max(1, Math.round(currentPayload?.width || selection?.width || canvasDims.width || 960));
    const height = Math.max(1, Math.round(currentPayload?.height || selection?.height || canvasDims.height || 640));
    const nextPayload = buildCurrentTextLayerPayload(width, height, text);
    const layer = renderTextLayerCanvas(nextPayload);
    if (!layer) return;
    await canvasRef.current.replaceActiveLayerContents(layer.toDataURL("image/png"), active.name);
    updateLayer(activeLayerId, {
      type: "text",
      aiData: {
        ...(active.aiData as any),
        textLayer: nextPayload
      } as any
    });
  };

  const handleWarpText = async () => {
    if (!canvasRef.current || collabRole === "viewer") return;
    const text = textDraft.trim();
    if (!text) {
      alert("Enter text first.");
      return;
    }
    const loaded = await loadSnapshotImage();
    if (!loaded) return;
    const bounds = getWorkingBounds(loaded.fullCanvas.width, loaded.fullCanvas.height, false);
    if (!bounds) return;
    const layer = document.createElement("canvas");
    layer.width = bounds.width;
    layer.height = bounds.height;
    const ctx = layer.getContext("2d");
    if (!ctx) return;
    (ctx as CanvasRenderingContext2D & { fontKerning?: "auto" | "normal" | "none" }).fontKerning = openTypeKerning ? "normal" : "none";
    ctx.fillStyle = activeColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = buildFontValue();
    const centerX = bounds.width / 2;
    const centerY = bounds.height / 2;
    const span = textWarpAxis === "horizontal" ? bounds.width : bounds.height;
    const amplitude = Math.max(4, Math.min(bounds.width, bounds.height) * textWarp * 0.28);
    const evaluateWarp = (t: number) => {
      const u = t - 0.5;
      if (textWarpStyle === "arch") {
        return {
          offset: (1 - Math.abs(u) * 2) * amplitude,
          angle: -Math.sign(u) * textWarp * 0.28
        };
      }
      if (textWarpStyle === "bulge") {
        return {
          offset: (1 - 4 * u * u) * amplitude,
          angle: -u * textWarp * 0.95
        };
      }
      if (textWarpStyle === "flag") {
        const phase = u * Math.PI * 2;
        return {
          offset: (Math.sin(phase) + 0.35 * Math.sin(phase * 2)) * amplitude * 0.68,
          angle: (Math.cos(phase) + 0.7 * Math.cos(phase * 2)) * textWarp * 0.24
        };
      }
      if (textWarpStyle === "wave") {
        const phase = (t * 2 - 1) * Math.PI * 2;
        return {
          offset: Math.sin(phase) * amplitude * 0.62,
          angle: Math.cos(phase) * textWarp * 0.26
        };
      }
      return {
        offset: Math.sin((t - 0.5) * Math.PI) * amplitude,
        angle: Math.cos((t - 0.5) * Math.PI) * textWarp * 0.45
      };
    };
    const glyphs = buildOpenTypeGlyphs(text);
    glyphs.forEach((glyph, idx) => {
      const t = glyphs.length <= 1 ? 0.5 : idx / (glyphs.length - 1);
      const guide = span * (0.1 + t * 0.8);
      const warp = evaluateWarp(t);
      const x = textWarpAxis === "horizontal" ? guide : centerX + warp.offset;
      const y = textWarpAxis === "horizontal" ? centerY + warp.offset : guide;
      const angle = textWarpAxis === "horizontal" ? warp.angle : warp.angle + Math.PI / 2;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      drawGlyph(ctx, glyph, 0, 0);
      ctx.restore();
    });
    commitRegionLayer(layer, "Warp Text", bounds.x, bounds.y, {
      layerType: 'text',
      text,
      family: fontFamily,
      weight: fontWeight,
      italic: textItalic,
      underline: textUnderline,
      warp: {
        amount: textWarp,
        style: textWarpStyle,
        axis: textWarpAxis
      },
      openType: {
        liga: openTypeLiga,
        discretionaryLiga: openTypeDiscretionaryLiga,
        kerning: openTypeKerning,
        oldStyleFigures: openTypeOldStyleFigures,
        smallCaps: openTypeSmallCaps
      }
    });
  };

  const handleTextOnPath = async () => {
    if (!canvasRef.current || collabRole === "viewer") return;
    const text = textDraft.trim();
    if (!text) {
      alert("Enter text first.");
      return;
    }
    const loaded = await loadSnapshotImage();
    if (!loaded) return;
    const fallbackBounds = getWorkingBounds(loaded.fullCanvas.width, loaded.fullCanvas.height, false);
    const activePath = activePathId ? paths.find((path) => path.id === activePathId) ?? null : null;
    const pathTarget = (activePath && (activePath.nodes?.length || activePath.bounds) ? activePath : null)
      ?? paths.find((path) => path.visible && ((path.nodes?.length ?? 0) > 1 || path.bounds)) ?? null;
    const bounds = pathTarget?.bounds ? { ...pathTarget.bounds } : fallbackBounds;
    if (!bounds) return;
    const layer = document.createElement("canvas");
    layer.width = bounds.width;
    layer.height = bounds.height;
    const ctx = layer.getContext("2d");
    if (!ctx) return;
    (ctx as CanvasRenderingContext2D & { fontKerning?: "auto" | "normal" | "none" }).fontKerning = openTypeKerning ? "normal" : "none";
    ctx.fillStyle = activeColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = buildFontValue();
    const glyphs = buildOpenTypeGlyphs(text);
    const letterAdvanceAdjust = tracking * 0.05 + (openTypeKerning ? 0 : 0.8) + (openTypeLiga ? 0 : 0.6);

    const polyline: Array<{ x: number; y: number }> = (() => {
      if (pathTarget?.nodes && pathTarget.nodes.length > 1) {
        const points = pathTarget.nodes.map((node) => ({ x: node.x - bounds.x, y: node.y - bounds.y }));
        if (pathTarget.closed) points.push(points[0]);
        return points;
      }
      if (pathTarget?.bounds) {
        const w = bounds.width;
        const h = bounds.height;
        return [
          { x: 0, y: h * 0.5 },
          { x: w * 0.25, y: h * 0.2 },
          { x: w * 0.5, y: h * 0.15 },
          { x: w * 0.75, y: h * 0.2 },
          { x: w, y: h * 0.5 }
        ];
      }
      const radius = Math.max(12, Math.min(bounds.width, bounds.height) * 0.35);
      const cx = bounds.width / 2;
      const cy = bounds.height / 2 + radius * 0.2;
      const steps = Math.max(24, glyphs.length * 3);
      const points: Array<{ x: number; y: number }> = [];
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const angle = -Math.PI * 0.75 + Math.PI * 1.5 * t;
        points.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
      }
      return points;
    })();

    const segments: Array<{ from: { x: number; y: number }; to: { x: number; y: number }; len: number; start: number }> = [];
    let totalLength = 0;
    for (let i = 0; i < polyline.length - 1; i += 1) {
      const from = polyline[i];
      const to = polyline[i + 1];
      const len = Math.hypot(to.x - from.x, to.y - from.y);
      if (len <= 0.0001) continue;
      segments.push({ from, to, len, start: totalLength });
      totalLength += len;
    }
    if (totalLength <= 0 || segments.length === 0) {
      alert("Selected path is too small for text placement.");
      return;
    }

    const sampleAtDistance = (distance: number) => {
      const clamped = Math.max(0, Math.min(totalLength, distance));
      const segment = segments.find((item, index) => {
        const nextStart = index === segments.length - 1 ? totalLength : segments[index + 1].start;
        return clamped >= item.start && clamped <= nextStart;
      }) ?? segments[segments.length - 1];
      const t = Math.max(0, Math.min(1, (clamped - segment.start) / segment.len));
      const x = segment.from.x + (segment.to.x - segment.from.x) * t;
      const y = segment.from.y + (segment.to.y - segment.from.y) * t;
      const angle = Math.atan2(segment.to.y - segment.from.y, segment.to.x - segment.from.x);
      return { x, y, angle };
    };

    const advances = glyphs.map((glyph) => {
      const out = openTypeSmallCaps ? glyph.toUpperCase() : glyph;
      return ctx.measureText(out).width + letterAdvanceAdjust;
    });
    const textLength = advances.reduce((sum, value) => sum + value, 0) - (advances.length ? letterAdvanceAdjust : 0);
    let cursor = Math.max(0, (totalLength - textLength) * 0.5);

    glyphs.forEach((glyph, idx) => {
      const raw = openTypeSmallCaps ? glyph.toUpperCase() : glyph;
      const glyphWidth = ctx.measureText(raw).width;
      const point = sampleAtDistance(cursor + glyphWidth * 0.5);
      const angle = point.angle + (textDirection === "vertical" ? Math.PI / 2 : 0);
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(angle);
      drawGlyph(ctx, glyph, 0, 0);
      ctx.restore();
      cursor += advances[idx];
    });
    commitRegionLayer(layer, "Text on Path", bounds.x, bounds.y, {
      layerType: 'text',
      text,
      family: fontFamily,
      weight: fontWeight,
      italic: textItalic,
      underline: textUnderline,
      mode: "path",
      pathId: pathTarget?.id ?? null,
      pathName: pathTarget?.name ?? null,
      openType: {
        liga: openTypeLiga,
        discretionaryLiga: openTypeDiscretionaryLiga,
        kerning: openTypeKerning,
        oldStyleFigures: openTypeOldStyleFigures,
        smallCaps: openTypeSmallCaps
      }
    });
  };

  const buildPathBounds = () => {
    if (selection) {
      return {
        x: selection.x,
        y: selection.y,
        width: Math.max(24, selection.width),
        height: Math.max(24, selection.height)
      };
    }
    const fallbackCanvasWidth = Math.max(320, canvasDims.width || 0);
    const fallbackCanvasHeight = Math.max(240, canvasDims.height || 0);
    const width = Math.max(180, Math.round(fallbackCanvasWidth * 0.3));
    const height = Math.max(140, Math.round(fallbackCanvasHeight * 0.26));
    return {
      x: Math.max(12, Math.round((fallbackCanvasWidth - width) * 0.5)),
      y: Math.max(12, Math.round((fallbackCanvasHeight - height) * 0.5)),
      width,
      height
    };
  };

  const buildBezierRectNodes = (bounds: { x: number; y: number; width: number; height: number }): NonNullable<PathItem["nodes"]> => {
    const { x, y, width, height } = bounds;
    const handleX = width * 0.25;
    const handleY = height * 0.25;
    return [
      { x, y, inX: x + handleX, inY: y, outX: x, outY: y + handleY, corner: false },
      { x: x + width, y, inX: x + width, inY: y + handleY, outX: x + width - handleX, outY: y, corner: false },
      { x: x + width, y: y + height, inX: x + width - handleX, inY: y + height, outX: x + width, outY: y + height - handleY, corner: false },
      { x, y: y + height, inX: x, inY: y + height - handleY, outX: x + handleX, outY: y + height, corner: false }
    ];
  };

  const buildCurvatureNodes = (bounds: { x: number; y: number; width: number; height: number }): NonNullable<PathItem["nodes"]> => {
    const { x, y, width, height } = bounds;
    const points = [
      { x: x + width * 0.08, y: y + height * 0.82 },
      { x: x + width * 0.3, y: y + height * 0.2 },
      { x: x + width * 0.68, y: y + height * 0.34 },
      { x: x + width * 0.9, y: y + height * 0.16 }
    ];
    return points.map((point, index) => {
      const prev = points[Math.max(0, index - 1)];
      const next = points[Math.min(points.length - 1, index + 1)];
      const tangentX = (next.x - prev.x) * 0.22;
      const tangentY = (next.y - prev.y) * 0.22;
      return {
        x: point.x,
        y: point.y,
        inX: point.x - tangentX,
        inY: point.y - tangentY,
        outX: point.x + tangentX,
        outY: point.y + tangentY,
        corner: false
      };
    });
  };

  const unionBounds = (a: NonNullable<PathItem["bounds"]>, b: NonNullable<PathItem["bounds"]>) => {
    const x1 = Math.min(a.x, b.x);
    const y1 = Math.min(a.y, b.y);
    const x2 = Math.max(a.x + a.width, b.x + b.width);
    const y2 = Math.max(a.y + a.height, b.y + b.height);
    return { x: x1, y: y1, width: Math.max(1, x2 - x1), height: Math.max(1, y2 - y1) };
  };

  const intersectBounds = (a: NonNullable<PathItem["bounds"]>, b: NonNullable<PathItem["bounds"]>) => {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.width, b.x + b.width);
    const y2 = Math.min(a.y + a.height, b.y + b.height);
    if (x2 <= x1 || y2 <= y1) return null;
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  };

  const subtractBounds = (base: NonNullable<PathItem["bounds"]>, cut: NonNullable<PathItem["bounds"]>) => {
    const overlap = intersectBounds(base, cut);
    if (!overlap) return base;
    const candidates = [
      { x: base.x, y: base.y, width: overlap.x - base.x, height: base.height },
      { x: overlap.x + overlap.width, y: base.y, width: base.x + base.width - (overlap.x + overlap.width), height: base.height },
      { x: overlap.x, y: base.y, width: overlap.width, height: overlap.y - base.y },
      { x: overlap.x, y: overlap.y + overlap.height, width: overlap.width, height: base.y + base.height - (overlap.y + overlap.height) }
    ].filter((rect) => rect.width > 0 && rect.height > 0);
    if (!candidates.length) return null;
    return candidates.reduce((best, item) => (item.width * item.height > best.width * best.height ? item : best));
  };

  const handleApplyPathOperation = () => {
    if (collabRole === "viewer") return;
    const candidates = paths.filter((path) => path.visible && path.bounds);
    if (candidates.length < 2) {
      alert("Create at least two visible paths with bounds first.");
      return;
    }

    const active = activePathId ? candidates.find((path) => path.id === activePathId) ?? null : null;
    const base = active ?? candidates[0];
    const operand = candidates.find((path) => path.id !== base.id) ?? null;
    if (!operand || !base.bounds || !operand.bounds) {
      alert("Select a base path and another visible path.");
      return;
    }

    let nextBounds: NonNullable<PathItem["bounds"]> | null = null;
    if (pathMode === "add") nextBounds = unionBounds(base.bounds, operand.bounds);
    if (pathMode === "intersect") nextBounds = intersectBounds(base.bounds, operand.bounds);
    if (pathMode === "subtract") nextBounds = subtractBounds(base.bounds, operand.bounds);

    if (!nextBounds) {
      alert(pathMode === "intersect" ? "Paths do not overlap for intersect." : "Subtract removed the entire base path.");
      return;
    }

    const nextId = crypto.randomUUID();
    const nextPath: PathItem = {
      id: nextId,
      name: `${pathMode}(${base.name}, ${operand.name})`,
      visible: true,
      kind: "shape",
      closed: true,
      bounds: nextBounds,
      nodes: buildBezierRectNodes(nextBounds)
    };

    setPaths((prev) => [nextPath, ...prev]);
    setActivePathId(nextId);
  };

  const handleCreatePath = (kind: PathItem["kind"]) => {
    if (collabRole === "viewer") return;
    const bounds = buildPathBounds();
    const id = crypto.randomUUID();
    const next: PathItem = {
      id,
      name: `${kind === "work" ? "Work" : kind === "pen" ? "Pen" : kind === "curvature" ? "Curvature" : kind} Path ${paths.length + 1}`,
      visible: true,
      kind
    };
    if (kind === "pen") {
      next.bounds = bounds;
      next.closed = true;
      next.nodes = buildBezierRectNodes(bounds);
    } else if (kind === "curvature") {
      next.bounds = bounds;
      next.closed = false;
      next.nodes = buildCurvatureNodes(bounds);
    } else if (kind === "work" && selection) {
      next.bounds = bounds;
      next.closed = true;
      next.nodes = buildBezierRectNodes(bounds);
    }
    setPaths((prev) => [next, ...prev]);
    setActivePathId(id);
  };

  const handleCreatePathFromSelection = () => {
    if (!selection) {
      alert("Create a selection first.");
      return;
    }
    const next: PathItem = {
      id: crypto.randomUUID(),
      name: `Selection Path ${paths.length + 1}`,
      visible: true,
      kind: "selection",
      closed: true,
      bounds: {
        x: selection.x,
        y: selection.y,
        width: selection.width,
        height: selection.height
      },
      nodes: buildBezierRectNodes({
        x: selection.x,
        y: selection.y,
        width: selection.width,
        height: selection.height
      })
    };
    setPaths((prev) => [next, ...prev]);
    setActivePathId(next.id);
  };

  const handleLoadPathAsSelection = (pathId: string) => {
    const target = paths.find((p) => p.id === pathId);
    if (!target?.bounds || !canvasRef.current) return;
    canvasRef.current.setSelectionRect(target.bounds);
    setActivePathId(pathId);
  };

  const buildAdjustmentFilters = (
    preset: 'brightness-contrast' | 'cinematic' | 'black-white' | 'vibrance-pop' | 'teal-orange',
    strengthPercent: number
  ): Record<string, number> => {
    const t = Math.max(0, Math.min(1, strengthPercent / 100));
    const next: Record<string, number> = {};
    if (preset === 'black-white') {
      next.grayscale = 1;
      next.contrast = 0.12 + t * 0.26;
      next.levels = 0.04 + t * 0.22;
      next.brightness = -0.05 + t * 0.08;
      return next;
    }
    if (preset === 'cinematic') {
      next.contrast = 0.1 + t * 0.22;
      next.photoFilter = 0.08 + t * 0.28;
      next.shadows = 0.04 + t * 0.16;
      next.highlights = -0.04 - t * 0.14;
      next.saturation = -0.03 + t * 0.08;
      next.lutPreset = 3;
      return next;
    }
    if (preset === 'vibrance-pop') {
      next.vibrance = 0.14 + t * 0.34;
      next.saturation = 0.05 + t * 0.18;
      next.contrast = 0.04 + t * 0.12;
      next.highlights = -0.03 - t * 0.08;
      return next;
    }
    if (preset === 'teal-orange') {
      next.hue = 0.02 + t * 0.09;
      next.redBalance = 0.04 + t * 0.2;
      next.blueBalance = 0.08 + t * 0.24;
      next.selectiveColor = 0.06 + t * 0.22;
      next.gradientMap = 0.04 + t * 0.18;
      return next;
    }
    next.brightness = -0.04 + t * 0.18;
    next.contrast = 0.06 + t * 0.22;
    next.levels = 0.02 + t * 0.16;
    return next;
  };

  const applyAdjustmentPresetToLayer = (
    layerId: string,
    preset: 'brightness-contrast' | 'cinematic' | 'black-white' | 'vibrance-pop' | 'teal-orange',
    strengthPercent: number
  ) => {
    const filters = buildAdjustmentFilters(preset, strengthPercent);
    updateLayer(layerId, {
      type: 'adjustment',
      filters
    });
  };

  const handleCreateAdjustmentLayer = async (
    preset: 'brightness-contrast' | 'cinematic' | 'black-white' | 'vibrance-pop' | 'teal-orange' = adjustmentLayerPreset,
    source: 'merged' | 'active' = adjustmentLayerSource,
    strengthPercent: number = adjustmentLayerStrength
  ) => {
    if (!canvasRef.current || collabRole === 'viewer') return;
    const activeLayer = activeLayerId ? layers.find((layer) => layer.id === activeLayerId) : null;
    const mergedSnapshot = canvasRef.current.getCanvasSnapshot();
    const sourceSnapshot = source === 'active' ? (activeLayer?.thumbnail || mergedSnapshot) : mergedSnapshot;
    if (!sourceSnapshot) return;
    const stamp = Date.now().toString().slice(-5);
    const name = `Adjustment ${preset} ${stamp}`;
    canvasRef.current.addImageLayer(
      sourceSnapshot,
      name,
      { adjustment: true, preset, source, strength: strengthPercent },
      { addToHistory: true, layerType: 'adjustment', smartObject: true }
    );

    queueMicrotask(() => {
      const state = useLayerStore.getState();
      const createdId = state.activeLayerId;
      if (!createdId) return;
      const created = state.layers.find((layer) => layer.id === createdId);
      if (!created || created.type !== 'adjustment') return;
      applyAdjustmentPresetToLayer(createdId, preset, strengthPercent);
    });
  };

  const handleApplyAdjustmentPresetToActive = () => {
    if (!activeLayerId) return;
    const active = layers.find((layer) => layer.id === activeLayerId);
    if (!active || active.type !== 'adjustment') {
      alert("Select an adjustment layer first.");
      return;
    }
    applyAdjustmentPresetToLayer(activeLayerId, adjustmentLayerPreset, adjustmentLayerStrength);
  };

  const applySmartFilterRecipeToLayer = (
    layer: (typeof layers)[number],
    preset: 'brightness-contrast' | 'cinematic' | 'black-white' | 'vibrance-pop' | 'teal-orange',
    strengthPercent: number
  ) => {
    const strength = Math.max(0, Math.min(100, Math.round(strengthPercent)));
    const filters = buildAdjustmentFilters(preset, strength);
    updateLayer(layer.id, {
      type: 'smart',
      smartObject: true,
      filters,
      aiData: {
        ...(layer.aiData as any),
        smartFilters: {
          preset,
          strength,
          filters
        }
      } as any
    });
  };

  const handleApplySmartFiltersToActive = () => {
    if (!activeLayerId) return;
    const active = layers.find((layer) => layer.id === activeLayerId);
    if (!active) return;
    applySmartFilterRecipeToLayer(active, smartFilterPreset, smartFilterStrength);
  };

  const handleReapplySavedSmartFilters = () => {
    if (!activeLayerId) return;
    const active = layers.find((layer) => layer.id === activeLayerId);
    if (!active) return;
    const saved = (active.aiData as any)?.smartFilters as {
      preset?: 'brightness-contrast' | 'cinematic' | 'black-white' | 'vibrance-pop' | 'teal-orange';
      strength?: number;
    } | undefined;
    if (!saved || !saved.preset || typeof saved.strength !== "number") {
      alert("No saved Smart Filter recipe on this layer.");
      return;
    }
    applySmartFilterRecipeToLayer(active, saved.preset, saved.strength);
  };

  const handleConvertToSmartObject = () => {
    if (!activeLayerId) return;
    updateLayer(activeLayerId, { smartObject: true, type: 'smart' });
  };

  const handleToggleClippingMask = () => {
    if (!activeLayerId) return;
    const current = layers.find((l) => l.id === activeLayerId);
    if (!current) return;
    updateLayer(activeLayerId, { clippingMask: !current.clippingMask });
  };

  const handleLayerStylePreset = (preset: 'soft-shadow' | 'outline' | 'glow' | 'bevel') => {
    if (!activeLayerId) return;
    if (preset === 'soft-shadow') updateLayer(activeLayerId, { layerStyle: { dropShadow: 0.55, stroke: 0, glow: 0, bevel: 0 } });
    if (preset === 'outline') updateLayer(activeLayerId, { layerStyle: { dropShadow: 0, stroke: 0.45, glow: 0, bevel: 0 } });
    if (preset === 'glow') updateLayer(activeLayerId, { layerStyle: { dropShadow: 0, stroke: 0, glow: 0.55, bevel: 0 } });
    if (preset === 'bevel') updateLayer(activeLayerId, { layerStyle: { dropShadow: 0, stroke: 0.2, glow: 0, bevel: 0.55 } });
  };

  const handleReplaceActiveContents = async () => {
    const url = prompt("Enter replacement image URL")?.trim();
    if (!url || !canvasRef.current) return;
    if (!/^https?:\/\//i.test(url) && !url.startsWith("data:image/")) {
      alert("Use an http(s) URL or data URL.");
      return;
    }
    await canvasRef.current.replaceActiveLayerContents(url, "Replaced Contents");
  };

  const handleFreeTransform = () => {
    canvasRef.current?.transformActiveLayer({ scaleX: 1.08, scaleY: 1.08, angle: 8 });
  };

  const handlePuppetWarp = () => {
    canvasRef.current?.transformActiveLayer({ skewX: 8, skewY: -4 });
  };

  const handleAlignActive = (mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    canvasRef.current?.alignActiveLayer(mode);
  };

  const handleCameraRawFilter = () => {
    if (!activeLayerId) return;
    const toNorm = (value: number, span = 100) => Math.max(-1, Math.min(1, value / span));
    const strength = Math.max(0, Math.min(1, cameraRawStrength));

    const exposure = toNorm(cameraRawExposure, 80) * 0.7 * strength;
    const contrast = (toNorm(cameraRawContrast) * 0.45 + strength * 0.12);
    const highlights = toNorm(cameraRawHighlights) * 0.5;
    const shadows = toNorm(cameraRawShadows) * 0.5;
    const vibrance = toNorm(cameraRawVibrance) * 0.55;
    const saturation = toNorm(cameraRawSaturation) * 0.4;
    const levels = toNorm(cameraRawWhites - cameraRawBlacks, 120) * 0.35 + toNorm(cameraRawDehaze) * 0.22;
    const photoFilter = toNorm(cameraRawTemperature) * 0.35;
    const hue = toNorm(cameraRawTint) * 0.08;
    const textureMix = (toNorm(cameraRawTexture) * 0.22) + (toNorm(cameraRawClarity) * 0.24);

    setLayerFilter(activeLayerId, 'exposure', exposure);
    setLayerFilter(activeLayerId, 'contrast', contrast);
    setLayerFilter(activeLayerId, 'highlights', highlights);
    setLayerFilter(activeLayerId, 'shadows', shadows);
    setLayerFilter(activeLayerId, 'vibrance', vibrance);
    setLayerFilter(activeLayerId, 'saturation', saturation);
    setLayerFilter(activeLayerId, 'levels', levels);
    setLayerFilter(activeLayerId, 'photoFilter', photoFilter);
    setLayerFilter(activeLayerId, 'hue', hue);
    setLayerFilter(activeLayerId, 'sharpen', textureMix);
    setLayerFilter(activeLayerId, 'highPass', toNorm(cameraRawClarity) * 0.2);

    if (cameraRawProfile === "portrait") {
      setLayerFilter(activeLayerId, 'contrast', contrast * 0.9);
      setLayerFilter(activeLayerId, 'saturation', saturation * 0.75);
      setLayerFilter(activeLayerId, 'photoFilter', photoFilter + 0.06);
    } else if (cameraRawProfile === "landscape") {
      setLayerFilter(activeLayerId, 'vibrance', vibrance + 0.18);
      setLayerFilter(activeLayerId, 'dehaze', toNorm(cameraRawDehaze) * 0.35 + 0.08);
    } else if (cameraRawProfile === "vivid") {
      setLayerFilter(activeLayerId, 'vibrance', vibrance + 0.24);
      setLayerFilter(activeLayerId, 'contrast', contrast + 0.1);
      setLayerFilter(activeLayerId, 'lutPreset', 2);
    } else if (cameraRawProfile === "bw") {
      setLayerFilter(activeLayerId, 'grayscale', 1);
      setLayerFilter(activeLayerId, 'contrast', contrast + 0.08);
      setLayerFilter(activeLayerId, 'vibrance', 0);
      setLayerFilter(activeLayerId, 'saturation', -0.4);
    } else {
      setLayerFilter(activeLayerId, 'grayscale', 0);
    }

    const active = layers.find((layer) => layer.id === activeLayerId);
    if (active) {
      updateLayer(activeLayerId, {
        aiData: {
          ...(active.aiData as any),
          cameraRaw: {
            strength: cameraRawStrength,
            profile: cameraRawProfile,
            temperature: cameraRawTemperature,
            tint: cameraRawTint,
            exposure: cameraRawExposure,
            contrast: cameraRawContrast,
            highlights: cameraRawHighlights,
            shadows: cameraRawShadows,
            whites: cameraRawWhites,
            blacks: cameraRawBlacks,
            texture: cameraRawTexture,
            clarity: cameraRawClarity,
            dehaze: cameraRawDehaze,
            vibrance: cameraRawVibrance,
            saturation: cameraRawSaturation
          }
        } as any
      });
    }
  };

  const applyNeuralPluginToLayer = (
    layerId: string,
    model: "skin-smooth" | "portrait-light" | "colorize" | "style-transfer" | "depth-blur",
    strength: number,
    detail: number,
    preserveColor: boolean,
    autoMask: boolean
  ) => {
    const s = Math.max(0, Math.min(1, strength / 100));
    const d = Math.max(0, Math.min(1, detail / 100));
    if (model === "skin-smooth") {
      setLayerFilter(layerId, 'blur', 0.04 + s * 0.14);
      setLayerFilter(layerId, 'texture', -0.04 - s * 0.12);
      setLayerFilter(layerId, 'shadows', 0.06 + d * 0.2);
      if (autoMask) setLayerFilter(layerId, 'surfaceBlur', 0.06 + s * 0.12);
    } else if (model === "portrait-light") {
      setLayerFilter(layerId, 'exposure', 0.04 + s * 0.22);
      setLayerFilter(layerId, 'highlights', -0.06 - s * 0.2);
      setLayerFilter(layerId, 'shadows', 0.08 + d * 0.22);
      setLayerFilter(layerId, 'photoFilter', preserveColor ? 0.04 : 0.1);
    } else if (model === "colorize") {
      setLayerFilter(layerId, 'grayscale', 0);
      setLayerFilter(layerId, 'gradientMap', 0.2 + s * 0.5);
      setLayerFilter(layerId, 'vibrance', 0.08 + d * 0.5);
      setLayerFilter(layerId, 'saturation', preserveColor ? 0.06 + s * 0.2 : 0.14 + s * 0.3);
    } else if (model === "style-transfer") {
      setLayerFilter(layerId, 'lutPreset', 2);
      setLayerFilter(layerId, 'contrast', 0.08 + s * 0.26);
      setLayerFilter(layerId, 'highPass', 0.04 + d * 0.22);
      setLayerFilter(layerId, 'posterize', autoMask ? 0.04 + s * 0.1 : 0);
    } else {
      setLayerFilter(layerId, 'lensBlur', 0.08 + s * 0.3);
      setLayerFilter(layerId, 'sharpen', 0.04 + d * 0.2);
      setLayerFilter(layerId, 'vignette', 0.06 + s * 0.2);
      if (autoMask) setLayerFilter(layerId, 'depthMap', 0.14 + s * 0.24);
    }
  };

  const handleApplyNeuralPlugin = () => {
    if (!activeLayerId) return;
    applyNeuralPluginToLayer(
      activeLayerId,
      neuralPluginModel,
      neuralPluginStrength,
      neuralPluginDetail,
      neuralPluginPreserveColor,
      neuralPluginAutoMask
    );
    const active = layers.find((layer) => layer.id === activeLayerId);
    if (!active) return;
    updateLayer(activeLayerId, {
      aiData: {
        ...(active.aiData as any),
        neuralPlugin: {
          model: neuralPluginModel,
          strength: neuralPluginStrength,
          detail: neuralPluginDetail,
          preserveColor: neuralPluginPreserveColor,
          autoMask: neuralPluginAutoMask
        }
      } as any
    });
  };

  const handleNeuralFilterPreset = (preset: 'skin' | 'colorize' | 'style') => {
    if (!activeLayerId) return;
    if (preset === 'skin') {
      setNeuralPluginModel("skin-smooth");
      setNeuralPluginStrength(58);
      setNeuralPluginDetail(56);
      setNeuralPluginPreserveColor(true);
      setNeuralPluginAutoMask(true);
      applyNeuralPluginToLayer(activeLayerId, "skin-smooth", 58, 56, true, true);
    }
    if (preset === 'colorize') {
      setNeuralPluginModel("colorize");
      setNeuralPluginStrength(66);
      setNeuralPluginDetail(62);
      setNeuralPluginPreserveColor(false);
      setNeuralPluginAutoMask(false);
      applyNeuralPluginToLayer(activeLayerId, "colorize", 66, 62, false, false);
    }
    if (preset === 'style') {
      setNeuralPluginModel("style-transfer");
      setNeuralPluginStrength(62);
      setNeuralPluginDetail(54);
      setNeuralPluginPreserveColor(true);
      setNeuralPluginAutoMask(true);
      applyNeuralPluginToLayer(activeLayerId, "style-transfer", 62, 54, true, true);
    }
  };

  const renderSkyReplacementLayer = (img: HTMLImageElement, sourceLabel: "merged" | "active") => {
    const out = document.createElement("canvas");
    out.width = img.naturalWidth;
    out.height = img.naturalHeight;
    const ctx = out.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);

    const horizonY = Math.max(24, Math.min(out.height - 12, Math.round((Math.max(20, Math.min(80, skyReplacementHorizon)) / 100) * out.height)));
    const intensity = Math.max(0, Math.min(1, skyReplacementIntensity / 100));
    const cloudStrength = Math.max(0, Math.min(1, skyReplacementClouds / 100));

    const sky = document.createElement("canvas");
    sky.width = out.width;
    sky.height = out.height;
    const skyCtx = sky.getContext("2d");
    if (!skyCtx) return null;

    const gradient = skyCtx.createLinearGradient(0, 0, 0, horizonY);
    if (skyReplacementStyle === "clear") {
      gradient.addColorStop(0, "#3b82f6");
      gradient.addColorStop(1, "#93c5fd");
    } else if (skyReplacementStyle === "storm") {
      gradient.addColorStop(0, "#111827");
      gradient.addColorStop(1, "#475569");
    } else if (skyReplacementStyle === "twilight") {
      gradient.addColorStop(0, "#312e81");
      gradient.addColorStop(1, "#7c3aed");
    } else {
      gradient.addColorStop(0, "#f97316");
      gradient.addColorStop(0.55, "#ec4899");
      gradient.addColorStop(1, "#818cf8");
    }
    skyCtx.fillStyle = gradient;
    skyCtx.fillRect(0, 0, out.width, horizonY);

    const cloudCount = Math.round(6 + cloudStrength * 18);
    for (let i = 0; i < cloudCount; i += 1) {
      const x = (i / Math.max(1, cloudCount - 1)) * out.width + (Math.random() * 60 - 30);
      const y = Math.random() * Math.max(30, horizonY * 0.8);
      const rx = 38 + Math.random() * 130;
      const ry = 12 + Math.random() * 44;
      skyCtx.fillStyle = `rgba(255,255,255,${(0.04 + cloudStrength * 0.24 * Math.random()).toFixed(3)})`;
      skyCtx.beginPath();
      skyCtx.ellipse(x, y, rx, ry, Math.random() * 0.22 - 0.11, 0, Math.PI * 2);
      skyCtx.fill();
    }

    const horizonFade = skyCtx.createLinearGradient(0, Math.max(0, horizonY - 80), 0, horizonY + 52);
    horizonFade.addColorStop(0, "rgba(255,255,255,0)");
    horizonFade.addColorStop(1, "rgba(255,255,255,0.34)");
    skyCtx.fillStyle = horizonFade;
    skyCtx.fillRect(0, Math.max(0, horizonY - 80), out.width, 132);

    const mask = ctx.createLinearGradient(0, 0, 0, horizonY + 50);
    mask.addColorStop(0, `rgba(255,255,255,${(0.5 + intensity * 0.5).toFixed(3)})`);
    mask.addColorStop(0.72, `rgba(255,255,255,${(0.25 + intensity * 0.5).toFixed(3)})`);
    mask.addColorStop(1, "rgba(255,255,255,0)");
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(sky, 0, 0);
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = mask;
    ctx.fillRect(0, 0, out.width, horizonY + 50);
    ctx.restore();

    const overlayAlpha = 0.08 + intensity * 0.16;
    ctx.fillStyle = `rgba(59,130,246,${overlayAlpha.toFixed(3)})`;
    ctx.fillRect(0, 0, out.width, Math.round(horizonY * 0.3));

    return {
      layer: out,
      payload: {
        style: skyReplacementStyle,
        intensity: skyReplacementIntensity,
        horizon: skyReplacementHorizon,
        clouds: skyReplacementClouds,
        source: sourceLabel
      }
    };
  };

  const handleSkyReplacement = async () => {
    if (!canvasRef.current || collabRole === 'viewer') return;
    const active = activeLayerId ? layers.find((layer) => layer.id === activeLayerId) : null;
    const merged = canvasRef.current.getCanvasSnapshot();
    const sourceMode: "merged" | "active" = active?.thumbnail ? "active" : "merged";
    const snap = sourceMode === "active" ? (active?.thumbnail || merged) : merged;
    if (!snap) return;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Unable to load canvas snapshot'));
      i.src = snap;
    });
    const rendered = renderSkyReplacementLayer(img, sourceMode);
    if (!rendered) return;
    canvasRef.current.addImageLayer(
      rendered.layer.toDataURL("image/png"),
      "Sky Replacement",
      { aiSkyReplacement: { ...rendered.payload, sourceSnapshot: snap } },
      { addToHistory: true, layerType: "image" }
    );
    canvasRef.current.applySemanticSelection('sky');
    setShowPromptBar(true);
    setAiPromptDraft("Sky replacement generated. Refine lighting, haze, and edge blending.");
  };

  const handleUpdateActiveSkyReplacement = async () => {
    if (!canvasRef.current || collabRole === "viewer" || !activeLayerId) return;
    const active = layers.find((layer) => layer.id === activeLayerId);
    if (!active) return;
    const existing = (active.aiData as any)?.aiSkyReplacement as { sourceSnapshot?: string; source?: "merged" | "active" } | undefined;
    if (!existing) {
      alert("Select a sky replacement layer first.");
      return;
    }
    const fallback = canvasRef.current.getCanvasSnapshot();
    const sourceSnapshot = existing.sourceSnapshot || active.thumbnail || fallback;
    if (!sourceSnapshot) return;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Unable to load sky source"));
      i.src = sourceSnapshot;
    });
    const sourceLabel = existing.source || "merged";
    const rendered = renderSkyReplacementLayer(img, sourceLabel);
    if (!rendered) return;
    await canvasRef.current.replaceActiveLayerContents(rendered.layer.toDataURL("image/png"), active.name);
    updateLayer(activeLayerId, {
      aiData: {
        ...(active.aiData as any),
        aiSkyReplacement: {
          ...rendered.payload,
          sourceSnapshot
        }
      } as any
    });
  };

  const renderRemoveBackgroundLayer = (img: HTMLImageElement, sourceLabel: "merged" | "active") => {
    const out = document.createElement("canvas");
    out.width = img.naturalWidth;
    out.height = img.naturalHeight;
    const ctx = out.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);

    const keepMask = document.createElement("canvas");
    keepMask.width = out.width;
    keepMask.height = out.height;
    const mctx = keepMask.getContext("2d");
    if (!mctx) return null;

    const scale = Math.max(0.28, Math.min(0.86, removeBgSubjectScale / 100));
    const rx = out.width * (0.22 + scale * 0.24);
    const ry = out.height * (0.32 + scale * 0.18);
    const featherPx = Math.max(8, Math.min(Math.round(Math.min(out.width, out.height) * 0.4), Math.round((removeBgFeather / 100) * Math.min(out.width, out.height) * 0.55)));
    const cx = out.width / 2;
    const cy = out.height * 0.54;

    mctx.fillStyle = "black";
    mctx.fillRect(0, 0, out.width, out.height);
    const grad = mctx.createRadialGradient(cx, cy, Math.max(8, Math.min(rx, ry) - featherPx), cx, cy, Math.max(rx, ry) + featherPx);
    grad.addColorStop(0, "white");
    grad.addColorStop(0.72, "rgba(255,255,255,0.94)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    mctx.fillStyle = grad;
    mctx.beginPath();
    mctx.ellipse(cx, cy, rx + featherPx, ry + featherPx, 0, 0, Math.PI * 2);
    mctx.fill();

    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(keepMask, 0, 0);
    ctx.globalCompositeOperation = "source-over";

    const decontam = Math.max(0, Math.min(1, removeBgDecontaminate / 100));
    if (decontam > 0) {
      const edgeOverlay = ctx.createLinearGradient(0, 0, 0, out.height);
      edgeOverlay.addColorStop(0, `rgba(255,255,255,${(decontam * 0.14).toFixed(3)})`);
      edgeOverlay.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = edgeOverlay;
      ctx.fillRect(0, 0, out.width, out.height);
    }

    return {
      layer: out,
      payload: {
        feather: removeBgFeather,
        subjectScale: removeBgSubjectScale,
        decontaminate: removeBgDecontaminate,
        source: sourceLabel
      }
    };
  };

  const handleRemoveBackground = async () => {
    if (!canvasRef.current || collabRole === "viewer") return;
    const active = activeLayerId ? layers.find((layer) => layer.id === activeLayerId) : null;
    const merged = canvasRef.current.getCanvasSnapshot();
    const sourceMode: "merged" | "active" =
      removeBgSource === "active" && active?.thumbnail ? "active" : "merged";
    const snap = sourceMode === "active" ? (active?.thumbnail || merged) : merged;
    if (!snap) return;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Unable to load source snapshot"));
      i.src = snap;
    });
    const rendered = renderRemoveBackgroundLayer(img, sourceMode);
    if (!rendered) return;
    canvasRef.current.addImageLayer(
      rendered.layer.toDataURL("image/png"),
      "Background Removed",
      { aiRemoveBackground: { ...rendered.payload, sourceSnapshot: snap } },
      { addToHistory: true, layerType: "image" }
    );
  };

  const handleUpdateActiveRemoveBackground = async () => {
    if (!canvasRef.current || collabRole === "viewer" || !activeLayerId) return;
    const active = layers.find((layer) => layer.id === activeLayerId);
    if (!active) return;
    const existing = (active.aiData as any)?.aiRemoveBackground as { sourceSnapshot?: string; source?: "merged" | "active" } | undefined;
    if (!existing) {
      alert("Select a background-removed layer first.");
      return;
    }
    const fallback = canvasRef.current.getCanvasSnapshot();
    const sourceSnapshot = existing.sourceSnapshot || active.thumbnail || fallback;
    if (!sourceSnapshot) return;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Unable to load remove-background source"));
      i.src = sourceSnapshot;
    });
    const sourceLabel = existing.source || "merged";
    const rendered = renderRemoveBackgroundLayer(img, sourceLabel);
    if (!rendered) return;
    await canvasRef.current.replaceActiveLayerContents(rendered.layer.toDataURL("image/png"), active.name);
    updateLayer(activeLayerId, {
      aiData: {
        ...(active.aiData as any),
        aiRemoveBackground: {
          ...rendered.payload,
          sourceSnapshot
        }
      } as any
    });
  };

  const resolveGenerativeExpandPadding = (width: number, height: number) => {
    const base = Math.max(24, Math.round(Math.min(width, height) * (Math.max(2, Math.min(60, generativeExpandPercent)) / 100)));
    if (generativeExpandDirection === "all") return { left: base, right: base, top: base, bottom: base };
    if (generativeExpandDirection === "horizontal") return { left: base, right: base, top: 0, bottom: 0 };
    if (generativeExpandDirection === "vertical") return { left: 0, right: 0, top: base, bottom: base };
    if (generativeExpandDirection === "left") return { left: base, right: 0, top: 0, bottom: 0 };
    if (generativeExpandDirection === "right") return { left: 0, right: base, top: 0, bottom: 0 };
    if (generativeExpandDirection === "top") return { left: 0, right: 0, top: base, bottom: 0 };
    return { left: 0, right: 0, top: 0, bottom: base };
  };

  const renderGenerativeExpandCanvas = (img: HTMLImageElement, sourceLabel: "merged" | "active") => {
    const pad = resolveGenerativeExpandPadding(img.naturalWidth, img.naturalHeight);
    const out = document.createElement("canvas");
    out.width = img.naturalWidth + pad.left + pad.right;
    out.height = img.naturalHeight + pad.top + pad.bottom;
    const ctx = out.getContext("2d");
    if (!ctx) return null;

    if (generativeExpandFill === "gradient") {
      const bg = ctx.createLinearGradient(0, 0, out.width, out.height);
      bg.addColorStop(0, "#d4d4d8");
      bg.addColorStop(1, "#e4e4e7");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, out.width, out.height);
    } else if (generativeExpandFill === "blur") {
      ctx.filter = "blur(28px) saturate(1.06)";
      ctx.drawImage(img, -Math.round(out.width * 0.07), -Math.round(out.height * 0.07), Math.round(out.width * 1.14), Math.round(out.height * 1.14));
      ctx.filter = "none";
      ctx.fillStyle = "rgba(15,23,42,0.10)";
      ctx.fillRect(0, 0, out.width, out.height);
    } else {
      ctx.fillStyle = "#f4f4f5";
      ctx.fillRect(0, 0, out.width, out.height);
      if (pad.left > 0) ctx.drawImage(img, 0, 0, 1, img.naturalHeight, 0, pad.top, pad.left, img.naturalHeight);
      if (pad.right > 0) ctx.drawImage(img, img.naturalWidth - 1, 0, 1, img.naturalHeight, pad.left + img.naturalWidth, pad.top, pad.right, img.naturalHeight);
      if (pad.top > 0) ctx.drawImage(img, 0, 0, img.naturalWidth, 1, pad.left, 0, img.naturalWidth, pad.top);
      if (pad.bottom > 0) ctx.drawImage(img, 0, img.naturalHeight - 1, img.naturalWidth, 1, pad.left, pad.top + img.naturalHeight, img.naturalWidth, pad.bottom);
    }

    ctx.drawImage(img, pad.left, pad.top);
    const strokeAlpha = sourceLabel === "active" ? 0.18 : 0.12;
    ctx.strokeStyle = `rgba(30,41,59,${strokeAlpha})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(pad.left + 0.5, pad.top + 0.5, img.naturalWidth - 1, img.naturalHeight - 1);
    return {
      layer: out,
      payload: {
        percent: generativeExpandPercent,
        direction: generativeExpandDirection,
        fill: generativeExpandFill,
        source: sourceLabel,
        pad
      }
    };
  };

  const handleGenerativeExpand = async () => {
    if (!canvasRef.current || collabRole === 'viewer') return;
    const active = activeLayerId ? layers.find((layer) => layer.id === activeLayerId) : null;
    const merged = canvasRef.current.getCanvasSnapshot();
    const snap = generativeExpandSource === "active" ? (active?.thumbnail || merged) : merged;
    if (!snap) return;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Unable to load canvas snapshot'));
      i.src = snap;
    });
    const rendered = renderGenerativeExpandCanvas(img, generativeExpandSource);
    if (!rendered) return;
    canvasRef.current.addImageLayer(
      rendered.layer.toDataURL('image/png'),
      'Generative Expand',
      { aiExpand: { ...rendered.payload, sourceSnapshot: snap } },
      { addToHistory: true, layerType: 'image' }
    );
  };

  const handleUpdateActiveGenerativeExpand = async () => {
    if (!canvasRef.current || collabRole === "viewer" || !activeLayerId) return;
    const active = layers.find((layer) => layer.id === activeLayerId);
    if (!active) return;
    const existing = (active.aiData as any)?.aiExpand as { sourceSnapshot?: string; source?: "merged" | "active" } | undefined;
    if (!existing) {
      alert("Select a Generative Expand layer first.");
      return;
    }
    const fallback = canvasRef.current.getCanvasSnapshot();
    const sourceSnapshot = existing.sourceSnapshot || active.thumbnail || fallback;
    if (!sourceSnapshot) return;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Unable to load expand source"));
      i.src = sourceSnapshot;
    });
    const sourceLabel = generativeExpandSource || existing.source || "merged";
    const rendered = renderGenerativeExpandCanvas(img, sourceLabel);
    if (!rendered) return;
    await canvasRef.current.replaceActiveLayerContents(rendered.layer.toDataURL("image/png"), active.name);
    updateLayer(activeLayerId, {
      aiData: {
        ...(active.aiData as any),
        aiExpand: {
          ...rendered.payload,
          sourceSnapshot
        }
      } as any
    });
  };

  const renderSuperResolutionCanvas = (img: HTMLImageElement, sourceLabel: "merged" | "active") => {
    const scale = superResScale;
    const out = document.createElement('canvas');
    out.width = img.naturalWidth * scale;
    out.height = img.naturalHeight * scale;
    const ctx = out.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, out.width, out.height);

    const denoise = Math.max(0, Math.min(100, superResDenoise)) / 100;
    if (denoise > 0) {
      const soft = document.createElement("canvas");
      soft.width = out.width;
      soft.height = out.height;
      const sctx = soft.getContext("2d");
      if (sctx) {
        sctx.filter = `blur(${(0.6 + denoise * 2.2).toFixed(2)}px)`;
        sctx.drawImage(out, 0, 0);
        sctx.filter = "none";
        ctx.globalAlpha = denoise * 0.42;
        ctx.drawImage(soft, 0, 0);
        ctx.globalAlpha = 1;
      }
    }

    const sharpen = Math.max(0, Math.min(100, superResSharpen)) / 100;
    if (sharpen > 0) {
      const blur = document.createElement("canvas");
      blur.width = out.width;
      blur.height = out.height;
      const bctx = blur.getContext("2d");
      if (bctx) {
        bctx.filter = `blur(${(0.4 + sharpen * 1.8).toFixed(2)}px)`;
        bctx.drawImage(out, 0, 0);
        bctx.filter = "none";
        const src = ctx.getImageData(0, 0, out.width, out.height);
        const blr = bctx.getImageData(0, 0, out.width, out.height);
        const s = src.data;
        const b = blr.data;
        const amount = 0.85 + sharpen * 1.4;
        for (let i = 0; i < s.length; i += 4) {
          s[i] = clamp255(s[i] + (s[i] - b[i]) * amount);
          s[i + 1] = clamp255(s[i + 1] + (s[i + 1] - b[i + 1]) * amount);
          s[i + 2] = clamp255(s[i + 2] + (s[i + 2] - b[i + 2]) * amount);
        }
        ctx.putImageData(src, 0, 0);
      }
    }

    return {
      layer: out,
      payload: {
        scale,
        sharpen: superResSharpen,
        denoise: superResDenoise,
        source: sourceLabel
      }
    };
  };

  const handleSuperResolution = async () => {
    if (!canvasRef.current || collabRole === 'viewer') return;
    const active = activeLayerId ? layers.find((layer) => layer.id === activeLayerId) : null;
    const merged = canvasRef.current.getCanvasSnapshot();
    const sourceMode: "merged" | "active" = superResSource === "active" && active?.thumbnail ? "active" : "merged";
    const snap = sourceMode === "active" ? (active?.thumbnail || merged) : merged;
    if (!snap) return;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Unable to load canvas snapshot'));
      i.src = snap;
    });
    const rendered = renderSuperResolutionCanvas(img, sourceMode);
    if (!rendered) return;
    canvasRef.current.addImageLayer(
      rendered.layer.toDataURL('image/png'),
      `Super Resolution ${superResScale}x`,
      { aiUpscale: { ...rendered.payload, sourceSnapshot: snap } },
      { addToHistory: true, layerType: 'image', smartObject: true }
    );
  };

  const handleUpdateActiveSuperResolution = async () => {
    if (!canvasRef.current || collabRole === "viewer" || !activeLayerId) return;
    const active = layers.find((layer) => layer.id === activeLayerId);
    if (!active) return;
    const existing = (active.aiData as any)?.aiUpscale as { sourceSnapshot?: string; source?: "merged" | "active" } | undefined;
    if (!existing) {
      alert("Select a super-resolution layer first.");
      return;
    }
    const fallback = canvasRef.current.getCanvasSnapshot();
    const sourceSnapshot = existing.sourceSnapshot || active.thumbnail || fallback;
    if (!sourceSnapshot) return;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Unable to load super-resolution source"));
      i.src = sourceSnapshot;
    });
    const sourceLabel = existing.source || "merged";
    const rendered = renderSuperResolutionCanvas(img, sourceLabel);
    if (!rendered) return;
    await canvasRef.current.replaceActiveLayerContents(rendered.layer.toDataURL("image/png"), active.name);
    updateLayer(activeLayerId, {
      aiData: {
        ...(active.aiData as any),
        aiUpscale: {
          ...rendered.payload,
          sourceSnapshot
        }
      } as any
    });
  };

  const buildCurrentVideoLayerPayload = (width: number, height: number) => {
    const durationFrames = Math.max(24, Math.round(timelineDurationFrames));
    const frame = Math.max(0, Math.min(Math.round(timelineFrame), durationFrames - 1));
    const inFrame = Math.max(0, Math.min(Math.round(videoEditInFrame), durationFrames - 2));
    const outFrame = Math.max(inFrame + 1, Math.min(Math.round(videoEditOutFrame), durationFrames - 1));
    const keyframes = [...new Set(
      timelineKeyframes
        .map((value) => Math.max(0, Math.min(Math.round(value), durationFrames - 1)))
        .filter((value) => Number.isFinite(value))
    )].sort((a, b) => a - b);
    return {
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
      frame,
      fps: Math.max(12, Math.min(60, Math.round(timelineFps))),
      durationFrames,
      keyframes,
      includeAudio: includeTimelineAudio,
      rangeIn: inFrame,
      rangeOut: outFrame,
      speed: Math.max(0.25, Math.min(4, Number(videoEditSpeed) || 1)),
      loop: videoEditLoop,
      transition: videoEditTransition,
      animation: {
        zoomAmplitude: 0.06,
        panXAmplitude: 14,
        panYAmplitude: 8,
        fadeStart: 0.55,
        fadeWindow: 0.35,
        fadeOpacity: 0.16
      }
    };
  };

  const renderVideoLayerCanvas = (payload: ReturnType<typeof buildCurrentVideoLayerPayload>) => {
    const layer = document.createElement("canvas");
    layer.width = payload.width;
    layer.height = payload.height;
    const ctx = layer.getContext("2d");
    if (!ctx) return null;

    const maxFrame = Math.max(1, payload.durationFrames - 1);
    const rangeIn = Math.max(0, Math.min(payload.rangeIn ?? 0, maxFrame - 1));
    const rangeOut = Math.max(rangeIn + 1, Math.min(payload.rangeOut ?? maxFrame, maxFrame));
    const span = Math.max(1, rangeOut - rangeIn + 1);
    const sourceFrame = Math.max(rangeIn, Math.min(payload.frame, rangeOut));
    const sourceLocal = sourceFrame - rangeIn;
    const speed = Math.max(0.25, Math.min(4, Number(payload.speed) || 1));
    const remappedRaw = Math.floor(sourceLocal * speed);
    const remappedLocal = payload.loop
      ? ((remappedRaw % span) + span) % span
      : Math.max(0, Math.min(remappedRaw, span - 1));
    const effectiveFrame = rangeIn + remappedLocal;
    const progress = Math.max(0, Math.min(1, effectiveFrame / maxFrame));
    const dynamicHue = 210 + Math.round(progress * 36);
    const grad = ctx.createLinearGradient(0, 0, payload.width, payload.height);
    grad.addColorStop(0, `hsl(${dynamicHue} 42% 14%)`);
    grad.addColorStop(1, `hsl(${Math.max(0, dynamicHue - 16)} 36% 20%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, payload.width, payload.height);

    const glow = ctx.createRadialGradient(payload.width * 0.72, payload.height * 0.24, payload.width * 0.04, payload.width * 0.72, payload.height * 0.24, payload.width * 0.62);
    glow.addColorStop(0, `hsla(${dynamicHue + 8} 90% 72% / 0.34)`);
    glow.addColorStop(1, "hsla(0 0% 0% / 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, payload.width, payload.height);

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    const cx = payload.width / 2;
    const cy = payload.height / 2;
    const playSize = Math.max(14, Math.round(Math.min(payload.width, payload.height) * 0.11));
    ctx.beginPath();
    ctx.moveTo(cx - playSize * 0.52, cy - playSize);
    ctx.lineTo(cx - playSize * 0.52, cy + playSize);
    ctx.lineTo(cx + playSize * 0.94, cy);
    ctx.closePath();
    ctx.fill();

    const barX = Math.round(payload.width * 0.07);
    const barY = Math.round(payload.height * 0.84);
    const barWidth = Math.round(payload.width * 0.86);
    const barHeight = Math.max(4, Math.round(payload.height * 0.026));
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(barX, barY, barWidth, barHeight);
    const rangeX = barX + Math.round((rangeIn / maxFrame) * barWidth);
    const rangeW = Math.max(2, Math.round(((rangeOut - rangeIn) / maxFrame) * barWidth));
    ctx.fillStyle = "rgba(244,244,245,0.24)";
    ctx.fillRect(rangeX, barY - 2, rangeW, barHeight + 4);
    ctx.fillStyle = "rgba(59,130,246,0.85)";
    ctx.fillRect(barX, barY, Math.max(2, Math.round(barWidth * progress)), barHeight);

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    payload.keyframes.forEach((frame) => {
      const x = barX + Math.round((frame / maxFrame) * barWidth);
      ctx.fillRect(Math.max(barX, x - 1), barY - 3, 2, barHeight + 6);
    });
    ctx.fillStyle = "rgba(248,250,252,0.95)";
    const playX = barX + Math.round((effectiveFrame / maxFrame) * barWidth);
    ctx.fillRect(Math.max(barX, playX - 1), barY - 5, 3, barHeight + 10);

    ctx.font = `600 ${Math.max(10, Math.round(payload.height * 0.05))}px "Segoe UI", "Arial", sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.fillText(`Frame ${effectiveFrame + 1}/${payload.durationFrames} • ${payload.fps}fps`, barX, Math.round(payload.height * 0.08));
    ctx.font = `500 ${Math.max(9, Math.round(payload.height * 0.04))}px "Segoe UI", "Arial", sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.76)";
    ctx.fillText(`In ${rangeIn + 1} • Out ${rangeOut + 1} • ${speed.toFixed(2)}x • ${payload.loop ? "Loop" : "Hold"} • ${payload.transition}`, barX, Math.round(payload.height * 0.15));
    ctx.fillText(payload.includeAudio ? "Audio enabled" : "Audio muted", barX, Math.round(payload.height * 0.21));
    return layer;
  };

  const handleCreateVideoLayer = () => {
    if (!canvasRef.current || collabRole === 'viewer') return;
    const videoLayerPayload = buildCurrentVideoLayerPayload(640, 360);
    const layer = renderVideoLayerCanvas(videoLayerPayload);
    if (!layer) return;
    canvasRef.current.addImageLayer(
      layer.toDataURL("image/png"),
      "Video Layer",
      { timeline: true, videoLayer: videoLayerPayload },
      { addToHistory: true, layerType: "video" }
    );
  };

  const handleUpdateActiveVideoLayer = async () => {
    if (!canvasRef.current || collabRole === "viewer" || !activeLayerId) return;
    const active = layers.find((layer) => layer.id === activeLayerId);
    if (!active || active.type !== "video") {
      alert("Select a video layer first.");
      return;
    }
    const currentPayload = (active.aiData as any)?.videoLayer as { width?: number; height?: number } | undefined;
    const width = Math.max(1, Math.round(currentPayload?.width || selection?.width || canvasDims.width || 640));
    const height = Math.max(1, Math.round(currentPayload?.height || selection?.height || canvasDims.height || 360));
    const nextPayload = buildCurrentVideoLayerPayload(width, height);
    const layer = renderVideoLayerCanvas(nextPayload);
    if (!layer) return;
    await canvasRef.current.replaceActiveLayerContents(layer.toDataURL("image/png"), active.name);
    updateLayer(activeLayerId, {
      type: "video",
      aiData: {
        ...(active.aiData as any),
        timeline: true,
        videoLayer: nextPayload
      } as any
    });
  };

  const buildCurrentLegacy3DLayerPayload = (width: number, height: number) => ({
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
    depth: Math.max(0, Math.min(100, Math.round(legacy3DDepth))),
    tilt: Math.max(-60, Math.min(60, Math.round(legacy3DTilt))),
    wireframe: Math.max(4, Math.min(40, Math.round(legacy3DWireframe))),
    glow: Math.max(0, Math.min(100, Math.round(legacy3DGlow))),
    tint: activeColor,
    object: legacy3DObject,
    material: legacy3DMaterial,
    roughness: Math.max(0, Math.min(100, Math.round(legacy3DRoughness))),
    metalness: Math.max(0, Math.min(100, Math.round(legacy3DMetalness))),
    lightAzimuth: Math.max(-180, Math.min(180, Math.round(legacy3DLightAzimuth))),
    lightElevation: Math.max(0, Math.min(90, Math.round(legacy3DLightElevation))),
    lightIntensity: Math.max(0, Math.min(100, Math.round(legacy3DLightIntensity))),
    uvEnabled: uvPreviewEnabled,
    uvGridDensity: Math.max(4, Math.min(32, Math.round(uvGridDensity))),
    uvSeamStrength: Math.max(0, Math.min(100, Math.round(uvSeamStrength))),
    uvCheckerOpacity: Math.max(0, Math.min(100, Math.round(uvCheckerOpacity))),
    uvDistortion: Math.max(0, Math.min(100, Math.round(uvDistortion)))
  });

  const renderLegacy3DLayerCanvas = (payload: ReturnType<typeof buildCurrentLegacy3DLayerPayload>) => {
    const layer = document.createElement("canvas");
    layer.width = payload.width;
    layer.height = payload.height;
    const ctx = layer.getContext("2d");
    if (!ctx) return null;

    const baseHue = (() => {
      const hex = payload.tint.replace("#", "");
      if (!/^[0-9a-f]{6}$/i.test(hex)) return 220;
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      if (d === 0) return 220;
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return Math.round((h * 60 + 360) % 360);
    })();

    const depthAmount = payload.depth / 100;
    const glowAmount = payload.glow / 100;
    const roughness = (payload.roughness ?? 46) / 100;
    const metalness = (payload.metalness ?? 36) / 100;
    const tiltNorm = (payload.tilt + 60) / 120;
    const lightAzimuth = ((payload.lightAzimuth ?? 32) * Math.PI) / 180;
    const lightElevation = ((payload.lightElevation ?? 38) * Math.PI) / 180;
    const lightIntensity = Math.max(0, Math.min(1, (payload.lightIntensity ?? 68) / 100));
    const lightDirX = Math.cos(lightElevation) * Math.cos(lightAzimuth);
    const lightDirY = Math.sin(lightElevation);
    const materialSatBoost = payload.material === "metal" ? 18 : payload.material === "emissive" ? 22 : 8;
    const materialLightBoost = payload.material === "glass" ? 8 : payload.material === "emissive" ? 14 : 0;
    const grad = ctx.createLinearGradient(0, 0, payload.width, payload.height);
    grad.addColorStop(0, `hsl(${baseHue} ${56 + materialSatBoost}% ${Math.round(8 + tiltNorm * 14 + materialLightBoost * 0.4)}%)`);
    grad.addColorStop(1, `hsl(${(baseHue + 24) % 360} ${58 + materialSatBoost}% ${Math.round(14 + depthAmount * 20 + materialLightBoost)}%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, payload.width, payload.height);

    const glow = ctx.createRadialGradient(
      payload.width * 0.7,
      payload.height * 0.22,
      payload.width * 0.06,
      payload.width * 0.7,
      payload.height * 0.22,
      payload.width * 0.72
    );
    glow.addColorStop(0, `hsla(${baseHue + 8} 95% 68% / ${0.1 + glowAmount * 0.36})`);
    glow.addColorStop(1, "hsla(0 0% 0% / 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, payload.width, payload.height);

    const cx = payload.width * 0.52;
    const cy = payload.height * 0.54;
    const size = Math.min(payload.width, payload.height) * (0.2 + depthAmount * 0.22);
    const shadowX = cx - lightDirX * size * (0.9 + depthAmount * 0.5);
    const shadowY = cy + size * (0.8 + (1 - lightDirY) * 0.8);
    ctx.fillStyle = `rgba(0,0,0,${(0.16 + (1 - lightIntensity) * 0.2).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(shadowX, shadowY, size * 1.1, size * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    const objectFill = ctx.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
    objectFill.addColorStop(0, `hsla(${baseHue + 4} 72% ${Math.round(58 + lightIntensity * 16)}% / ${payload.material === "glass" ? 0.45 : 0.88})`);
    objectFill.addColorStop(1, `hsla(${(baseHue + 24) % 360} ${66 + Math.round(metalness * 12)}% ${Math.round(24 + (1 - roughness) * 18)}% / 0.96)`);
    ctx.fillStyle = objectFill;
    ctx.strokeStyle = `rgba(255,255,255,${(0.2 + (1 - roughness) * 0.3).toFixed(3)})`;
    ctx.lineWidth = 1.2 + (1 - roughness) * 1.4;

    if (payload.object === "sphere") {
      const sphere = ctx.createRadialGradient(
        cx - lightDirX * size * 0.28,
        cy - lightDirY * size * 0.5,
        size * 0.12,
        cx,
        cy,
        size
      );
      sphere.addColorStop(0, `hsla(${baseHue + 8} 92% 82% / ${0.9 - roughness * 0.35})`);
      sphere.addColorStop(1, `hsla(${(baseHue + 28) % 360} 70% ${Math.round(24 + (1 - roughness) * 18)}% / 0.96)`);
      ctx.fillStyle = sphere;
      ctx.beginPath();
      ctx.arc(cx, cy, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (payload.object === "cylinder") {
      const rx = size * 0.72;
      const ry = size * 0.22;
      const h = size * 1.46;
      ctx.beginPath();
      ctx.ellipse(cx, cy - h * 0.5, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(cx - rx, cy - h * 0.5, rx * 2, h);
      ctx.strokeRect(cx - rx, cy - h * 0.5, rx * 2, h);
      ctx.beginPath();
      ctx.ellipse(cx, cy + h * 0.5, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (payload.object === "torus") {
      ctx.beginPath();
      ctx.ellipse(cx, cy, size * 1.08, size * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.ellipse(cx, cy, size * 0.52, size * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = `rgba(255,255,255,${(0.18 + (1 - roughness) * 0.24).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, size * 0.52, size * 0.34, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (payload.object === "plane") {
      const planeTilt = (payload.tilt / 60) * size * 0.72;
      ctx.beginPath();
      ctx.moveTo(cx - size, cy - size * 0.42);
      ctx.lineTo(cx + size, cy - size * 0.42 + planeTilt * 0.35);
      ctx.lineTo(cx + size * 0.82, cy + size * 0.46 + planeTilt * 0.3);
      ctx.lineTo(cx - size * 1.12, cy + size * 0.46);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      const cubeTilt = (payload.tilt / 60) * size * 0.55;
      ctx.fillRect(cx - size * 0.72, cy - size * 0.72, size * 1.44, size * 1.44);
      ctx.strokeRect(cx - size * 0.72, cy - size * 0.72, size * 1.44, size * 1.44);
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.72, cy - size * 0.72);
      ctx.lineTo(cx - size * 0.22 + cubeTilt, cy - size * 1.2);
      ctx.lineTo(cx + size * 1.2 + cubeTilt, cy - size * 1.2);
      ctx.lineTo(cx + size * 0.72, cy - size * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + size * 0.72, cy - size * 0.72);
      ctx.lineTo(cx + size * 1.2 + cubeTilt, cy - size * 1.2);
      ctx.lineTo(cx + size * 1.2 + cubeTilt, cy + size * 0.24);
      ctx.lineTo(cx + size * 0.72, cy + size * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    if (payload.material === "metal") {
      const spec = ctx.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
      spec.addColorStop(0, `rgba(255,255,255,${(0.38 + metalness * 0.42).toFixed(3)})`);
      spec.addColorStop(1, "rgba(255,255,255,0.04)");
      ctx.fillStyle = spec;
      ctx.fillRect(cx - size * 1.15, cy - size * 1.15, size * 2.3, size * 2.3);
    } else if (payload.material === "glass") {
      ctx.fillStyle = "rgba(186,230,253,0.18)";
      ctx.fillRect(cx - size * 1.05, cy - size * 1.05, size * 2.1, size * 2.1);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.66, cy - size * 0.84);
      ctx.lineTo(cx + size * 0.16, cy - size * 0.18);
      ctx.stroke();
    } else if (payload.material === "emissive") {
      const emissive = ctx.createRadialGradient(cx, cy, size * 0.2, cx, cy, size * 1.6);
      emissive.addColorStop(0, `hsla(${(baseHue + 36) % 360} 95% 72% / 0.5)`);
      emissive.addColorStop(1, "hsla(0 0% 0% / 0)");
      ctx.fillStyle = emissive;
      ctx.fillRect(cx - size * 1.6, cy - size * 1.6, size * 3.2, size * 3.2);
    }

    if (payload.uvEnabled) {
      const grid = Math.max(4, Math.min(32, Math.round(payload.uvGridDensity ?? 12)));
      const seamAlpha = Math.max(0, Math.min(1, (payload.uvSeamStrength ?? 62) / 100));
      const checkerAlpha = Math.max(0, Math.min(1, (payload.uvCheckerOpacity ?? 24) / 100));
      const distort = Math.max(0, Math.min(1, (payload.uvDistortion ?? 28) / 100));
      const uvX = cx - size * 1.1;
      const uvY = cy - size * 1.1;
      const uvW = size * 2.2;
      const uvH = size * 2.2;

      for (let gy = 0; gy < grid; gy += 1) {
        for (let gx = 0; gx < grid; gx += 1) {
          if ((gx + gy) % 2 === 0) {
            const x = uvX + (gx / grid) * uvW;
            const y = uvY + (gy / grid) * uvH;
            const w = uvW / grid;
            const h = uvH / grid;
            ctx.fillStyle = `rgba(248,250,252,${(checkerAlpha * 0.8).toFixed(3)})`;
            ctx.fillRect(x, y, w, h);
          }
        }
      }

      ctx.lineWidth = 1;
      for (let i = 0; i <= grid; i += 1) {
        const t = i / grid;
        const x = uvX + t * uvW;
        const wobble = Math.sin(t * Math.PI * 2) * distort * (uvW * 0.06);
        ctx.strokeStyle = "rgba(15,23,42,0.26)";
        ctx.beginPath();
        ctx.moveTo(x, uvY);
        ctx.bezierCurveTo(x + wobble, uvY + uvH * 0.33, x - wobble, uvY + uvH * 0.66, x, uvY + uvH);
        ctx.stroke();
      }
      for (let i = 0; i <= grid; i += 1) {
        const t = i / grid;
        const y = uvY + t * uvH;
        const wobble = Math.cos(t * Math.PI * 2) * distort * (uvH * 0.06);
        ctx.strokeStyle = "rgba(30,41,59,0.24)";
        ctx.beginPath();
        ctx.moveTo(uvX, y);
        ctx.bezierCurveTo(uvX + uvW * 0.33, y + wobble, uvX + uvW * 0.66, y - wobble, uvX + uvW, y);
        ctx.stroke();
      }

      const seamX = uvX + uvW * 0.5;
      const seamY = uvY + uvH * 0.5;
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = `rgba(14,165,233,${(0.2 + seamAlpha * 0.6).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(seamX, uvY);
      ctx.lineTo(seamX, uvY + uvH);
      ctx.stroke();
      ctx.strokeStyle = `rgba(249,115,22,${(0.18 + seamAlpha * 0.55).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(uvX, seamY);
      ctx.lineTo(uvX + uvW, seamY);
      ctx.stroke();
    }

    ctx.strokeStyle = `rgba(255,255,255,${(0.34 + depthAmount * 0.46).toFixed(3)})`;
    ctx.lineWidth = 1.5 + depthAmount * 2;
    const lineCount = Math.max(4, payload.wireframe);
    const tiltPx = (payload.tilt / 60) * payload.width * 0.08;
    const xInset = payload.width * 0.06;
    const yTop = payload.height * 0.14;
    const yBottom = payload.height * 0.9;
    for (let i = 0; i < lineCount; i += 1) {
      const t = i / Math.max(1, lineCount - 1);
      const xStart = xInset + t * (payload.width - xInset * 2);
      const xEnd = xStart + tiltPx;
      ctx.beginPath();
      ctx.moveTo(xStart, yTop);
      ctx.lineTo(xEnd, yBottom);
      ctx.stroke();
    }

    const panelWidth = payload.width * (0.26 + depthAmount * 0.24);
    const panelHeight = payload.height * (0.16 + depthAmount * 0.2);
    const panelX = payload.width * 0.5 - panelWidth * 0.5 + tiltPx * 0.18;
    const panelY = payload.height * (0.56 - depthAmount * 0.08);
    ctx.fillStyle = `rgba(255,255,255,${(0.08 + depthAmount * 0.12).toFixed(3)})`;
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = `rgba(255,255,255,${(0.46 + depthAmount * 0.28).toFixed(3)})`;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.font = `600 ${Math.max(10, Math.round(payload.height * 0.046))}px "Segoe UI", "Arial", sans-serif`;
    ctx.fillText("3D Layer (Legacy)", Math.round(payload.width * 0.06), Math.round(payload.height * 0.08));
    ctx.font = `500 ${Math.max(9, Math.round(payload.height * 0.035))}px "Segoe UI", "Arial", sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.fillText(`Obj ${payload.object}  Mat ${payload.material}  Light ${Math.round(lightIntensity * 100)}%`, Math.round(payload.width * 0.06), Math.round(payload.height * 0.145));
    ctx.fillText(`Depth ${payload.depth}%  Tilt ${payload.tilt}deg  Mesh ${payload.wireframe}  UV ${payload.uvEnabled ? "On" : "Off"}`, Math.round(payload.width * 0.06), Math.round(payload.height * 0.192));
    return layer;
  };

  const handleCreate3DLayer = () => {
    if (!canvasRef.current || collabRole === 'viewer') return;
    const threeDLayerPayload = buildCurrentLegacy3DLayerPayload(512, 512);
    const layer = renderLegacy3DLayerCanvas(threeDLayerPayload);
    if (!layer) return;
    canvasRef.current.addImageLayer(
      layer.toDataURL("image/png"),
      "3D Layer (Legacy)",
      { legacy3d: true, threeDLayer: threeDLayerPayload },
      { addToHistory: true, layerType: "threeD" }
    );
  };

  const handleUpdateActive3DLayer = async () => {
    if (!canvasRef.current || collabRole === "viewer" || !activeLayerId) return;
    const active = layers.find((layer) => layer.id === activeLayerId);
    if (!active || active.type !== "threeD") {
      alert("Select a 3D layer first.");
      return;
    }
    const currentPayload = (active.aiData as any)?.threeDLayer as { width?: number; height?: number } | undefined;
    const width = Math.max(1, Math.round(currentPayload?.width || selection?.width || canvasDims.width || 512));
    const height = Math.max(1, Math.round(currentPayload?.height || selection?.height || canvasDims.height || 512));
    const nextPayload = buildCurrentLegacy3DLayerPayload(width, height);
    const layer = renderLegacy3DLayerCanvas(nextPayload);
    if (!layer) return;
    await canvasRef.current.replaceActiveLayerContents(layer.toDataURL("image/png"), active.name);
    updateLayer(activeLayerId, {
      type: "threeD",
      aiData: {
        ...(active.aiData as any),
        legacy3d: true,
        threeDLayer: nextPayload
      } as any
    });
  };

  const handleGenerateAssets = async () => {
    const targets: Array<{ name: string; x: number; y: number; width: number; height: number; source: "slice" | "artboard" }> = [];
    if (assetGenSource === "slices" || assetGenSource === "both") {
      for (const s of slices) {
        targets.push({ name: s.name, x: s.x, y: s.y, width: s.width, height: s.height, source: "slice" });
      }
    }
    if (assetGenSource === "artboards" || assetGenSource === "both") {
      for (const a of artboards) {
        targets.push({ name: a.name, x: a.x, y: a.y, width: a.width, height: a.height, source: "artboard" });
      }
    }
    if (!targets.length) {
      alert("No targets found. Create slices or artboards first.");
      return;
    }
    const snapshot = canvasRef.current?.getCanvasSnapshot();
    if (!snapshot) return;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Unable to load canvas snapshot"));
      i.src = snapshot;
    });
    const formats = [...new Set(assetGenFormats)];
    const scales = [...new Set(assetGenScales)].sort((a, b) => a - b);
    const total = targets.length * formats.length * scales.length;
    const quality = Math.max(0.1, Math.min(1, assetGenQuality / 100));
    const reportRows: string[] = [];
    setAssetGenStatus({ running: true, total, done: 0, last: null });
    setAssetGenReport(null);
    let done = 0;
    for (const target of targets) {
      for (const scale of scales) {
        for (const format of formats) {
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(target.width * scale));
          canvas.height = Math.max(1, Math.round(target.height * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(
            img,
            Math.round(target.x),
            Math.round(target.y),
            Math.round(target.width),
            Math.round(target.height),
            0,
            0,
            canvas.width,
            canvas.height
          );
          const ext = format === "jpeg" ? "jpg" : format;
          const base = target.name.replace(/\s+/g, "-").toLowerCase();
          const sourceTag = assetGenIncludeSourceTag ? `-${target.source}` : "";
          const prefix = assetGenPrefix.trim() ? `${assetGenPrefix.trim().replace(/\s+/g, "-").toLowerCase()}-` : "";
          const filename = `${prefix}${base}${sourceTag}${scale === 1 ? "" : `@${scale}x`}.${ext}`;
          const mime = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
          const href = format === "png" ? canvas.toDataURL(mime) : canvas.toDataURL(mime, quality);
          const link = document.createElement("a");
          link.download = filename;
          link.href = href;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          reportRows.push(`${filename} (${canvas.width}x${canvas.height})`);
          done += 1;
          setAssetGenStatus({ running: true, total, done, last: filename });
          await new Promise((r) => setTimeout(r, 12));
        }
      }
    }
    setAssetGenStatus((prev) => ({ ...prev, running: false, done: total }));
    setAssetGenReport(`Generated ${reportRows.length} assets from ${targets.length} targets.\n${reportRows.slice(0, 12).join("\n")}${reportRows.length > 12 ? `\n...and ${reportRows.length - 12} more.` : ""}`);
  };

  const handlePrintSettings = async () => {
    const snapshot = canvasRef.current?.getCanvasSnapshot();
    if (!snapshot) return;

    const paperMm = (() => {
      if (printPaperSize === "letter") return { w: 215.9, h: 279.4 };
      if (printPaperSize === "a3") return { w: 297, h: 420 };
      if (printPaperSize === "tabloid") return { w: 279.4, h: 431.8 };
      return { w: 210, h: 297 };
    })();
    const pageMm = printOrientation === "landscape"
      ? { w: paperMm.h, h: paperMm.w }
      : paperMm;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Unable to load print source image"));
      i.src = snapshot;
    });

    const dpi = 300;
    const pxPerMm = dpi / 25.4;
    const pageW = Math.max(64, Math.round(pageMm.w * pxPerMm));
    const pageH = Math.max(64, Math.round(pageMm.h * pxPerMm));
    const bleedPx = Math.max(0, Math.round(printBleedMm * pxPerMm));
    const safeW = Math.max(8, pageW - bleedPx * 2);
    const safeH = Math.max(8, pageH - bleedPx * 2);
    const scale = Math.max(10, Math.min(400, printScalePercent)) / 100;
    const fit = Math.min(safeW / img.naturalWidth, safeH / img.naturalHeight);
    const renderW = Math.max(4, Math.round(img.naturalWidth * fit * scale));
    const renderH = Math.max(4, Math.round(img.naturalHeight * fit * scale));
    const dx = Math.round((pageW - renderW) / 2);
    const dy = Math.round((pageH - renderH) / 2);

    const out = document.createElement("canvas");
    out.width = pageW;
    out.height = pageH;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, dx, dy, renderW, renderH);

    if (printColorProfile !== "srgb") {
      const profile = ctx.getImageData(0, 0, out.width, out.height);
      const data = profile.data;
      const satBoost = printColorProfile === "display-p3" ? 1.06 : printColorProfile === "adobe-rgb" ? 1.04 : 0.92;
      const gamma = printColorProfile === "display-p3" ? 0.96 : printColorProfile === "adobe-rgb" ? 0.98 : 1.05;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        const avg = (r + g + b) / 3;
        const rr = Math.pow(avg + (r - avg) * satBoost, gamma);
        const gg = Math.pow(avg + (g - avg) * satBoost, gamma);
        const bb = Math.pow(avg + (b - avg) * satBoost, gamma);
        data[i] = Math.max(0, Math.min(255, Math.round(rr * 255)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(gg * 255)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(bb * 255)));
      }
      ctx.putImageData(profile, 0, 0);
    }

    if (printSimulateCmyk) {
      const image = ctx.getImageData(0, 0, out.width, out.height);
      const data = image.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        const k = 1 - Math.max(r, g, b);
        const c = (1 - r - k) / Math.max(0.0001, 1 - k);
        const m = (1 - g - k) / Math.max(0.0001, 1 - k);
        const y = (1 - b - k) / Math.max(0.0001, 1 - k);
        const rk = (1 - Math.min(1, c * 0.88 + k * 0.92)) * 255;
        const gk = (1 - Math.min(1, m * 0.88 + k * 0.92)) * 255;
        const bk = (1 - Math.min(1, y * 0.88 + k * 0.92)) * 255;
        data[i] = Math.max(0, Math.min(255, Math.round(rk)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(gk)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(bk)));
      }
      ctx.putImageData(image, 0, 0);
    }

    if (printShowMarks && bleedPx > 0) {
      ctx.strokeStyle = "rgba(2,6,23,0.78)";
      ctx.lineWidth = 1;
      const m = bleedPx;
      const arm = Math.max(10, Math.round(bleedPx * 1.8));
      const x0 = m;
      const y0 = m;
      const x1 = out.width - m;
      const y1 = out.height - m;
      ctx.beginPath();
      ctx.moveTo(x0 - arm, y0); ctx.lineTo(x0 - 3, y0);
      ctx.moveTo(x0, y0 - arm); ctx.lineTo(x0, y0 - 3);
      ctx.moveTo(x1 + 3, y0); ctx.lineTo(x1 + arm, y0);
      ctx.moveTo(x1, y0 - arm); ctx.lineTo(x1, y0 - 3);
      ctx.moveTo(x0 - arm, y1); ctx.lineTo(x0 - 3, y1);
      ctx.moveTo(x0, y1 + 3); ctx.lineTo(x0, y1 + arm);
      ctx.moveTo(x1 + 3, y1); ctx.lineTo(x1 + arm, y1);
      ctx.moveTo(x1, y1 + 3); ctx.lineTo(x1, y1 + arm);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(2,6,23,0.72)";
    ctx.font = "500 13px Segoe UI, Arial, sans-serif";
    ctx.fillText(
      `Profile: ${printColorProfile} | Intent: ${printIntent} | ${printPaperSize.toUpperCase()} ${printOrientation}`,
      Math.max(12, bleedPx + 8),
      Math.max(20, bleedPx + 16)
    );

    const dataUrl = out.toDataURL("image/png");
    const win = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");
    if (!win) {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `print-preview-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setLastPrintSummary("Print popup blocked. Downloaded print-preview PNG instead.");
      return;
    }

    const profileLabel = printColorProfile === "srgb"
      ? "sRGB IEC61966-2.1"
      : printColorProfile === "display-p3"
      ? "Display P3"
      : printColorProfile === "adobe-rgb"
      ? "Adobe RGB (1998)"
      : printColorProfile === "cmyk-coated"
      ? "US Web Coated (SWOP) v2"
      : "GRACoL 2013 Coated";

    win.document.write(`
      <html>
        <head>
          <title>Print Preview</title>
          <style>
            @page { size: ${pageMm.w}mm ${pageMm.h}mm; margin: 0; }
            body { margin: 0; background: #f4f4f5; font: 12px/1.4 Segoe UI, Arial, sans-serif; color: #0f172a; }
            .meta { padding: 10px 12px; background: #e2e8f0; border-bottom: 1px solid #cbd5e1; }
            .sheet { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 42px); }
            img { max-width: calc(100vw - 24px); max-height: calc(100vh - 68px); background: #fff; box-shadow: 0 8px 24px rgba(2,6,23,0.18); }
            @media print { .meta { display: none; } body { background: #fff; } .sheet { min-height: 100vh; } img { max-width: 100%; max-height: 100%; box-shadow: none; } }
          </style>
        </head>
        <body>
          <div class="meta">
            ${profileLabel} | ${printIntent} | Bleed ${printBleedMm}mm | Marks ${printShowMarks ? "on" : "off"} | Flatten ${printFlattenImage ? "on" : "off"} | CMYK sim ${printSimulateCmyk ? "on" : "off"}
          </div>
          <div class="sheet"><img src="${dataUrl}" alt="Print preview"/></div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    setLastPrintSummary(`Prepared print preview with ${profileLabel} / ${printIntent}.`);
  };

  const handleGaussianBlurFilter = () => withRegionCanvas(
    "Gaussian Blur",
    (ctx, w, h) => {
      const copy = document.createElement("canvas");
      copy.width = w;
      copy.height = h;
      const cctx = copy.getContext("2d");
      if (!cctx) return;
      cctx.drawImage(ctx.canvas, 0, 0);
      ctx.filter = "blur(6px)";
      ctx.drawImage(copy, 0, 0);
      ctx.filter = "none";
    }
  );

  const handleMotionBlurFilter = () => withRegionCanvas(
    "Motion Blur",
    (ctx, w, h) => {
      const copy = document.createElement("canvas");
      copy.width = w;
      copy.height = h;
      const cctx = copy.getContext("2d");
      if (!cctx) return;
      cctx.drawImage(ctx.canvas, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 0.16;
      for (let i = -4; i <= 4; i += 1) {
        ctx.drawImage(copy, i * 2, i, w, h);
      }
      ctx.globalAlpha = 1;
    }
  );

  const handleLensBlurFilter = () => withRegionCanvas(
    "Lens Blur",
    (ctx, w, h) => {
      const copy = document.createElement("canvas");
      copy.width = w;
      copy.height = h;
      const cctx = copy.getContext("2d");
      if (!cctx) return;
      cctx.drawImage(ctx.canvas, 0, 0);
      ctx.filter = "blur(8px)";
      ctx.drawImage(copy, 0, 0);
      ctx.filter = "none";
      const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.18, w / 2, h / 2, Math.max(w, h) * 0.62);
      vignette.addColorStop(0, "rgba(255,255,255,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.22)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    }
  );

  const handleSurfaceBlurFilter = () => withRegionCanvas(
    "Surface Blur",
    (ctx, w, h) => {
      const src = ctx.getImageData(0, 0, w, h);
      const blurred = applyKernel(src, [
        1, 1, 1,
        1, 2, 1,
        1, 1, 1
      ], 10);
      const out = src.data;
      const b = blurred.data;
      for (let i = 0; i < out.length; i += 4) {
        const edge = Math.abs(out[i] - out[Math.max(0, i - 4)]) + Math.abs(out[i + 1] - out[Math.max(1, i - 3)]) + Math.abs(out[i + 2] - out[Math.max(2, i - 2)]);
        if (edge < 36) {
          out[i] = b[i];
          out[i + 1] = b[i + 1];
          out[i + 2] = b[i + 2];
        }
      }
      ctx.putImageData(src, 0, 0);
    }
  );

  const handleFieldBlurFilter = () => withRegionCanvas(
    "Field Blur",
    (ctx, w, h) => {
      const copy = document.createElement("canvas");
      copy.width = w;
      copy.height = h;
      const cctx = copy.getContext("2d");
      if (!cctx) return;
      cctx.drawImage(ctx.canvas, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < 4; i += 1) {
        const alpha = 0.15 + i * 0.08;
        ctx.globalAlpha = alpha;
        ctx.filter = `blur(${2 + i * 2}px)`;
        ctx.drawImage(copy, 0, 0);
      }
      ctx.filter = "none";
      ctx.globalAlpha = 1;
    }
  );

  const handleTiltShiftFilter = () => withRegionCanvas(
    "Tilt-Shift",
    (ctx, w, h) => {
      const copy = document.createElement("canvas");
      copy.width = w;
      copy.height = h;
      const cctx = copy.getContext("2d");
      if (!cctx) return;
      cctx.drawImage(ctx.canvas, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.filter = "blur(6px)";
      ctx.drawImage(copy, 0, 0);
      ctx.filter = "none";
      const mask = ctx.createLinearGradient(0, 0, 0, h);
      mask.addColorStop(0, "rgba(255,255,255,1)");
      mask.addColorStop(0.35, "rgba(255,255,255,0)");
      mask.addColorStop(0.65, "rgba(255,255,255,0)");
      mask.addColorStop(1, "rgba(255,255,255,1)");
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = mask;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(copy, 0, 0);
    }
  );

  const handleUnsharpMaskFilter = () => withRegionCanvas(
    "Unsharp Mask",
    (ctx, w, h) => {
      const src = ctx.getImageData(0, 0, w, h);
      const blur = applyKernel(src, [
        1, 2, 1,
        2, 4, 2,
        1, 2, 1
      ], 16);
      const d = src.data;
      const b = blur.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = clamp255(d[i] + (d[i] - b[i]) * 1.35);
        d[i + 1] = clamp255(d[i + 1] + (d[i + 1] - b[i + 1]) * 1.35);
        d[i + 2] = clamp255(d[i + 2] + (d[i + 2] - b[i + 2]) * 1.35);
      }
      ctx.putImageData(src, 0, 0);
    }
  );

  const handleSmartSharpenFilter = () => withRegionCanvas(
    "Smart Sharpen",
    (ctx, w, h) => {
      const src = ctx.getImageData(0, 0, w, h);
      const sharp = applyKernel(src, [
        -1, -1, -1,
        -1, 9, -1,
        -1, -1, -1
      ]);
      const d = src.data;
      const s = sharp.data;
      for (let i = 0; i < d.length; i += 4) {
        const dr = Math.abs(s[i] - d[i]);
        const dg = Math.abs(s[i + 1] - d[i + 1]);
        const db = Math.abs(s[i + 2] - d[i + 2]);
        if ((dr + dg + db) / 3 > 8) {
          d[i] = s[i];
          d[i + 1] = s[i + 1];
          d[i + 2] = s[i + 2];
        }
      }
      ctx.putImageData(src, 0, 0);
    }
  );

  const handleHighPassFilter = () => withRegionCanvas(
    "High Pass",
    (ctx, w, h) => {
      const src = ctx.getImageData(0, 0, w, h);
      const blur = applyKernel(src, [
        1, 2, 1,
        2, 4, 2,
        1, 2, 1
      ], 16);
      const d = src.data;
      const b = blur.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = clamp255(128 + d[i] - b[i]);
        d[i + 1] = clamp255(128 + d[i + 1] - b[i + 1]);
        d[i + 2] = clamp255(128 + d[i + 2] - b[i + 2]);
      }
      ctx.putImageData(src, 0, 0);
    }
  );

  const handleAddNoiseFilter = () => withRegionCanvas(
    "Add Noise",
    (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = (Math.random() - 0.5) * 42;
        d[i] = clamp255(d[i] + n);
        d[i + 1] = clamp255(d[i + 1] + n);
        d[i + 2] = clamp255(d[i + 2] + n);
      }
      ctx.putImageData(img, 0, 0);
    }
  );

  const handleReduceNoiseFilter = () => withRegionCanvas(
    "Reduce Noise",
    (ctx, w, h) => {
      const src = ctx.getImageData(0, 0, w, h);
      const smooth = applyKernel(src, [
        1, 1, 1,
        1, 2, 1,
        1, 1, 1
      ], 10);
      ctx.putImageData(smooth, 0, 0);
    }
  );

  const handleDustScratchesFilter = () => withRegionCanvas(
    "Dust & Scratches",
    (ctx, w, h) => {
      const src = ctx.getImageData(0, 0, w, h);
      const smooth = applyKernel(src, [
        1, 2, 1,
        2, 4, 2,
        1, 2, 1
      ], 16);
      const d = src.data;
      const s = smooth.data;
      for (let i = 0; i < d.length; i += 4) {
        const diff = Math.abs(d[i] - s[i]) + Math.abs(d[i + 1] - s[i + 1]) + Math.abs(d[i + 2] - s[i + 2]);
        if (diff < 28) {
          d[i] = s[i];
          d[i + 1] = s[i + 1];
          d[i + 2] = s[i + 2];
        }
      }
      ctx.putImageData(src, 0, 0);
    }
  );

  const handleLiquifyFilter = () => withRegionCanvas(
    "Liquify",
    (ctx, w, h) => {
      const src = ctx.getImageData(0, 0, w, h);
      const out = ctx.createImageData(w, h);
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) * 0.45;
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const dx = x - cx;
          const dy = y - cy;
          const r = Math.sqrt(dx * dx + dy * dy);
          const influence = Math.max(0, 1 - r / maxR);
          const sx = Math.max(0, Math.min(w - 1, Math.round(x - dx * influence * 0.2)));
          const sy = Math.max(0, Math.min(h - 1, Math.round(y - dy * influence * 0.2)));
          const sIdx = (sy * w + sx) * 4;
          const oIdx = (y * w + x) * 4;
          out.data[oIdx] = src.data[sIdx];
          out.data[oIdx + 1] = src.data[sIdx + 1];
          out.data[oIdx + 2] = src.data[sIdx + 2];
          out.data[oIdx + 3] = src.data[sIdx + 3];
        }
      }
      ctx.putImageData(out, 0, 0);
    }
  );

  const handleWarpFilter = () => withRegionCanvas(
    "Warp Distort",
    (ctx, w, h) => {
      const copy = document.createElement("canvas");
      copy.width = w;
      copy.height = h;
      const cctx = copy.getContext("2d");
      if (!cctx) return;
      cctx.drawImage(ctx.canvas, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (let y = 0; y < h; y += 2) {
        const wave = Math.sin((y / h) * Math.PI * 2) * 8;
        ctx.drawImage(copy, 0, y, w, 2, wave, y, w, 2);
      }
    }
  );

  const handleTwirlFilter = () => withRegionCanvas(
    "Twirl",
    (ctx, w, h) => {
      const src = ctx.getImageData(0, 0, w, h);
      const out = ctx.createImageData(w, h);
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.46;
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const dx = x - cx;
          const dy = y - cy;
          const r = Math.sqrt(dx * dx + dy * dy);
          const t = Math.max(0, 1 - r / radius);
          const angle = Math.atan2(dy, dx) + t * t * 1.15;
          const sx = Math.max(0, Math.min(w - 1, Math.round(cx + r * Math.cos(angle))));
          const sy = Math.max(0, Math.min(h - 1, Math.round(cy + r * Math.sin(angle))));
          const sIdx = (sy * w + sx) * 4;
          const oIdx = (y * w + x) * 4;
          out.data[oIdx] = src.data[sIdx];
          out.data[oIdx + 1] = src.data[sIdx + 1];
          out.data[oIdx + 2] = src.data[sIdx + 2];
          out.data[oIdx + 3] = src.data[sIdx + 3];
        }
      }
      ctx.putImageData(out, 0, 0);
    }
  );

  const handleRippleFilter = () => withRegionCanvas(
    "Ripple",
    (ctx, w, h) => {
      const copy = document.createElement("canvas");
      copy.width = w;
      copy.height = h;
      const cctx = copy.getContext("2d");
      if (!cctx) return;
      cctx.drawImage(ctx.canvas, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (let y = 0; y < h; y += 1) {
        const shift = Math.sin((y / h) * Math.PI * 12) * 6;
        ctx.drawImage(copy, 0, y, w, 1, shift, y, w, 1);
      }
    }
  );

  const handlePolarCoordinatesFilter = () => withRegionCanvas(
    "Polar Coordinates",
    (ctx, w, h) => {
      const src = ctx.getImageData(0, 0, w, h);
      const out = ctx.createImageData(w, h);
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) / 2;
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const dx = x - cx;
          const dy = y - cy;
          const r = Math.sqrt(dx * dx + dy * dy);
          const theta = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
          const sx = Math.max(0, Math.min(w - 1, Math.round(theta * (w - 1))));
          const sy = Math.max(0, Math.min(h - 1, Math.round((r / maxR) * (h - 1))));
          const sIdx = (sy * w + sx) * 4;
          const oIdx = (y * w + x) * 4;
          out.data[oIdx] = src.data[sIdx];
          out.data[oIdx + 1] = src.data[sIdx + 1];
          out.data[oIdx + 2] = src.data[sIdx + 2];
          out.data[oIdx + 3] = src.data[sIdx + 3];
        }
      }
      ctx.putImageData(out, 0, 0);
    }
  );

  const handleCloudsRender = () => withRegionCanvas(
    "Clouds Render",
    (ctx, w, h) => {
      const img = ctx.createImageData(w, h);
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const n = (
            Math.sin(x * 0.03) +
            Math.cos(y * 0.028) +
            Math.sin((x + y) * 0.015) +
            (Math.random() - 0.5) * 0.5
          ) * 0.5;
          const v = clamp255(160 + n * 72);
          const idx = (y * w + x) * 4;
          img.data[idx] = v;
          img.data[idx + 1] = clamp255(v + 14);
          img.data[idx + 2] = clamp255(v + 28);
          img.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }
  );

  const handleLightingRender = () => withRegionCanvas(
    "Lighting Effects",
    (ctx, w, h) => {
      const glow = ctx.createRadialGradient(w * 0.32, h * 0.28, 12, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
      glow.addColorStop(0, "rgba(255,244,214,0.72)");
      glow.addColorStop(1, "rgba(0,0,0,0.48)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    }
  );

  const handleLensFlareRender = () => withRegionCanvas(
    "Lens Flare",
    (ctx, w, h) => {
      const x = w * 0.28;
      const y = h * 0.24;
      const grad = ctx.createRadialGradient(x, y, 2, x, y, Math.max(w, h) * 0.2);
      grad.addColorStop(0, "rgba(255,255,255,0.95)");
      grad.addColorStop(0.2, "rgba(255,225,150,0.58)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(w, h) * 0.2, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 1; i <= 4; i += 1) {
        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        ctx.arc(x + i * w * 0.16, y + i * h * 0.12, 6 + i * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  );

  const handleOilPaintStylize = () => withRegionCanvas(
    "Oil Paint",
    (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.round(d[i] / 32) * 32;
        d[i + 1] = Math.round(d[i + 1] / 32) * 32;
        d[i + 2] = Math.round(d[i + 2] / 32) * 32;
      }
      ctx.putImageData(img, 0, 0);
      ctx.filter = "blur(1.2px)";
      ctx.drawImage(ctx.canvas, 0, 0);
      ctx.filter = "none";
    }
  );

  const handleEmbossStylize = () => withRegionCanvas(
    "Emboss",
    (ctx, w, h) => {
      const src = ctx.getImageData(0, 0, w, h);
      const emb = applyKernel(src, [
        -2, -1, 0,
        -1, 1, 1,
        0, 1, 2
      ], 1, 128);
      ctx.putImageData(emb, 0, 0);
    }
  );

  const handleFindEdgesStylize = () => withRegionCanvas(
    "Find Edges",
    (ctx, w, h) => {
      const src = ctx.getImageData(0, 0, w, h);
      const edges = applyKernel(src, [
        -1, -1, -1,
        -1, 8, -1,
        -1, -1, -1
      ], 1, 128);
      ctx.putImageData(edges, 0, 0);
    }
  );

  const handleGlowingEdgesStylize = () => withRegionCanvas(
    "Glowing Edges",
    (ctx, w, h) => {
      const src = ctx.getImageData(0, 0, w, h);
      const edges = applyKernel(src, [
        -1, -1, -1,
        -1, 8, -1,
        -1, -1, -1
      ]);
      const d = edges.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = 255 - Math.max(d[i], d[i + 1], d[i + 2]);
        d[i] = clamp255(v * 0.2);
        d[i + 1] = clamp255(v * 0.8);
        d[i + 2] = clamp255(v);
      }
      ctx.putImageData(edges, 0, 0);
    }
  );

  const applyDropletPresetToLayer = (layerId: string, preset: DropletPreset) => {
    const target = layers.find((layer) => layer.id === layerId);
    if (!target) return false;
    updateLayer(layerId, {
      filters: {
        ...(target.filters || {}),
        ...preset.filters
      },
      aiData: {
        ...(target.aiData as any),
        droplet: {
          id: preset.id,
          name: preset.name,
          appliedAt: new Date().toISOString()
        }
      } as any
    });
    return true;
  };

  const resolveActiveDropletPreset = () => {
    const preferredId = activeDropletId ?? dropletPresets[0]?.id ?? null;
    if (!preferredId) return null;
    return dropletPresets.find((preset) => preset.id === preferredId) ?? null;
  };

  const handleRunDroplet = () => {
    maybeRecordMacroCommand("run-droplet");
    if (!activeLayerId) {
      alert("Select a layer first.");
      return;
    }
    const preset = resolveActiveDropletPreset();
    if (!preset) {
      alert("Create a droplet preset first.");
      return;
    }
    const applied = applyDropletPresetToLayer(activeLayerId, preset);
    if (!applied) return;
    setDropletPresets((prev) =>
      prev.map((item) =>
        item.id === preset.id
          ? { ...item, runCount: item.runCount + 1, lastRunAt: new Date().toISOString() }
          : item
      )
    );
    alert(`Droplet executed: ${preset.name}`);
  };

  const handleSaveDropletFromActiveLayer = () => {
    if (!activeLayerId) {
      alert("Select a layer first.");
      return;
    }
    const active = layers.find((layer) => layer.id === activeLayerId);
    const filters = active?.filters || {};
    const keys = Object.keys(filters);
    if (!keys.length) {
      alert("Active layer has no filters to store in a droplet.");
      return;
    }
    const name = prompt("Droplet preset name", `Droplet ${dropletPresets.length + 1}`)?.trim();
    if (!name) return;
    const preset: DropletPreset = {
      id: crypto.randomUUID(),
      name,
      filters: { ...filters },
      runCount: 0
    };
    setDropletPresets((prev) => [preset, ...prev]);
    setActiveDropletId(preset.id);
  };

  const handleDeleteActiveDroplet = () => {
    const current = resolveActiveDropletPreset();
    if (!current) return;
    if (!confirm(`Delete droplet "${current.name}"?`)) return;
    setDropletPresets((prev) => prev.filter((item) => item.id !== current.id));
    setActiveDropletId((prev) => (prev === current.id ? null : prev));
  };

  const maybeRecordMacroCommand = (cmd: MacroCommand) => {
    if (!isActionRecording || replayingActionRef.current) return;
    setRecordedCommands((prev) => [...prev, cmd]);
  };

  const runMacroCommand = async (cmd: MacroCommand) => {
    if (cmd === "run-droplet") {
      handleRunDroplet();
      return;
    }
    if (cmd === "run-brush") {
      handleBrushTool();
      return;
    }
    if (cmd === "run-pencil") {
      handlePencilTool();
      return;
    }
    if (cmd === "run-mixer") {
      handleMixerBrush();
      return;
    }
    if (cmd === "run-gradient") {
      handleGradientTool();
      return;
    }
    if (cmd === "run-paint-bucket") {
      handlePaintBucket();
      return;
    }
    await handleExportTimelineVideo();
  };

  const runAndMaybeRecordMacroCommand = async (cmd: MacroCommand) => {
    maybeRecordMacroCommand(cmd);
    await runMacroCommand(cmd);
  };

  const toggleMacroRecording = () => {
    if (!isActionRecording) {
      setRecordedCommands([]);
      setIsActionRecording(true);
      return;
    }
    setIsActionRecording(false);
    if (recordedCommands.length === 0) return;
    const name = actionNameDraft.trim() || `Action ${actions.length + 1}`;
    const next: MacroAction = {
      id: crypto.randomUUID(),
      name,
      steps: recordedCommands.length,
      commands: recordedCommands,
      runCount: 0
    };
    setActions((prev) => [next, ...prev]);
    setRecordedCommands([]);
    setActionNameDraft(`Action ${actions.length + 2}`);
  };

  const discardMacroRecording = () => {
    setRecordedCommands([]);
    setIsActionRecording(false);
  };

  const runSavedAction = async (id: string) => {
    const action = actions.find((a) => a.id === id);
    if (!action) return;
    replayingActionRef.current = true;
    try {
      for (const cmd of action.commands) {
        await runMacroCommand(cmd);
        await new Promise((r) => setTimeout(r, 120));
      }
    } finally {
      replayingActionRef.current = false;
    }
    setActions((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, runCount: (item.runCount ?? 0) + 1, lastRunAt: new Date().toISOString() }
          : item
      )
    );
  };

  const handleApplyDataDrivenGraphics = async () => {
    if (!canvasRef.current || collabRole === 'viewer') return;
    const rows = dataRows.trim().split(/\r?\n/).map((r) => r.split(",").map((v) => v.trim()));
    if (rows.length < 2) {
      alert("Provide CSV rows with header and at least one data row.");
      return;
    }
    const headers = rows[0];
    const data = rows.slice(1);

    const resolveTemplate = (rowValues: string[], rowIndex: number) => {
      const map = Object.fromEntries(headers.map((key, idx) => [key, rowValues[idx] || ""]));
      const withVars = dataTemplate.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_m, token: string) => {
        const key = token.trim();
        if (key in map) return String(map[key] ?? "");
        if (key.toLowerCase() === "row") return String(rowIndex + 1);
        return "";
      });
      return withVars.trim() || `${rowValues[0] || "Untitled"}\n${rowValues[1] || ""}`.trim();
    };

    const renderTemplateLayer = (title: string, body: string, footerPairs: Array<{ key: string; value: string }>) => {
      const out = document.createElement("canvas");
      out.width = 960;
      out.height = 320;
      const ctx = out.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, out.width, out.height);
      const bg = ctx.createLinearGradient(0, 0, out.width, out.height);
      bg.addColorStop(0, "rgba(59,130,246,0.14)");
      bg.addColorStop(1, "rgba(16,185,129,0.08)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "600 26px Segoe UI, sans-serif";
      ctx.fillText(title, 28, 42);

      ctx.fillStyle = "#dbeafe";
      ctx.font = "500 18px Segoe UI, sans-serif";
      body.split("\n").forEach((line, idx) => {
        ctx.fillText(line, 28, 88 + idx * 28);
      });

      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(24, 222, out.width - 48, 72);
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "500 13px Segoe UI, sans-serif";
      footerPairs.slice(0, 4).forEach((pair, idx) => {
        ctx.fillText(`${pair.key}: ${pair.value || "-"}`, 34 + idx * 220, 262);
      });
      return out;
    };

    if (dataDrivenMode === "single") {
      const out = document.createElement("canvas");
      out.width = 960;
      out.height = Math.max(240, 90 + data.length * 88);
      const ctx = out.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "600 28px Segoe UI, sans-serif";
      ctx.fillText("Data-driven Graphics", 28, 44);
      data.forEach((row, idx) => {
        const y = 96 + idx * 84;
        ctx.fillStyle = idx % 2 === 0 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)";
        ctx.fillRect(20, y - 28, out.width - 40, 62);
        const rendered = resolveTemplate(row, idx);
        const lines = rendered.split("\n").filter((line) => line.trim().length > 0);
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "500 17px Segoe UI, sans-serif";
        ctx.fillText(lines[0] || `Row ${idx + 1}`, 34, y);
        if (lines[1]) {
          ctx.fillStyle = "#94a3b8";
          ctx.font = "400 14px Segoe UI, sans-serif";
          ctx.fillText(lines[1], 34, y + 20);
        }
      });
      canvasRef.current.addImageLayer(
        out.toDataURL("image/png"),
        "Data-driven Graphic",
        { automation: "variables", mode: "single", template: dataTemplate, rowCount: data.length },
        { addToHistory: true, layerType: 'image' }
      );
      setDataDrivenSummary(`Generated 1 combined graphic from ${data.length} row(s).`);
      return;
    }

    let generated = 0;
    for (let index = 0; index < data.length; index += 1) {
      const row = data[index];
      const rendered = resolveTemplate(row, index);
      const lines = rendered.split("\n").filter((line) => line.trim().length > 0);
      const footerPairs = headers.map((key, idx) => ({ key, value: row[idx] || "" }));
      const layer = renderTemplateLayer(lines[0] || `Row ${index + 1}`, lines.slice(1).join("\n"), footerPairs);
      if (!layer) continue;
      canvasRef.current.addImageLayer(
        layer.toDataURL("image/png"),
        `Data Row ${index + 1}`,
        { automation: "variables", mode: "rows", rowIndex: index, template: dataTemplate, values: Object.fromEntries(headers.map((h, i) => [h, row[i] || ""])) },
        { addToHistory: true, layerType: 'image' }
      );
      generated += 1;
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
    setDataDrivenSummary(`Generated ${generated} data-driven layer(s).`);
  };

  const runKnownScriptCommand = async (rawCommand: string) => {
    const cmd = rawCommand.trim().toLowerCase();
    if (!cmd) return "Empty command.";
    if (cmd === "ai sky") {
      handleSkyReplacement();
      return "Applied AI sky replacement preset.";
    }
    if (cmd === "filters vintage") {
      if (!activeLayerId) return "No active layer for vintage filter.";
      setLayerFilter(activeLayerId, 'lutPreset', 3);
      setLayerFilter(activeLayerId, 'contrast', 0.18);
      setLayerFilter(activeLayerId, 'photoFilter', 0.24);
      return "Applied vintage filter stack.";
    }
    if (cmd === "export assets") {
      await handleGenerateAssets();
      return "Triggered asset export.";
    }
    if (cmd === "batch open") {
      handleBatchProcess();
      return "Opened batch file picker.";
    }
    if (cmd === "video export") {
      await handleExportTimelineVideo();
      return "Exported timeline video.";
    }
    if (cmd === "droplet run") {
      handleRunDroplet();
      return "Ran active droplet preset.";
    }
    if (cmd === "variables run") {
      await handleApplyDataDrivenGraphics();
      return "Ran variables/data-driven generation.";
    }
    throw new Error("Unknown script command. Try: ai sky | filters vintage | export assets | batch open | video export | droplet run | variables run");
  };

  const handleRunQuickScriptCommand = async () => {
    try {
      const result = await runKnownScriptCommand(scriptCommand);
      setScriptOutput(`[Quick] ${result}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Script command failed.";
      setScriptOutput(`[Quick] ${message}`);
      alert(message);
    }
  };

  const handleRunScriptCommand = async () => {
    const code = scriptBody.trim();
    if (!code) return;
    const logs: string[] = [];
    const log = (message: string) => {
      logs.push(message);
    };
    try {
      if (scriptLanguage === "javascript") {
        const api = {
          command: async (name: string) => {
            const result = await runKnownScriptCommand(name);
            log(`[command] ${result}`);
          },
          setFilter: (name: string, value: number) => {
            if (!activeLayerId) throw new Error("No active layer selected.");
            setLayerFilter(activeLayerId, name, value);
            log(`[filter] ${name}=${value}`);
          },
          runDroplet: () => {
            handleRunDroplet();
            log("[droplet] Ran active droplet preset.");
          },
          runVariables: async () => {
            await handleApplyDataDrivenGraphics();
            log("[variables] Generated data-driven layers.");
          },
          log
        };
        const runner = new Function("api", `"use strict"; return (async () => { ${code}\n})();`);
        await runner(api);
      } else {
        const lines = code.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        for (const line of lines) {
          if (line.startsWith("'") || /^rem\b/i.test(line)) continue;
          const setFilterMatch = line.match(/^setfilter\s+([a-z0-9_-]+)\s+(-?\d+(?:\.\d+)?)$/i);
          if (setFilterMatch) {
            if (!activeLayerId) throw new Error("No active layer selected.");
            const [, filterName, filterValue] = setFilterMatch;
            setLayerFilter(activeLayerId, filterName, Number(filterValue));
            log(`[vb] setfilter ${filterName} ${filterValue}`);
            continue;
          }
          const commandMatch = line.match(/^command\s+(.+)$/i);
          if (commandMatch) {
            const output = await runKnownScriptCommand(commandMatch[1]);
            log(`[vb] ${output}`);
            continue;
          }
          if (/^rundroplet$/i.test(line)) {
            handleRunDroplet();
            log("[vb] Ran active droplet preset.");
            continue;
          }
          if (/^runvariables$/i.test(line)) {
            await handleApplyDataDrivenGraphics();
            log("[vb] Ran data-driven generation.");
            continue;
          }
          throw new Error(`Unsupported VBScript line: ${line}`);
        }
      }
      setScriptOutput(`Success\n${logs.join("\n")}`.trim());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Script execution failed.";
      setScriptOutput(`Error\n${logs.join("\n")}\n${message}`.trim());
      alert(message);
    }
  };

  const handleToggleThirdPartyPluginInstall = (id: 'vintage-fx' | 'watercolor-brush' | 'bg-ai-remix' | 'film-grain-pro' | 'comic-ink-brush' | 'object-cutout-ai') => {
    setInstalledThirdPartyPlugins((prev) => ({ ...prev, [id]: !prev[id] }));
    setThirdPartyPluginStatus((prev) => prev && prev.includes(id) ? null : `${prev ?? ""}`.trim() || null);
  };

  const handleRunThirdPartyPlugin = async () => {
    if (!installedThirdPartyPlugins[selectedPlugin]) {
      setThirdPartyPluginStatus(`Plugin "${selectedPlugin}" is not installed.`);
      return;
    }
    const strength = Math.max(0, Math.min(1, thirdPartyPluginStrength / 100));
    const detail = Math.max(0, Math.min(1, thirdPartyPluginDetail / 100));

    if (selectedPlugin === 'vintage-fx') {
      if (activeLayerId) {
        setLayerFilter(activeLayerId, 'lutPreset', 3);
        setLayerFilter(activeLayerId, 'contrast', 0.08 + strength * 0.22);
        setLayerFilter(activeLayerId, 'photoFilter', 0.04 + detail * 0.24);
        setLayerFilter(activeLayerId, 'grain', 0.04 + strength * 0.18);
      }
      setThirdPartyPluginStatus("Applied Vintage FX Pack.");
    } else if (selectedPlugin === 'watercolor-brush') {
      setBrushTexture(62);
      setBrushTextureScale(120 + Math.round(detail * 120));
      setBrushFlow(Math.max(18, Math.round(48 - strength * 18)));
      setBrushJitter(Math.round(12 + detail * 38));
      handleMixerBrush();
      setThirdPartyPluginStatus("Applied Watercolor Brush Kit.");
    } else if (selectedPlugin === 'bg-ai-remix') {
      canvasRef.current?.applySemanticSelection("background");
      setShowPromptBar(true);
      setAiPromptDraft(`Restyle the background with ${thirdPartyPluginUseAiAssist ? "AI-guided" : "manual"} editorial lighting. Strength ${Math.round(strength * 100)}%, detail ${Math.round(detail * 100)}%.`);
      setThirdPartyPluginStatus("Prepared AI Background Remix prompt.");
    } else if (selectedPlugin === 'film-grain-pro') {
      if (activeLayerId) {
        setLayerFilter(activeLayerId, 'addNoise', 0.06 + strength * 0.26);
        setLayerFilter(activeLayerId, 'contrast', 0.05 + detail * 0.18);
        setLayerFilter(activeLayerId, 'levels', 0.03 + strength * 0.14);
      }
      setThirdPartyPluginStatus("Applied Film Grain Pro.");
    } else if (selectedPlugin === 'comic-ink-brush') {
      setBrushShape("square");
      setBrushHardness(Math.min(100, Math.round(76 + detail * 24)));
      setBrushSpacing(Math.max(1, Math.round(4 + (1 - detail) * 8)));
      setBrushFlow(Math.max(22, Math.round(58 - strength * 20)));
      handlePencilTool();
      setThirdPartyPluginStatus("Applied Comic Ink Brush.");
    } else if (selectedPlugin === 'object-cutout-ai') {
      canvasRef.current?.applySemanticSelection("foreground");
      setShowPromptBar(true);
      setAiPromptDraft(`Cut out and refine the subject edge for web composition. Feather ${Math.round(strength * 30)}px, detail ${Math.round(detail * 100)}%.`);
      setThirdPartyPluginStatus("Prepared Object Cutout AI prompt.");
    }

    if (activeLayerId) {
      const active = layers.find((layer) => layer.id === activeLayerId);
      if (active) {
        updateLayer(activeLayerId, {
          aiData: {
            ...(active.aiData as any),
            thirdPartyPlugin: {
              id: selectedPlugin,
              strength: thirdPartyPluginStrength,
              detail: thirdPartyPluginDetail,
              aiAssist: thirdPartyPluginUseAiAssist
            }
          } as any
        });
      }
    }
  };

  const stepTimeline = (delta: number) => {
    setTimelineFrame((prev) => {
      const maxFrame = Math.max(1, timelineDurationFrames - 1);
      const next = prev + delta;
      if (next < 0) return maxFrame;
      if (next > maxFrame) return 0;
      return next;
    });
  };

  const toggleCurrentKeyframe = () => {
    setTimelineKeyframes((prev) => {
      if (prev.includes(timelineFrame)) {
        return prev.filter((f) => f !== timelineFrame).sort((a, b) => a - b);
      }
      return [...prev, timelineFrame].sort((a, b) => a - b);
    });
  };

  const jumpToNextKeyframe = () => {
    if (timelineKeyframes.length === 0) return;
    const next = timelineKeyframes.find((f) => f > timelineFrame);
    setTimelineFrame(next ?? timelineKeyframes[0]);
  };

  const jumpToPrevKeyframe = () => {
    if (timelineKeyframes.length === 0) return;
    const prev = [...timelineKeyframes].reverse().find((f) => f < timelineFrame);
    setTimelineFrame(prev ?? timelineKeyframes[timelineKeyframes.length - 1]);
  };

  useEffect(() => {
    const max = Math.max(1, timelineDurationFrames - 1);
    setVideoEditInFrame((prev) => Math.max(0, Math.min(prev, max - 1)));
    setVideoEditOutFrame((prev) => Math.max(1, Math.min(prev, max)));
  }, [timelineDurationFrames]);

  useEffect(() => {
    setVideoEditOutFrame((prev) => Math.max(videoEditInFrame + 1, prev));
  }, [videoEditInFrame]);

  const toggleCurrentAnimationFrame = () => {
    setFrameAnimationFrames((prev) => {
      if (prev.includes(timelineFrame)) {
        return prev.filter((f) => f !== timelineFrame).sort((a, b) => a - b);
      }
      return [...prev, timelineFrame].sort((a, b) => a - b);
    });
  };

  const drawTimelineMotionFrame = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    width: number,
    height: number,
    absoluteFrame: number,
    frameCount: number,
    transitionStyle: "cut" | "fade" | "dissolve" | "wipe-left" | "zoom-fade" = "fade"
  ) => {
    const t = absoluteFrame / Math.max(1, frameCount - 1);
    const zoomBase = transitionStyle === "zoom-fade" ? 0.12 : 0.06;
    const zoom = 1 + Math.sin(t * Math.PI) * zoomBase;
    const panX = Math.sin(t * Math.PI * 2) * 14;
    const panY = Math.cos(t * Math.PI * 2) * 8;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2 + panX, height / 2 + panY);
    ctx.scale(zoom, zoom);
    ctx.drawImage(img, -width / 2, -height / 2, width, height);
    ctx.restore();
    if (transitionStyle === "fade") {
      const head = Math.max(0, (0.12 - t) / 0.12);
      const tail = Math.max(0, (t - 0.88) / 0.12);
      const alpha = Math.min(1, (head + tail) * 0.85);
      if (alpha > 0) {
        ctx.fillStyle = `rgba(0,0,0,${alpha.toFixed(3)})`;
        ctx.fillRect(0, 0, width, height);
      }
      return;
    }
    if (transitionStyle === "dissolve") {
      const dissolve = 0.45 + Math.sin(t * Math.PI * 4) * 0.2;
      for (let i = 0; i < 120; i += 1) {
        const px = Math.floor(((i * 97) % 100) / 100 * width);
        const py = Math.floor(((i * 53) % 100) / 100 * height);
        const size = 2 + (i % 4);
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, dissolve - (i % 5) * 0.06).toFixed(3)})`;
        ctx.fillRect(px, py, size, size);
      }
      return;
    }
    if (transitionStyle === "wipe-left") {
      const wipeX = Math.round(width * t);
      const grad = ctx.createLinearGradient(Math.max(0, wipeX - 24), wipeX + 12, 0, 0);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.3)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, wipeX, height);
      return;
    }
    if (transitionStyle === "zoom-fade") {
      const glow = 0.08 + Math.sin(t * Math.PI) * 0.15;
      ctx.fillStyle = `rgba(255,255,255,${glow.toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
    }
  };

  const handleExportFrameAnimationGif = async () => {
    if (!canvasRef.current || isExportingGif) return;
    const snapshot = canvasRef.current.getCanvasSnapshot();
    if (!snapshot) return;
    const picked = frameAnimationFrames.length > 0 ? frameAnimationFrames : (timelineKeyframes.length > 0 ? timelineKeyframes : [timelineFrame]);
    const frames = [...new Set(picked.map((f) => Math.max(0, Math.min(Math.round(f), Math.max(1, timelineDurationFrames - 1)))))].sort((a, b) => a - b);
    if (frames.length === 0) return;
    setIsExportingGif(true);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("Unable to load snapshot"));
        i.src = snapshot;
      });

      const out = document.createElement("canvas");
      out.width = img.naturalWidth;
      out.height = img.naturalHeight;
      const ctx = out.getContext("2d");
      if (!ctx) return;
      const frameCount = Math.max(24, timelineDurationFrames);
      const fps = Math.max(8, Math.min(30, timelineFps));

      const canRecordGif = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("image/gif");
      if (canRecordGif) {
        const stream = out.captureStream(fps);
        const chunks: Blob[] = [];
        const recorder = new MediaRecorder(stream, { mimeType: "image/gif" as any });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        const finished = new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
        });
        recorder.start();
        for (const frameValue of frames) {
          drawTimelineMotionFrame(ctx, img, out.width, out.height, frameValue % frameCount, frameCount);
          await new Promise((r) => setTimeout(r, 1000 / fps));
        }
        recorder.stop();
        await finished;
        const blob = new Blob(chunks, { type: "image/gif" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `zerothlayer-frame-animation-${Date.now()}.gif`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }

      for (let i = 0; i < frames.length; i += 1) {
        const frameValue = frames[i];
        drawTimelineMotionFrame(ctx, img, out.width, out.height, frameValue % frameCount, frameCount);
        const link = document.createElement("a");
        link.href = out.toDataURL("image/png");
        link.download = `zerothlayer-frame-${String(i + 1).padStart(3, "0")}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await new Promise((r) => setTimeout(r, 24));
      }
      alert("Native GIF encoding is unavailable in this browser. Exported PNG frame sequence instead.");
    } finally {
      setIsExportingGif(false);
    }
  };

  const handleExportTimelineVideo = async () => {
    maybeRecordMacroCommand("export-timeline");
    if (!canvasRef.current || isExportingVideo) return;
    const snapshot = canvasRef.current.getCanvasSnapshot();
    if (!snapshot) return;
    setIsExportingVideo(true);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("Unable to load snapshot"));
        i.src = snapshot;
      });

      const out = document.createElement("canvas");
      out.width = Math.max(2, Math.round(img.naturalWidth * timelineExportScale));
      out.height = Math.max(2, Math.round(img.naturalHeight * timelineExportScale));
      const ctx = out.getContext("2d");
      if (!ctx) return;
      const fps = Math.max(12, Math.min(60, timelineFps));
      const frameCount = Math.max(24, timelineDurationFrames);
      const durationMs = (frameCount / fps) * 1000;
      const stream = out.captureStream(fps);
      const tracks = [...stream.getVideoTracks()];
      let audioCtx: AudioContext | null = null;
      let osc: OscillatorNode | null = null;
      let pulseOsc: OscillatorNode | null = null;
      let pulseLfo: OscillatorNode | null = null;

      if (includeTimelineAudio && timelineAudioMode !== "none") {
        audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        const gain = audioCtx.createGain();
        gain.gain.value = (Math.max(0, Math.min(100, timelineAudioLevel)) / 100) * 0.05;
        gain.connect(dest);
        if (timelineAudioMode === "tone") {
          osc = audioCtx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(220, audioCtx.currentTime);
          osc.frequency.linearRampToValueAtTime(440, audioCtx.currentTime + durationMs / 1000);
          osc.connect(gain);
          osc.start();
        } else {
          pulseOsc = audioCtx.createOscillator();
          pulseLfo = audioCtx.createOscillator();
          const gate = audioCtx.createGain();
          pulseOsc.type = "square";
          pulseOsc.frequency.value = 110;
          pulseLfo.type = "sawtooth";
          pulseLfo.frequency.value = Math.max(1, fps / 6);
          gate.gain.value = 0;
          pulseLfo.connect(gate.gain);
          pulseOsc.connect(gate);
          gate.connect(gain);
          pulseOsc.start();
          pulseLfo.start();
        }
        dest.stream.getAudioTracks().forEach((t) => tracks.push(t));
      }

      const composite = new MediaStream(tracks);
      const chunks: Blob[] = [];
      const mimeCandidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
      const mimeType = mimeCandidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "video/webm";
      const recorder = new MediaRecorder(composite, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      const finished = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      recorder.start();
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
        const absoluteFrame = (timelineFrame + frameIndex) % Math.max(1, frameCount);
        drawTimelineMotionFrame(ctx, img, out.width, out.height, absoluteFrame, frameCount, timelineTransitionStyle);
        await new Promise((r) => setTimeout(r, 1000 / fps));
      }
      recorder.stop();
      await finished;
      if (osc) osc.stop();
      if (pulseOsc) pulseOsc.stop();
      if (pulseLfo) pulseLfo.stop();
      if (audioCtx) await audioCtx.close();
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `zerothlayer-timeline-${Date.now()}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingVideo(false);
    }
  };

  useEffect(() => {
    if (!isTimelinePlaying) return;
    const fps = Math.max(12, Math.min(60, timelineFps));
    const id = window.setInterval(() => {
      setTimelineFrame((prev) => {
        const maxFrame = Math.max(1, timelineDurationFrames - 1);
        return prev >= maxFrame ? 0 : prev + 1;
      });
    }, Math.max(16, Math.round(1000 / fps)));
    return () => window.clearInterval(id);
  }, [isTimelinePlaying, timelineFps, timelineDurationFrames]);

  const handleUVTextureEdit = async () => {
    if (selectedLayer?.type === "threeD" && activeLayerId) {
      setUvPreviewEnabled(true);
      await handleUpdateActive3DLayer();
      return;
    }
    await withRegionCanvas(
      "UV Texture Edit",
      (ctx, w, h) => {
        const grid = Math.max(4, Math.min(32, Math.round(uvGridDensity)));
        const seamAlpha = Math.max(0, Math.min(1, uvSeamStrength / 100));
        const checker = Math.max(0, Math.min(1, uvCheckerOpacity / 100));
        const distort = Math.max(0, Math.min(1, uvDistortion / 100));
        const cellW = w / grid;
        const cellH = h / grid;

        for (let gy = 0; gy < grid; gy += 1) {
          for (let gx = 0; gx < grid; gx += 1) {
            if ((gx + gy) % 2 !== 0) continue;
            ctx.fillStyle = `rgba(248,250,252,${(checker * 0.9).toFixed(3)})`;
            ctx.fillRect(gx * cellW, gy * cellH, cellW, cellH);
          }
        }
        for (let i = 0; i <= grid; i += 1) {
          const t = i / grid;
          const x = t * w;
          const y = t * h;
          const swayX = Math.sin(t * Math.PI * 2) * distort * Math.max(6, w * 0.03);
          const swayY = Math.cos(t * Math.PI * 2) * distort * Math.max(6, h * 0.03);
          ctx.strokeStyle = "rgba(15,23,42,0.35)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.bezierCurveTo(x + swayX, h * 0.33, x - swayX, h * 0.66, x, h);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.bezierCurveTo(w * 0.33, y + swayY, w * 0.66, y - swayY, w, y);
          ctx.stroke();
        }
        ctx.strokeStyle = `rgba(14,165,233,${(0.24 + seamAlpha * 0.64).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.5, 0);
        ctx.lineTo(w * 0.5, h);
        ctx.stroke();
        ctx.strokeStyle = `rgba(249,115,22,${(0.2 + seamAlpha * 0.6).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.5);
        ctx.lineTo(w, h * 0.5);
        ctx.stroke();

        ctx.fillStyle = "rgba(15,23,42,0.82)";
        ctx.fillRect(10, 10, 256, 58);
        ctx.fillStyle = "#f8fafc";
        ctx.font = "600 13px Segoe UI, sans-serif";
        ctx.fillText("UV texture guide", 18, 31);
        ctx.font = "400 11px Segoe UI, sans-serif";
        ctx.fillText(`Grid ${grid}  Seams ${uvSeamStrength}%  Distort ${uvDistortion}%`, 18, 48);
      }
    );
  };

  const refreshProjects = async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    if (res.ok) setProjects(data.projects || []);
  };

  const refreshSnapshots = async (projectId: string = currentProjectId) => {
    const res = await fetch(`/api/projects/snapshots?projectId=${encodeURIComponent(projectId)}`);
    const data = await res.json();
    if (res.ok) setSnapshots(data.snapshots || []);
  };

  const handleSignIn = async () => {
    const name = prompt('Enter your name for local auth')?.trim();
    if (!name) return;
    const res = await fetch('/api/auth/local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (res.ok) {
      setAuthUser(data.user);
    }
  };

  const handleCreateProject = async () => {
    const name = prompt('Project name')?.trim();
    if (!name) return;
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ownerId: authUser?.id || 'local-user' })
    });
    const data = await res.json();
    if (res.ok && data.project) {
      setCurrentProjectId(data.project.id);
      await refreshProjects();
      await refreshSnapshots(data.project.id);
    }
  };

  const handleSaveCloudProject = async () => {
    if (!canvasRef.current) return;
    const payload = canvasRef.current.getProjectPayload();
    if (!payload) return;

    const targetId = currentProjectId || crypto.randomUUID();
    const res = await fetch(`/api/projects/${targetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: projects.find((p) => p.id === targetId)?.name || 'Untitled Project',
        ownerId: authUser?.id || 'local-user',
        payload
      })
    });
    if (res.ok) {
      setCurrentProjectId(targetId);
      await refreshProjects();
    }
  };

  const handleLoadCloudProject = async (projectId: string) => {
    const res = await fetch(`/api/projects/${projectId}`);
    const data = await res.json();
    if (res.ok && data?.project?.payload && canvasRef.current) {
      await canvasRef.current.loadProjectPayload(data.project.payload);
      setCurrentProjectId(projectId);
      await refreshSnapshots(projectId);
    }
  };

  const handleSaveSnapshot = async () => {
    if (!canvasRef.current) return;
    const payload = canvasRef.current.getProjectPayload();
    if (!payload) return;

    const res = await fetch('/api/projects/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: currentProjectId,
        name: snapshotName.trim() || undefined,
        payload
      })
    });
    if (res.ok) {
      setSnapshotName("");
      await refreshSnapshots();
    }
  };

  const handleRestoreSnapshot = async (snapshot: any) => {
    if (!canvasRef.current || !snapshot?.payload) return;
    await canvasRef.current.loadProjectPayload(snapshot.payload);
  };

  const handleCompareSnapshot = (snapshot: any) => {
    setComparePreview(snapshot?.payload?.preview || null);
    setShowCompare(Boolean(snapshot?.payload?.preview));
  };

  const handleCreateShare = async (mode: 'view' | 'edit') => {
    const res = await fetch('/api/share-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: currentProjectId, mode })
    });
    const data = await res.json();
    if (res.ok) {
      const absolute = `${window.location.origin}${data.url}`;
      setShareUrl(absolute);
      setEmbedSnippet(`<iframe src="${absolute}" width="960" height="540" style="border:0;" loading="lazy"></iframe>`);
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const thread: CommentThread = {
      id: crypto.randomUUID(),
      text: newComment.trim(),
      x: selection?.x ?? 0,
      y: selection?.y ?? 0,
      selection: selection ? { x: selection.x, y: selection.y, width: selection.width, height: selection.height } : undefined,
      resolved: false,
      replies: [],
      createdAt: new Date().toISOString()
    };
    setComments((prev) => [thread, ...prev]);
    setNewComment("");
  };

  const handleReply = (id: string) => {
    const text = prompt('Reply')?.trim();
    if (!text) return;
    setComments((prev) =>
      prev.map((thread) =>
        thread.id === id
          ? {
            ...thread,
            replies: [...thread.replies, { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() }]
          }
          : thread
      )
    );
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [providerName, setProviderName] = useState<string>('gemini');

  const handleGenerate = async (prompt: string) => {
    if (collabRole === 'viewer') return;
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
          prompt: prompt.trim(),
          metadata: {
            regionBounds: {
              x: Math.round(selection.x),
              y: Math.round(selection.y),
              width: Math.round(selection.width),
              height: Math.round(selection.height),
            },
            featherAmount: 0,
            outputFormat: 'png',
          },
          providerName
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      console.log("Generation successful");

      // Add the result as a new layer
      if (data.image) {
        const resultBounds = data.regionBounds || {
          x: Math.round(selection.x),
          y: Math.round(selection.y),
          width: Math.round(selection.width),
          height: Math.round(selection.height),
        };

        canvasRef.current.addImageLayer(data.image, `AI: ${prompt}`, {
          prompt,
          seed: data.seed,
          provider: data.provider,
          context: data.context,
          originalMask: genData.mask,
          regionBounds: resultBounds
        }, {
          left: Number(resultBounds.x) || 0,
          top: Number(resultBounds.y) || 0,
          blendMode: 'normal',
          addToHistory: true
        });
        canvasRef.current.clearSelection();
        setShowPromptBar(false);
      }

    } catch (error) {
      console.error(error);
      alert("Error generating image. Check console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  const addLibraryAsset = (asset: NewLibraryAsset) => {
    const id = crypto.randomUUID();
    setLibraryAssets((prev) => [{ id, ...asset } as LibraryAsset, ...prev]);
  };

  const handleSaveColorAsset = () => {
    addLibraryAsset({
      name: `Color ${activeColor.toUpperCase()}`,
      type: "color",
      color: activeColor
    });
  };

  const handleSaveGradientAsset = () => {
    addLibraryAsset({
      name: `Gradient ${gradientA.toUpperCase()}→${gradientB.toUpperCase()}`,
      type: "gradient",
      a: gradientA,
      b: gradientB
    });
  };

  const handleSaveTextStyleAsset = () => {
    addLibraryAsset({
      name: `Text ${fontSize}px ${textAlign} ${textDirection === "vertical" ? "V" : "H"}`,
      type: "textStyle",
      fontSize,
      fontFamily,
      fontWeight,
      italic: textItalic,
      underline: textUnderline,
      lineHeight,
      tracking,
      paragraphSpacing,
      paragraphIndent,
      textAlign,
      textDirection,
      liga: openTypeLiga,
      discretionaryLiga: openTypeDiscretionaryLiga,
      kerning: openTypeKerning,
      oldStyleFigures: openTypeOldStyleFigures,
      smallCaps: openTypeSmallCaps
    });
  };

  const handleSaveBrushPresetAsset = () => {
    addLibraryAsset({
      name: `Brush ${brushShape} ${brushSize}px`,
      type: "brushPreset",
      size: brushSize,
      hardness: brushHardness,
      spacing: brushSpacing,
      shape: brushShape,
      flow: brushFlow,
      jitter: brushJitter,
      texture: brushTexture,
      textureScale: brushTextureScale
    });
  };

  const handleApplyLibraryAsset = (id: string) => {
    const asset = libraryAssets.find((item) => item.id === id);
    if (!asset) return;
    if (asset.type === "color") {
      setActiveColor(asset.color);
      return;
    }
    if (asset.type === "gradient") {
      setGradientA(asset.a);
      setGradientB(asset.b);
      return;
    }
    if (asset.type === "textStyle") {
      setFontSize(asset.fontSize);
      setFontFamily(asset.fontFamily ?? "sans");
      setFontWeight(asset.fontWeight ?? 500);
      setTextItalic(asset.italic ?? false);
      setTextUnderline(asset.underline ?? false);
      setLineHeight(asset.lineHeight);
      setTracking(asset.tracking);
      setParagraphSpacing(asset.paragraphSpacing ?? 10);
      setParagraphIndent(asset.paragraphIndent ?? 0);
      setTextAlign(asset.textAlign);
      setTextDirection(asset.textDirection === "vertical" ? "vertical" : "horizontal");
      setOpenTypeLiga(asset.liga);
      setOpenTypeDiscretionaryLiga(asset.discretionaryLiga ?? false);
      setOpenTypeKerning(asset.kerning ?? true);
      setOpenTypeOldStyleFigures(asset.oldStyleFigures ?? false);
      setOpenTypeSmallCaps(asset.smallCaps);
      return;
    }
    setBrushSize(asset.size);
    setBrushHardness(asset.hardness);
    setBrushSpacing(asset.spacing);
    setBrushShape(asset.shape);
    setBrushFlow(asset.flow);
    setBrushJitter(asset.jitter);
    setBrushTexture(asset.texture);
    setBrushTextureScale(asset.textureScale);
  };

  useEffect(() => {
    if (!activeLayerId) return;
    const active = layers.find((layer) => layer.id === activeLayerId);
    if (!active) return;
    if (active.linkedAsset && typeof active.externalSrc === "string" && active.externalSrc.trim()) {
      setPlaceLinkedUrl(active.externalSrc);
    }
    const smartPayload = (active.aiData as any)?.smartFilters;
    if (smartPayload && typeof smartPayload === "object") {
      if (
        smartPayload.preset === "brightness-contrast" ||
        smartPayload.preset === "cinematic" ||
        smartPayload.preset === "black-white" ||
        smartPayload.preset === "vibrance-pop" ||
        smartPayload.preset === "teal-orange"
      ) {
        setSmartFilterPreset(smartPayload.preset);
      }
      if (typeof smartPayload.strength === "number") {
        setSmartFilterStrength(Math.max(0, Math.min(100, Math.round(smartPayload.strength))));
      }
    }
    const expandPayload = (active.aiData as any)?.aiExpand;
    if (expandPayload && typeof expandPayload === "object") {
      if (typeof expandPayload.percent === "number") setGenerativeExpandPercent(Math.max(2, Math.min(60, Math.round(expandPayload.percent))));
      if (
        expandPayload.direction === "all" ||
        expandPayload.direction === "horizontal" ||
        expandPayload.direction === "vertical" ||
        expandPayload.direction === "left" ||
        expandPayload.direction === "right" ||
        expandPayload.direction === "top" ||
        expandPayload.direction === "bottom"
      ) {
        setGenerativeExpandDirection(expandPayload.direction);
      }
      if (expandPayload.fill === "gradient" || expandPayload.fill === "mirror" || expandPayload.fill === "blur") {
        setGenerativeExpandFill(expandPayload.fill);
      }
      if (expandPayload.source === "merged" || expandPayload.source === "active") {
        setGenerativeExpandSource(expandPayload.source);
      }
    }
    const skyPayload = (active.aiData as any)?.aiSkyReplacement;
    if (skyPayload && typeof skyPayload === "object") {
      if (skyPayload.style === "sunset" || skyPayload.style === "clear" || skyPayload.style === "storm" || skyPayload.style === "twilight") {
        setSkyReplacementStyle(skyPayload.style);
      }
      if (typeof skyPayload.intensity === "number") {
        setSkyReplacementIntensity(Math.max(0, Math.min(100, Math.round(skyPayload.intensity))));
      }
      if (typeof skyPayload.horizon === "number") {
        setSkyReplacementHorizon(Math.max(20, Math.min(80, Math.round(skyPayload.horizon))));
      }
      if (typeof skyPayload.clouds === "number") {
        setSkyReplacementClouds(Math.max(0, Math.min(100, Math.round(skyPayload.clouds))));
      }
    }
    const removePayload = (active.aiData as any)?.aiRemoveBackground;
    if (removePayload && typeof removePayload === "object") {
      if (typeof removePayload.feather === "number") {
        setRemoveBgFeather(Math.max(0, Math.min(100, Math.round(removePayload.feather))));
      }
      if (typeof removePayload.subjectScale === "number") {
        setRemoveBgSubjectScale(Math.max(20, Math.min(90, Math.round(removePayload.subjectScale))));
      }
      if (typeof removePayload.decontaminate === "number") {
        setRemoveBgDecontaminate(Math.max(0, Math.min(100, Math.round(removePayload.decontaminate))));
      }
      if (removePayload.source === "merged" || removePayload.source === "active") {
        setRemoveBgSource(removePayload.source);
      }
    }
    const srPayload = (active.aiData as any)?.aiUpscale;
    if (srPayload && typeof srPayload === "object") {
      if (srPayload.scale === 2 || srPayload.scale === 3 || srPayload.scale === 4) {
        setSuperResScale(srPayload.scale);
      }
      if (typeof srPayload.sharpen === "number") {
        setSuperResSharpen(Math.max(0, Math.min(100, Math.round(srPayload.sharpen))));
      }
      if (typeof srPayload.denoise === "number") {
        setSuperResDenoise(Math.max(0, Math.min(100, Math.round(srPayload.denoise))));
      }
      if (srPayload.source === "merged" || srPayload.source === "active") {
        setSuperResSource(srPayload.source);
      }
    }
    const cameraRawPayload = (active.aiData as any)?.cameraRaw;
    if (cameraRawPayload && typeof cameraRawPayload === "object") {
      if (typeof cameraRawPayload.strength === "number") setCameraRawStrength(Math.max(0, Math.min(1, cameraRawPayload.strength)));
      if (cameraRawPayload.profile === "adobe-color" || cameraRawPayload.profile === "portrait" || cameraRawPayload.profile === "landscape" || cameraRawPayload.profile === "vivid" || cameraRawPayload.profile === "bw") {
        setCameraRawProfile(cameraRawPayload.profile);
      }
      if (typeof cameraRawPayload.temperature === "number") setCameraRawTemperature(Math.max(-100, Math.min(100, Math.round(cameraRawPayload.temperature))));
      if (typeof cameraRawPayload.tint === "number") setCameraRawTint(Math.max(-100, Math.min(100, Math.round(cameraRawPayload.tint))));
      if (typeof cameraRawPayload.exposure === "number") setCameraRawExposure(Math.max(-100, Math.min(100, Math.round(cameraRawPayload.exposure))));
      if (typeof cameraRawPayload.contrast === "number") setCameraRawContrast(Math.max(-100, Math.min(100, Math.round(cameraRawPayload.contrast))));
      if (typeof cameraRawPayload.highlights === "number") setCameraRawHighlights(Math.max(-100, Math.min(100, Math.round(cameraRawPayload.highlights))));
      if (typeof cameraRawPayload.shadows === "number") setCameraRawShadows(Math.max(-100, Math.min(100, Math.round(cameraRawPayload.shadows))));
      if (typeof cameraRawPayload.whites === "number") setCameraRawWhites(Math.max(-100, Math.min(100, Math.round(cameraRawPayload.whites))));
      if (typeof cameraRawPayload.blacks === "number") setCameraRawBlacks(Math.max(-100, Math.min(100, Math.round(cameraRawPayload.blacks))));
      if (typeof cameraRawPayload.texture === "number") setCameraRawTexture(Math.max(-100, Math.min(100, Math.round(cameraRawPayload.texture))));
      if (typeof cameraRawPayload.clarity === "number") setCameraRawClarity(Math.max(-100, Math.min(100, Math.round(cameraRawPayload.clarity))));
      if (typeof cameraRawPayload.dehaze === "number") setCameraRawDehaze(Math.max(-100, Math.min(100, Math.round(cameraRawPayload.dehaze))));
      if (typeof cameraRawPayload.vibrance === "number") setCameraRawVibrance(Math.max(-100, Math.min(100, Math.round(cameraRawPayload.vibrance))));
      if (typeof cameraRawPayload.saturation === "number") setCameraRawSaturation(Math.max(-100, Math.min(100, Math.round(cameraRawPayload.saturation))));
    }
    const neuralPayload = (active.aiData as any)?.neuralPlugin;
    if (neuralPayload && typeof neuralPayload === "object") {
      if (neuralPayload.model === "skin-smooth" || neuralPayload.model === "portrait-light" || neuralPayload.model === "colorize" || neuralPayload.model === "style-transfer" || neuralPayload.model === "depth-blur") {
        setNeuralPluginModel(neuralPayload.model);
      }
      if (typeof neuralPayload.strength === "number") setNeuralPluginStrength(Math.max(0, Math.min(100, Math.round(neuralPayload.strength))));
      if (typeof neuralPayload.detail === "number") setNeuralPluginDetail(Math.max(0, Math.min(100, Math.round(neuralPayload.detail))));
      if (typeof neuralPayload.preserveColor === "boolean") setNeuralPluginPreserveColor(neuralPayload.preserveColor);
      if (typeof neuralPayload.autoMask === "boolean") setNeuralPluginAutoMask(neuralPayload.autoMask);
    }
    const thirdPartyPayload = (active.aiData as any)?.thirdPartyPlugin;
    if (thirdPartyPayload && typeof thirdPartyPayload === "object") {
      if (thirdPartyPayload.id === "vintage-fx" || thirdPartyPayload.id === "watercolor-brush" || thirdPartyPayload.id === "bg-ai-remix" || thirdPartyPayload.id === "film-grain-pro" || thirdPartyPayload.id === "comic-ink-brush" || thirdPartyPayload.id === "object-cutout-ai") {
        setSelectedPlugin(thirdPartyPayload.id);
      }
      if (typeof thirdPartyPayload.strength === "number") setThirdPartyPluginStrength(Math.max(0, Math.min(100, Math.round(thirdPartyPayload.strength))));
      if (typeof thirdPartyPayload.detail === "number") setThirdPartyPluginDetail(Math.max(0, Math.min(100, Math.round(thirdPartyPayload.detail))));
      if (typeof thirdPartyPayload.aiAssist === "boolean") setThirdPartyPluginUseAiAssist(thirdPartyPayload.aiAssist);
    }
    if (active.type === "text") {
      const payload = (active.aiData as any)?.textLayer;
      if (!payload || typeof payload !== "object") return;

      if (typeof payload.text === "string") setTextDraft(payload.text);
      if (typeof payload.fontSize === "number") setFontSize(Math.max(8, Math.min(320, payload.fontSize)));
      if (payload.fontFamily === "sans" || payload.fontFamily === "serif" || payload.fontFamily === "mono") setFontFamily(payload.fontFamily);
      if ([300, 400, 500, 600, 700].includes(payload.fontWeight)) setFontWeight(payload.fontWeight);
      setTextItalic(Boolean(payload.textItalic));
      setTextUnderline(Boolean(payload.textUnderline));
      if (typeof payload.lineHeight === "number") setLineHeight(Math.max(0.6, Math.min(4, payload.lineHeight)));
      if (typeof payload.tracking === "number") setTracking(Math.max(-100, Math.min(400, payload.tracking)));
      if (typeof payload.paragraphSpacing === "number") setParagraphSpacing(Math.max(0, Math.min(120, payload.paragraphSpacing)));
      if (typeof payload.paragraphIndent === "number") setParagraphIndent(Math.max(0, Math.min(240, payload.paragraphIndent)));
      if (payload.textAlign === "left" || payload.textAlign === "center" || payload.textAlign === "right") setTextAlign(payload.textAlign);
      if (payload.textDirection === "horizontal" || payload.textDirection === "vertical") setTextDirection(payload.textDirection);

      const ot = payload.openType || {};
      setOpenTypeLiga(Boolean(ot.liga));
      setOpenTypeDiscretionaryLiga(Boolean(ot.discretionaryLiga));
      setOpenTypeKerning(ot.kerning !== false);
      setOpenTypeOldStyleFigures(Boolean(ot.oldStyleFigures));
      setOpenTypeSmallCaps(Boolean(ot.smallCaps));
      return;
    }
    if (active.type === "shape") {
      const payload = (active.aiData as any)?.shapeLayer;
      if (!payload || typeof payload !== "object") return;
      if (payload.shape === "rectangle" || payload.shape === "ellipse" || payload.shape === "polygon" || payload.shape === "custom") {
        setVectorShape(payload.shape);
      }
      if (payload.customShape === "star" || payload.customShape === "arrow" || payload.customShape === "diamond" || payload.customShape === "speech") {
        setCustomShapePreset(payload.customShape);
      }
      if (typeof payload.sides === "number") setPolygonSides(Math.max(3, Math.min(12, Math.round(payload.sides))));
      if (typeof payload.fill === "string" && /^#?[0-9a-f]{6}$/i.test(payload.fill)) {
        setActiveColor(payload.fill.startsWith("#") ? payload.fill : `#${payload.fill}`);
      }
      return;
    }
    if (active.type === "video") {
      const payload = (active.aiData as any)?.videoLayer;
      if (!payload || typeof payload !== "object") return;
      if (typeof payload.durationFrames === "number") {
        const nextDuration = Math.max(24, Math.round(payload.durationFrames));
        setTimelineDurationFrames(nextDuration);
      }
      if (typeof payload.fps === "number") {
        setTimelineFps(Math.max(12, Math.min(60, Math.round(payload.fps))));
      }
      const durationForFrame = typeof payload.durationFrames === "number"
        ? Math.max(24, Math.round(payload.durationFrames))
        : Math.max(24, timelineDurationFrames);
      if (typeof payload.frame === "number") {
        setTimelineFrame(Math.max(0, Math.min(Math.round(payload.frame), durationForFrame - 1)));
      }
      if (Array.isArray(payload.keyframes)) {
        const sanitized: number[] = [...new Set<number>(
          payload.keyframes
            .map((value: unknown) => Number(value))
            .filter((value: number) => Number.isFinite(value))
            .map((value: number) => Math.max(0, Math.min(Math.round(value), durationForFrame - 1)))
        )].sort((a: number, b: number) => a - b);
        setTimelineKeyframes(sanitized);
      }
      if (typeof payload.includeAudio === "boolean") {
        setIncludeTimelineAudio(payload.includeAudio);
      }
      if (typeof payload.rangeIn === "number") {
        setVideoEditInFrame(Math.max(0, Math.min(Math.round(payload.rangeIn), durationForFrame - 2)));
      }
      if (typeof payload.rangeOut === "number") {
        setVideoEditOutFrame(Math.max(1, Math.min(Math.round(payload.rangeOut), durationForFrame - 1)));
      }
      if (typeof payload.speed === "number") {
        setVideoEditSpeed(Math.max(0.25, Math.min(4, Number(payload.speed))));
      }
      if (typeof payload.loop === "boolean") {
        setVideoEditLoop(payload.loop);
      }
      if (payload.transition === "cut" || payload.transition === "fade" || payload.transition === "dissolve") {
        setVideoEditTransition(payload.transition);
      }
      return;
    }
    if (active.type === "threeD") {
      const payload = (active.aiData as any)?.threeDLayer;
      if (!payload || typeof payload !== "object") return;
      if (typeof payload.depth === "number") setLegacy3DDepth(Math.max(0, Math.min(100, Math.round(payload.depth))));
      if (typeof payload.tilt === "number") setLegacy3DTilt(Math.max(-60, Math.min(60, Math.round(payload.tilt))));
      if (typeof payload.wireframe === "number") setLegacy3DWireframe(Math.max(4, Math.min(40, Math.round(payload.wireframe))));
      if (typeof payload.glow === "number") setLegacy3DGlow(Math.max(0, Math.min(100, Math.round(payload.glow))));
      if (payload.object === "cube" || payload.object === "sphere" || payload.object === "cylinder" || payload.object === "torus" || payload.object === "plane") {
        setLegacy3DObject(payload.object);
      }
      if (payload.material === "matte" || payload.material === "metal" || payload.material === "glass" || payload.material === "emissive") {
        setLegacy3DMaterial(payload.material);
      }
      if (typeof payload.roughness === "number") setLegacy3DRoughness(Math.max(0, Math.min(100, Math.round(payload.roughness))));
      if (typeof payload.metalness === "number") setLegacy3DMetalness(Math.max(0, Math.min(100, Math.round(payload.metalness))));
      if (typeof payload.lightAzimuth === "number") setLegacy3DLightAzimuth(Math.max(-180, Math.min(180, Math.round(payload.lightAzimuth))));
      if (typeof payload.lightElevation === "number") setLegacy3DLightElevation(Math.max(0, Math.min(90, Math.round(payload.lightElevation))));
      if (typeof payload.lightIntensity === "number") setLegacy3DLightIntensity(Math.max(0, Math.min(100, Math.round(payload.lightIntensity))));
      if (typeof payload.uvEnabled === "boolean") setUvPreviewEnabled(payload.uvEnabled);
      if (typeof payload.uvGridDensity === "number") setUvGridDensity(Math.max(4, Math.min(32, Math.round(payload.uvGridDensity))));
      if (typeof payload.uvSeamStrength === "number") setUvSeamStrength(Math.max(0, Math.min(100, Math.round(payload.uvSeamStrength))));
      if (typeof payload.uvCheckerOpacity === "number") setUvCheckerOpacity(Math.max(0, Math.min(100, Math.round(payload.uvCheckerOpacity))));
      if (typeof payload.uvDistortion === "number") setUvDistortion(Math.max(0, Math.min(100, Math.round(payload.uvDistortion))));
      if (typeof payload.tint === "string" && /^#?[0-9a-f]{6}$/i.test(payload.tint)) {
        setActiveColor(payload.tint.startsWith("#") ? payload.tint : `#${payload.tint}`);
      }
    }
  }, [activeLayerId, layers, timelineDurationFrames]);

  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [resizing, setResizing] = useState<'sidebar' | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;

      if (resizing === 'sidebar') {
        const newWidth = window.innerWidth - e.clientX;
        setSidebarWidth(Math.max(260, Math.min(newWidth, 500)));
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
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  useEffect(() => {
    if (aiPromptDraft && selection) {
      setShowPromptBar(true);
    }
  }, [aiPromptDraft, selection]);

  useEffect(() => {
    const t = window.setInterval(() => {
      if (canvasRef.current) {
        setHistoryInfo(canvasRef.current.getHistoryInfo());
        refreshViewState();
      }
    }, 500);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    void refreshProjects();
    void refreshSnapshots();
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ACTIONS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const restored = parsed
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          if (typeof row.id !== "string" || typeof row.name !== "string" || !Array.isArray(row.commands)) return null;
          const commands = row.commands.filter(isMacroCommand);
          if (commands.length === 0) return null;
          return {
            id: row.id,
            name: row.name,
            steps: typeof row.steps === "number" ? row.steps : commands.length,
            commands,
            runCount: typeof row.runCount === "number" ? Math.max(0, Math.floor(row.runCount)) : 0,
            lastRunAt: typeof row.lastRunAt === "string" ? row.lastRunAt : undefined
          } satisfies MacroAction;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
      if (restored.length > 0) {
        setActions(restored);
      }
    } catch {
      // ignore malformed local actions storage
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(ACTIONS_STORAGE_KEY, JSON.stringify(actions));
    } catch {
      // ignore storage quota / privacy mode failures
    }
  }, [actions]);

  useEffect(() => {
    if (dropletPresets.length === 0) {
      setActiveDropletId(null);
      return;
    }
    if (!activeDropletId || !dropletPresets.some((item) => item.id === activeDropletId)) {
      setActiveDropletId(dropletPresets[0].id);
    }
  }, [activeDropletId, dropletPresets]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DROPLETS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const restored: DropletPreset[] = parsed
        .filter(isDropletPresetRecord)
        .map((item) => {
          const filters = Object.fromEntries(
            Object.entries(item.filters).filter((entry): entry is [string, number] => typeof entry[1] === "number")
          );
          return {
            id: item.id,
            name: item.name,
            filters,
            runCount: typeof item.runCount === "number" ? Math.max(0, Math.floor(item.runCount)) : 0,
            lastRunAt: typeof (item as any).lastRunAt === "string" ? (item as any).lastRunAt : undefined
          };
        })
        .filter((item) => Object.keys(item.filters).length > 0);
      if (restored.length > 0) {
        setDropletPresets(restored);
      }
    } catch {
      // ignore malformed local droplet storage
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(DROPLETS_STORAGE_KEY, JSON.stringify(dropletPresets));
    } catch {
      // ignore storage quota / privacy mode failures
    }
  }, [dropletPresets]);

  useEffect(() => {
    if (!collabEnabled) {
      collabRef.current?.disconnect();
      collabRef.current = null;
      channelRef.current?.close();
      channelRef.current = null;
      setCollabUsers([]);
      return;
    }

    const user: CollaborativeUser = {
      id: crypto.randomUUID(),
      name: authUser?.name || `User-${Math.floor(Math.random() * 1000)}`,
      color: `hsl(${Math.floor(Math.random() * 360)} 80% 55%)`,
      role: collabRole
    };
    setLocalUser(user);

    const engine = new CollaborationEngine(currentProjectId, user.id);
    engine.setLocalUser(user);
    const unsub = engine.subscribe((users) => setCollabUsers(users));
    engine.connect();
    collabRef.current = engine;

    const bc = new BroadcastChannel(`zerothlayer-room-${currentProjectId}`);
    channelRef.current = bc;

    const publishPresence = () => {
      bc.postMessage({ type: 'presence', user });
    };
    publishPresence();

    const interval = window.setInterval(publishPresence, 5000);

    bc.onmessage = async (event) => {
      const msg = event.data;
      if (!msg || !canvasRef.current) return;

      if (msg.type === 'presence' && msg.user?.id !== user.id) {
        engine.upsertRemoteUser(msg.user);
      } else if (msg.type === 'cursor' && msg.userId !== user.id) {
        const existing = collabUsers.find((u) => u.id === msg.userId);
        if (existing) {
          engine.upsertRemoteUser({ ...existing, cursor: msg.cursor });
        }
      } else if (msg.type === 'payload' && msg.userId !== user.id && msg.payload) {
        await canvasRef.current.loadProjectPayload(msg.payload);
      } else if (msg.type === 'layers' && msg.userId !== user.id && Array.isArray(msg.layers)) {
        // metadata hint channel, full payload handles actual pixels
      }
    };

    return () => {
      window.clearInterval(interval);
      unsub();
      bc.close();
      engine.disconnect();
    };
  }, [collabEnabled, currentProjectId, authUser?.name, collabRole]);

  useEffect(() => {
    if (!collabEnabled || !channelRef.current || !canvasRef.current || !localUser) return;
    const payload = canvasRef.current.getProjectPayload();
    if (!payload) return;
    channelRef.current.postMessage({ type: 'layers', userId: localUser.id, layers });
    channelRef.current.postMessage({ type: 'payload', userId: localUser.id, payload });
  }, [layers, collabEnabled, localUser?.id]);

  const getContextToolbarPosition = () => {
    if (!selection || selection.screenX === undefined || selection.screenY === undefined) return null;

    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    const centerX = selection.screenX + (selection.screenWidth || 0) / 2;
    const belowY = selection.screenY + (selection.screenHeight || 0) + 12;
    const aboveY = selection.screenY - 56;
    const useAbove = belowY > viewportHeight - 120 && aboveY > 72;

    return {
      x: Math.max(140, Math.min(centerX, viewportWidth - 140)),
      y: useAbove ? aboveY : belowY,
    };
  };

  const contextToolbarPosition = getContextToolbarPosition();
  const viewerCount = collabUsers.filter((u) => (u.role || 'editor') === 'viewer').length;
  const editorCount = collabUsers.filter((u) => (u.role || 'editor') === 'editor').length;
  const isViewer = collabRole === 'viewer';
  const rulerInfo = selection
    ? {
      width: Math.round(selection.width),
      height: Math.round(selection.height),
      diagonal: Math.round(Math.hypot(selection.width, selection.height)),
      x: Math.round(selection.x),
      y: Math.round(selection.y)
    }
    : null;

  return (
    <div className="flex h-screen w-screen bg-zinc-50 dark:bg-[#09090b] text-foreground overflow-hidden font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={projectFileInputRef}
        type="file"
        accept=".zlayer,.json,image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handleProjectFileChange}
      />
      <input
        ref={placeEmbeddedInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
        multiple
        className="hidden"
        onChange={handlePlaceEmbeddedFileChange}
      />
      <input
        ref={batchInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        multiple
        className="hidden"
        onChange={handleBatchFilesChange}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col relative h-full overflow-hidden">

        {/* File Menu */}
        <div className="absolute top-4 left-4 z-50">
          <div className="relative">
            <button
              onClick={() => setShowFileMenu((v) => !v)}
              className="glass px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-200 ring-1 ring-black/5 dark:ring-white/10 hover:bg-white/80 dark:hover:bg-zinc-800/80 transition-colors"
            >
              File
            </button>
            {showFileMenu && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1">
                <button
                  onClick={() => {
                    handleNewProject();
                    setShowFileMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  New Project <span className="float-right opacity-50 font-mono">Ctrl+N</span>
                </button>
                <button
                  onClick={() => {
                    handleOpenProject();
                    setShowFileMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Open... <span className="float-right opacity-50 font-mono">Ctrl+O</span>
                </button>
                <button
                  onClick={() => {
                    handleSaveProject();
                    setShowFileMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Save Project
                </button>
                <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                <button
                  onClick={() => {
                    handlePlaceEmbedded();
                    setShowFileMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Place Embedded...
                </button>
                <button
                  onClick={() => {
                    void handlePlaceLinked();
                    setShowFileMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Place Linked...
                </button>
                <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                <button
                  onClick={() => {
                    handleBatchProcess();
                    setShowFileMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Image Processor (Batch)...
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Auth / Presence */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={handleSignIn}
            className={cn(
              "glass w-10 h-10 rounded-full flex items-center justify-center ring-2 shadow-sm",
              collabRole === 'editor'
                ? "ring-green-500/80"
                : "ring-blue-500/80"
            )}
            title={authUser ? `${authUser.name} (${collabRole})` : `Not signed in (${collabRole})`}
          >
            <UserCircle2 className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
          </button>
        </div>

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
                label="Select (R)"
                disabled={isViewer}
              />
              <ToolButton
                active={activeTool === 'crop'}
                onClick={() => setActiveTool('crop')}
                icon={Crop}
                label="Crop (C)"
                disabled={isViewer}
              />
              <ToolButton
                active={activeTool === 'lasso'}
                onClick={() => setActiveTool('lasso')}
                icon={PenTool}
                label="Lasso (L)"
                disabled={isViewer}
              />
              <ToolButton
                active={activeTool === 'magic'}
                onClick={() => setActiveTool('magic')}
                icon={Wand2}
                label="Magic (W)"
                disabled={isViewer}
              />
              <ToolButton
                active={activeTool === 'quick'}
                onClick={() => setActiveTool('quick')}
                icon={Brush}
                label="Quick (Q)"
                disabled={isViewer}
              />
              <ToolButton
                active={activeTool === 'slice'}
                onClick={() => setActiveTool('slice')}
                icon={Scissors}
                label="Slice (K)"
                disabled={isViewer}
              />
              <ToolButton
                active={activeTool === 'semantic'}
                onClick={() => setActiveTool('semantic')}
                icon={Brain}
                label="Semantic (S)"
                disabled={isViewer}
              />
            </div>

            <div className="flex items-center gap-1">
              <IconButton onClick={handleUndo} disabled={!canUndo} icon={RotateCcw} label="Undo" />
              <IconButton onClick={handleRedo} disabled={!canRedo} icon={RotateCw} label="Redo" />
            </div>

            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

            <div className="flex items-center gap-1">
              <IconButton onClick={handleUploadClick} icon={Upload} label="Upload" />
              <div className="relative">
                <IconButton onClick={() => setShowExportMenu(!showExportMenu)} icon={Download} label="Export" />
                {showExportMenu && (
                  <div className="absolute top-full right-0 mt-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden py-2 min-w-[220px] z-[100] drop-shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 pb-2 mb-1 border-b border-zinc-200 dark:border-zinc-800">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-wide text-zinc-500">Optimize</span>
                        <span className="text-[10px] font-mono text-zinc-500">{exportQuality}%</span>
                      </div>
                      <input
                        type="range"
                        min={40}
                        max={100}
                        step={5}
                        value={exportQuality}
                        onChange={(e) => setExportQuality(Number(e.target.value))}
                        className="w-full h-1.5 mt-1 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700"
                      />
                    </div>
                    <button onClick={() => handleExport('png', 'flattened')} className="w-full px-4 py-2 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-foreground transition-colors">Export flattened PNG <span className="float-right text-[10px] opacity-50 font-mono mt-0.5">Ctrl+S</span></button>
                    <button onClick={() => handleExport('jpeg', 'flattened')} className="w-full px-4 py-2 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-foreground transition-colors">Export flattened JPEG</button>
                    <button onClick={() => handleExport('webp', 'flattened')} className="w-full px-4 py-2 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-foreground transition-colors">Export flattened WebP</button>
                    <button onClick={() => handleExport('svg', 'flattened')} className="w-full px-4 py-2 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-foreground transition-colors">Export flattened SVG</button>
                    <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                    <button onClick={() => handleExport('png', 'active-layer')} className="w-full px-4 py-2 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-foreground transition-colors">Export active layer PNG</button>
                    <button onClick={() => handleExport('webp', 'active-layer')} className="w-full px-4 py-2 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-foreground transition-colors">Export active layer WebP</button>
                    <button onClick={() => handleExport('svg', 'active-layer')} className="w-full px-4 py-2 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-foreground transition-colors">Export active layer SVG</button>
                    <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                    <button
                      onClick={() => {
                        canvasRef.current?.exportProjectWithLayers();
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-foreground transition-colors"
                    >
                      Export layered (.zlayer)
                    </button>
                  </div>
                )}
              </div>
              <IconButton
                onClick={() => setShowSidebar((prev) => !prev)}
                icon={showSidebar ? PanelRightClose : PanelRightOpen}
                label={showSidebar ? "Hide Panels (P)" : "Show Panels (P)"}
              />
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div
          className="relative flex-1 bg-zinc-100/50 dark:bg-black/20"
          onMouseMove={(e) => {
            if (!collabEnabled || !channelRef.current || !localUser) return;
            const cursor = { x: e.clientX, y: e.clientY };
            collabRef.current?.updateCursor(cursor.x, cursor.y);
            channelRef.current.postMessage({ type: 'cursor', userId: localUser.id, cursor });
          }}
        >
          <Canvas
            ref={canvasRef}
            onSelectionChange={handleSelectionChange}
            onHistoryChange={handleHistoryChange}
          />
          {artboards.map((a) => {
            const left = a.x * viewState.zoom + viewState.panX;
            const top = a.y * viewState.zoom + viewState.panY;
            const width = a.width * viewState.zoom;
            const height = a.height * viewState.zoom;
            return (
              <div
                key={a.id}
                className="pointer-events-none absolute z-30 border-2 border-sky-400/70 bg-sky-500/5"
                style={{ left, top, width, height }}
              >
                <div className="absolute left-0 top-0 -translate-y-full px-2 py-0.5 rounded-t-md bg-sky-500/90 text-white text-[10px] leading-none whitespace-nowrap">
                  {a.name} ({a.width}x{a.height})
                </div>
              </div>
            );
          })}
          {showCompare && comparePreview && (
            <img
              src={comparePreview}
              alt="Before snapshot"
              className="pointer-events-none absolute inset-0 w-full h-full object-contain opacity-80"
            />
          )}
          {collabEnabled && collabUsers.filter((u) => u.cursor).map((u) => (
            <div
              key={u.id}
              className="fixed z-[70] pointer-events-none"
              style={{ left: (u.cursor?.x || 0) + 10, top: (u.cursor?.y || 0) + 10 }}
            >
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: u.color }} />
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/70 text-white">{u.name}</span>
              </div>
            </div>
          ))}
          {counts.map((m, idx) => (
            <div
              key={m.id}
              className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2"
              style={{ left: m.x, top: m.y }}
            >
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-semibold flex items-center justify-center shadow">
                {idx + 1}
              </div>
            </div>
          ))}
          {notes.map((n) => (
            <div
              key={n.id}
              className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-full"
              style={{ left: n.x, top: n.y - 8 }}
            >
              <div className="px-2 py-1 rounded bg-amber-100/95 text-amber-900 text-[10px] border border-amber-300 shadow max-w-40 truncate">
                {n.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showSidebar && (
        <>
          {/* Resize Handle */}
          <div
            onMouseDown={() => setResizing('sidebar')}
            className="w-px hover:w-1 active:w-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-blue-500 active:bg-blue-500 cursor-col-resize transition-all z-20"
          />

          {/* Right Sidebar */}
          <div
            ref={sidebarRef}
            style={{ width: sidebarWidth }}
            className="flex flex-col bg-white dark:bg-zinc-900/50 border-l border-zinc-200 dark:border-zinc-800 backdrop-blur-xl h-full shrink-0 z-10 animate-in slide-in-from-right-8 fade-in duration-200"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-2 py-2 shrink-0">
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setSidebarTab('properties')}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    sidebarTab === 'properties' ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Properties
                </button>
                <button
                  onClick={() => setSidebarTab('layers')}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    sidebarTab === 'layers' ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Layers
                </button>
                <button
                  onClick={() => setSidebarTab('adjustments')}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    sidebarTab === 'adjustments' ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Adjustments
                </button>
                <button
                  onClick={() => setSidebarTab('colors')}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    sidebarTab === 'colors' ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Colors
                </button>
                <button
                  onClick={() => setSidebarTab('place')}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    sidebarTab === 'place' ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Place
                </button>
                <button
                  onClick={() => setSidebarTab('automate')}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    sidebarTab === 'automate' ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Automate
                </button>
                <button
                  onClick={() => setSidebarTab('exportas')}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    sidebarTab === 'exportas' ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Export As
                </button>
                <button
                  onClick={() => setSidebarTab('navigator')}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    sidebarTab === 'navigator' ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Navigator
                </button>
                <button
                  onClick={() => setSidebarTab('channels')}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    sidebarTab === 'channels' ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Channels
                </button>
                <button
                  onClick={() => setSidebarTab('paths')}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    sidebarTab === 'paths' ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Paths
                </button>
                <button
                  onClick={() => setSidebarTab('character')}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    sidebarTab === 'character' ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Character
                </button>
                <button
                  onClick={() => setSidebarTab('brush')}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    sidebarTab === 'brush' ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Brush
                </button>
                <button
                  onClick={() => setSidebarTab('libraries')}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    sidebarTab === 'libraries' ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Libraries
                </button>
                <button
                  onClick={() => setSidebarTab('timeline')}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    sidebarTab === 'timeline' ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Timeline
                </button>
                <button
                  onClick={() => setSidebarTab('actions')}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    sidebarTab === 'actions' ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Actions
                </button>
                <button
                  onClick={() => setSidebarTab('tools')}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    sidebarTab === 'tools' ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Tools
                </button>
                <button
                  onClick={() => setSidebarTab('filters')}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    sidebarTab === 'filters' ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Filters
                </button>
                <button
                  onClick={() => setSidebarTab('styles')}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    sidebarTab === 'styles' ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Styles
                </button>
                <button
                  onClick={() => setSidebarTab('project')}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    sidebarTab === 'project' ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Project
                </button>
                <button
                  onClick={() => setSidebarTab('workspace')}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    sidebarTab === 'workspace' ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  Workspace
                </button>
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Close panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {sidebarTab === 'properties' ? (
              <div className="flex-1 overflow-hidden">
                <PropertiesPanel
                  className="flex-1"
                  onCreateMask={handleCreateMask}
                  onInvertMask={() => canvasRef.current?.invertMask()}
                  onFeatherMask={(amount) => canvasRef.current?.featherMask(amount)}
                />
              </div>
            ) : sidebarTab === 'layers' ? (
              <div className="flex-1 overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/30">
                <LayerPanel
                  onCreateMask={handleCreateMask}
                  onInvertMask={() => canvasRef.current?.invertMask()}
                  onFeatherMask={(amount) => canvasRef.current?.featherMask(amount)}
                  onCrop={handleCrop}
                />
              </div>
            ) : sidebarTab === 'adjustments' ? (
              <div className="flex-1 overflow-hidden">
                <AdjustmentsPanel className="flex-1" />
              </div>
            ) : sidebarTab === 'colors' ? (
              <div className="flex-1 overflow-hidden">
                <ColorSwatchesPanel
                  className="flex-1"
                  activeColor={activeColor}
                  onColorSelect={setActiveColor}
                  swatches={swatches}
                  onAddSwatch={(color) =>
                    setSwatches((prev) => (prev.includes(color) ? prev : [...prev.slice(-23), color]))
                  }
                  onRemoveSwatch={(color) =>
                    setSwatches((prev) => prev.filter((c) => c.toLowerCase() !== color.toLowerCase()))
                  }
                  gradientA={gradientA}
                  gradientB={gradientB}
                  onGradientAChange={setGradientA}
                  onGradientBChange={setGradientB}
                  onApplyGradient={handleGradientTool}
                  onApplyPaintBucket={handlePaintBucket}
                  disabled={isViewer || !selection}
                />
              </div>
            ) : sidebarTab === 'place' ? (
              <div className="flex-1 overflow-hidden">
                <PlaceAssetsPanel
                  className="flex-1"
                  canEdit={!isViewer}
                  linkedUrl={placeLinkedUrl}
                  setLinkedUrl={setPlaceLinkedUrl}
                  embeddedSmartObject={placeEmbeddedSmartObject}
                  setEmbeddedSmartObject={setPlaceEmbeddedSmartObject}
                  linkedSmartObject={placeLinkedSmartObject}
                  setLinkedSmartObject={setPlaceLinkedSmartObject}
                  activeLinkedLayerName={(activeLayerId ? layers.find((l) => l.id === activeLayerId) : null)?.linkedAsset ? (layers.find((l) => l.id === activeLayerId)?.name || null) : null}
                  activeLinkedSrc={(activeLayerId ? layers.find((l) => l.id === activeLayerId) : null)?.linkedAsset ? (layers.find((l) => l.id === activeLayerId)?.externalSrc || null) : null}
                  linkedLayerCount={layers.filter((l) => l.linkedAsset).length}
                  linkedBrokenCount={layers.filter((l) => l.linkedAsset && (l.aiData as any)?.linkedStatus === "error").length}
                  linkedRefreshSummary={linkedRefreshSummary}
                  isRefreshingLinkedAssets={isRefreshingLinkedAssets}
                  onPlaceEmbedded={handlePlaceEmbedded}
                  onPlaceLinked={() => void handlePlaceLinked(placeLinkedUrl)}
                  onRelinkActive={() => void handleRelinkActiveLayer()}
                  onRefreshActive={() => void handleRefreshActiveLinkedLayer()}
                  onRefreshAll={() => void handleRefreshAllLinkedLayers()}
                />
              </div>
            ) : sidebarTab === 'automate' ? (
              <div className="flex-1 overflow-hidden">
                <AutomationPanel
                  className="flex-1"
                  canEdit={!isViewer}
                  batchOptions={batchOptions}
                  setBatchOptions={setBatchOptions}
                  batchStatus={batchStatus}
                  dropletPresets={dropletPresets}
                  activeDropletId={activeDropletId}
                  setActiveDropletId={setActiveDropletId}
                  canSaveDropletFromActive={Boolean(selectedLayer?.filters && Object.keys(selectedLayer.filters).length > 0)}
                  scriptLanguage={scriptLanguage}
                  setScriptLanguage={setScriptLanguage}
                  scriptBody={scriptBody}
                  setScriptBody={setScriptBody}
                  scriptOutput={scriptOutput}
                  dataRows={dataRows}
                  setDataRows={setDataRows}
                  dataTemplate={dataTemplate}
                  setDataTemplate={setDataTemplate}
                  dataDrivenMode={dataDrivenMode}
                  setDataDrivenMode={setDataDrivenMode}
                  dataDrivenSummary={dataDrivenSummary}
                  onPickBatchFiles={handleBatchProcess}
                  onDownloadBatchReport={handleDownloadLastBatchReport}
                  onRunDroplet={handleRunDroplet}
                  onSaveDropletFromActive={handleSaveDropletFromActiveLayer}
                  onDeleteActiveDroplet={handleDeleteActiveDroplet}
                  onRunScript={() => void handleRunScriptCommand()}
                  onRunDataDriven={() => void handleApplyDataDrivenGraphics()}
                />
              </div>
            ) : sidebarTab === 'exportas' ? (
              <div className="flex-1 overflow-hidden">
                <ExportAsPanel
                  className="flex-1"
                  canExport={!isViewer}
                  options={exportAsOptions}
                  originalWidth={Math.max(1, Math.round(canvasDims.width || 1))}
                  originalHeight={Math.max(1, Math.round(canvasDims.height || 1))}
                  estimateBytes={exportAsEstimateBytes}
                  estimating={isEstimatingExportAs}
                  onOptionsChange={setExportAsOptions}
                  onResetDimensions={() =>
                    setExportAsOptions((prev) => ({
                      ...prev,
                      width: Math.max(1, Math.round(canvasDims.width || prev.width || 1)),
                      height: Math.max(1, Math.round(canvasDims.height || prev.height || 1))
                    }))
                  }
                  onExport={() => void handleExportAsOptimized()}
                />
              </div>
            ) : sidebarTab === 'navigator' ? (
              <div className="flex-1 overflow-hidden">
                <NavigatorPanel 
                  className="flex-1" 
                  canvasWidth={canvasDims.width || 800}
                  canvasHeight={canvasDims.height || 600}
                  zoom={viewState.zoom}
                  panX={viewState.panX}
                  panY={viewState.panY}
                  onZoomChange={(zoom) => {
                    canvasRef.current?.setZoom(zoom);
                    refreshViewState();
                  }}
                  onPan={(dx, dy) => {
                    canvasRef.current?.panBy(dx, dy);
                    refreshViewState();
                  }}
                />
              </div>
            ) : sidebarTab === 'channels' ? (
              <div className="flex-1 overflow-hidden">
                <ChannelsPanel
                  className="flex-1"
                  onCreateMask={handleCreateMask}
                  onInvertMask={() => canvasRef.current?.invertMask()}
                  onFeatherMask={(amount) => canvasRef.current?.featherMask(amount)}
                />
              </div>
            ) : sidebarTab === 'paths' ? (
              <div className="flex-1 overflow-hidden">
                <PathsPanel
                  className="flex-1"
                  paths={paths}
                  activePathId={activePathId}
                  mode={pathMode}
                  canEdit={!isViewer}
                  hasSelection={Boolean(selection)}
                  onSetMode={setPathMode}
                  onCreatePath={handleCreatePath}
                  onCreateFromSelection={handleCreatePathFromSelection}
                  onLoadAsSelection={handleLoadPathAsSelection}
                  onToggleVisible={(pathId, visible) =>
                    setPaths((prev) => prev.map((p) => (p.id === pathId ? { ...p, visible } : p)))
                  }
                  onRename={(pathId, name) =>
                    setPaths((prev) => prev.map((p) => (p.id === pathId ? { ...p, name } : p)))
                  }
                  onDelete={(pathId) =>
                    setPaths((prev) => prev.filter((p) => p.id !== pathId))
                  }
                  onSelectPath={setActivePathId}
                  onCreateShapeFromSelection={() => void handleCreateShape()}
                  onTextOnPath={() => void handleTextOnPath()}
                  onApplyOperation={handleApplyPathOperation}
                />
              </div>
            ) : sidebarTab === 'character' ? (
              <div className="flex-1 overflow-hidden">
                <CharacterParagraphPanel
                  className="flex-1"
                  disabled={isViewer}
                  textDraft={textDraft}
                  setTextDraft={setTextDraft}
                  fontSize={fontSize}
                  setFontSize={setFontSize}
                  fontFamily={fontFamily}
                  setFontFamily={setFontFamily}
                  fontWeight={fontWeight}
                  setFontWeight={setFontWeight}
                  textItalic={textItalic}
                  setTextItalic={setTextItalic}
                  textUnderline={textUnderline}
                  setTextUnderline={setTextUnderline}
                  lineHeight={lineHeight}
                  setLineHeight={setLineHeight}
                  tracking={tracking}
                  setTracking={setTracking}
                  paragraphSpacing={paragraphSpacing}
                  setParagraphSpacing={setParagraphSpacing}
                  paragraphIndent={paragraphIndent}
                  setParagraphIndent={setParagraphIndent}
                  textAlign={textAlign}
                  setTextAlign={setTextAlign}
                  textDirection={textDirection}
                  setTextDirection={setTextDirection}
                  textWarp={textWarp}
                  setTextWarp={setTextWarp}
                  textWarpStyle={textWarpStyle}
                  setTextWarpStyle={setTextWarpStyle}
                  textWarpAxis={textWarpAxis}
                  setTextWarpAxis={setTextWarpAxis}
                  openTypeLiga={openTypeLiga}
                  setOpenTypeLiga={setOpenTypeLiga}
                  openTypeDiscretionaryLiga={openTypeDiscretionaryLiga}
                  setOpenTypeDiscretionaryLiga={setOpenTypeDiscretionaryLiga}
                  openTypeKerning={openTypeKerning}
                  setOpenTypeKerning={setOpenTypeKerning}
                  openTypeOldStyleFigures={openTypeOldStyleFigures}
                  setOpenTypeOldStyleFigures={setOpenTypeOldStyleFigures}
                  openTypeSmallCaps={openTypeSmallCaps}
                  setOpenTypeSmallCaps={setOpenTypeSmallCaps}
                  onAddTypeLayer={() => void handleAddTypeLayer()}
                  onUpdateTypeLayer={() => void handleUpdateActiveTextLayer()}
                  onWarpText={() => void handleWarpText()}
                  onTextOnPath={() => void handleTextOnPath()}
                />
              </div>
            ) : sidebarTab === 'brush' ? (
              <div className="flex-1 overflow-hidden">
                <BrushSettingsPanel
                  className="flex-1"
                  disabled={isViewer || !selection}
                  brushSize={brushSize}
                  setBrushSize={setBrushSize}
                  brushHardness={brushHardness}
                  setBrushHardness={setBrushHardness}
                  brushSpacing={brushSpacing}
                  setBrushSpacing={setBrushSpacing}
                  brushShape={brushShape}
                  setBrushShape={setBrushShape}
                  brushFlow={brushFlow}
                  setBrushFlow={setBrushFlow}
                  brushJitter={brushJitter}
                  setBrushJitter={setBrushJitter}
                  brushTexture={brushTexture}
                  setBrushTexture={setBrushTexture}
                  brushTextureScale={brushTextureScale}
                  setBrushTextureScale={setBrushTextureScale}
                  onBrush={handleBrushTool}
                  onPencil={handlePencilTool}
                  onMixer={handleMixerBrush}
                />
              </div>
            ) : sidebarTab === 'libraries' ? (
              <div className="flex-1 overflow-hidden">
                <LibrariesPanel
                  className="flex-1"
                  canEdit={!isViewer}
                  assets={libraryAssets}
                  onSaveColor={handleSaveColorAsset}
                  onSaveGradient={handleSaveGradientAsset}
                  onSaveTextStyle={handleSaveTextStyleAsset}
                  onSaveBrushPreset={handleSaveBrushPresetAsset}
                  onApplyAsset={handleApplyLibraryAsset}
                  onDeleteAsset={(id) => setLibraryAssets((prev) => prev.filter((item) => item.id !== id))}
                />
              </div>
            ) : sidebarTab === 'timeline' ? (
              <div className="flex-1 overflow-hidden">
                <TimelinePanel
                  className="flex-1"
                  canEdit={!isViewer}
                  frame={timelineFrame}
                  fps={timelineFps}
                  durationFrames={timelineDurationFrames}
                  isPlaying={isTimelinePlaying}
                  includeAudio={includeTimelineAudio}
                  audioMode={timelineAudioMode}
                  audioLevel={timelineAudioLevel}
                  transitionStyle={timelineTransitionStyle}
                  exportScale={timelineExportScale}
                  isExporting={isExportingVideo}
                  keyframes={timelineKeyframes}
                  videoLayerCount={layers.filter((l) => l.type === 'video').length}
                  onSetFrame={(value) => setTimelineFrame(Math.max(0, Math.min(value, Math.max(1, timelineDurationFrames - 1))))}
                  onSetFps={(value) => setTimelineFps(Math.max(12, Math.min(60, value)))}
                  onSetDurationFrames={(value) => {
                    const clamped = Math.max(24, Math.min(600, value));
                    setTimelineDurationFrames(clamped);
                    setTimelineFrame((prev) => Math.min(prev, clamped - 1));
                    setTimelineKeyframes((prev) => prev.filter((f) => f < clamped));
                    setFrameAnimationFrames((prev) => prev.filter((f) => f < clamped));
                  }}
                  onTogglePlay={() => setIsTimelinePlaying((prev) => !prev)}
                  onStep={stepTimeline}
                  onToggleKeyframe={toggleCurrentKeyframe}
                  onToggleAnimationFrame={toggleCurrentAnimationFrame}
                  onClearAnimationFrames={() => setFrameAnimationFrames([])}
                  onPrevKeyframe={jumpToPrevKeyframe}
                  onNextKeyframe={jumpToNextKeyframe}
                  onCreateVideoLayer={handleCreateVideoLayer}
                  onExportVideo={() => void handleExportTimelineVideo()}
                  onExportGif={() => void handleExportFrameAnimationGif()}
                  onSetIncludeAudio={setIncludeTimelineAudio}
                  onSetAudioMode={(value) => {
                    setTimelineAudioMode(value);
                    if (value === "none") setIncludeTimelineAudio(false);
                    if (value !== "none") setIncludeTimelineAudio(true);
                  }}
                  onSetAudioLevel={(value) => setTimelineAudioLevel(Math.max(0, Math.min(100, value)))}
                  onSetTransitionStyle={setTimelineTransitionStyle}
                  onSetExportScale={setTimelineExportScale}
                  frameAnimationFrames={frameAnimationFrames}
                  isExportingGif={isExportingGif}
                />
              </div>
            ) : sidebarTab === 'actions' ? (
              <div className="flex-1 overflow-hidden">
                <ActionsPanel
                  className="flex-1"
                  canEdit={!isViewer}
                  isRecording={isActionRecording}
                  recordingName={actionNameDraft}
                  setRecordingName={setActionNameDraft}
                  recordedCommands={recordedCommands}
                  actions={actions}
                  onToggleRecording={toggleMacroRecording}
                  onDiscardRecording={discardMacroRecording}
                  onRunAction={(id) => void runSavedAction(id)}
                  onDeleteAction={(id) => setActions((prev) => prev.filter((a) => a.id !== id))}
                  onRunCommand={(cmd) => void runAndMaybeRecordMacroCommand(cmd)}
                />
              </div>
            ) : sidebarTab === 'tools' ? (
              <div className="flex-1 overflow-hidden">
                <ToolboxPanel className="flex-1" />
              </div>
            ) : sidebarTab === 'filters' ? (
              <div className="flex-1 overflow-hidden">
                <FiltersPanel className="flex-1" />
              </div>
            ) : sidebarTab === 'styles' ? (
              <div className="flex-1 overflow-hidden">
                <LayerStylesPanel className="flex-1" />
              </div>
            ) : sidebarTab === 'project' ? (
              <div className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-900/30 p-3 space-y-4">
                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Collaboration</h4>
                    <span className="text-[10px] text-zinc-500">{collabEnabled ? "On" : "Off"}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500">Room: {currentProjectId}</div>
                  <div className="text-[11px] text-zinc-500">Users: {collabUsers.length}</div>
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Comments</h4>
                  <div className="flex gap-2">
                    <input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Pin comment to current selection"
                      className="flex-1 text-xs px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900"
                    />
                    <button onClick={handleAddComment} className="px-2 py-1.5 text-xs rounded bg-blue-600 text-white">Add</button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-auto">
                    {comments.map((c) => (
                      <div key={c.id} className="text-[11px] rounded border border-zinc-200 dark:border-zinc-700 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn(c.resolved && "line-through text-zinc-400")}>{c.text}</span>
                          <div className="flex gap-1">
                            <button onClick={() => handleReply(c.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800">Reply</button>
                            <button onClick={() => setComments((prev) => prev.map((t) => t.id === c.id ? { ...t, resolved: !t.resolved } : t))} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800">{c.resolved ? "Unresolve" : "Resolve"}</button>
                          </div>
                        </div>
                        {c.replies.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {c.replies.map((r) => (
                              <div key={r.id} className="text-[10px] text-zinc-500 pl-2 border-l border-zinc-300 dark:border-zinc-700">{r.text}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Snapshots</h4>
                  <div className="flex gap-2">
                    <input
                      value={snapshotName}
                      onChange={(e) => setSnapshotName(e.target.value)}
                      placeholder="Snapshot name"
                      className="flex-1 text-xs px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900"
                    />
                    <button onClick={handleSaveSnapshot} className="px-2 py-1.5 text-xs rounded bg-blue-600 text-white">Save</button>
                  </div>
                  <button onClick={() => refreshSnapshots()} className="text-[10px] px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800">Refresh</button>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {snapshots.map((s) => (
                      <div key={s.id} className="flex items-center gap-1 text-[10px] border border-zinc-200 dark:border-zinc-700 rounded p-1.5">
                        <span className="flex-1 truncate">{s.name}</span>
                        <button onClick={() => handleRestoreSnapshot(s)} className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800">Restore</button>
                        <button onClick={() => handleCompareSnapshot(s)} className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800">Compare</button>
                      </div>
                    ))}
                  </div>
                  {comparePreview && (
                    <button onClick={() => setShowCompare((v) => !v)} className="text-[10px] px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800">
                      {showCompare ? "Hide Before" : "Show Before"}
                    </button>
                  )}
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Share</h4>
                  <div className="flex gap-2">
                    <button onClick={() => handleCreateShare('view')} className="px-2 py-1.5 text-xs rounded bg-zinc-200 dark:bg-zinc-800">View Link</button>
                    <button onClick={() => handleCreateShare('edit')} className="px-2 py-1.5 text-xs rounded bg-zinc-200 dark:bg-zinc-800">Edit Link</button>
                  </div>
                  {shareUrl && <input readOnly value={shareUrl} className="w-full text-[10px] px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900" />}
                  {embedSnippet && <textarea readOnly value={embedSnippet} className="w-full h-20 text-[10px] px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900" />}
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Cloud Projects</h4>
                  <div className="flex gap-2">
                    <span className="px-2 py-1.5 text-xs rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">{authUser ? authUser.name : "Not signed in"}</span>
                    <button onClick={handleCreateProject} className="px-2 py-1.5 text-xs rounded bg-zinc-200 dark:bg-zinc-800">New</button>
                    <button onClick={handleSaveCloudProject} className="px-2 py-1.5 text-xs rounded bg-zinc-200 dark:bg-zinc-800">Save</button>
                  </div>
                  <button onClick={() => refreshProjects()} className="text-[10px] px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800">Refresh Library</button>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {projects.map((p) => (
                      <div key={p.id} className="flex items-center gap-1 text-[10px] border border-zinc-200 dark:border-zinc-700 rounded p-1.5">
                        <span className="flex-1 truncate">{p.name}</span>
                        <button onClick={() => handleLoadCloudProject(p.id)} className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800">Open</button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-900/30 p-3 space-y-4">
                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300 flex items-center gap-1"><History className="w-3.5 h-3.5" /> History</h4>
                    <div className="flex gap-1">
                      <button onClick={handleUndo} disabled={!historyInfo.canUndo} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Undo</button>
                      <button onClick={handleRedo} disabled={!historyInfo.canRedo} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Redo</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <div className="text-zinc-500 mb-1">Undo Stack</div>
                      <div className="space-y-1 max-h-24 overflow-auto">
                        {historyInfo.undo
                          .slice(-8)
                          .reverse()
                          .map((h, i) => (
                            <div
                              key={`u-${i}`}
                              className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 truncate"
                            >
                              {h}
                            </div>
                          ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500 mb-1">Redo Stack</div>
                      <div className="space-y-1 max-h-24 overflow-auto">
                        {historyInfo.redo
                          .slice(-8)
                          .reverse()
                          .map((h, i) => (
                            <div
                              key={`r-${i}`}
                              className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 truncate"
                            >
                              {h}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-3">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Layers, Filters, Transform, AI</h4>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Adjustment Preset</div>
                      <select value={adjustmentLayerPreset} onChange={(e) => setAdjustmentLayerPreset(e.target.value as 'brightness-contrast' | 'cinematic' | 'black-white' | 'vibrance-pop' | 'teal-orange')} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="brightness-contrast">Brightness / Contrast</option>
                        <option value="cinematic">Cinematic</option>
                        <option value="black-white">Black & White</option>
                        <option value="vibrance-pop">Vibrance Pop</option>
                        <option value="teal-orange">Teal / Orange</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Source</div>
                      <select value={adjustmentLayerSource} onChange={(e) => setAdjustmentLayerSource(e.target.value as 'merged' | 'active')} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="merged">Merged Canvas</option>
                        <option value="active">Active Layer</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Strength: {adjustmentLayerStrength}%</div>
                      <input type="range" min={0} max={100} value={adjustmentLayerStrength} onChange={(e) => setAdjustmentLayerStrength(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Smart Filter Preset</div>
                      <select value={smartFilterPreset} onChange={(e) => setSmartFilterPreset(e.target.value as 'brightness-contrast' | 'cinematic' | 'black-white' | 'vibrance-pop' | 'teal-orange')} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="brightness-contrast">Brightness / Contrast</option>
                        <option value="cinematic">Cinematic</option>
                        <option value="black-white">Black & White</option>
                        <option value="vibrance-pop">Vibrance Pop</option>
                        <option value="teal-orange">Teal / Orange</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Smart Strength: {smartFilterStrength}%</div>
                      <input type="range" min={0} max={100} value={smartFilterStrength} onChange={(e) => setSmartFilterStrength(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => void handleCreateAdjustmentLayer()} disabled={isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Adjustment Layer</button>
                    <button onClick={handleApplyAdjustmentPresetToActive} disabled={isViewer || !activeLayerId} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Apply to Active Adj</button>
                    <button onClick={handleConvertToSmartObject} disabled={isViewer || !activeLayerId} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Smart Object</button>
                    <button onClick={handleApplySmartFiltersToActive} disabled={isViewer || !activeLayerId} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Apply Smart Filter</button>
                    <button onClick={handleReapplySavedSmartFilters} disabled={isViewer || !activeLayerId} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Reapply Saved Smart</button>
                    <button onClick={() => void handleReplaceActiveContents()} disabled={isViewer || !activeLayerId} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Replace Contents</button>
                    <button onClick={handleToggleClippingMask} disabled={isViewer || !activeLayerId} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Clipping Mask</button>
                    <button onClick={() => handleLayerStylePreset('soft-shadow')} disabled={isViewer || !activeLayerId} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Drop Shadow</button>
                    <button onClick={() => handleLayerStylePreset('outline')} disabled={isViewer || !activeLayerId} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Stroke</button>
                    <button onClick={() => handleLayerStylePreset('glow')} disabled={isViewer || !activeLayerId} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Glow</button>
                    <button onClick={() => handleLayerStylePreset('bevel')} disabled={isViewer || !activeLayerId} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Bevel</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={handleFreeTransform} disabled={isViewer || !activeLayerId} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Free Transform</button>
                    <button onClick={() => void handlePerspectiveCrop(0.24)} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Perspective Warp</button>
                    <button onClick={handlePuppetWarp} disabled={isViewer || !activeLayerId} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Puppet Warp</button>
                    <button onClick={() => handleAlignActive('left')} disabled={isViewer || !activeLayerId} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Align Left</button>
                    <button onClick={() => handleAlignActive('center')} disabled={isViewer || !activeLayerId} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Align Center</button>
                    <button onClick={() => handleAlignActive('right')} disabled={isViewer || !activeLayerId} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Align Right</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Camera Raw Strength</div>
                      <input type="range" min={0} max={100} value={Math.round(cameraRawStrength * 100)} onChange={(e) => setCameraRawStrength(Number(e.target.value) / 100)} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Profile</div>
                      <select value={cameraRawProfile} onChange={(e) => setCameraRawProfile(e.target.value as "adobe-color" | "portrait" | "landscape" | "vivid" | "bw")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="adobe-color">Adobe Color</option>
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                        <option value="vivid">Vivid</option>
                        <option value="bw">Black & White</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Temperature: {cameraRawTemperature}</div>
                      <input type="range" min={-100} max={100} value={cameraRawTemperature} onChange={(e) => setCameraRawTemperature(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Tint: {cameraRawTint}</div>
                      <input type="range" min={-100} max={100} value={cameraRawTint} onChange={(e) => setCameraRawTint(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Exposure: {cameraRawExposure}</div>
                      <input type="range" min={-100} max={100} value={cameraRawExposure} onChange={(e) => setCameraRawExposure(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Contrast: {cameraRawContrast}</div>
                      <input type="range" min={-100} max={100} value={cameraRawContrast} onChange={(e) => setCameraRawContrast(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Highlights: {cameraRawHighlights}</div>
                      <input type="range" min={-100} max={100} value={cameraRawHighlights} onChange={(e) => setCameraRawHighlights(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Shadows: {cameraRawShadows}</div>
                      <input type="range" min={-100} max={100} value={cameraRawShadows} onChange={(e) => setCameraRawShadows(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Whites: {cameraRawWhites}</div>
                      <input type="range" min={-100} max={100} value={cameraRawWhites} onChange={(e) => setCameraRawWhites(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Blacks: {cameraRawBlacks}</div>
                      <input type="range" min={-100} max={100} value={cameraRawBlacks} onChange={(e) => setCameraRawBlacks(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Texture: {cameraRawTexture}</div>
                      <input type="range" min={-100} max={100} value={cameraRawTexture} onChange={(e) => setCameraRawTexture(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Clarity: {cameraRawClarity}</div>
                      <input type="range" min={-100} max={100} value={cameraRawClarity} onChange={(e) => setCameraRawClarity(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Dehaze: {cameraRawDehaze}</div>
                      <input type="range" min={-100} max={100} value={cameraRawDehaze} onChange={(e) => setCameraRawDehaze(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Vibrance: {cameraRawVibrance}</div>
                      <input type="range" min={-100} max={100} value={cameraRawVibrance} onChange={(e) => setCameraRawVibrance(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Saturation: {cameraRawSaturation}</div>
                      <input type="range" min={-100} max={100} value={cameraRawSaturation} onChange={(e) => setCameraRawSaturation(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <div className="col-span-2 flex gap-2">
                      <button onClick={handleCameraRawFilter} disabled={!activeLayerId} className="flex-1 px-2 py-1.5 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Apply Camera Raw</button>
                      <button
                        onClick={() => {
                          setCameraRawProfile("adobe-color");
                          setCameraRawTemperature(0);
                          setCameraRawTint(0);
                          setCameraRawExposure(0);
                          setCameraRawContrast(8);
                          setCameraRawHighlights(-12);
                          setCameraRawShadows(14);
                          setCameraRawWhites(6);
                          setCameraRawBlacks(-6);
                          setCameraRawTexture(8);
                          setCameraRawClarity(10);
                          setCameraRawDehaze(8);
                          setCameraRawVibrance(12);
                          setCameraRawSaturation(0);
                        }}
                        className="flex-1 px-2 py-1.5 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Expand Amount: {generativeExpandPercent}%</div>
                      <input type="range" min={2} max={60} value={generativeExpandPercent} onChange={(e) => setGenerativeExpandPercent(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Expand Direction</div>
                      <select value={generativeExpandDirection} onChange={(e) => setGenerativeExpandDirection(e.target.value as "all" | "horizontal" | "vertical" | "left" | "right" | "top" | "bottom")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="all">All Sides</option>
                        <option value="horizontal">Horizontal</option>
                        <option value="vertical">Vertical</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                        <option value="top">Top</option>
                        <option value="bottom">Bottom</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Expand Fill</div>
                      <select value={generativeExpandFill} onChange={(e) => setGenerativeExpandFill(e.target.value as "gradient" | "mirror" | "blur")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="gradient">Gradient</option>
                        <option value="mirror">Mirror Edge</option>
                        <option value="blur">Blur Context</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Expand Source</div>
                      <select value={generativeExpandSource} onChange={(e) => setGenerativeExpandSource(e.target.value as "merged" | "active")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="merged">Merged Canvas</option>
                        <option value="active">Active Layer</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Sky Style</div>
                      <select value={skyReplacementStyle} onChange={(e) => setSkyReplacementStyle(e.target.value as "sunset" | "clear" | "storm" | "twilight")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="sunset">Sunset</option>
                        <option value="clear">Clear Day</option>
                        <option value="storm">Storm</option>
                        <option value="twilight">Twilight</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Sky Intensity: {skyReplacementIntensity}%</div>
                      <input type="range" min={0} max={100} value={skyReplacementIntensity} onChange={(e) => setSkyReplacementIntensity(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Horizon: {skyReplacementHorizon}%</div>
                      <input type="range" min={20} max={80} value={skyReplacementHorizon} onChange={(e) => setSkyReplacementHorizon(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Clouds: {skyReplacementClouds}%</div>
                      <input type="range" min={0} max={100} value={skyReplacementClouds} onChange={(e) => setSkyReplacementClouds(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Remove BG Feather: {removeBgFeather}%</div>
                      <input type="range" min={0} max={100} value={removeBgFeather} onChange={(e) => setRemoveBgFeather(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Subject Scale: {removeBgSubjectScale}%</div>
                      <input type="range" min={20} max={90} value={removeBgSubjectScale} onChange={(e) => setRemoveBgSubjectScale(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Decontaminate: {removeBgDecontaminate}%</div>
                      <input type="range" min={0} max={100} value={removeBgDecontaminate} onChange={(e) => setRemoveBgDecontaminate(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Remove BG Source</div>
                      <select value={removeBgSource} onChange={(e) => setRemoveBgSource(e.target.value as "merged" | "active")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="active">Active Layer</option>
                        <option value="merged">Merged Canvas</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Super Res Scale</div>
                      <select value={superResScale} onChange={(e) => setSuperResScale(Number(e.target.value) as 2 | 3 | 4)} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value={2}>2x</option>
                        <option value={3}>3x</option>
                        <option value={4}>4x</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Super Res Source</div>
                      <select value={superResSource} onChange={(e) => setSuperResSource(e.target.value as "merged" | "active")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="merged">Merged Canvas</option>
                        <option value="active">Active Layer</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Sharpen: {superResSharpen}%</div>
                      <input type="range" min={0} max={100} value={superResSharpen} onChange={(e) => setSuperResSharpen(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Denoise: {superResDenoise}%</div>
                      <input type="range" min={0} max={100} value={superResDenoise} onChange={(e) => setSuperResDenoise(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Video In: {videoEditInFrame}</div>
                      <input type="range" min={0} max={Math.max(1, timelineDurationFrames - 2)} value={Math.min(videoEditInFrame, Math.max(1, timelineDurationFrames - 2))} onChange={(e) => setVideoEditInFrame(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Video Out: {videoEditOutFrame}</div>
                      <input type="range" min={1} max={Math.max(1, timelineDurationFrames - 1)} value={Math.min(videoEditOutFrame, Math.max(1, timelineDurationFrames - 1))} onChange={(e) => setVideoEditOutFrame(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Video Speed: {videoEditSpeed.toFixed(2)}x</div>
                      <input type="range" min={25} max={400} value={Math.round(videoEditSpeed * 100)} onChange={(e) => setVideoEditSpeed(Number(e.target.value) / 100)} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Video Transition</div>
                      <select value={videoEditTransition} onChange={(e) => setVideoEditTransition(e.target.value as "cut" | "fade" | "dissolve")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="cut">Cut</option>
                        <option value="fade">Fade</option>
                        <option value="dissolve">Dissolve</option>
                      </select>
                    </label>
                    <label className="flex items-end gap-2 text-zinc-500">
                      <input type="checkbox" checked={videoEditLoop} onChange={(e) => setVideoEditLoop(e.target.checked)} />
                      Loop Playback
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Print Profile</div>
                      <select value={printColorProfile} onChange={(e) => setPrintColorProfile(e.target.value as "srgb" | "display-p3" | "adobe-rgb" | "cmyk-coated" | "gracol")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="srgb">sRGB IEC61966-2.1</option>
                        <option value="display-p3">Display P3</option>
                        <option value="adobe-rgb">Adobe RGB (1998)</option>
                        <option value="cmyk-coated">US Web Coated (SWOP) v2</option>
                        <option value="gracol">GRACoL 2013 Coated</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Render Intent</div>
                      <select value={printIntent} onChange={(e) => setPrintIntent(e.target.value as "perceptual" | "relative-colorimetric" | "saturation" | "absolute-colorimetric")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="perceptual">Perceptual</option>
                        <option value="relative-colorimetric">Relative Colorimetric</option>
                        <option value="saturation">Saturation</option>
                        <option value="absolute-colorimetric">Absolute Colorimetric</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Paper</div>
                      <select value={printPaperSize} onChange={(e) => setPrintPaperSize(e.target.value as "a4" | "letter" | "a3" | "tabloid")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="a4">A4</option>
                        <option value="letter">Letter</option>
                        <option value="a3">A3</option>
                        <option value="tabloid">Tabloid</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Orientation</div>
                      <select value={printOrientation} onChange={(e) => setPrintOrientation(e.target.value as "portrait" | "landscape")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Scale: {printScalePercent}%</div>
                      <input type="range" min={10} max={200} value={printScalePercent} onChange={(e) => setPrintScalePercent(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Bleed: {printBleedMm}mm</div>
                      <input type="range" min={0} max={10} value={printBleedMm} onChange={(e) => setPrintBleedMm(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="flex items-end gap-2 text-zinc-500">
                      <input type="checkbox" checked={printShowMarks} onChange={(e) => setPrintShowMarks(e.target.checked)} />
                      Show Crop Marks
                    </label>
                    <label className="flex items-end gap-2 text-zinc-500">
                      <input type="checkbox" checked={printFlattenImage} onChange={(e) => setPrintFlattenImage(e.target.checked)} />
                      Flatten For Print
                    </label>
                    <label className="flex items-end gap-2 text-zinc-500">
                      <input type="checkbox" checked={printSimulateCmyk} onChange={(e) => setPrintSimulateCmyk(e.target.checked)} />
                      Simulate CMYK
                    </label>
                  </div>
                  {lastPrintSummary && (
                    <div className="text-[10px] text-zinc-500">{lastPrintSummary}</div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Asset Source</div>
                      <select value={assetGenSource} onChange={(e) => setAssetGenSource(e.target.value as "slices" | "artboards" | "both")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="both">Slices + Artboards</option>
                        <option value="slices">Slices only</option>
                        <option value="artboards">Artboards only</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Asset Quality: {assetGenQuality}%</div>
                      <input type="range" min={40} max={100} value={assetGenQuality} onChange={(e) => setAssetGenQuality(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1 col-span-2">
                      <div className="text-zinc-500">Asset Prefix</div>
                      <input value={assetGenPrefix} onChange={(e) => setAssetGenPrefix(e.target.value)} placeholder="optional-prefix" className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" />
                    </label>
                    <label className="col-span-2 flex items-center gap-2 text-zinc-500">
                      <input type="checkbox" checked={assetGenIncludeSourceTag} onChange={(e) => setAssetGenIncludeSourceTag(e.target.checked)} />
                      Include source tag in filename (`-slice` / `-artboard`)
                    </label>
                    <div className="space-y-1">
                      <div className="text-zinc-500">Formats</div>
                      <div className="flex flex-wrap gap-1">
                        {(["png", "jpeg", "webp"] as const).map((fmt) => (
                          <label key={fmt} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800">
                            <input type="checkbox" checked={assetGenFormats.includes(fmt)} onChange={() => toggleAssetGenFormat(fmt)} />
                            {fmt.toUpperCase()}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-zinc-500">Scales</div>
                      <div className="flex flex-wrap gap-1">
                        {[1, 2, 3, 4].map((scale) => (
                          <label key={scale} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800">
                            <input type="checkbox" checked={assetGenScales.includes(scale as 1 | 2 | 3 | 4)} onChange={() => toggleAssetGenScale(scale as 1 | 2 | 3 | 4)} />
                            {scale}x
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {assetGenStatus.running ? `Generating assets ${assetGenStatus.done}/${assetGenStatus.total}${assetGenStatus.last ? ` - ${assetGenStatus.last}` : ""}` : assetGenReport ? assetGenReport.split("\n")[0] : "No generated asset report yet."}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Neural Model</div>
                      <select value={neuralPluginModel} onChange={(e) => setNeuralPluginModel(e.target.value as "skin-smooth" | "portrait-light" | "colorize" | "style-transfer" | "depth-blur")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="skin-smooth">Skin Smooth</option>
                        <option value="portrait-light">Portrait Relight</option>
                        <option value="colorize">Colorize</option>
                        <option value="style-transfer">Style Transfer</option>
                        <option value="depth-blur">Depth Blur</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Strength: {neuralPluginStrength}%</div>
                      <input type="range" min={0} max={100} value={neuralPluginStrength} onChange={(e) => setNeuralPluginStrength(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Detail: {neuralPluginDetail}%</div>
                      <input type="range" min={0} max={100} value={neuralPluginDetail} onChange={(e) => setNeuralPluginDetail(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="flex items-end gap-2 text-zinc-500">
                      <input type="checkbox" checked={neuralPluginPreserveColor} onChange={(e) => setNeuralPluginPreserveColor(e.target.checked)} />
                      Preserve color
                    </label>
                    <label className="flex items-end gap-2 text-zinc-500">
                      <input type="checkbox" checked={neuralPluginAutoMask} onChange={(e) => setNeuralPluginAutoMask(e.target.checked)} />
                      Auto subject mask
                    </label>
                    <div className="flex items-end">
                      <button onClick={handleApplyNeuralPlugin} disabled={!activeLayerId} className="w-full px-2 py-1.5 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Apply Neural Plugin</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => handleNeuralFilterPreset('skin')} disabled={!activeLayerId} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Neural: Skin</button>
                    <button onClick={() => handleNeuralFilterPreset('colorize')} disabled={!activeLayerId} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Neural: Colorize</button>
                    <button onClick={() => handleNeuralFilterPreset('style')} disabled={!activeLayerId} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Neural: Style</button>
                    <button onClick={handleSkyReplacement} disabled={isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Sky Replacement</button>
                    <button onClick={() => void handleUpdateActiveSkyReplacement()} disabled={isViewer || !(selectedLayer && (selectedLayer.aiData as any)?.aiSkyReplacement)} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Update Sky Layer</button>
                    <button onClick={handleRemoveBackground} disabled={isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Remove Background</button>
                    <button onClick={() => void handleUpdateActiveRemoveBackground()} disabled={isViewer || !(selectedLayer && (selectedLayer.aiData as any)?.aiRemoveBackground)} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Update Removed BG Layer</button>
                    <button onClick={handleGenerativeExpand} disabled={isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Generative Expand</button>
                    <button onClick={() => void handleUpdateActiveGenerativeExpand()} disabled={isViewer || !(selectedLayer && (selectedLayer.aiData as any)?.aiExpand)} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Update Expand Layer</button>
                    <button onClick={handleSuperResolution} disabled={isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Super Resolution</button>
                    <button onClick={() => void handleUpdateActiveSuperResolution()} disabled={isViewer || !(selectedLayer && (selectedLayer.aiData as any)?.aiUpscale)} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Update Super-Res Layer</button>
                    <button onClick={handleCreateVideoLayer} disabled={isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Video Layer</button>
                    <button onClick={() => void handleUpdateActiveVideoLayer()} disabled={isViewer || selectedLayer?.type !== "video"} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Update Video Layer</button>
                    <button onClick={() => setVideoEditInFrame(Math.min(timelineFrame, Math.max(0, timelineDurationFrames - 2)))} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">Set In @ Frame</button>
                    <button onClick={() => setVideoEditOutFrame(Math.min(Math.max(timelineFrame, 1), Math.max(1, timelineDurationFrames - 1)))} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">Set Out @ Frame</button>
                    <button onClick={handleCreate3DLayer} disabled={isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">3D Layer</button>
                    <button onClick={() => void handleUpdateActive3DLayer()} disabled={isViewer || selectedLayer?.type !== "threeD"} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Update 3D Layer</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={toggleMacroRecording} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">{isActionRecording ? "Stop Action" : "Record Action"}</button>
                    <button onClick={handleBatchProcess} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">Batch Processing</button>
                    <button onClick={handleGenerateAssets} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">Generate Assets</button>
                    <button onClick={handlePrintSettings} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">Print Settings</button>
                    <button onClick={() => setSidebarTab('automate')} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">Droplets</button>
                    <button onClick={() => setSidebarTab('automate')} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">Variables</button>
                    <button onClick={() => setSidebarTab('automate')} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">Scripts</button>
                    <button onClick={() => alert("Camera Raw and Neural plugin presets are enabled from this panel.")} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">Plugins</button>
                  </div>
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-3">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Advanced Filters, Automation, Video, Plugins</h4>
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase tracking-wide text-zinc-500">Blur</div>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={handleGaussianBlurFilter} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Gaussian</button>
                      <button onClick={handleMotionBlurFilter} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Motion</button>
                      <button onClick={handleLensBlurFilter} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Lens</button>
                      <button onClick={handleSurfaceBlurFilter} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Surface</button>
                      <button onClick={handleFieldBlurFilter} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Field</button>
                      <button onClick={handleTiltShiftFilter} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Tilt-Shift</button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase tracking-wide text-zinc-500">Sharpen / Noise</div>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={handleUnsharpMaskFilter} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Unsharp Mask</button>
                      <button onClick={handleSmartSharpenFilter} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Smart Sharpen</button>
                      <button onClick={handleHighPassFilter} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">High Pass</button>
                      <button onClick={handleAddNoiseFilter} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Add Noise</button>
                      <button onClick={handleReduceNoiseFilter} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Reduce Noise</button>
                      <button onClick={handleDustScratchesFilter} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Dust & Scratches</button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase tracking-wide text-zinc-500">Distort / Render / Stylize</div>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={handleLiquifyFilter} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Liquify</button>
                      <button onClick={handleWarpFilter} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Warp</button>
                      <button onClick={handleTwirlFilter} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Twirl</button>
                      <button onClick={handleRippleFilter} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Ripple</button>
                      <button onClick={handlePolarCoordinatesFilter} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Polar</button>
                      <button onClick={handleCloudsRender} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Clouds</button>
                      <button onClick={handleLightingRender} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Lighting</button>
                      <button onClick={handleLensFlareRender} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Lens Flare</button>
                      <button onClick={handleOilPaintStylize} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Oil Paint</button>
                      <button onClick={handleEmbossStylize} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Emboss</button>
                      <button onClick={handleFindEdgesStylize} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Find Edges</button>
                      <button onClick={handleGlowingEdgesStylize} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Glowing Edges</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded border border-zinc-200 dark:border-zinc-700 p-2 space-y-2">
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">Automation</div>
                      <button onClick={handleRunDroplet} disabled={!activeLayerId} className="w-full px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Droplet Run</button>
                      <textarea value={dataRows} onChange={(e) => setDataRows(e.target.value)} className="w-full h-16 text-[10px] px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900" />
                      <button onClick={() => void handleApplyDataDrivenGraphics()} className="w-full px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">Variables/Data-driven</button>
                      <input value={scriptCommand} onChange={(e) => setScriptCommand(e.target.value)} placeholder="script command..." className="w-full text-[10px] px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900" />
                      <button onClick={() => void handleRunQuickScriptCommand()} className="w-full px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">Run Script</button>
                    </div>
                    <div className="rounded border border-zinc-200 dark:border-zinc-700 p-2 space-y-2">
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">Video / 3D / Plugins</div>
                      <label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={includeTimelineAudio} onChange={(e) => setIncludeTimelineAudio(e.target.checked)} /> Include audio</label>
                      <button onClick={() => void handleExportTimelineVideo()} disabled={isExportingVideo} className="w-full px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">{isExportingVideo ? "Exporting..." : "Export Timeline Video"}</button>
                      <label className="space-y-1 text-[10px] block">
                        <div className="text-zinc-500">3D Depth: {legacy3DDepth}%</div>
                        <input type="range" min={0} max={100} value={legacy3DDepth} onChange={(e) => setLegacy3DDepth(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                      </label>
                      <label className="space-y-1 text-[10px] block">
                        <div className="text-zinc-500">3D Tilt: {legacy3DTilt}°</div>
                        <input type="range" min={-60} max={60} value={legacy3DTilt} onChange={(e) => setLegacy3DTilt(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                      </label>
                      <label className="space-y-1 text-[10px] block">
                        <div className="text-zinc-500">Wireframe: {legacy3DWireframe}</div>
                        <input type="range" min={4} max={40} value={legacy3DWireframe} onChange={(e) => setLegacy3DWireframe(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                      </label>
                      <label className="space-y-1 text-[10px] block">
                        <div className="text-zinc-500">3D Glow: {legacy3DGlow}%</div>
                        <input type="range" min={0} max={100} value={legacy3DGlow} onChange={(e) => setLegacy3DGlow(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                      </label>
                      <label className="space-y-1 text-[10px] block">
                        <div className="text-zinc-500">3D Object</div>
                        <select value={legacy3DObject} onChange={(e) => setLegacy3DObject(e.target.value as "cube" | "sphere" | "cylinder" | "torus" | "plane")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                          <option value="cube">Cube</option>
                          <option value="sphere">Sphere</option>
                          <option value="cylinder">Cylinder</option>
                          <option value="torus">Torus</option>
                          <option value="plane">Plane</option>
                        </select>
                      </label>
                      <label className="space-y-1 text-[10px] block">
                        <div className="text-zinc-500">Material</div>
                        <select value={legacy3DMaterial} onChange={(e) => setLegacy3DMaterial(e.target.value as "matte" | "metal" | "glass" | "emissive")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                          <option value="matte">Matte</option>
                          <option value="metal">Metal</option>
                          <option value="glass">Glass</option>
                          <option value="emissive">Emissive</option>
                        </select>
                      </label>
                      <label className="space-y-1 text-[10px] block">
                        <div className="text-zinc-500">Roughness: {legacy3DRoughness}%</div>
                        <input type="range" min={0} max={100} value={legacy3DRoughness} onChange={(e) => setLegacy3DRoughness(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                      </label>
                      <label className="space-y-1 text-[10px] block">
                        <div className="text-zinc-500">Metalness: {legacy3DMetalness}%</div>
                        <input type="range" min={0} max={100} value={legacy3DMetalness} onChange={(e) => setLegacy3DMetalness(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                      </label>
                      <label className="space-y-1 text-[10px] block">
                        <div className="text-zinc-500">Light Azimuth: {legacy3DLightAzimuth}deg</div>
                        <input type="range" min={-180} max={180} value={legacy3DLightAzimuth} onChange={(e) => setLegacy3DLightAzimuth(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                      </label>
                      <label className="space-y-1 text-[10px] block">
                        <div className="text-zinc-500">Light Elevation: {legacy3DLightElevation}deg</div>
                        <input type="range" min={0} max={90} value={legacy3DLightElevation} onChange={(e) => setLegacy3DLightElevation(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                      </label>
                      <label className="space-y-1 text-[10px] block">
                        <div className="text-zinc-500">Light Intensity: {legacy3DLightIntensity}%</div>
                        <input type="range" min={0} max={100} value={legacy3DLightIntensity} onChange={(e) => setLegacy3DLightIntensity(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                      </label>
                      <label className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <input type="checkbox" checked={uvPreviewEnabled} onChange={(e) => setUvPreviewEnabled(e.target.checked)} />
                        UV Preview Overlay
                      </label>
                      <label className="space-y-1 text-[10px] block">
                        <div className="text-zinc-500">UV Grid: {uvGridDensity}</div>
                        <input type="range" min={4} max={32} value={uvGridDensity} onChange={(e) => setUvGridDensity(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                      </label>
                      <label className="space-y-1 text-[10px] block">
                        <div className="text-zinc-500">UV Seam Strength: {uvSeamStrength}%</div>
                        <input type="range" min={0} max={100} value={uvSeamStrength} onChange={(e) => setUvSeamStrength(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                      </label>
                      <label className="space-y-1 text-[10px] block">
                        <div className="text-zinc-500">UV Checker: {uvCheckerOpacity}%</div>
                        <input type="range" min={0} max={100} value={uvCheckerOpacity} onChange={(e) => setUvCheckerOpacity(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                      </label>
                      <label className="space-y-1 text-[10px] block">
                        <div className="text-zinc-500">UV Distortion: {uvDistortion}%</div>
                        <input type="range" min={0} max={100} value={uvDistortion} onChange={(e) => setUvDistortion(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                      </label>
                      <button onClick={() => void handleUVTextureEdit()} disabled={isViewer || (!selection && selectedLayer?.type !== "threeD")} className="w-full px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">UV Texture Edit</button>
                      <button onClick={() => void handleUpdateActive3DLayer()} disabled={isViewer || selectedLayer?.type !== "threeD"} className="w-full px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Rebuild Active 3D Layer</button>
                      <select value={selectedPlugin} onChange={(e) => setSelectedPlugin(e.target.value as 'vintage-fx' | 'watercolor-brush' | 'bg-ai-remix' | 'film-grain-pro' | 'comic-ink-brush' | 'object-cutout-ai')} className="w-full text-[10px] px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="vintage-fx">Vintage FX Pack</option>
                        <option value="watercolor-brush">Watercolor Brush Kit</option>
                        <option value="bg-ai-remix">AI Background Remix</option>
                        <option value="film-grain-pro">Film Grain Pro</option>
                        <option value="comic-ink-brush">Comic Ink Brush</option>
                        <option value="object-cutout-ai">Object Cutout AI</option>
                      </select>
                      <div className="grid grid-cols-2 gap-1 text-[10px]">
                        <label className="space-y-1">
                          <div className="text-zinc-500">Plugin Strength: {thirdPartyPluginStrength}%</div>
                          <input type="range" min={0} max={100} value={thirdPartyPluginStrength} onChange={(e) => setThirdPartyPluginStrength(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                        </label>
                        <label className="space-y-1">
                          <div className="text-zinc-500">Plugin Detail: {thirdPartyPluginDetail}%</div>
                          <input type="range" min={0} max={100} value={thirdPartyPluginDetail} onChange={(e) => setThirdPartyPluginDetail(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                        </label>
                      </div>
                      <label className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <input type="checkbox" checked={thirdPartyPluginUseAiAssist} onChange={(e) => setThirdPartyPluginUseAiAssist(e.target.checked)} />
                        AI Assist
                      </label>
                      <button onClick={() => handleToggleThirdPartyPluginInstall(selectedPlugin)} className="w-full px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">
                        {installedThirdPartyPlugins[selectedPlugin] ? "Uninstall Plugin" : "Install Plugin"}
                      </button>
                      <button onClick={() => void handleRunThirdPartyPlugin()} className="w-full px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">Run Third-party Plugin</button>
                      {thirdPartyPluginStatus && <div className="text-[10px] text-zinc-500">{thirdPartyPluginStatus}</div>}
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300 flex items-center gap-1"><Navigation className="w-3.5 h-3.5" /> Navigator</h4>
                    <button onClick={() => { canvasRef.current?.resetView(); refreshViewState(); }} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">Reset</button>
                  </div>
                  <div className="text-[10px] text-zinc-500">Zoom: {(viewState.zoom * 100).toFixed(0)}%</div>
                  <input
                    type="range"
                    min={10}
                    max={800}
                    value={Math.round(viewState.zoom * 100)}
                    onChange={(e) => {
                      const z = Number(e.target.value) / 100;
                      canvasRef.current?.setZoom(z);
                      refreshViewState();
                    }}
                    className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700"
                  />
                  <div className="grid grid-cols-3 gap-1">
                    <button onClick={() => { canvasRef.current?.panBy(0, -40); refreshViewState(); }} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">Up</button>
                    <button onClick={() => { canvasRef.current?.panBy(-40, 0); refreshViewState(); }} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">Left</button>
                    <button onClick={() => { canvasRef.current?.panBy(40, 0); refreshViewState(); }} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">Right</button>
                    <button onClick={() => { canvasRef.current?.panBy(0, 40); refreshViewState(); }} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">Down</button>
                  </div>
                  <div className="text-[10px] text-zinc-500">Pan: {Math.round(viewState.panX)}, {Math.round(viewState.panY)}</div>
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Move, Crop & Measure</h4>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => setActiveTool('move')} className={cn("px-2 py-1 text-[10px] rounded", activeTool === 'move' ? "bg-blue-600 text-white" : "bg-zinc-200 dark:bg-zinc-800")}>Move Tool</button>
                    <button onClick={() => setActiveTool('crop')} className={cn("px-2 py-1 text-[10px] rounded", activeTool === 'crop' ? "bg-blue-600 text-white" : "bg-zinc-200 dark:bg-zinc-800")}>Crop Tool</button>
                    <button onClick={handleCrop} disabled={!selection || isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Crop Selection</button>
                    <button onClick={() => void handlePerspectiveCrop()} disabled={!selection || isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Perspective Crop</button>
                  </div>
                  {rulerInfo && (
                    <div className="text-[10px] text-zinc-500 grid grid-cols-2 gap-x-2 gap-y-1">
                      <div>X: {rulerInfo.x}px</div>
                      <div>Y: {rulerInfo.y}px</div>
                      <div>W: {rulerInfo.width}px</div>
                      <div>H: {rulerInfo.height}px</div>
                      <div>Diag: {rulerInfo.diagonal}px</div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => void handleEyedropperFromSelection()} disabled={isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Eyedropper</button>
                    <button onClick={handleAddNote} disabled={isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Add Note</button>
                    <button onClick={handleAddCountMarker} disabled={isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Count Marker</button>
                    <button onClick={() => setCounts([])} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">Clear Count</button>
                  </div>
                  {sampledColor && (
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      <span className="w-4 h-4 rounded border border-zinc-300 dark:border-zinc-700" style={{ backgroundColor: sampledColor.hex }} />
                      <span>{sampledColor.hex.toUpperCase()}</span>
                      <span>rgba({sampledColor.r}, {sampledColor.g}, {sampledColor.b}, {sampledColor.a})</span>
                    </div>
                  )}
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Retouching & Healing</h4>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={handleSpotHealing} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Spot Healing</button>
                    <button onClick={handleHealingBrush} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Healing Brush</button>
                    <button onClick={handlePatchTool} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Patch Tool</button>
                    <button onClick={handleContentAwareFill} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Content-Aware Fill/Move</button>
                    <button onClick={handleCloneStamp} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Clone Stamp</button>
                    <button onClick={handleRedEye} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Red Eye</button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Clone Offset X</div>
                      <input type="number" min={-512} max={512} value={cloneStampOffsetX} onChange={(e) => setCloneStampOffsetX(Number(e.target.value))} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Clone Offset Y</div>
                      <input type="number" min={-512} max={512} value={cloneStampOffsetY} onChange={(e) => setCloneStampOffsetY(Number(e.target.value))} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Clone Opacity {cloneStampOpacity}%</div>
                      <input type="range" min={5} max={100} value={cloneStampOpacity} onChange={(e) => setCloneStampOpacity(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Red Eye {redEyeStrength}%</div>
                      <input type="range" min={20} max={100} value={redEyeStrength} onChange={(e) => setRedEyeStrength(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                  </div>
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Painting & Drawing</h4>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={handleBrushTool} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Brush</button>
                    <button onClick={handlePencilTool} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Pencil</button>
                    <button onClick={handleMixerBrush} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Mixer Brush</button>
                    <button onClick={handleColorReplacementTool} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Color Replace</button>
                    <button onClick={handleGradientTool} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Gradient</button>
                    <button onClick={handlePaintBucket} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Paint Bucket</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Replace Tolerance {colorReplaceTolerance}</div>
                      <input type="range" min={4} max={100} value={colorReplaceTolerance} onChange={(e) => setColorReplaceTolerance(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Replace Strength {colorReplaceStrength}%</div>
                      <input type="range" min={10} max={100} value={colorReplaceStrength} onChange={(e) => setColorReplaceStrength(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Gradient Type</div>
                      <select value={gradientType} onChange={(e) => setGradientType(e.target.value as "linear" | "radial" | "reflected" | "diamond")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="linear">Linear</option>
                        <option value="radial">Radial</option>
                        <option value="reflected">Reflected</option>
                        <option value="diamond">Diamond</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Gradient Angle {gradientAngle}°</div>
                      <input type="range" min={0} max={360} value={gradientAngle} onChange={(e) => setGradientAngle(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Gradient Opacity {gradientOpacity}%</div>
                      <input type="range" min={5} max={100} value={gradientOpacity} onChange={(e) => setGradientOpacity(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Bucket Mode</div>
                      <select value={paintBucketMode} onChange={(e) => setPaintBucketMode(e.target.value as "color" | "pattern")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="color">Color</option>
                        <option value="pattern">Pattern</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Pattern</div>
                      <select value={paintBucketPattern} onChange={(e) => setPaintBucketPattern(e.target.value as "checker" | "stripes" | "dots")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="checker">Checker</option>
                        <option value="stripes">Stripes</option>
                        <option value="dots">Dots</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Tolerance {paintBucketTolerance}%</div>
                      <input type="range" min={4} max={100} value={paintBucketTolerance} onChange={(e) => setPaintBucketTolerance(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                  </div>
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Blur, Sharpen, Smudge, Dodge, Burn, Sponge</h4>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={handleBlurTool} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Blur</button>
                    <button onClick={handleSharpenTool} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Sharpen</button>
                    <button onClick={handleSmudgeTool} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Smudge</button>
                    <button onClick={handleDodge} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Dodge</button>
                    <button onClick={handleBurn} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Burn</button>
                    <button onClick={handleSponge} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Sponge</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Blur Strength {blurToolStrength}%</div>
                      <input type="range" min={5} max={100} value={blurToolStrength} onChange={(e) => setBlurToolStrength(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="flex items-end gap-2 text-zinc-500">
                      <input type="checkbox" checked={blurToolPreserveEdges} onChange={(e) => setBlurToolPreserveEdges(e.target.checked)} />
                      Preserve edges
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Sharpen Amount {sharpenToolAmount}%</div>
                      <input type="range" min={0} max={150} value={sharpenToolAmount} onChange={(e) => setSharpenToolAmount(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Radius {sharpenToolRadius}px</div>
                      <input type="range" min={1} max={6} value={sharpenToolRadius} onChange={(e) => setSharpenToolRadius(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Threshold {sharpenToolThreshold}</div>
                      <input type="range" min={0} max={64} value={sharpenToolThreshold} onChange={(e) => setSharpenToolThreshold(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Smudge Strength {smudgeToolStrength}%</div>
                      <input type="range" min={5} max={100} value={smudgeToolStrength} onChange={(e) => setSmudgeToolStrength(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Finger Width {smudgeToolFingerWidth}px</div>
                      <input type="range" min={2} max={64} value={smudgeToolFingerWidth} onChange={(e) => setSmudgeToolFingerWidth(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Direction {smudgeToolDirection}°</div>
                      <input type="range" min={0} max={360} value={smudgeToolDirection} onChange={(e) => setSmudgeToolDirection(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Dodge Strength {dodgeToolStrength}%</div>
                      <input type="range" min={5} max={100} value={dodgeToolStrength} onChange={(e) => setDodgeToolStrength(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Dodge Range</div>
                      <select value={dodgeToolRange} onChange={(e) => setDodgeToolRange(e.target.value as "shadows" | "midtones" | "highlights")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="shadows">Shadows</option>
                        <option value="midtones">Midtones</option>
                        <option value="highlights">Highlights</option>
                      </select>
                    </label>
                    <label className="flex items-end gap-2 text-zinc-500">
                      <input type="checkbox" checked={dodgeProtectHighlights} onChange={(e) => setDodgeProtectHighlights(e.target.checked)} />
                      Protect highlights
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Burn Strength {burnToolStrength}%</div>
                      <input type="range" min={5} max={100} value={burnToolStrength} onChange={(e) => setBurnToolStrength(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Burn Range</div>
                      <select value={burnToolRange} onChange={(e) => setBurnToolRange(e.target.value as "shadows" | "midtones" | "highlights")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="shadows">Shadows</option>
                        <option value="midtones">Midtones</option>
                        <option value="highlights">Highlights</option>
                      </select>
                    </label>
                    <label className="flex items-end gap-2 text-zinc-500">
                      <input type="checkbox" checked={burnProtectShadows} onChange={(e) => setBurnProtectShadows(e.target.checked)} />
                      Protect shadows
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Sponge Strength {spongeToolStrength}%</div>
                      <input type="range" min={5} max={100} value={spongeToolStrength} onChange={(e) => setSpongeToolStrength(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Sponge Mode</div>
                      <select value={spongeToolMode} onChange={(e) => setSpongeToolMode(e.target.value as "saturate" | "desaturate")} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="saturate">Saturate</option>
                        <option value="desaturate">Desaturate</option>
                      </select>
                    </label>
                    <label className="flex items-end gap-2 text-zinc-500">
                      <input type="checkbox" checked={spongeProtectSkin} onChange={(e) => setSpongeProtectSkin(e.target.checked)} />
                      Protect skin
                    </label>
                  </div>
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Vector & Text</h4>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Shape</div>
                      <select
                        value={vectorShape}
                        onChange={(e) => setVectorShape(e.target.value as 'rectangle' | 'ellipse' | 'polygon' | 'custom')}
                        className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                      >
                        <option value="rectangle">Rectangle</option>
                        <option value="ellipse">Ellipse</option>
                        <option value="polygon">Polygon</option>
                        <option value="custom">Custom</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">{vectorShape === "custom" ? "Custom Preset" : "Polygon Sides"}</div>
                      {vectorShape === "custom" ? (
                        <select
                          value={customShapePreset}
                          onChange={(e) => setCustomShapePreset(e.target.value as 'star' | 'arrow' | 'diamond' | 'speech')}
                          className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                        >
                          <option value="star">Star</option>
                          <option value="arrow">Arrow</option>
                          <option value="diamond">Diamond</option>
                          <option value="speech">Speech Bubble</option>
                        </select>
                      ) : (
                        <input type="number" min={3} max={12} value={polygonSides} onChange={(e) => setPolygonSides(Number(e.target.value))} disabled={vectorShape !== "polygon"} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 disabled:opacity-60" />
                      )}
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => handleCreatePath("pen")} disabled={isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Pen Tool</button>
                    <button onClick={() => handleCreatePath("curvature")} disabled={isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Curvature Pen</button>
                    <button onClick={() => handleCreateShape()} disabled={isViewer || !selection} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Shape Tools</button>
                    <button onClick={() => void handleUpdateActiveShapeLayer()} disabled={isViewer || selectedLayer?.type !== "shape"} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Update Shape Layer</button>
                    <button onClick={() => setPathMode(pathMode === 'add' ? 'subtract' : pathMode === 'subtract' ? 'intersect' : 'add')} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800">Path Operation: {pathMode}</button>
                    <button onClick={handleApplyPathOperation} disabled={isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Apply Path Op</button>
                  </div>
                  <textarea
                    value={textDraft}
                    onChange={(e) => setTextDraft(e.target.value)}
                    placeholder="Type text here"
                    className="w-full h-16 text-[10px] px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900"
                  />
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Font Family</div>
                      <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value as 'sans' | 'serif' | 'mono')} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="sans">Sans</option>
                        <option value="serif">Serif</option>
                        <option value="mono">Mono</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Font Weight</div>
                      <select value={fontWeight} onChange={(e) => setFontWeight(Number(e.target.value) as 300 | 400 | 500 | 600 | 700)} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value={300}>300</option>
                        <option value={400}>400</option>
                        <option value={500}>500</option>
                        <option value={600}>600</option>
                        <option value={700}>700</option>
                      </select>
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                    <label className="flex items-center gap-1"><input type="checkbox" checked={openTypeLiga} onChange={(e) => setOpenTypeLiga(e.target.checked)} /> OpenType Ligatures</label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={openTypeDiscretionaryLiga} onChange={(e) => setOpenTypeDiscretionaryLiga(e.target.checked)} /> Discretionary Ligatures</label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={openTypeKerning} onChange={(e) => setOpenTypeKerning(e.target.checked)} /> Kerning</label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={openTypeOldStyleFigures} onChange={(e) => setOpenTypeOldStyleFigures(e.target.checked)} /> Oldstyle Figures</label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={openTypeSmallCaps} onChange={(e) => setOpenTypeSmallCaps(e.target.checked)} /> Small Caps</label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={textItalic} onChange={(e) => setTextItalic(e.target.checked)} /> Italic</label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={textUnderline} onChange={(e) => setTextUnderline(e.target.checked)} /> Underline</label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Paragraph Spacing</div>
                      <input type="number" min={0} max={120} value={paragraphSpacing} onChange={(e) => setParagraphSpacing(Number(e.target.value) || 0)} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">First-line Indent</div>
                      <input type="number" min={0} max={240} value={paragraphIndent} onChange={(e) => setParagraphIndent(Number(e.target.value) || 0)} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <button
                      onClick={() => setTextDirection("horizontal")}
                      className={cn("px-2 py-1 rounded transition-colors", textDirection === "horizontal" ? "bg-blue-600 text-white" : "bg-zinc-200 dark:bg-zinc-800")}
                    >
                      Horizontal Type
                    </button>
                    <button
                      onClick={() => setTextDirection("vertical")}
                      className={cn("px-2 py-1 rounded transition-colors", textDirection === "vertical" ? "bg-blue-600 text-white" : "bg-zinc-200 dark:bg-zinc-800")}
                    >
                      Vertical Type
                    </button>
                  </div>
                  <label className="space-y-1 text-[10px] block">
                    <div className="text-zinc-500">Warp: {(textWarp * 100).toFixed(0)}%</div>
                    <input type="range" min={0} max={80} value={Math.round(textWarp * 100)} onChange={(e) => setTextWarp(Number(e.target.value) / 100)} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Warp Style</div>
                      <select value={textWarpStyle} onChange={(e) => setTextWarpStyle(e.target.value as 'arc' | 'arch' | 'bulge' | 'flag' | 'wave')} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="arc">Arc</option>
                        <option value="arch">Arch</option>
                        <option value="bulge">Bulge</option>
                        <option value="flag">Flag</option>
                        <option value="wave">Wave</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Warp Axis</div>
                      <select value={textWarpAxis} onChange={(e) => setTextWarpAxis(e.target.value as 'horizontal' | 'vertical')} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <option value="horizontal">Horizontal</option>
                        <option value="vertical">Vertical</option>
                      </select>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => void handleAddTypeLayer()} disabled={isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Type Tool</button>
                    <button onClick={() => void handleUpdateActiveTextLayer()} disabled={isViewer || !activeLayerId} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Update Text Layer</button>
                    <button onClick={() => void handleWarpText()} disabled={isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Warp Text</button>
                    <button onClick={() => void handleTextOnPath()} disabled={isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Text on Path</button>
                  </div>
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Artboards</h4>
                    <button onClick={handleAddArtboardFromSelection} disabled={isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Add</button>
                  </div>
                  <div className="text-[10px] text-zinc-500">Multi-screen layouts with reusable artboard presets.</div>
                  <div className="flex flex-wrap gap-1">
                    {ARTBOARD_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handleAddArtboardPreset(preset)}
                        disabled={isViewer}
                        className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40"
                        title={`${preset.width}x${preset.height}`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button onClick={handleCreateSlicesFromArtboards} disabled={isViewer || !artboards.length} className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Slices From Artboards</button>
                    <button onClick={() => void handleExportAllArtboards()} disabled={!artboards.length} className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Export All</button>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-auto">
                    {artboards.length === 0 ? (
                      <div className="text-[10px] text-zinc-500">No artboards yet.</div>
                    ) : artboards.map((a) => (
                      <div key={a.id} className="flex items-center gap-1 text-[10px] rounded border border-zinc-200 dark:border-zinc-700 p-1.5">
                        <span className="flex-1 truncate">{a.name} ({a.width}x{a.height})</span>
                        <button onClick={() => handleFocusArtboard(a)} className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800">Focus</button>
                        <button onClick={() => void exportArtboard(a)} className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800">Export</button>
                        <button onClick={() => handleRenameArtboard(a.id)} disabled={isViewer} className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Rename</button>
                        <button onClick={() => handleDuplicateArtboard(a.id)} disabled={isViewer} className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Duplicate</button>
                        <button onClick={() => setArtboards((prev) => prev.filter((it) => it.id !== a.id))} disabled={isViewer} className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Delete</button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Slices</h4>
                    <button onClick={handleAddSliceFromSelection} disabled={isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Add From Selection</button>
                  </div>
                  <div className="text-[10px] text-zinc-500">Web slicing presets for responsive export.</div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Format</div>
                      <select
                        value={sliceExportFormat}
                        onChange={(e) => setSliceExportFormat(e.target.value as "png" | "jpeg" | "webp")}
                        className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                      >
                        <option value="webp">WebP</option>
                        <option value="png">PNG</option>
                        <option value="jpeg">JPEG</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Quality: {sliceExportQuality}%</div>
                      <input
                        type="range"
                        min={40}
                        max={100}
                        value={sliceExportQuality}
                        onChange={(e) => setSliceExportQuality(Number(e.target.value))}
                        className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700"
                        disabled={sliceExportFormat === "png"}
                      />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Naming</div>
                      <select
                        value={sliceWebNaming}
                        onChange={(e) => setSliceWebNaming(e.target.value as "kebab" | "preserve")}
                        className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                      >
                        <option value="kebab">Kebab-case</option>
                        <option value="preserve">Preserve names</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Asset Path Prefix</div>
                      <input value={sliceWebPathPrefix} onChange={(e) => setSliceWebPathPrefix(e.target.value)} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" placeholder="assets/ui/" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">CSS Class Prefix</div>
                      <input value={sliceWebClassPrefix} onChange={(e) => setSliceWebClassPrefix(e.target.value)} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" placeholder="ui-" />
                    </label>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-zinc-500">Scales</span>
                    {[1, 2, 3].map((scale) => (
                      <label key={scale} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={sliceExportScales.includes(scale as 1 | 2 | 3)}
                          onChange={() => toggleSliceScale(scale as 1 | 2 | 3)}
                        />
                        @{scale}x
                      </label>
                    ))}
                    <button onClick={() => void handleExportAllSlicesForWeb()} disabled={!slices.length} className="ml-auto px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Export All</button>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <button onClick={handleExportSliceManifest} disabled={!slices.length} className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Manifest JSON</button>
                    <button onClick={handleExportSliceCss} disabled={!slices.length} className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">CSS Snippet</button>
                  </div>
                  {sliceWebReport && <div className="text-[10px] text-zinc-500">{sliceWebReport}</div>}
                  <div className="space-y-1 max-h-24 overflow-auto">
                    {slices.length === 0 ? (
                      <div className="text-[10px] text-zinc-500">No slices yet.</div>
                    ) : slices.map((s) => (
                      <div key={s.id} className="flex items-center gap-1 text-[10px] rounded border border-zinc-200 dark:border-zinc-700 p-1.5">
                        <span className="flex-1 truncate">{s.name} ({s.width}x{s.height})</span>
                        <button onClick={() => void exportSlice(s)} className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800">Export</button>
                        <button onClick={() => void exportSliceForWeb(s)} className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800">Web</button>
                        <button onClick={() => setSlices((prev) => prev.filter((it) => it.id !== s.id))} disabled={isViewer} className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Delete</button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300 flex items-center gap-1"><Palette className="w-3.5 h-3.5" /> Color / Swatches / Gradients</h4>
                  <div className="flex items-center gap-2">
                    <input type="color" value={activeColor} onChange={(e) => setActiveColor(e.target.value)} className="w-8 h-8 rounded border border-zinc-300 dark:border-zinc-700" />
                    <button
                      onClick={() => setSwatches((prev) => prev.includes(activeColor) ? prev : [...prev.slice(-11), activeColor])}
                      className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800"
                    >
                      Save Swatch
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {swatches.map((c) => (
                      <button key={c} onClick={() => setActiveColor(c)} className="w-5 h-5 rounded border border-zinc-300 dark:border-zinc-700" style={{ backgroundColor: c }} title={c} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="color" value={gradientA} onChange={(e) => setGradientA(e.target.value)} className="w-8 h-8 rounded border border-zinc-300 dark:border-zinc-700" />
                    <input type="color" value={gradientB} onChange={(e) => setGradientB(e.target.value)} className="w-8 h-8 rounded border border-zinc-300 dark:border-zinc-700" />
                    <div className="flex-1 h-8 rounded border border-zinc-300 dark:border-zinc-700" style={{ background: `linear-gradient(90deg, ${gradientA}, ${gradientB})` }} />
                  </div>
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Channels</h4>
                  <div className="grid grid-cols-2 gap-1">
                    {(['r', 'g', 'b', 'a'] as const).map((key) => (
                      <label key={key} className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800">
                        <span className="uppercase">{key === 'a' ? 'Alpha' : key}</span>
                        <input
                          type="checkbox"
                          checked={channels[key]}
                          onChange={(e) => setChannels((prev) => ({ ...prev, [key]: e.target.checked }))}
                        />
                      </label>
                    ))}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    Composite: {channels.r || channels.g || channels.b ? "RGB" : "None"} {channels.a ? "+ Alpha" : ""}
                  </div>
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Paths</h4>
                    <button
                      onClick={() => handleCreatePath("work")}
                      disabled={isViewer}
                      className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40"
                    >
                      New
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {(['add', 'subtract', 'intersect'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setPathMode(mode)}
                        className={cn(
                          "px-2 py-1 text-[10px] rounded transition-colors",
                          pathMode === mode ? "bg-blue-600 text-white" : "bg-zinc-200 dark:bg-zinc-800"
                        )}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <button onClick={handleApplyPathOperation} disabled={isViewer} className="px-2 py-1 text-[10px] rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Apply Operation</button>
                  <div className="space-y-1 max-h-24 overflow-auto">
                    {paths.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setActivePathId(p.id)}
                        className={cn(
                          "flex items-center gap-1 text-[10px] rounded border p-1.5 cursor-pointer",
                          activePathId === p.id
                            ? "border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10"
                            : "border-zinc-200 dark:border-zinc-700"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={p.visible}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setPaths((prev) => prev.map((it) => it.id === p.id ? { ...it, visible: e.target.checked } : it))}
                        />
                        <span className="flex-1 truncate">{p.name}{activePathId === p.id ? " (Active)" : ""}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaths((prev) => prev.filter((it) => it.id !== p.id));
                          }}
                          className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Character / Paragraph</h4>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <label className="space-y-1">
                      <div className="text-zinc-500">Font Size</div>
                      <input type="number" min={8} max={320} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" />
                    </label>
                    <label className="space-y-1">
                      <div className="text-zinc-500">Line Height</div>
                      <input type="number" min={0.6} max={4} step={0.1} value={lineHeight} onChange={(e) => setLineHeight(Number(e.target.value))} className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" />
                    </label>
                  </div>
                  <label className="space-y-1 text-[10px] block">
                    <div className="text-zinc-500">Tracking</div>
                    <input type="range" min={-100} max={400} value={tracking} onChange={(e) => setTracking(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                  </label>
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Brush / Brush Settings</h4>
                  <label className="space-y-1 text-[10px] block">
                    <div className="text-zinc-500">Size: {brushSize}px</div>
                    <input type="range" min={1} max={256} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                  </label>
                  <label className="space-y-1 text-[10px] block">
                    <div className="text-zinc-500">Hardness: {brushHardness}%</div>
                    <input type="range" min={0} max={100} value={brushHardness} onChange={(e) => setBrushHardness(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                  </label>
                  <label className="space-y-1 text-[10px] block">
                    <div className="text-zinc-500">Spacing: {brushSpacing}%</div>
                    <input type="range" min={1} max={100} value={brushSpacing} onChange={(e) => setBrushSpacing(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                  </label>
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Libraries</h4>
                  <div className="text-[10px] text-zinc-500">Reusable assets and presets</div>
                  <div className="grid grid-cols-2 gap-1">
                    {swatches.slice(-6).map((c) => (
                      <div key={`lib-${c}`} className="h-6 rounded border border-zinc-300 dark:border-zinc-700" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Timeline</h4>
                  <div className="text-[10px] text-zinc-500">Frame: {timelineFrame} / FPS: {timelineFps}</div>
                  <input type="range" min={0} max={240} value={timelineFrame} onChange={(e) => setTimelineFrame(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                  <input type="range" min={12} max={60} value={timelineFps} onChange={(e) => setTimelineFps(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                </section>

                <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Actions</h4>
                    <button
                      onClick={toggleMacroRecording}
                      className={cn(
                        "px-2 py-1 text-[10px] rounded",
                        isActionRecording ? "bg-red-600 text-white" : "bg-zinc-200 dark:bg-zinc-800"
                      )}
                    >
                      {isActionRecording ? "Stop" : "Record"}
                    </button>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-auto">
                    {actions.map((a) => (
                      <div key={a.id} className="flex items-center gap-1 text-[10px] rounded border border-zinc-200 dark:border-zinc-700 p-1.5">
                        <span className="flex-1 truncate">{a.name}</span>
                        <span className="text-zinc-500">{a.steps} steps</span>
                        <button onClick={() => void runSavedAction(a.id)} className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800">Run</button>
                      </div>
                    ))}
                  </div>
                </section>
                
              </div>
            )}
          </div>
        </>
      )}

      {selection && contextToolbarPosition && !showPromptBar && activeTool !== 'crop' && activeTool !== 'slice' && (
        <div
          className="fixed z-50 -translate-x-1/2 glass rounded-xl px-2 py-1.5 shadow-lg ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{ left: contextToolbarPosition.x, top: contextToolbarPosition.y }}
        >
          <div className="flex items-center gap-1">
            <button
              onClick={() => !isViewer && setShowPromptBar(true)}
              disabled={isViewer}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Edit with AI
            </button>
            <button
              onClick={() => {
                setShowSidebar(true);
                setSidebarTab('properties');
              }}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Adjust
            </button>
            <button
              onClick={() => {
                canvasRef.current?.clearSelection();
                setShowPromptBar(false);
              }}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
            <button
              onClick={handleCreateMask}
              disabled={isViewer}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Scan className="w-3.5 h-3.5" />
              Mask
            </button>
          </div>
        </div>
      )}

      {activeTool === 'semantic' && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 glass rounded-xl p-3 flex flex-col gap-2 ring-1 ring-black/5 dark:ring-white/10 shadow-lg w-[min(92vw,640px)]">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={semanticQuery}
              onChange={(e) => setSemanticQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleApplySemanticSelection();
                }
              }}
              placeholder='Semantic select: "background", "beard"...'
              className="bg-transparent text-xs min-w-0 outline-none text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-500 flex-1"
            />
            <button
              onClick={handleApplySemanticSelection}
              disabled={isViewer}
              className="px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Select
            </button>
            {semanticSource && (
              <span className="text-[10px] text-zinc-500 uppercase tracking-wide">{semanticSource}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-2 space-y-2">
              <div className="font-semibold text-zinc-600 dark:text-zinc-300">Advanced Selection</div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={handleSelectSubject} disabled={isViewer} className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Select Subject</button>
                <button onClick={handleObjectSelection} disabled={isViewer || !selection} className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Object Selection</button>
                <button onClick={() => void handleFocusAreaSelection()} disabled={isViewer} className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Focus Area</button>
              </div>
              <div className="text-[10px] text-zinc-500">Draw a marquee around an object, then run Object Selection.</div>
              <div className="flex items-center gap-2">
                <input type="color" value={colorRangeColor} onChange={(e) => setColorRangeColor(e.target.value)} className="w-7 h-7 rounded border border-zinc-300 dark:border-zinc-700" />
                <input type="range" min={5} max={180} value={colorRangeTolerance} onChange={(e) => setColorRangeTolerance(Number(e.target.value))} className="flex-1 h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                <button onClick={() => void handleColorRangeSelection()} disabled={isViewer} className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Color Range</button>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-2 space-y-2">
              <div className="font-semibold text-zinc-600 dark:text-zinc-300">Select & Mask</div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Feather</span>
                <input type="range" min={0} max={32} value={selectMaskFeather} onChange={(e) => setSelectMaskFeather(Number(e.target.value))} className="flex-1 h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
                <button onClick={() => canvasRef.current?.featherMask(selectMaskFeather)} disabled={isViewer} className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Apply</button>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => canvasRef.current?.createMask()} disabled={isViewer} className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Create Mask</button>
                <button onClick={() => canvasRef.current?.invertMask()} disabled={isViewer} className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 disabled:opacity-40">Invert</button>
                <button onClick={() => canvasRef.current?.clearSelection()} className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800">Clear</button>
                <label className="ml-auto flex items-center gap-1 text-[10px] text-zinc-500">
                  <input type="checkbox" checked={maskPreviewMode} onChange={(e) => setMaskPreviewMode(e.target.checked)} />
                  Preview
                </label>
              </div>
              <div className="text-[10px] text-zinc-500">Focus Strength: {focusStrength}%</div>
              <input type="range" min={20} max={100} value={focusStrength} onChange={(e) => setFocusStrength(Number(e.target.value))} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-500 dark:bg-zinc-700" />
            </div>
          </div>
        </div>
      )}

      <PromptBar
        selection={selection}
        open={showPromptBar}
        onGenerate={handleGenerate}
        onStyleTransfer={() => {
          if (isViewer) return;
          canvasRef.current?.applySemanticSelection('entire image');
          setAiPromptDraft('Apply this style to entire image: ');
        }}
        onCancel={() => {
          setShowPromptBar(false);
          canvasRef.current?.clearSelection();
        }}
        isGenerating={isGenerating}
        providerName={providerName}
        onProviderChange={setProviderName}
        position={selection?.screenX !== undefined ? {
          x: (selection.screenX || 0) + (selection.screenWidth || 0) / 2,
          y: (selection.screenY || 0) + (selection.screenHeight || 0) + 16 // 16px padding below selection
        } : undefined}
      />

      {/* Crop Confirmation Overlay */}
      {activeTool === 'crop' && selection && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 glass px-4 py-3 rounded-xl shadow-2xl flex gap-3 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center pr-2 border-r border-zinc-200 dark:border-zinc-700">
            {Math.round(selection.width)} x {Math.round(selection.height)}
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

      {activeTool === 'slice' && selection && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 glass px-4 py-3 rounded-xl shadow-2xl flex gap-3 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center pr-2 border-r border-zinc-200 dark:border-zinc-700">
            Slice {Math.round(selection.width)} x {Math.round(selection.height)}
          </div>
          <button
            onClick={handleSliceFromCurrentSelection}
            disabled={isViewer}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-40"
          >
            Create Slice
          </button>
          <button
            onClick={() => {
              canvasRef.current?.clearSelection();
              setActiveTool('move');
            }}
            className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

function ToolButton({ active, onClick, icon: Icon, label, disabled }: { active: boolean, onClick: () => void, icon: any, label: string, disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "p-2 rounded-xl transition-all duration-200 group relative disabled:opacity-40 disabled:cursor-not-allowed",
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
