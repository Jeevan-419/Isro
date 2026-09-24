import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  Terminal,
  Loader2,
  Activity,
  LayoutDashboard,
  Eye,
} from 'lucide-react';
import type {
  ExtractedElement,
  TaskMatchResult,
  BackendTaskRecord,
  ExecutionHistoryItem,
  PerceptionDashboardMetrics,
} from './types/dom';
import { extractInteractiveElements, matchTaskToElement } from './utils/domExtractor';
import { TaskInputBar } from './components/TaskInputBar';
import { MockBrowserPage } from './components/MockBrowserPage';
import { DomInspectorSidebar } from './components/DomInspectorSidebar';
import { DashboardPanel } from './components/DashboardPanel';
import { LiveWebsiteMonitorPanel } from './components/LiveWebsiteMonitorPanel';
import './index.css';

/**
 * ============================================================================
 * MAIN APPLICATION COMPONENT (App.tsx)
 * ============================================================================
 * 
 * Orchestrates:
 * 1. Task instruction simulation (NLP matching -> element targeting).
 * 2. Mock browser webpage rendering with forms, buttons, & sensitive PII.
 * 3. Automated DOM and Accessibility (a11y) tree extraction via W3C heuristics.
 * 4. Real-time Telemetry Dashboard (Pixels processed, latency, inference tiers, firewall audit).
 * 5. Universal Live Website Monitoring (DOM integrity, Attention Firewall, security score).
 * 6. Bi-directional inspector highlighting between UI canvas and sidebar.
 */
