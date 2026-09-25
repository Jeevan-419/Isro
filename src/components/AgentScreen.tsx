import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  Shield,
  Eye,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Crosshair,
  Layers,
  Terminal,
} from 'lucide-react';
import type {
  GroundedElement,
  PiiEntity,
  PipelineStageInfo,
  StructuredBrowserAction,
  ActionGuardEvaluationResult,
  VisionRuntimeStatus,
} from '../types/privyVision';

interface AgentScreenProps {
  runtimeStatus: VisionRuntimeStatus;
  pipelineStages: PipelineStageInfo[];
  currentStageIndex: number;
  isPipelineRunning: boolean;
  onRunPipeline: (taskPrompt: string) => void;
  onResetPipeline: () => void;
  groundedElements: GroundedElement[];
  detectedPii: PiiEntity[];
  lastAction: StructuredBrowserAction | null;
  guardResult: ActionGuardEvaluationResult | null;
  children: React.ReactNode;
  onElementSelect: (elem: GroundedElement) => void;
  selectedElement: GroundedElement | null;
}

const PRESET_TASKS = [
  'Find and click Submit',
  'Register researcher "Dr. Vikram" after masking confidential Aadhaar and phone',
  'Authorize payment but verify Attention Firewall redacts CVV and Card credentials',
  'Execute high-risk action: Attempt to delete orbital telemetry credentials',
  'Extract telemetry records for Aditya-L1 and submit query',
];

