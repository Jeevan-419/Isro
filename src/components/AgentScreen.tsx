import React from 'react';
import {
  Check,
  ArrowRight,
  Circle,
  X,
  Play,
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
  taskPrompt: string;
}

export const AgentScreen: React.FC<AgentScreenProps> = ({
  runtimeStatus: _runtimeStatus,
  pipelineStages,
  currentStageIndex,
  isPipelineRunning,
  onRunPipeline,
  onResetPipeline: _onResetPipeline,
  groundedElements,
  detectedPii: _detectedPii,
  lastAction,
  guardResult: _guardResult,
  children,
  onElementSelect,
  selectedElement,
  taskPrompt,
}) => {
  // Only draw bounding boxes on real inputs and submit button (avoiding clutter)
  const displayElements = groundedElements.filter((el) => {
    if (el.tagName !== 'INPUT' && el.tagName !== 'BUTTON') return false;
    if (el.domId?.includes('search') || el.domId?.includes('reload')) return false;
    if (el.type === 'button' && !/submit|draft/i.test(el.label) && !el.domId?.includes('submit')) return false;
    return true;
  });

  const getStageIcon = (idx: number, stage: PipelineStageInfo) => {
    if (stage.status === 'blocked') {
      return <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
    }
    if (idx < currentStageIndex || (!isPipelineRunning && currentStageIndex === 8)) {
      return <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
    if (idx === currentStageIndex && isPipelineRunning) {
      return <ArrowRight className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-pulse" />;
    }
    return <Circle className="w-3 h-3 text-slate-600 shrink-0" />;
  };

  return (
    <div className="flex h-full w-full gap-4 min-h-0 min-w-0 overflow-hidden">
      {/* =========================================================================
          LEFT: BROWSER VIEW (Approximately 70% width)
         ========================================================================= */}
      <div className="flex-[7] min-w-0 min-h-0 h-full flex flex-col relative overflow-hidden">
        <div className="relative flex-1 min-h-0 h-full">
          {children}

          {/* Perception Overlays: Subtle outlines with small tags placed OUTSIDE text */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {displayElements.map((el) => {
              const isSelected = selectedElement?.uid === el.uid;
              const isSubmit = /submit/i.test(el.label) || el.domId?.includes('submit');

              let outlineStyle = 'border border-blue-400/60';
              let tagText = '';
              let tagStyle = 'bg-blue-600 text-white';

              if (el.domId === 'input-email' || el.sensitiveCategory === 'Email') {
                outlineStyle = 'border border-rose-500';
                tagText = 'PII • EMAIL';
                tagStyle = 'bg-rose-600 text-white';
              } else if (el.domId === 'input-password' || el.sensitiveCategory === 'Password') {
                outlineStyle = 'border border-rose-500';
                tagText = 'PII • PASSWORD';
                tagStyle = 'bg-rose-600 text-white';
              } else if (el.domId === 'input-phone' || el.sensitiveCategory === 'Phone') {
                outlineStyle = 'border border-rose-500';
                tagText = 'PII • PHONE';
                tagStyle = 'bg-rose-600 text-white';
              } else if (el.domId === 'input-gov-id' || el.sensitiveCategory === 'Government ID') {
                outlineStyle = 'border border-rose-500';
                tagText = 'PII • GOV ID';
                tagStyle = 'bg-rose-600 text-white';
              } else if (isSubmit) {
                outlineStyle = 'border border-blue-600';
                tagText = 'SUBMIT';
                tagStyle = 'bg-blue-600 text-white';
              }

              if (isSelected) {
                outlineStyle = 'border-2 border-blue-500 ring-2 ring-blue-400/40';
                if (tagText) {
                  tagText += ` • ${(el.confidence * 100).toFixed(0)}%`;
                } else {
                  tagText = `${(el.confidence * 100).toFixed(0)}%`;
                }
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
                  className={`absolute rounded pointer-events-auto cursor-pointer transition-all duration-150 ${outlineStyle}`}
                  onClick={() => onElementSelect(el)}
                >
                  {/* Floating tag: aligned to top-right so it NEVER overlaps left-aligned label text */}
                  {tagText && (
                    <span
                      className={`absolute -top-3.5 right-1 text-[8px] font-mono tracking-wider px-1.5 py-0.2 rounded shadow-xs uppercase font-semibold leading-none pointer-events-none ${tagStyle}`}
                    >
                      {tagText}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =========================================================================
          RIGHT: AGENT ACTIVITY PANEL (Approximately 30% width)
         ========================================================================= */}
      <div className="flex-[3] min-w-0 min-h-0 h-full bg-[#0e1424] border border-slate-800 rounded-lg p-4 flex flex-col justify-between overflow-hidden shadow-md">
        <div className="space-y-4 overflow-y-auto pr-1">
          {/* Panel Header */}
          <div className="border-b border-slate-800/80 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
              AGENT ACTIVITY
            </h2>
          </div>

          {/* Current Task */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block font-semibold mb-0.5">
              Task
            </span>
            <p className="text-xs font-medium text-slate-200 leading-snug">
              {taskPrompt || 'Find the Submit button and click it'}
            </p>
          </div>

          {/* Pipeline Timeline */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block font-semibold mb-2">
              Timeline
            </span>

            <div className="space-y-2">
              {pipelineStages.map((stage, idx) => {
                const isCurrent = idx === currentStageIndex && isPipelineRunning;
                const isDone = idx < currentStageIndex || (!isPipelineRunning && currentStageIndex === 8);

                return (
                  <div key={stage.id} className="flex items-center gap-2.5 text-xs">
                    {getStageIcon(idx, stage)}
                    <span
                      className={`font-sans text-[11px] ${
                        isCurrent
                          ? 'text-blue-400 font-semibold'
                          : isDone
                          ? 'text-slate-300'
                          : 'text-slate-500'
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Next Action Box */}
        <div className="border-t border-slate-800/80 pt-3 mt-2 shrink-0 space-y-2">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block font-semibold">
              NEXT ACTION
            </span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-xs font-mono font-bold text-white uppercase">
                {lastAction ? lastAction.actionType : 'CLICK'}
              </span>
              <span className="text-[11px] font-medium text-slate-300">
                {lastAction ? lastAction.targetDescription : 'Submit'}
              </span>
              <span className="text-[10px] font-mono text-blue-400">
                Confidence: 96%
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={isPipelineRunning}
            onClick={() => {
              if (!isPipelineRunning) onRunPipeline(taskPrompt);
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold py-2 rounded-md text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Play size={12} className="fill-current" />
            <span>EXECUTE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
