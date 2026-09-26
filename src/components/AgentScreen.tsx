import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  Check,
  ArrowRight,
  Circle,
  X,
  Lock,
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

export const AgentScreen: React.FC<AgentScreenProps> = ({
  runtimeStatus: _runtimeStatus,
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
  const [taskInput, setTaskInput] = useState<string>('Find the Submit button and click it');
  const [showOverlays, setShowOverlays] = useState<boolean>(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim() || isPipelineRunning) return;
    onRunPipeline(taskInput);
  };

  const getStageStatusIcon = (idx: number, stage: PipelineStageInfo) => {
    if (stage.status === 'blocked') {
      return <X className="w-4 h-4 text-rose-400 shrink-0" />;
    }
    if (idx < currentStageIndex || (!isPipelineRunning && currentStageIndex === 8)) {
      return <Check className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    if (idx === currentStageIndex && isPipelineRunning) {
      return <ArrowRight className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />;
    }
    return <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0" />;
  };

  // Restrained elements to highlight (avoiding visual clutter)
  const displayElements = groundedElements.filter((el) => {
    if (el.tagName !== 'INPUT' && el.tagName !== 'BUTTON') return false;
    if (el.domId?.includes('search') || el.domId?.includes('reload')) return false;
    if (el.type === 'button' && !/submit|draft/i.test(el.label) && !el.domId?.includes('submit')) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Large Task Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            placeholder="What would you like the agent to do?"
            disabled={isPipelineRunning}
            className="w-full bg-[#0e1424] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition shadow-sm font-sans"
          />
        </div>
        <button
          type="submit"
          disabled={isPipelineRunning || !taskInput.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition flex items-center gap-2 shadow-sm shrink-0 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>RUN AGENT</span>
        </button>
        {currentStageIndex > 0 && !isPipelineRunning && (
          <button
            type="button"
            onClick={onResetPipeline}
            title="Reset Agent state"
            className="bg-[#0e1424] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 p-3 rounded-xl text-sm transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Main 70/30 Split Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-10 gap-4 min-h-0">
        {/* LEFT: Browser Workspace (70% = 7 Cols) */}
        <div className="lg:col-span-7 flex flex-col h-full min-h-[580px] relative">
          <div className="relative flex-1 h-full">
            {children}

            {/* Restrained Beautiful Bounding Boxes */}
            {showOverlays && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {displayElements.map((el) => {
                  const isSelected = selectedElement?.uid === el.uid;
                  const isSubmit = /submit/i.test(el.label) || el.domId?.includes('submit');

                  // Floating label text and badge
                  let labelName = 'INPUT';
                  let subLabel = '96% CONFIDENCE';
                  let borderClass = 'border-blue-500/80 bg-blue-500/5';
                  let badgeBg = 'bg-blue-600 text-white';

                  if (el.domId === 'input-email' || el.sensitiveCategory === 'Email') {
                    labelName = 'EMAIL';
                    subLabel = 'PII REDACTED';
                    borderClass = 'border-rose-500/80 bg-rose-500/10';
                    badgeBg = 'bg-rose-600 text-white';
                  } else if (el.domId === 'input-password' || el.sensitiveCategory === 'Password') {
                    labelName = 'PASSWORD';
                    subLabel = 'PII REDACTED';
                    borderClass = 'border-rose-500/80 bg-rose-500/10';
                    badgeBg = 'bg-rose-600 text-white';
                  } else if (el.domId === 'input-phone' || el.sensitiveCategory === 'Phone') {
                    labelName = 'PHONE';
                    subLabel = 'PII REDACTED';
                    borderClass = 'border-rose-500/80 bg-rose-500/10';
                    badgeBg = 'bg-rose-600 text-white';
                  } else if (el.domId === 'input-gov-id' || el.sensitiveCategory === 'Government ID') {
                    labelName = 'GOV ID';
                    subLabel = 'PII REDACTED';
                    borderClass = 'border-rose-500/80 bg-rose-500/10';
                    badgeBg = 'bg-rose-600 text-white';
                  } else if (isSubmit) {
                    labelName = 'SUBMIT';
                    subLabel = '96% CONFIDENCE';
                    borderClass = 'border-emerald-500/90 bg-emerald-500/10';
                    badgeBg = 'bg-emerald-600 text-white';
                  } else if (el.domId === 'input-full-name') {
                    labelName = 'NAME';
                    subLabel = '98% CONFIDENCE';
                  }

                  if (isSelected) {
                    borderClass += ' ring-2 ring-amber-400';
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
                      className={`absolute border rounded-md pointer-events-auto cursor-pointer transition-all duration-150 ${borderClass}`}
                      onClick={() => onElementSelect(el)}
                    >
                      {/* Small clean floating label */}
                      <div
                        className={`absolute -top-3.5 left-1 text-[9px] font-sans font-semibold tracking-wider px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 leading-none ${badgeBg}`}
                      >
                        <span>{labelName}</span>
                        <span className="opacity-80 font-normal">{subLabel}</span>
                        {el.isSensitive && <Lock className="w-2.5 h-2.5 ml-0.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick toggle for bounding boxes */}
          <div className="absolute bottom-3 right-3 z-10">
            <button
              type="button"
              onClick={() => setShowOverlays(!showOverlays)}
              className="bg-[#0e1424]/90 backdrop-blur-sm border border-slate-800 text-slate-400 hover:text-slate-200 text-[11px] px-2.5 py-1 rounded-md transition shadow-md cursor-pointer"
            >
              {showOverlays ? 'Hide Bounding Boxes' : 'Show Bounding Boxes'}
            </button>
          </div>
        </div>

        {/* RIGHT: Agent Activity (30% = 3 Cols) */}
        <div className="lg:col-span-3 bg-[#0e1424] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-xl">
          <div className="space-y-5">
            {/* Task Heading */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold mb-1">
                TASK
              </span>
              <p className="text-sm font-medium text-slate-100 leading-snug">
                {taskInput}
              </p>
            </div>

            {/* Status */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold mb-1">
                STATUS
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPipelineRunning
                      ? 'bg-blue-400 animate-pulse'
                      : currentStageIndex === 8
                      ? 'bg-emerald-400'
                      : guardResult?.status === 'BLOCKED'
                      ? 'bg-rose-400'
                      : 'bg-slate-500'
                  }`}
                />
                <span
                  className={`text-sm font-semibold ${
                    isPipelineRunning
                      ? 'text-blue-400'
                      : currentStageIndex === 8
                      ? 'text-emerald-400'
                      : guardResult?.status === 'BLOCKED'
                      ? 'text-rose-400'
                      : 'text-slate-300'
                  }`}
                >
                  {isPipelineRunning
                    ? 'Running'
                    : currentStageIndex === 8
                    ? 'Completed'
                    : guardResult?.status === 'BLOCKED'
                    ? 'Action Blocked'
                    : 'Idle / Ready'}
                </span>
              </div>
            </div>

            {/* Vertical Timeline */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold mb-3">
                PIPELINE EXECUTION
              </span>

              <div className="space-y-3 pl-1">
                {pipelineStages.map((stage, idx) => {
                  return (
                    <div key={stage.id} className="flex items-center gap-3 text-xs">
                      {getStageStatusIcon(idx, stage)}
                      <span
                        className={`font-medium ${
                          idx === currentStageIndex && isPipelineRunning
                            ? 'text-blue-400 font-semibold'
                            : idx < currentStageIndex || (!isPipelineRunning && currentStageIndex === 8)
                            ? 'text-slate-200'
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
          <div className="border-t border-slate-800/80 pt-4 mt-4 space-y-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold mb-1">
                NEXT ACTION
              </span>
              <p className="text-xs text-slate-300 font-medium">
                {lastAction
                  ? `${lastAction.actionType.toUpperCase()}: ${lastAction.targetDescription || 'Submit'}`
                  : 'Click "Submit"'}
              </p>
            </div>

            <button
              type="button"
              disabled={isPipelineRunning}
              onClick={() => {
                if (!isPipelineRunning) {
                  onRunPipeline(taskInput);
                }
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>EXECUTE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