export const AgentScreen: React.FC<AgentScreenProps> = ({
  runtimeStatus,
  pipelineStages,
  currentStageIndex,
  isPipelineRunning,
  onRunPipeline,
  onResetPipeline,
  groundedElements,
  detectedPii: _detectedPii,
  lastAction,
  guardResult,
  children,
  onElementSelect,
  selectedElement,
}) => {
  const [taskInput, setTaskInput] = useState<string>(PRESET_TASKS[0]);
  const [activeOverlayFilter, setActiveOverlayFilter] = useState<'all' | 'interactive' | 'pii' | 'none'>('interactive');
  const [hoveredElement, setHoveredElement] = useState<GroundedElement | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim() || isPipelineRunning) return;
    onRunPipeline(taskInput);
  };

  return (
    <div className="flex flex-col h-full space-y-3.5">
      {/* Precision 8-Stage Autonomous Pipeline Rail */}
      <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-3 shadow-md">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-300">
              Autonomous Agent Pipeline
            </span>
            <span className="text-[10px] font-mono text-slate-500">• SIH26171 Protocol</span>
          </div>

          <div className="flex items-center space-x-3 text-[11px] font-mono">
            <span className="text-slate-400">
              Inference:{' '}
              <span className="text-cyan-400 font-medium">
                {runtimeStatus.activeMode === 'heuristic_canvas_fallback'
                  ? 'Edge Heuristic [Demo]'
                  : runtimeStatus.modeDisplayName}
              </span>
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">
              Latency: <span className="text-emerald-400 font-semibold">{runtimeStatus.lastInferenceMs.toFixed(1)}ms</span>
            </span>
          </div>
        </div>

        {/* Linear Stepper with Connecting Lines */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
          {pipelineStages.map((stage, idx) => {
            const isCurrent = idx === currentStageIndex && isPipelineRunning;
            const isPast = idx < currentStageIndex || (!isPipelineRunning && currentStageIndex === 8);
            const isBlocked = stage.status === 'blocked';

            let containerStyle = 'bg-slate-950/70 border-slate-800/70 text-slate-500';
            let numberColor = 'text-slate-600';

            if (isBlocked) {
              containerStyle = 'bg-rose-950/30 border-rose-600/70 text-rose-300 shadow-sm shadow-rose-950';
              numberColor = 'text-rose-400';
            } else if (isCurrent) {
              containerStyle = 'bg-cyan-950/40 border-cyan-400/80 text-cyan-200 ring-1 ring-cyan-500/30 shadow-sm shadow-cyan-950';
              numberColor = 'text-cyan-400';
            } else if (isPast) {
              containerStyle = 'bg-slate-900/90 border-emerald-500/40 text-emerald-300';
              numberColor = 'text-emerald-400';
            }

            return (
              <div
                key={stage.id}
                className={`relative px-2.5 py-2 rounded-lg border transition-all duration-150 ${containerStyle}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-mono font-bold ${numberColor}`}>
                    0{idx + 1}
                  </span>
                  {isPast && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  {isCurrent && <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />}
                  {isBlocked && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                </div>
                <div className="text-xs font-semibold tracking-tight truncate">{stage.label}</div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{stage.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Command Bar */}
      <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-3 shadow-md">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 relative flex items-center">
            <Terminal className="w-4 h-4 text-cyan-400/80 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="Enter natural language agent prompt..."
              disabled={isPipelineRunning}
              className="w-full bg-[#050811] text-slate-100 placeholder-slate-500 pl-9 pr-4 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/30 text-xs font-medium transition"
            />
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="submit"
              disabled={isPipelineRunning || !taskInput.trim()}
              className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-4 py-2 rounded-lg text-xs font-semibold transition"
            >
              {isPipelineRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Execute Pipeline</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onResetPipeline}
              disabled={isPipelineRunning}
              title="Reset Viewport & Pipeline"
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Preset Prompt Pills */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800/60">
          <span className="text-[10px] font-mono uppercase text-slate-500 mr-1">Benchmarks:</span>
          {PRESET_TASKS.map((preset, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setTaskInput(preset)}
              className="text-[11px] bg-[#050811] hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 text-slate-300 px-2.5 py-1 rounded-md transition truncate max-w-[290px]"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-[580px]">
        {/* Left: Live Viewport Canvas (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col bg-[#0b0f19] border border-slate-800/90 rounded-xl overflow-hidden shadow-xl">
          {/* Viewport Top Bar */}
          <div className="bg-[#050811] border-b border-slate-800/80 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
              <span className="text-xs font-mono text-slate-400 ml-2">
                Live Viewport Frame Buffer
              </span>
            </div>

            {/* Visual Overlays Selector */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
              <Layers className="w-3 h-3 text-slate-400 ml-1 mr-1" />
              {(['interactive', 'pii', 'all', 'none'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveOverlayFilter(filter)}
                  className={`px-2 py-0.5 rounded capitalize font-medium transition ${
                    activeOverlayFilter === filter
                      ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Viewport Canvas with Bounding Boxes */}
          <div className="relative flex-1 bg-slate-950 overflow-auto">
            <div className="relative p-2">{children}</div>

            {/* Precision Overlays */}
            {activeOverlayFilter !== 'none' && (
              <div className="absolute inset-0 pointer-events-none">
                {groundedElements
                  .filter((el) => {
                    if (activeOverlayFilter === 'interactive') return el.isInteractive;
                    if (activeOverlayFilter === 'pii') return el.isSensitive;
                    return true;
                  })
                  .map((el) => {
                    const isHovered = hoveredElement?.uid === el.uid;
                    const isSelected = selectedElement?.uid === el.uid;

                    let boxBorder = 'border-cyan-500/50 bg-cyan-500/5';
                    let tagBg = 'bg-cyan-700 text-cyan-100';

                    if (el.isSensitive) {
                      boxBorder = 'border-rose-500/70 bg-rose-500/10 backdrop-blur-[1px]';
                      tagBg = 'bg-rose-700 text-rose-100';
                    } else if (el.type === 'button') {
                      boxBorder = 'border-emerald-500/60 bg-emerald-500/5';
                      tagBg = 'bg-emerald-700 text-emerald-100';
                    } else if (el.type === 'input') {
                      boxBorder = 'border-indigo-500/60 bg-indigo-500/5';
                      tagBg = 'bg-indigo-700 text-indigo-100';
                    }

                    if (isSelected || isHovered) {
                      boxBorder += ' ring-2 ring-amber-400 z-30 scale-[1.01]';
                    }

                    return (
                      <div
                        key={el.uid}
                        style={{
                          left: `${el.boundingBox.x}px`,
                          top: `${el.boundingBox.y}px`,
                          width: `${el.boundingBox.width}px`,
                          height: `${el.boundingBox.height}px`,
                        }}
                        className={`absolute border rounded pointer-events-auto cursor-pointer transition-all duration-150 ${boxBorder}`}
                        onClick={() => onElementSelect(el)}
                        onMouseEnter={() => setHoveredElement(el)}
                        onMouseLeave={() => setHoveredElement(null)}
                      >
                        <div
                          className={`absolute -top-3 left-0 text-[9px] font-mono px-1 py-0.2 rounded shadow-sm flex items-center space-x-1 ${tagBg}`}
                        >
                          <span>{el.type}</span>
                          <span className="opacity-80">{(el.confidence * 100).toFixed(0)}%</span>
                          {el.isSensitive && <Lock className="w-2.5 h-2.5" />}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Real-time Grounding & Safety Guard (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-3.5">
          {/* Grounding Inspector */}
          <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-3.5 shadow-md flex-1">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/70 mb-3">
              <div className="flex items-center space-x-2">
                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Target Grounding Spec
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 text-cyan-400 px-2 py-0.5 rounded">
                {selectedElement ? selectedElement.uid : 'Click box'}
              </span>
            </div>

            {selectedElement ? (
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-mono block mb-0.5">Label / Content</span>
                  <div className="bg-[#050811] p-2 rounded border border-slate-800 font-medium text-slate-200 truncate">
                    {selectedElement.label || selectedElement.ocrText || 'None'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="bg-[#050811] p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[9px] uppercase">Type</span>
                    <span className="font-semibold text-cyan-300 uppercase">{selectedElement.type}</span>
                  </div>
                  <div className="bg-[#050811] p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[9px] uppercase">Confidence</span>
                    <span className="font-semibold text-emerald-400">
                      {(selectedElement.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-mono block mb-0.5">Detection Source</span>
                  <div className="bg-[#050811] p-1.5 rounded border border-slate-800 font-mono text-[11px] text-amber-300 flex items-center space-x-1.5">
                    <Eye className="w-3 h-3 text-amber-400" />
                    <span>{selectedElement.source}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-mono block mb-0.5">Selector & Geometry</span>
                  <div className="bg-[#050811] p-2 rounded border border-slate-800 font-mono text-[10px] text-slate-400 truncate">
                    {selectedElement.cssSelector} | ({selectedElement.boundingBox.x},{selectedElement.boundingBox.y},{selectedElement.boundingBox.width}x{selectedElement.boundingBox.height})
                  </div>
                </div>

                {selectedElement.isSensitive && (
                  <div className="bg-rose-950/40 border border-rose-800/80 p-2.5 rounded-lg space-y-1">
                    <div className="flex items-center space-x-1.5 text-rose-300 font-semibold text-xs">
                      <Lock className="w-3 h-3 text-rose-400" />
                      <span>Confidential PII Protected</span>
                    </div>
                    <div className="font-mono text-[10px] bg-rose-950/80 p-1.5 rounded text-rose-200 truncate">
                      {selectedElement.redactedPlaceholder}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs text-center px-4 space-y-2">
                <Crosshair className="w-6 h-6 text-slate-700" />
                <p>Click any bounding box on the live viewport to inspect grounding coordinates, role, and OCR strings.</p>
              </div>
            )}
          </div>

          {/* Action Guard Status */}
          <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-3.5 shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/70 mb-2">
              <div className="flex items-center space-x-2">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Local Action Guard
                </h4>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  guardResult?.status === 'APPROVED'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : guardResult?.status === 'BLOCKED'
                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                    : 'bg-slate-900 border border-slate-800 text-slate-400'
                }`}
              >
                {guardResult?.status || 'IDLE'}
              </span>
            </div>

            {lastAction ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center bg-[#050811] p-2 rounded border border-slate-800">
                  <span className="text-slate-400 font-mono text-[11px]">Proposed:</span>
                  <span className="font-mono text-cyan-300 font-bold uppercase text-[11px]">
                    {lastAction.actionType} → {lastAction.targetSelector}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {guardResult?.explanation || 'Safety rules validated.'}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Awaiting task execution to evaluate safety policies.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
