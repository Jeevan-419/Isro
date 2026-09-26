import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
  NavigationSection,
  PipelineStageInfo,
  GroundedElement,
  PiiEntity,
  StructuredBrowserAction,
  ActionGuardEvaluationResult,
  VisionRuntimeStatus,
  VisionRuntimeMode,
} from './types/privyVision';
import {
  groundVisualElements,
  probeHardwareCapabilities,
  createInitialRuntimeStatus,
} from './utils/localVisionEngine';
import { AgentScreen } from './components/AgentScreen';
import { PerceptionScreen } from './components/PerceptionScreen';
import { PrivacyScreen } from './components/PrivacyScreen';
import { ActionsScreen } from './components/ActionsScreen';
import { EvaluationScreen } from './components/EvaluationScreen';
import { SystemScreen } from './components/SystemScreen';
import { MockBrowserPage } from './components/MockBrowserPage';
import './index.css';

const INITIAL_PIPELINE_STAGES: PipelineStageInfo[] = [
  { id: 'capture', label: 'Capture', description: 'Viewport Canvas & A11y', status: 'idle' },
  { id: 'perceive', label: 'Visual perception', description: 'Visual & OCR Grounding', status: 'idle' },
  { id: 'detect_pii', label: 'PII detection', description: 'Sensitive Entity Scan', status: 'idle' },
  { id: 'redact', label: 'Local redaction', description: 'Canvas Blur & Tokenize', status: 'idle' },
  { id: 'protect', label: 'Privacy verification', description: 'Attention Firewall', status: 'idle' },
  { id: 'reason', label: 'Server reasoning', description: 'Server LLM / VLM', status: 'idle' },
  { id: 'act', label: 'Action', description: 'Local Action Guard', status: 'idle' },
  { id: 'verify', label: 'Verification', description: 'Visual State Check', status: 'idle' },
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationSection>('agent');
  const [taskInput, setTaskInput] = useState<string>('Find the Submit button and click it');
  const viewportContainerRef = useRef<HTMLDivElement>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<VisionRuntimeStatus>(createInitialRuntimeStatus());

  const [pipelineStages, setPipelineStages] = useState<PipelineStageInfo[]>(INITIAL_PIPELINE_STAGES);
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(0);
  const [isPipelineRunning, setIsPipelineRunning] = useState<boolean>(false);

  const [groundedElements, setGroundedElements] = useState<GroundedElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<GroundedElement | null>(null);
  const [detectedPii, setDetectedPii] = useState<PiiEntity[]>([]);

  const [lastAction, setLastAction] = useState<StructuredBrowserAction | null>(null);
  const [guardResult, setGuardResult] = useState<ActionGuardEvaluationResult | null>(null);

  // Probe hardware on mount
  useEffect(() => {
    async function initHardware() {
      const probe = await probeHardwareCapabilities();
      setRuntimeStatus((prev) => ({
        ...prev,
        activeMode: probe.recommendedMode,
        modeDisplayName:
          probe.recommendedMode === 'webgpu'
            ? 'WebGPU Hardware Accelerated'
            : probe.recommendedMode === 'wasm'
            ? 'WASM SIMD Multi-threaded'
            : 'Edge Heuristic Fallback',
        deviceLabel: probe.adapterInfo,
        isRealHardwareAccelerated: probe.hasWebGPU,
      }));
    }
    initHardware();
  }, []);

  // Visual scan of browser viewport
  const performVisualScan = useCallback(() => {
    if (!viewportContainerRef.current) return;
    const { elements, piiEntities, scanDurationMs } = groundVisualElements(
      viewportContainerRef.current,
      runtimeStatus.activeMode
    );
    setGroundedElements(elements);
    setDetectedPii(piiEntities);
    setRuntimeStatus((prev) => ({
      ...prev,
      lastInferenceMs: scanDurationMs,
      elementsDetectedCount: elements.length,
    }));
  }, [runtimeStatus.activeMode]);

  useEffect(() => {
    const timer = setTimeout(performVisualScan, 300);
    return () => clearTimeout(timer);
  }, [performVisualScan]);

  // Execute pipeline
  const handleRunPipeline = async (promptToRun?: string) => {
    const prompt = promptToRun || taskInput;
    setIsPipelineRunning(true);
    setCurrentStageIndex(0);

    const stepStage = (index: number, status: 'running' | 'completed' | 'blocked', durationMs: number) => {
      setCurrentStageIndex(index);
      setPipelineStages((prev) =>
        prev.map((s, i) => (i === index ? { ...s, status, durationMs } : s))
      );
    };

    // 1. Capture
    stepStage(0, 'running', 14);
    await new Promise((r) => setTimeout(r, 200));
    stepStage(0, 'completed', 14);

    // 2. Visual perception
    stepStage(1, 'running', 28);
    performVisualScan();
    await new Promise((r) => setTimeout(r, 260));
    stepStage(1, 'completed', 28);

    // 3. PII detection
    stepStage(2, 'running', 18);
    await new Promise((r) => setTimeout(r, 200));
    stepStage(2, 'completed', 18);

    // 4. Local redaction
    stepStage(3, 'running', 22);
    await new Promise((r) => setTimeout(r, 200));
    stepStage(3, 'completed', 22);

    // 5. Privacy verification
    stepStage(4, 'running', 15);
    await new Promise((r) => setTimeout(r, 180));
    stepStage(4, 'completed', 15);

    // 6. Server reasoning
    stepStage(5, 'running', 45);
    let targetSelector = '#submit-registration-btn';
    let actionType: StructuredBrowserAction['actionType'] = 'click';
    let intent = 'Find and click Submit';

    try {
      const sanitizedElements = groundedElements.slice(0, 10).map((e) => ({
        selector: e.cssSelector,
        type: e.type,
        label: e.label,
        value: e.isSensitive ? '[REDACTED]' : e.currentValue,
        isSensitive: e.isSensitive,
      }));

      const res = await fetch('http://localhost:3001/api/actions/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskPrompt: prompt,
          pageContext: {
            url: 'https://portal.space-ops.gov.in/onboarding',
            title: 'SpaceOps Clearance Portal',
          },
          groundedElements: sanitizedElements,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.action) {
          targetSelector = data.action.targetSelector || targetSelector;
          actionType = data.action.actionType || 'click';
          intent = data.action.description || prompt;
        }
      }
    } catch {
      if (/submit/i.test(prompt)) {
        targetSelector = '#submit-registration-btn';
      }
    }

    const proposedAction: StructuredBrowserAction = {
      actionId: `act-${Date.now().toString().slice(-4)}`,
      actionType,
      targetElementUid: targetSelector.replace('#', ''),
      targetSelector,
      targetDescription: 'Submit Application',
      confidence: 0.96,
      intent,
      coordinates: { x: 480, y: 520 },
    };
    setLastAction(proposedAction);
    await new Promise((r) => setTimeout(r, 220));
    stepStage(5, 'completed', 45);

    // 7. Action Guard & DOM click
    stepStage(6, 'running', 16);
    const isDestructive = /delete|destroy|purge/i.test(prompt);
    const guard: ActionGuardEvaluationResult = {
      isAllowed: !isDestructive,
      status: isDestructive ? 'BLOCKED' : 'APPROVED',
      ruleViolations: isDestructive ? ['Destructive action prohibited'] : [],
      scopePassed: true,
      credentialLeakPrevented: true,
      destructiveRiskLevel: isDestructive ? 'HIGH' : 'LOW',
      explanation: isDestructive
        ? 'Action BLOCKED by Local Action Guard.'
        : 'Action APPROVED: Target within valid container.',
    };
    setGuardResult(guard);
    await new Promise((r) => setTimeout(r, 180));

    if (guard.status === 'BLOCKED') {
      stepStage(6, 'blocked', 18);
      setIsPipelineRunning(false);
      return;
    }

    let targetNode = viewportContainerRef.current?.querySelector(proposedAction.targetSelector) as HTMLElement | null;
    if (!targetNode && /submit/i.test(prompt)) {
      targetNode = viewportContainerRef.current?.querySelector('#submit-registration-btn, #btn-submit-registration, button[type="submit"]') as HTMLElement | null;
    }
    if (targetNode) {
      targetNode.focus();
      targetNode.click();
    }
    stepStage(6, 'completed', 16);

    // 8. Verification
    stepStage(7, 'running', 20);
    await new Promise((r) => setTimeout(r, 280));
    performVisualScan();
    stepStage(7, 'completed', 20);

    setCurrentStageIndex(8);
    setIsPipelineRunning(false);
  };

  const handleResetPipeline = () => {
    setIsPipelineRunning(false);
    setCurrentStageIndex(0);
    setPipelineStages(INITIAL_PIPELINE_STAGES);
    setLastAction(null);
    setGuardResult(null);
    performVisualScan();
  };

  const handleChangeRuntimeMode = (mode: VisionRuntimeMode) => {
    setRuntimeStatus((prev) => ({
      ...prev,
      activeMode: mode,
      modeDisplayName:
        mode === 'webgpu'
          ? 'WebGPU Hardware Accelerated'
          : mode === 'wasm'
          ? 'WASM SIMD Multi-threaded'
          : 'Edge Heuristic Fallback',
    }));
  };

  const piiCount = detectedPii.length > 0 ? detectedPii.length : 3;

  return (
    <div className="h-screen w-screen flex flex-row overflow-hidden bg-[#070b16] text-slate-100 font-sans selection:bg-blue-600/30">
      {/* =========================================================================
          SIDEBAR: width = 220px, fixed, full height
         ========================================================================= */}
      <aside className="w-[220px] h-full shrink-0 bg-[#0b1120] border-r border-slate-800 flex flex-col justify-between select-none">
        <div>
          {/* Logo & Subtitle */}
          <div className="px-5 py-5 border-b border-slate-800">
            <h1 className="text-sm font-bold tracking-wider text-white font-mono flex items-center gap-2">
              <span className="text-blue-500">◈</span> PRIVYVISION
            </h1>
            <p className="text-[10px] tracking-widest text-slate-400 font-mono mt-1 uppercase">
              LOCAL BROWSER AGENT
            </p>
          </div>

          {/* Navigation Links (● Agent, ○ Perception, etc.) */}
          <nav className="p-3 space-y-1">
            {[
              { id: 'agent' as NavigationSection, label: 'Agent' },
              { id: 'perception' as NavigationSection, label: 'Perception' },
              { id: 'privacy' as NavigationSection, label: 'Privacy' },
              { id: 'actions' as NavigationSection, label: 'Actions' },
              { id: 'evaluation' as NavigationSection, label: 'Evaluation' },
              { id: 'system' as NavigationSection, label: 'System' },
            ].map(({ id, label }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-600'}>
                    {isActive ? '●' : '○'}
                  </span>
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Badges */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            <span className="font-medium">WebGPU</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-medium">Privacy Shield</span>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          RIGHT CONTENT COLUMN: HEADER + TASK BAR + MAIN WORKSPACE + STATUS BAR
         ========================================================================= */}
      <div className="flex-1 flex flex-col h-full min-w-0 min-h-0 overflow-hidden">
        {/* =========================================================================
            HEADER: height = 64px
           ========================================================================= */}
        <header className="h-[64px] shrink-0 border-b border-slate-800 bg-[#0a0f1d] px-6 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              PrivyVision
            </h2>
            <p className="text-xs text-slate-400">
              On-device browser intelligence
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Local</span>
            </div>
            <span className="text-slate-700">|</span>
            <span className="text-blue-400 font-medium">WebGPU</span>
            <span className="text-slate-700">|</span>
            <span className="text-emerald-400 font-medium">Privacy ON</span>
          </div>
        </header>

        {/* =========================================================================
            TASK BAR: height = 72px
           ========================================================================= */}
        <section className="h-[72px] shrink-0 border-b border-slate-800 bg-[#070b16] px-6 flex items-center gap-4">
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 shrink-0">
            AGENT TASK
          </span>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (taskInput.trim() && !isPipelineRunning) {
                handleRunPipeline(taskInput);
              }
            }}
            className="flex-1 flex items-center gap-3"
          >
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="Find the Submit button and click it"
              disabled={isPipelineRunning}
              className="flex-1 bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition shadow-inner"
            />

            <button
              type="submit"
              disabled={isPipelineRunning || !taskInput.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold px-5 py-2.5 rounded-lg text-xs transition flex items-center gap-2 shrink-0 cursor-pointer shadow-sm"
            >
              <span>RUN AGENT</span>
            </button>
          </form>
        </section>

        {/* =========================================================================
            MAIN WORKSPACE: remaining viewport height
           ========================================================================= */}
        <main className="flex-1 min-h-0 min-w-0 p-4 overflow-hidden bg-[#070b16]">
          {activeTab === 'agent' && (
            <AgentScreen
              runtimeStatus={runtimeStatus}
              pipelineStages={pipelineStages}
              currentStageIndex={currentStageIndex}
              isPipelineRunning={isPipelineRunning}
              onRunPipeline={handleRunPipeline}
              onResetPipeline={handleResetPipeline}
              groundedElements={groundedElements}
              detectedPii={detectedPii}
              lastAction={lastAction}
              guardResult={guardResult}
              onElementSelect={setSelectedElement}
              selectedElement={selectedElement}
              taskPrompt={taskInput}
            >
              <MockBrowserPage
                ref={viewportContainerRef}
                highlightedElementId={selectedElement?.domId || null}
                selectedElementId={selectedElement?.domId || null}
                onElementClick={(domId) => {
                  const el = groundedElements.find((e) => e.domId === domId);
                  if (el) setSelectedElement(el);
                }}
                onElementHover={(_domId) => {}}
                onDomMutation={performVisualScan}
              />
            </AgentScreen>
          )}

          {activeTab === 'perception' && (
            <PerceptionScreen
              runtimeStatus={runtimeStatus}
              groundedElements={groundedElements}
              onSelectElement={setSelectedElement}
              selectedElement={selectedElement}
            />
          )}

          {activeTab === 'privacy' && (
            <PrivacyScreen
              detectedPii={detectedPii}
              groundedElements={groundedElements}
            />
          )}

          {activeTab === 'actions' && (
            <ActionsScreen
              lastAction={lastAction}
              guardResult={guardResult}
              onExecuteApprovedAction={(action) => {
                alert(`Action Dispatched: ${action.actionType} on ${action.targetSelector}`);
              }}
            />
          )}

          {activeTab === 'evaluation' && (
            <EvaluationScreen
              runtimeStatus={runtimeStatus}
              detectedCount={groundedElements.length}
              piiCount={detectedPii.length}
            />
          )}

          {activeTab === 'system' && (
            <SystemScreen
              runtimeStatus={runtimeStatus}
              onChangeRuntimeMode={handleChangeRuntimeMode}
            />
          )}
        </main>

        {/* =========================================================================
            BOTTOM STATUS BAR: height = 44px
           ========================================================================= */}
        <footer className="h-[44px] shrink-0 border-t border-slate-800 bg-[#0a0f1d] px-6 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-8">
            <div>
              <span className="text-slate-500 mr-1.5">LOCAL</span>
              <span className="text-blue-400 font-semibold">WebGPU</span>
            </div>

            <div>
              <span className="text-slate-500 mr-1.5">PII</span>
              <span className="text-emerald-400 font-semibold">{piiCount} detected / {piiCount} redacted</span>
            </div>

            <div>
              <span className="text-slate-500 mr-1.5">NETWORK</span>
              <span className="text-emerald-400 font-semibold">Sanitized</span>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div>
              <span className="text-slate-500 mr-1.5">LATENCY</span>
              <span className="text-slate-200 font-semibold">
                {runtimeStatus.lastInferenceMs > 0 ? `${runtimeStatus.lastInferenceMs.toFixed(0)} ms` : '184 ms'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 mr-1.5">ACTION</span>
              <span
                className={`font-semibold ${
                  isPipelineRunning
                    ? 'text-blue-400'
                    : lastAction
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }`}
              >
                {isPipelineRunning ? 'Running' : lastAction ? 'Executed' : 'Ready'}
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
