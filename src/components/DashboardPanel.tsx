import React, { useState } from 'react';
import {
  Activity,
  ShieldAlert,
  Clock,
  Cpu,
  Eye,
  RotateCcw,
  BarChart2,
  History,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import type {
  PerceptionDashboardMetrics,
  ExecutionHistoryItem,
  BackendTaskRecord,
} from '../types/dom';

interface DashboardPanelProps {
  /** Aggregated real-time metrics across all task runs */
  metrics: PerceptionDashboardMetrics;
  /** Chronological history of perception requests and actions */
  history: ExecutionHistoryItem[];
  /** Most recent active backend task record */
  activeTaskRecord: BackendTaskRecord | null;
  /** Callback when user clicks a past history item to load its details */
  onSelectHistoryTask: (taskQuery: string) => void;
  /** Callback to reset history and metrics counters */
  onResetMetrics: () => void;
}

/**
 * ============================================================================
 * DASHBOARD PANEL COMPONENT (DashboardPanel.tsx)
 * ============================================================================
 * 
 * METRIC COLLECTION & DISPLAY LOGIC:
 * 1. Pixel Processing Calculation:
 *    - Glance Mode: Standard viewport scan (~480,000 px).
 *    - Focus Mode: Targeted subregion container crop (~960,000 px).
 *    - Deep Look Mode: Multi-pass high-resolution layout & OCR alignment (~2,400,000 px).
 * 2. Latency & Compute Tracking:
 *    - Captures the exact processing latency per inference tier and maintains a running average.
 * 3. Attention Firewall Decision Stream:
 *    - Aggregates every redaction event and displays semantic placeholders applied to PII fields.
 * 4. Action Guard Approval Distribution:
 *    - Computes the approval vs block ratio across all proposed browser actions.
 */
export const DashboardPanel: React.FC<DashboardPanelProps> = ({
  metrics,
  history,
  activeTaskRecord,
  onSelectHistoryTask,
  onResetMetrics,
}) => {
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'APPROVED' | 'BLOCKED'>('ALL');

  // Filtered history list
  const filteredHistory = history.filter((item) => {
    if (historyFilter === 'APPROVED') return item.guardStatus === 'APPROVED';
    if (historyFilter === 'BLOCKED') return item.guardStatus === 'BLOCKED';
    return true;
  });

  // Calculate percentages for mode distribution bar
  const totalCalls = metrics.totalInferenceCalls || 1;
  const glancePct = Math.round((metrics.modeDistribution.glance / totalCalls) * 100);
  const focusPct = Math.round((metrics.modeDistribution.focus / totalCalls) * 100);
  const deepLookPct = Math.round((metrics.modeDistribution.deep_look / totalCalls) * 100);

  // Format large pixel counts for readability
  const formatPixels = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M px`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k px`;
    return `${num} px`;
  };

  return (
    <div className="dashboard-panel-root">
      {/* Top Header Bar */}
      <div className="dashboard-header">
        <div className="dashboard-title-group">
          <div className="dashboard-icon-badge">
            <Activity className="text-indigo-400" size={20} />
          </div>
          <div>
            <h2 className="dashboard-main-title">Perception & Action Guard Dashboard</h2>
            <p className="dashboard-subtitle">
              Live telemetry: Real-time inference mode allocation, pixel throughput, latency, and firewall decisions.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="dashboard-reset-btn"
          onClick={onResetMetrics}
          title="Reset metrics and clear history"
          aria-label="Reset telemetry metrics"
        >
          <RotateCcw size={13} />
          <span>Reset Telemetry</span>
        </button>
      </div>

      {/* Real-Time KPI Cards Grid */}
      <div className="dashboard-kpi-grid">
        {/* KPI 1: Pixels Processed */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Pixels Processed</span>
            <Eye size={16} className="text-indigo-400" />
          </div>
          <div className="kpi-value text-indigo-300">
            {formatPixels(metrics.totalPixelsProcessed)}
          </div>
          <div className="kpi-footer">
            <span className="text-xs text-slate-400">
              Across {metrics.totalInferenceCalls} inference runs
            </span>
          </div>
        </div>

        {/* KPI 2: Active Inference Mode */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Current Inference Mode</span>
            <Cpu size={16} className="text-amber-400" />
          </div>
          <div className="kpi-value flex items-center gap-2">
            <span
              className={`mode-badge ${
                metrics.currentInferenceMode === 'glance'
                  ? 'mode-glance'
                  : metrics.currentInferenceMode === 'focus'
                  ? 'mode-focus'
                  : 'mode-deeplook'
              }`}
            >
              {metrics.currentInferenceMode.toUpperCase()}
            </span>
          </div>
          <div className="kpi-footer">
            <span className="text-xs text-slate-400">
              {metrics.currentInferenceMode === 'glance'
                ? 'Coarse Global DOM (1 Unit)'
                : metrics.currentInferenceMode === 'focus'
                ? 'Targeted Container Crop (3 Units)'
                : 'Multi-Pass Semantic Alignment (8 Units)'}
            </span>
          </div>
        </div>

        {/* KPI 3: Latency Telemetry */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Inference Latency</span>
            <Clock size={16} className="text-emerald-400" />
          </div>
          <div className="kpi-value text-emerald-300">
            {metrics.lastLatencyMs} <span className="text-sm font-normal text-slate-400">ms</span>
          </div>
          <div className="kpi-footer">
            <span className="text-xs text-slate-400">
              Avg: {Math.round(metrics.avgLatencyMs)} ms / request
            </span>
          </div>
        </div>

        {/* KPI 4: Attention Firewall Redactions */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Firewall Redactions</span>
            <ShieldAlert size={16} className="text-rose-400" />
          </div>
          <div className="kpi-value text-rose-300">
            {metrics.totalRedactedFields}
          </div>
          <div className="kpi-footer">
            <span className="text-xs text-slate-400">
              + {metrics.totalProhibitedAttributesStripped} dangerous attrs stripped
            </span>
          </div>
        </div>

        {/* KPI 5: Action Guard Decisions */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Action Guard Verdicts</span>
            <ShieldCheck size={16} className="text-sky-400" />
          </div>
          <div className="kpi-value text-sky-300 flex items-center gap-2">
            <span>{metrics.guardDecisions.approved} Approved</span>
            {metrics.guardDecisions.blocked > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                {metrics.guardDecisions.blocked} Blocked
              </span>
            )}
          </div>
          <div className="kpi-footer">
            <span className="text-xs text-slate-400">
              Zero unauthorized actions permitted
            </span>
          </div>
        </div>
      </div>

      {/* Visual Analytics & Breakdown Row */}
      <div className="dashboard-charts-grid">
        {/* Chart 1: 3-Tier Mode Allocation Distribution */}
        <div className="dashboard-chart-card">
          <div className="chart-card-header">
            <BarChart2 size={16} className="text-indigo-400" />
            <h3 className="chart-card-title">Adaptive Mode Allocation Ratio</h3>
          </div>

          <p className="chart-desc">
            Visualizes how many tasks were resolved cheaply via Glance vs escalated to Focus / Deep Look.
          </p>

          {/* Stacked Progress Bar */}
          <div className="mode-stacked-bar">
            <div
              className="bar-segment segment-glance"
              style={{ width: `${Math.max(5, glancePct)}%` }}
              title={`Glance: ${metrics.modeDistribution.glance} calls (${glancePct}%)`}
            >
              {glancePct > 15 ? `Glance ${glancePct}%` : ''}
            </div>
            <div
              className="bar-segment segment-focus"
              style={{ width: `${Math.max(5, focusPct)}%` }}
              title={`Focus: ${metrics.modeDistribution.focus} calls (${focusPct}%)`}
            >
              {focusPct > 15 ? `Focus ${focusPct}%` : ''}
            </div>
            <div
              className="bar-segment segment-deeplook"
              style={{ width: `${Math.max(5, deepLookPct)}%` }}
              title={`Deep Look: ${metrics.modeDistribution.deep_look} calls (${deepLookPct}%)`}
            >
              {deepLookPct > 15 ? `Deep ${deepLookPct}%` : ''}
            </div>
          </div>

          {/* Legend */}
          <div className="mode-legend-row">
            <div className="legend-item">
              <span className="legend-dot dot-glance" />
              <span>Glance ({metrics.modeDistribution.glance})</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-focus" />
              <span>Focus ({metrics.modeDistribution.focus})</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-deeplook" />
              <span>Deep Look ({metrics.modeDistribution.deep_look})</span>
            </div>
          </div>
        </div>

        {/* Chart 2: Attention Firewall Blocking Decisions Stream */}
        <div className="dashboard-chart-card">
          <div className="chart-card-header">
            <ShieldAlert size={16} className="text-rose-400" />
            <h3 className="chart-card-title">Attention Firewall Active Redactions</h3>
          </div>

          <p className="chart-desc">
            Live stream of sensitive fields masked with semantic privacy tokens before agent consumption.
          </p>

          <div className="firewall-decisions-stream">
            {activeTaskRecord?.adaptiveInferenceResult?.firewallSummary.auditLog &&
            activeTaskRecord.adaptiveInferenceResult.firewallSummary.auditLog.filter(
              (e) => e.action !== 'PASSED_CLEAN'
            ).length > 0 ? (
              activeTaskRecord.adaptiveInferenceResult.firewallSummary.auditLog
                .filter((e) => e.action !== 'PASSED_CLEAN')
                .map((entry, idx) => (
                  <div key={idx} className="firewall-stream-item">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono text-indigo-300">#{entry.elementId}</span>
                      <span className="category-pill">{entry.category}</span>
                    </div>
                    {entry.placeholderApplied && (
                      <div className="placeholder-text font-mono text-emerald-400">
                        ↳ {entry.placeholderApplied}
                      </div>
                    )}
                    <div className="rule-text text-slate-400 text-xs">
                      Policy: {entry.ruleApplied}
                    </div>
                  </div>
                ))
            ) : (
              <div className="empty-stream-text">
                <ShieldCheck size={20} className="text-emerald-400 mb-1" />
                <span>All sensitive credentials masked. Execute a task to view real-time firewall decisions.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Execution History Log */}
      <div className="dashboard-history-card">
        <div className="history-card-header">
          <div className="flex items-center gap-2">
            <History size={17} className="text-indigo-400" />
            <h3 className="history-title">Perception & Action Execution Log</h3>
            <span className="history-count-badge">{filteredHistory.length} Recorded</span>
          </div>

          {/* History Filter Chips */}
          <div className="history-filter-chips">
            <button
              type="button"
              className={`filter-btn ${historyFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setHistoryFilter('ALL')}
            >
              All
            </button>
            <button
              type="button"
              className={`filter-btn ${historyFilter === 'APPROVED' ? 'active' : ''}`}
              onClick={() => setHistoryFilter('APPROVED')}
            >
              Approved
            </button>
            <button
              type="button"
              className={`filter-btn ${historyFilter === 'BLOCKED' ? 'active' : ''}`}
              onClick={() => setHistoryFilter('BLOCKED')}
            >
              Blocked
            </button>
          </div>
        </div>

        <div className="history-table-wrapper">
          {filteredHistory.length === 0 ? (
            <div className="history-empty-state">
              <History size={24} className="text-slate-500 mb-1" />
              <p>No historical requests recorded yet. Type an instruction above to begin.</p>
            </div>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Task Instruction</th>
                  <th>Inference Mode</th>
                  <th>Pixels Analyzed</th>
                  <th>Latency</th>
                  <th>Proposed Action</th>
                  <th>Guard Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr key={item.id}>
                    <td className="font-mono text-xs text-slate-400 whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="task-cell font-medium text-slate-200">
                      "{item.taskQuery}"
                    </td>
                    <td>
                      <span
                        className={`table-mode-pill ${
                          item.inferenceMode === 'glance'
                            ? 'pill-glance'
                            : item.inferenceMode === 'focus'
                            ? 'pill-focus'
                            : 'pill-deeplook'
                        }`}
                      >
                        {item.inferenceMode.toUpperCase()}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-slate-300">
                      {formatPixels(item.pixelsProcessed)}
                    </td>
                    <td className="font-mono text-xs text-emerald-400">
                      {item.latencyMs} ms
                    </td>
                    <td className="font-mono text-xs text-sky-300">
                      {item.proposedAction
                        ? `${item.proposedAction.actionType} (${item.proposedAction.targetSelector})`
                        : 'N/A'}
                    </td>
                    <td>
                      <span
                        className={`table-guard-badge ${
                          item.guardStatus === 'APPROVED'
                            ? 'guard-approved'
                            : item.guardStatus === 'BLOCKED'
                            ? 'guard-blocked'
                            : 'guard-confirm'
                        }`}
                      >
                        {item.guardStatus}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="history-load-btn"
                        onClick={() => onSelectHistoryTask(item.taskQuery)}
                        title="Reload and inspect this task"
                      >
                        Inspect <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