export const App: React.FC = () => {
  // Ref referencing the mock browser page DOM container
  const mockContainerRef = useRef<HTMLDivElement>(null);

  // Active view: 'workspace' (Simulated Browser + DOM Inspector), 'dashboard' (Real-time Metrics), or 'monitor' (Live Web Monitoring)
  const [activeView, setActiveView] = useState<'workspace' | 'dashboard' | 'monitor'>('workspace');

  // State: All extracted DOM & accessibility elements
  const [extractedElements, setExtractedElements] = useState<ExtractedElement[]>([]);

  // State: Currently selected element for deep drilldown in the sidebar
  const [selectedElement, setSelectedElement] = useState<ExtractedElement | null>(null);

  // State: Currently highlighted DOM ID (triggered by task execution or sidebar hover)
  const [highlightedElementId, setHighlightedElementId] = useState<string | null>(null);

  // State: Universal Live Website Mode tracking
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const [activeWebsiteUrl, setActiveWebsiteUrl] = useState<string>(
    'https://portal.space-ops.gov.in/personnel/secure-registration'
  );

  // State: Task matching result with confidence scores and reasoning
  const [activeTaskMatch, setActiveTaskMatch] = useState<TaskMatchResult | null>(null);

  // State: Backend perception record from Express API
  const [backendTaskRecord, setBackendTaskRecord] = useState<BackendTaskRecord | null>(null);

  // State: Loading / scanning indicator
  const [isExtracting, setIsExtracting] = useState<boolean>(false);

  // State: Real-time Perception Dashboard Metrics
  const [metrics, setMetrics] = useState<PerceptionDashboardMetrics>({
    totalInferenceCalls: 0,
    totalPixelsProcessed: 0,
    avgLatencyMs: 0,
    lastLatencyMs: 0,
    totalRedactedFields: 0,
    totalProhibitedAttributesStripped: 0,
    currentInferenceMode: 'glance',
    modeDistribution: { glance: 0, focus: 0, deep_look: 0 },
    guardDecisions: { approved: 0, blocked: 0, requiresConfirmation: 0 },
  });

  // State: Chronological Execution History Log
  const [history, setHistory] = useState<ExecutionHistoryItem[]>([]);

  /**
   * DOM Extraction Procedure:
   * Queries candidate nodes in mockContainerRef and extracts structured accessibility metadata.
   */
  const performExtraction = useCallback(() => {
    if (isLiveMode) return;
    if (!mockContainerRef.current) return;

    setIsExtracting(true);
    requestAnimationFrame(() => {
      const elements = extractInteractiveElements(mockContainerRef.current);
      setExtractedElements(elements);
      setIsExtracting(false);

      if (selectedElement) {
        const refreshed = elements.find((e) => e.domId === selectedElement.domId);
        if (refreshed) {
          setSelectedElement(refreshed);
        }
      }
    });
  }, [isLiveMode, selectedElement]);

  useEffect(() => {
    performExtraction();

    const containerNode = mockContainerRef.current;
    if (!containerNode) return;

    const observer = new MutationObserver(() => {
      performExtraction();
    });

    observer.observe(containerNode, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'class', 'disabled', 'required', 'aria-expanded'],
    });

    window.addEventListener('resize', performExtraction);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', performExtraction);
    };
  }, [performExtraction]);

  /**
   * Updates aggregated telemetry metrics upon task execution completion
   */
  const recordTelemetry = (taskData: BackendTaskRecord, taskQuery: string) => {
    const adaptive = taskData.adaptiveInferenceResult;
    const finalMode = (adaptive?.finalMode || 'glance') as 'glance' | 'focus' | 'deep_look';
    const latency = adaptive?.totalLatencyMs || 42;
    const compute = adaptive?.totalComputeCostUnits || 1;

    // Calculate pixels processed per mode
    let pixels = 480_000;
    if (finalMode === 'focus') pixels = 960_000;
    else if (finalMode === 'deep_look') pixels = 2_400_000;

    const redacted = adaptive?.firewallSummary?.sensitiveElementsRedacted || 0;
    const stripped = adaptive?.firewallSummary?.prohibitedAttributesStripped || 0;

    const guardStatus = taskData.guardEvaluation?.guardStatus || 'APPROVED';

    setMetrics((prev) => {
      const newTotalCalls = prev.totalInferenceCalls + 1;
      const newTotalPixels = prev.totalPixelsProcessed + pixels;
      const newAvgLatency =
        (prev.avgLatencyMs * prev.totalInferenceCalls + latency) / newTotalCalls;

      return {
        totalInferenceCalls: newTotalCalls,
        totalPixelsProcessed: newTotalPixels,
        avgLatencyMs: newAvgLatency,
        lastLatencyMs: latency,
        totalRedactedFields: prev.totalRedactedFields + redacted,
        totalProhibitedAttributesStripped: prev.totalProhibitedAttributesStripped + stripped,
        currentInferenceMode: finalMode,
        modeDistribution: {
          ...prev.modeDistribution,
          [finalMode]: prev.modeDistribution[finalMode] + 1,
        },
        guardDecisions: {
          ...prev.guardDecisions,
          approved: prev.guardDecisions.approved + (guardStatus === 'APPROVED' ? 1 : 0),
          blocked: prev.guardDecisions.blocked + (guardStatus === 'BLOCKED' ? 1 : 0),
          requiresConfirmation:
            prev.guardDecisions.requiresConfirmation +
            (guardStatus === 'REQUIRES_USER_CONFIRMATION' ? 1 : 0),
        },
      };
    });

    // Append to Execution History Log
    const historyItem: ExecutionHistoryItem = {
      id: `hist-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 3)}`,
      timestamp: new Date().toISOString(),
      taskQuery,
      intent: taskData.requirements?.intent || 'inspect',
      inferenceMode: finalMode,
      pixelsProcessed: pixels,
      latencyMs: latency,
      computeUnits: compute,
      redactedFieldsCount: redacted,
      prohibitedAttributesStripped: stripped,
      proposedAction: taskData.proposedAction
        ? {
            actionType: taskData.proposedAction.actionType,
            targetSelector: taskData.proposedAction.targetSelector,
            estimatedRisk: taskData.proposedAction.estimatedRisk,
          }
        : undefined,
      guardStatus,
      guardReason: taskData.guardEvaluation?.blockReason,
    };

    setHistory((prev) => [historyItem, ...prev]);
  };

  /**
   * Executes a user task query:
   * 1. Matches the natural language query against the extracted elements list.
   * 2. Identifies the highest-confidence target node.
   * 3. Calls the Express backend API (/api/tasks) to generate the official perception plan & requirements.
   * 4. Queries Action Planner and Local Action Guard.
   * 5. Updates real-time telemetry metrics and history.
   */
  const handleExecuteTask = async (taskQuery: string) => {
    const match = matchTaskToElement(taskQuery, extractedElements);
    setActiveTaskMatch(match);

    if (match.matchedElement) {
      setSelectedElement(match.matchedElement);
      setHighlightedElementId(match.matchedElement.domId);

      if (match.matchedElement.domId && mockContainerRef.current) {
        const targetNode = mockContainerRef.current.querySelector(
          `#${match.matchedElement.domId}`
        );
        if (targetNode) {
          targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    } else {
      setHighlightedElementId(null);
    }

    // Call Express backend
    try {
      if (isLiveMode) {
        // Live Website Task Execution via Backend Proxy & Universal Scraper
        const response = await fetch('http://localhost:3001/api/proxy/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: activeWebsiteUrl, task: taskQuery }),
        });

        if (response.ok) {
          const result = await response.json();
          const nowStr = new Date().toISOString();
          const taskData: BackendTaskRecord = {
            id: `task-live-${Date.now().toString(36)}`,
            rawTask: taskQuery,
            createdAt: nowStr,
            updatedAt: nowStr,
            status: 'COMPLETED',
            requirements: result.requirements,
            perceptionPlan: {
              planId: `plan-${Date.now().toString(36)}`,
              strategy: 'Universal live website element extraction & Attention Firewall',
              confidenceScore: 0.94,
              steps: [
                {
                  stepIndex: 1,
                  action: 'FETCH_AND_PARSE_DOM',
                  description: 'Extract accessible interactive candidates from target URL',
                  parameters: { url: activeWebsiteUrl },
                  expectedOutput: 'Parsed element candidates',
                },
                {
                  stepIndex: 2,
                  action: 'ATTENTION_FIREWALL_AUDIT',
                  description: 'Enforce privacy policies and redact sensitive fields',
                  parameters: { maskSensitiveValues: true },
                  expectedOutput: 'Sanitized perception payload',
                },
              ],
              safetyChecks: [
                'Local Action Guard validation',
                'Attention Firewall PII masking',
              ],
            },
            adaptiveInferenceResult: result.adaptiveResult,
            proposedAction: result.proposedAction,
            guardEvaluation: result.guardEvaluation,
          };

          if (result.elements && Array.isArray(result.elements)) {
            const mapped: ExtractedElement[] = result.elements.map((e: any, idx: number) => ({
              uid: e.id || `live-${idx}`,
              tagName: e.tagName,
              domId: e.domId || null,
              name: e.name || null,
              type: e.type || null,
              role: e.role,
              accessibleName: e.accessibleName,
              accessibleDescription: null,
              ariaAttributes: {},
              textContent: e.displayValueOrText || '',
              currentValue: e.displayValueOrText || '',
              placeholder: e.placeholder || null,
              isSensitive: e.isSensitive,
              sensitiveCategory: e.sensitiveCategory,
              cssSelector: e.cssSelector,
              xpath: `//${e.tagName.toLowerCase()}`,
              isVisible: true,
              isDisabled: Boolean(e.interactivity?.disabled),
              isRequired: Boolean(e.interactivity?.required),
              rect: { ...e.rect, top: e.rect.y, left: e.rect.x },
              htmlSnippet: `<${e.tagName.toLowerCase()} id="${e.domId || ''}">${e.accessibleName}</${e.tagName.toLowerCase()}>`,
            }));
            setExtractedElements(mapped);

            if (result.proposedAction) {
              const matchedEl = mapped.find(
                (m) =>
                  m.cssSelector === result.proposedAction.targetSelector ||
                  (result.proposedAction.targetElementId && m.domId === result.proposedAction.targetElementId) ||
                  (result.proposedAction.targetAccessibleName &&
                    m.accessibleName.toLowerCase() === result.proposedAction.targetAccessibleName.toLowerCase())
              );
              if (matchedEl) {
                setSelectedElement(matchedEl);
                setHighlightedElementId(matchedEl.domId || matchedEl.uid);
              }
            }
          }

          setBackendTaskRecord(taskData);
          recordTelemetry(taskData, taskQuery);
        }
        return;
      }

      // Portal or HTML Sandbox Mode: Send DOM candidates to backend
      const candidates = extractedElements.map((e) => ({
        domId: e.domId || undefined,
        tagName: e.tagName,
        type: e.type || undefined,
        role: e.role,
        accessibleName: e.accessibleName,
        cssSelector: e.cssSelector,
        rect: e.rect,
        isSensitive: e.isSensitive,
        sensitiveCategory: e.sensitiveCategory,
      }));

      const response = await fetch('http://localhost:3001/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskQuery, candidates }),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          const taskData = result.data as BackendTaskRecord;

          try {
            const actionRes = await fetch(
              `http://localhost:3001/api/tasks/${taskData.id}/actions/plan-and-guard`,
              { method: 'POST' }
            );
            if (actionRes.ok) {
              const actionData = await actionRes.json();
              taskData.proposedAction = actionData.proposedAction;
              taskData.guardEvaluation = actionData.guardEvaluation;
            }
          } catch {
            // Action guard offline fallback
          }

          setBackendTaskRecord(taskData);
          recordTelemetry(taskData, taskQuery);
        }
      }
    } catch {
      // Backend optional / graceful offline handling
    }
  };

  const handleClearTask = () => {
    setActiveTaskMatch(null);
    setHighlightedElementId(null);
    setBackendTaskRecord(null);
  };

  const handleElementClick = (domId: string | null, tagName: string) => {
    if (!domId) return;
    const found = extractedElements.find(
      (e) => e.domId === domId || e.tagName.toUpperCase() === tagName.toUpperCase()
    );
    if (found) {
      setSelectedElement(found);
      setHighlightedElementId(domId);
    }
  };

  const handleElementHover = (domId: string | null) => {
    if (!activeTaskMatch?.matchedElement) {
      setHighlightedElementId(domId);
    }
  };

  const handleResetMetrics = () => {
    setMetrics({
      totalInferenceCalls: 0,
      totalPixelsProcessed: 0,
      avgLatencyMs: 0,
      lastLatencyMs: 0,
      totalRedactedFields: 0,
      totalProhibitedAttributesStripped: 0,
      currentInferenceMode: 'glance',
      modeDistribution: { glance: 0, focus: 0, deep_look: 0 },
      guardDecisions: { approved: 0, blocked: 0, requiresConfirmation: 0 },
    });
    setHistory([]);
  };

  return (
    <div className="app-root">
      {/* Top Application Navigation Bar */}
      <header className="app-navbar">
        <div className="navbar-brand-section">
          <div className="navbar-logo-icon">
            <Terminal size={22} className="text-indigo-400" />
          </div>
          <div className="navbar-brand-text">
            <h1 className="navbar-app-title">Web DOM & Accessibility Simulation</h1>
            <span className="navbar-app-tagline">
              Adaptive Inference • Attention Firewall • Local Action Guard
            </span>
          </div>
        </div>

        {/* View Switcher: Workspace vs Telemetry Dashboard */}
        <div className="navbar-view-switcher">
          <button
            type="button"
            className={`view-switch-btn ${activeView === 'workspace' ? 'active' : ''}`}
            onClick={() => setActiveView('workspace')}
          >
            <Eye size={14} />
            <span>Workspace & Canvas</span>
          </button>
          <button
            type="button"
            className={`view-switch-btn ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveView('dashboard')}
          >
            <LayoutDashboard size={14} />
            <span>Telemetry Dashboard</span>
            {metrics.totalInferenceCalls > 0 && (
              <span className="nav-badge-count">{metrics.totalInferenceCalls}</span>
            )}
          </button>
          <button
            type="button"
            className={`view-switch-btn ${activeView === 'monitor' ? 'active' : ''}`}
            onClick={() => setActiveView('monitor')}
          >
            <Activity size={14} className="text-emerald-500" />
            <span>Live Web Monitor</span>
          </button>
        </div>

        <div className="navbar-actions">
          {isExtracting ? (
            <div className="navbar-badge text-indigo-400">
              <Loader2 size={15} className="animate-spin mr-1" />
              <span>Extracting DOM...</span>
            </div>
          ) : (
            <div className="navbar-badge">
              <ShieldCheck size={15} className="text-emerald-400 mr-1" />
              <span>Firewall Active ({metrics.totalRedactedFields} Redactions)</span>
            </div>
          )}
          <div className="navbar-badge">
            <Activity size={14} className="text-amber-400 mr-1" />
            <span className="font-mono text-xs">
              {metrics.lastLatencyMs ? `${metrics.lastLatencyMs}ms` : 'Idle'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="app-main-workspace">
        {/* Top: User Task Input & Automation Command Center */}
        <section className="app-task-section">
          <TaskInputBar
            onExecuteTask={handleExecuteTask}
            activeMatch={activeTaskMatch}
            onClearTask={handleClearTask}
          />
        </section>

        {/* View Mode 1: Workspace Split Screen (Mock Webpage + Sidebar) */}
        {activeView === 'workspace' && (
          <div className="app-split-container">
            {/* Left Column: Simulated Browser Environment */}
            <div className="app-browser-column">
              <MockBrowserPage
                ref={mockContainerRef}
                highlightedElementId={highlightedElementId}
                selectedElementId={selectedElement?.domId || null}
                onElementClick={handleElementClick}
                onElementHover={handleElementHover}
                onDomMutation={performExtraction}
                onLiveElementsExtracted={(elements, url) => {
                  setIsLiveMode(true);
                  setActiveWebsiteUrl(url);
                  setExtractedElements(elements);
                  setSelectedElement(elements[0] || null);
                }}
                onResetToLocalDom={() => {
                  setIsLiveMode(false);
                  setActiveWebsiteUrl('https://portal.space-ops.gov.in/personnel/secure-registration');
                  performExtraction();
                }}
                onOpenLiveMonitor={(url) => {
                  setActiveWebsiteUrl(url);
                  setActiveView('monitor');
                }}
              />
            </div>

            {/* Right Column: DOM & Accessibility Inspector Sidebar */}
            <div className="app-sidebar-column">
              <DomInspectorSidebar
                elements={extractedElements}
                selectedElement={selectedElement}
                highlightedElementId={highlightedElementId}
                onSelectElement={setSelectedElement}
                onHoverElement={handleElementHover}
                activeTaskMatch={activeTaskMatch}
                backendTaskRecord={backendTaskRecord}
                onRefreshExtraction={performExtraction}
              />
            </div>
          </div>
        )}

        {/* View Mode 2: Real-time Telemetry Dashboard */}
        {activeView === 'dashboard' && (
          <DashboardPanel
            metrics={metrics}
            history={history}
            activeTaskRecord={backendTaskRecord}
            onSelectHistoryTask={(taskQuery) => {
              setActiveView('workspace');
              handleExecuteTask(taskQuery);
            }}
            onResetMetrics={handleResetMetrics}
          />
        )}

        {/* View Mode 3: Universal Live Website Monitor Console */}
        {activeView === 'monitor' && (
          <LiveWebsiteMonitorPanel
            currentUrl={activeWebsiteUrl}
            onNavigateToUrl={(url) => {
              setActiveWebsiteUrl(url);
            }}
          />
        )}
      </main>
    </div>
  );
};

export default App;

