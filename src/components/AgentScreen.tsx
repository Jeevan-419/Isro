import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  Shield,
  Eye,
  Lock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Cpu,
  Crosshair,
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
  children: React.ReactNode; // Embedded interactive browser viewport
  onElementSelect: (elem: GroundedElement) => void;
  selectedElement: GroundedElement | null;
}

const PRESET_TASKS = [
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
    <div className="flex flex-col h-full space-y-4">
      {/* 8-Stage Visible Pipeline Tracker */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
              Autonomous Agent Execution Pipeline (SIH26171)
            </span>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="text-slate-400">
              Vision Mode:{' '}
              <span className="text-cyan-400 font-mono font-medium">
                {runtimeStatus.activeMode === 'heuristic_canvas_fallback'
                  ? 'Edge Heuristic & Canvas Fallback [Demo]'
                  : runtimeStatus.modeDisplayName}
              </span>
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">
              Latency:{' '}
              <span className="text-emerald-400 font-mono">
                {runtimeStatus.lastInferenceMs.toFixed(1)} ms
              </span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {pipelineStages.map((stage, idx) => {
            const isCurrent = idx === currentStageIndex && isPipelineRunning;
            const isPast = idx < currentStageIndex || (!isPipelineRunning && currentStageIndex === 8);
            const isBlocked = stage.status === 'blocked';

            let borderClass = 'border-slate-800 bg-slate-950/60 text-slate-500';
            if (isBlocked) {
              borderClass = 'border-rose-500 bg-rose-950/40 text-rose-300';
            } else if (isCurrent) {
              borderClass = 'border-cyan-400 bg-cyan-950/50 text-cyan-200 ring-2 ring-cyan-500/20 animate-pulse';
            } else if (isPast) {
              borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
            }

            return (
              <div
                key={stage.id}
                className={`p-2 rounded-lg border text-center transition-all ${borderClass}`}
              >
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <span className="text-[10px] font-mono text-slate-400 font-bold">0{idx + 1}</span>
                  {isPast && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  {isCurrent && <Cpu className="w-3 h-3 text-cyan-400 animate-spin" />}
                  {isBlocked && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                </div>
                <div className="text-xs font-semibold truncate">{stage.label}</div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{stage.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Input Command Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Crosshair className="w-4 h-4 text-cyan-400" />
            </div>
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="Enter high-level user instruction (e.g., Click register, fill name, verify privacy)..."
              disabled={isPipelineRunning}
              className="w-full bg-slate-950 text-slate-100 placeholder-slate-500 pl-10 pr-4 py-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm font-medium transition"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="submit"
              disabled={isPipelineRunning || !taskInput.trim()}
              className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition shadow-md shadow-cyan-900/30"
            >
              {isPipelineRunning ? (
                <>
                  <Cpu className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Execute Pipeline</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onResetPipeline}
              disabled={isPipelineRunning}
              title="Reset Pipeline & Overlays"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Preset Task Chips */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800/80">
          <span className="text-[11px] font-semibold text-slate-500 mr-1">SIH Scenarios:</span>
          {PRESET_TASKS.map((preset, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setTaskInput(preset)}
              className="text-[11px] bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-md transition truncate max-w-[280px]"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Main Viewport Container with Detection Overlays */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[580px]">
        {/* Left: Interactive Browser Viewport (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {/* Viewport Top Bar Controls */}
          <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
              <span className="text-xs font-mono text-slate-400 ml-2">
                Live Browser Canvas Viewport
              </span>
            </div>

            {/* Overlay Layer Selector */}
            <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
              <Layers className="w-3.5 h-3.5 text-slate-400 ml-1 mr-1" />
              {(['interactive', 'pii', 'all', 'none'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveOverlayFilter(filter)}
                  className={`px-2.5 py-0.5 rounded capitalize font-medium transition ${
                    activeOverlayFilter === filter
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Viewport Content with Relative Bounding Box Overlays */}
          <div className="relative flex-1 bg-slate-950 overflow-auto">
            {/* Embedded interactive page */}
            <div className="relative p-2">{children}</div>

            {/* SVG / HTML Visual Bounding Box Overlays */}
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

                    let boxBorder = 'border-cyan-500/60 bg-cyan-500/5';
                    let tagBg = 'bg-cyan-600 text-white';

                    if (el.isSensitive) {
                      boxBorder = 'border-rose-500/80 bg-rose-500/10 backdrop-blur-[2px]';
                      tagBg = 'bg-rose-600 text-white';
                    } else if (el.type === 'button') {
                      boxBorder = 'border-emerald-500/70 bg-emerald-500/5';
                      tagBg = 'bg-emerald-600 text-white';
                    } else if (el.type === 'input') {
                      boxBorder = 'border-indigo-500/70 bg-indigo-500/5';
                      tagBg = 'bg-indigo-600 text-white';
                    }

                    if (isSelected || isHovered) {
                      boxBorder += ' ring-2 ring-amber-400 scale-[1.01] z-30';
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
                        {/* Compact Floating Label Tag */}
                        <div
                          className={`absolute -top-3 left-0 text-[9px] font-mono px-1 py-0.2 rounded shadow-sm flex items-center space-x-1 ${tagBg}`}
                        >
                          <span>{el.type}</span>
                          <span className="opacity-75">{Math.round(el.confidence * 100)}%</span>
                          {el.isSensitive && <Lock className="w-2.5 h-2.5" />}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Telemetry & Inspected Element Card (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* Active Target Inspector Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex-1">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center space-x-2">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-200">Element Grounding Inspector</h3>
              </div>
              <span className="text-[11px] font-mono bg-slate-800 text-cyan-300 px-2 py-0.5 rounded">
                {selectedElement ? selectedElement.uid : 'Click any box'}
              </span>
            </div>

            {selectedElement ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Label / Content:</span>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800 font-medium text-slate-200">
                    {selectedElement.label || selectedElement.ocrText || 'No text label'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Type / Role</span>
                    <span className="font-semibold text-cyan-300 uppercase">{selectedElement.type} ({selectedElement.role})</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Confidence</span>
                    <span className="font-semibold text-emerald-400 font-mono">
                      {(selectedElement.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5">Multi-Modal Source:</span>
                  <div className="bg-slate-950 p-1.5 rounded border border-slate-800 font-mono text-[11px] text-amber-300 flex items-center space-x-1">
                    <Eye className="w-3 h-3 text-amber-400" />
                    <span>{selectedElement.source}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5">CSS Selector / Bounding Box:</span>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[10px] text-slate-400 truncate">
                    {selectedElement.cssSelector} | ({selectedElement.boundingBox.x},{selectedElement.boundingBox.y},{selectedElement.boundingBox.width}x{selectedElement.boundingBox.height})
                  </div>
                </div>

                {selectedElement.isSensitive && (
                  <div className="bg-rose-950/40 border border-rose-800 p-2.5 rounded-lg space-y-1">
                    <div className="flex items-center space-x-1.5 text-rose-300 font-semibold text-xs">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Confidential PII Protected</span>
                    </div>
                    <p className="text-[11px] text-rose-400/90">
                      Category: {selectedElement.sensitiveCategory || 'Personal Data'}
                    </p>
                    <div className="font-mono text-[10px] bg-rose-950 p-1 rounded text-rose-200">
                      {selectedElement.redactedPlaceholder}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs text-center px-4 space-y-2">
                <Crosshair className="w-8 h-8 text-slate-700 animate-pulse" />
                <p>Click on any bounding box on the viewport to view multi-modal grounding coordinates, OCR extraction, and protection policies.</p>
              </div>
            )}
          </div>

          {/* Action Guard Status Summary Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Local Action Guard
                </h4>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  guardResult?.status === 'APPROVED'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : guardResult?.status === 'BLOCKED'
                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {guardResult?.status || 'AWAITING DISPATCH'}
              </span>
            </div>

            {lastAction ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-400">Action:</span>
                  <span className="font-mono text-cyan-300 font-bold uppercase">
                    {lastAction.actionType} → {lastAction.targetSelector}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {guardResult?.explanation || 'Safety rules validated: No credential exfiltration detected.'}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                No action dispatched yet. Execute a task to trigger client-side safety evaluation.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
