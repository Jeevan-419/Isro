import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Layers,
  Search,
  CheckCircle2,
  Copy,
  Info,
  FileJson,
  MousePointerClick,
  Sparkles,
  Lock,
  Cpu,
  ShieldCheck,
  Zap,
  AlertOctagon,
  Play,
} from 'lucide-react';
import type {
  ExtractedElement,
  FilterCategory,
  TaskMatchResult,
  BackendTaskRecord,
} from '../types/dom';

interface DomInspectorSidebarProps {
  /** Array of extracted DOM & accessibility elements from container */
  elements: ExtractedElement[];
  /** Currently selected element for deep drill-down */
  selectedElement: ExtractedElement | null;
  /** Currently highlighted element ID from task matching or hover */
  highlightedElementId: string | null;
  /** Callback to select an element */
  onSelectElement: (element: ExtractedElement | null) => void;
  /** Callback to set hover highlight */
  onHoverElement: (elementDomId: string | null) => void;
  /** Active task match result */
  activeTaskMatch: TaskMatchResult | null;
  /** Perception contract & plan returned by Express backend */
  backendTaskRecord?: BackendTaskRecord | null;
  /** Refresh callback to re-run extraction */
  onRefreshExtraction: () => void;
}

/**
 * DomInspectorSidebar Component
 * 
 * Inspects, filters, and presents the live DOM and Accessibility (a11y) tree extracted from
 * the mock webpage. Highlights sensitive/PII elements and shows CSS/XPath locators used by web agents.
 */
export const DomInspectorSidebar: React.FC<DomInspectorSidebarProps> = ({
  elements,
  selectedElement,
  highlightedElementId,
  onSelectElement,
  onHoverElement,
  activeTaskMatch,
  backendTaskRecord,
  onRefreshExtraction,
}) => {
  // Sidebar view modes: 'list' (tree cards), 'details' (deep inspector), 'plan' (perception requirements), 'action' (Action Planner & Guard), 'json' (LLM agent view)
  const [activeTab, setActiveTab] = useState<'list' | 'details' | 'plan' | 'action' | 'json'>('list');
  // Category filter state
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  // Text search query for filtering DOM nodes
  const [searchFilter, setSearchFilter] = useState('');
  // Copy state feedback
  const [copiedJson, setCopiedJson] = useState(false);
  // Action approval execution state
  const [actionApprovalFeedback, setActionApprovalFeedback] = useState<string | null>(null);

  // Compute summary stats
  const stats = useMemo(() => {
    const total = elements.length;
    const sensitiveCount = elements.filter((e) => e.isSensitive).length;
    const inputsCount = elements.filter((e) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.tagName)).length;
    const buttonsCount = elements.filter((e) => e.role === 'button' || e.tagName === 'BUTTON').length;
    return { total, sensitiveCount, inputsCount, buttonsCount };
  }, [elements]);

  // Filter elements based on selected category and text search
  const filteredElements = useMemo(() => {
    return elements.filter((elem) => {
      // Category filter
      if (filterCategory === 'sensitive' && !elem.isSensitive) return false;
      if (
        filterCategory === 'inputs' &&
        !['INPUT', 'SELECT', 'TEXTAREA'].includes(elem.tagName)
      ) {
        return false;
      }
      if (
        filterCategory === 'buttons' &&
        elem.role !== 'button' &&
        elem.tagName !== 'BUTTON'
      ) {
        return false;
      }
      if (
        filterCategory === 'interactive' &&
        !['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(elem.tagName)
      ) {
        return false;
      }

      // Search term filter
      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase();
        const matchName = elem.accessibleName.toLowerCase().includes(query);
        const matchId = (elem.domId || '').toLowerCase().includes(query);
        const matchTag = elem.tagName.toLowerCase().includes(query);
        const matchRole = elem.role.toLowerCase().includes(query);
        const matchSelector = elem.cssSelector.toLowerCase().includes(query);
        return matchName || matchId || matchTag || matchRole || matchSelector;
      }

      return true;
    });
  }, [elements, filterCategory, searchFilter]);

  // Copy agent-readable JSON to clipboard
  const handleCopyJson = () => {
    const jsonOutput = JSON.stringify(elements, null, 2);
    navigator.clipboard.writeText(jsonOutput);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Submit action approval
  const handleApproveAction = async () => {
    if (!backendTaskRecord?.proposedAction) return;

    try {
      const res = await fetch('http://localhost:3001/api/actions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: backendTaskRecord.proposedAction,
          taskId: backendTaskRecord.id,
        }),
      });
      const data = await res.json();
      if (data.status === 'APPROVED') {
        setActionApprovalFeedback('✅ Action APPROVED and dispatched successfully!');
      } else if (data.status === 'BLOCKED') {
        setActionApprovalFeedback(`⛔ Action BLOCKED: ${data.reason}`);
      } else {
        setActionApprovalFeedback(`⚠️ Action ${data.status}: ${data.reason}`);
      }
      setTimeout(() => setActionApprovalFeedback(null), 5000);
    } catch (err) {
      setActionApprovalFeedback(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <aside className="dom-sidebar-container" aria-label="DOM and Accessibility Inspector">
      {/* Sidebar Header & Metrics */}
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <div className="sidebar-brand">
            <Layers className="text-indigo-400" size={18} />
            <h3 className="sidebar-title">DOM & Accessibility Inspector</h3>
          </div>
          <button
            className="sidebar-refresh-btn"
            onClick={onRefreshExtraction}
            title="Refresh DOM Snapshot"
            aria-label="Refresh extraction"
          >
            Refresh
          </button>
        </div>

        {/* Metric Badges */}
        <div className="sidebar-stats-row">
          <div className="stat-pill">
            <span className="stat-label">Total Elements:</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-pill stat-pill-sensitive">
            <ShieldAlert size={13} className="text-rose-400" />
            <span className="stat-label">Sensitive / PII:</span>
            <span className="stat-value text-rose-300 font-bold">{stats.sensitiveCount}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">Inputs:</span>
            <span className="stat-value">{stats.inputsCount}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">Buttons:</span>
            <span className="stat-value">{stats.buttonsCount}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="sidebar-tabs-nav">
          <button
            type="button"
            className={`sidebar-tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <Layers size={13} />
            <span>Elements ({filteredElements.length})</span>
          </button>
          <button
            type="button"
            className={`sidebar-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <Info size={13} />
            <span>Details</span>
          </button>
          <button
            type="button"
            className={`sidebar-tab-btn ${activeTab === 'plan' ? 'active' : ''}`}
            onClick={() => setActiveTab('plan')}
          >
            <Cpu size={13} />
            <span>Perception</span>
          </button>
          <button
            type="button"
            className={`sidebar-tab-btn ${activeTab === 'action' ? 'active' : ''}`}
            onClick={() => setActiveTab('action')}
          >
            <Zap size={13} />
            <span>Action Guard</span>
          </button>
          <button
            type="button"
            className={`sidebar-tab-btn ${activeTab === 'json' ? 'active' : ''}`}
            onClick={() => setActiveTab('json')}
          >
            <FileJson size={13} />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Element List & Filter */}
      {activeTab === 'list' && (
        <div className="sidebar-tab-body">
          {/* Filter Toolbar */}
          <div className="sidebar-filters-toolbar">
            <div className="sidebar-search-box">
              <Search size={14} className="sidebar-search-icon" />
              <input
                type="text"
                className="sidebar-search-input"
                placeholder="Filter by name, ID, role, or selector..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                aria-label="Filter extracted elements"
              />
            </div>

            {/* Quick Filter Buttons */}
            <div className="filter-chips-row">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'sensitive', label: '⚠️ Sensitive Only' },
                  { id: 'inputs', label: 'Inputs' },
                  { id: 'buttons', label: 'Buttons' },
                  { id: 'interactive', label: 'Interactive' },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className={`filter-chip ${filterCategory === chip.id ? 'active' : ''}`}
                  onClick={() => setFilterCategory(chip.id)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Elements Scrollable List */}
          <div className="sidebar-elements-list">
            {filteredElements.length === 0 ? (
              <div className="sidebar-empty-state">
                <Info size={28} className="text-slate-500 mb-2" />
                <p>No elements match the current filters.</p>
              </div>
            ) : (
              filteredElements.map((elem) => {
                const isSelected = selectedElement?.uid === elem.uid;
                const isHighlighted =
                  highlightedElementId === elem.domId ||
                  activeTaskMatch?.matchedElement?.uid === elem.uid;

                return (
                  <div
                    key={elem.uid}
                    className={`dom-element-card ${isSelected ? 'selected' : ''} ${
                      isHighlighted ? 'highlighted' : ''
                    } ${elem.isSensitive ? 'sensitive-card' : ''}`}
                    onClick={() => {
                      onSelectElement(elem);
                      setActiveTab('details');
                    }}
                    onMouseEnter={() => onHoverElement(elem.domId)}
                    onMouseLeave={() => onHoverElement(null)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Inspect element ${elem.tagName} with id ${elem.domId || 'none'}`}
                  >
                    {/* Card Top: Tag + Role + Sensitive Badge */}
                    <div className="elem-card-header">
                      <div className="elem-tag-group">
                        <span className="elem-tag-badge">&lt;{elem.tagName.toLowerCase()}&gt;</span>
                        <span className="elem-role-badge">role="{elem.role}"</span>
                        {elem.type && <span className="elem-type-badge">type="{elem.type}"</span>}
                      </div>

                      {elem.isSensitive && (
                        <span className="elem-sensitive-pill">
                          <Lock size={11} />
                          <span>{elem.sensitiveCategory || 'Sensitive'}</span>
                        </span>
                      )}
                    </div>

                    {/* Accessible Name / Text */}
                    <div className="elem-card-body">
                      <div className="elem-acc-name">
                        <span className="acc-name-label">AccName:</span>
                        <span className="acc-name-value">
                          {elem.accessibleName ? `"${elem.accessibleName}"` : '<none>'}
                        </span>
                      </div>

                      {elem.domId && (
                        <div className="elem-prop-row">
                          <span className="prop-key">id:</span>
                          <span className="prop-val-code">#{elem.domId}</span>
                        </div>
                      )}

                      {elem.name && (
                        <div className="elem-prop-row">
                          <span className="prop-key">name:</span>
                          <span className="prop-val-code">{elem.name}</span>
                        </div>
                      )}

                      <div className="elem-prop-row">
                        <span className="prop-key">Selector:</span>
                        <span className="prop-val-selector font-mono">{elem.cssSelector}</span>
                      </div>
                    </div>

                    {/* Card Footer Flags */}
                    <div className="elem-card-footer">
                      <span className={`flag-badge ${elem.isRequired ? 'required' : ''}`}>
                        {elem.isRequired ? 'Required' : 'Optional'}
                      </span>
                      <span className={`flag-badge ${elem.isDisabled ? 'disabled' : 'enabled'}`}>
                        {elem.isDisabled ? 'Disabled' : 'Enabled'}
                      </span>
                      <span className="flag-badge-geometry">
                        {elem.rect.width}×{elem.rect.height}px
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Detailed Element Inspector */}
      {activeTab === 'details' && (
        <div className="sidebar-tab-body sidebar-details-panel">
          {selectedElement ? (
            <div className="detail-view-container">
              {/* Top Banner */}
              <div className="detail-header-card">
                <div className="detail-tag-title">
                  <span className="detail-tag">&lt;{selectedElement.tagName.toLowerCase()}&gt;</span>
                  {selectedElement.domId && <span className="detail-id">#{selectedElement.domId}</span>}
                </div>

                {selectedElement.isSensitive && (
                  <div className="sensitive-alert-box">
                    <ShieldAlert size={16} className="text-rose-400" />
                    <div>
                      <strong>Sensitive / PII Field Detected</strong>
                      <p>Classified under: {selectedElement.sensitiveCategory}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Accessible Name Hierarchy Computation Breakdown */}
              <div className="detail-section">
                <h4 className="detail-section-title">W3C Accessible Name Computation</h4>
                <div className="detail-property-table">
                  <div className="prop-item">
                    <span className="prop-name">Computed Name:</span>
                    <span className="prop-content font-bold text-indigo-300">
                      {selectedElement.accessibleName || 'None'}
                    </span>
                  </div>
                  <div className="prop-item">
                    <span className="prop-name">Accessible Role:</span>
                    <span className="prop-content font-mono">{selectedElement.role}</span>
                  </div>
                  <div className="prop-item">
                    <span className="prop-name">Description (aria-describedby):</span>
                    <span className="prop-content">
                      {selectedElement.accessibleDescription || 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Automation Locators (CSS & XPath) */}
              <div className="detail-section">
                <h4 className="detail-section-title">Automation Locators</h4>
                <div className="locator-box">
                  <div className="locator-label">CSS Selector</div>
                  <div className="locator-code-row">
                    <code>{selectedElement.cssSelector}</code>
                    <button
                      className="locator-copy-btn"
                      onClick={() => navigator.clipboard.writeText(selectedElement.cssSelector)}
                      title="Copy CSS Selector"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>

                <div className="locator-box mt-2">
                  <div className="locator-label">XPath Expression</div>
                  <div className="locator-code-row">
                    <code>{selectedElement.xpath}</code>
                    <button
                      className="locator-copy-btn"
                      onClick={() => navigator.clipboard.writeText(selectedElement.xpath)}
                      title="Copy XPath"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* DOM Attributes & State */}
              <div className="detail-section">
                <h4 className="detail-section-title">DOM Attributes & State</h4>
                <div className="detail-property-table">
                  <div className="prop-item">
                    <span className="prop-name">Tag Name:</span>
                    <span className="prop-content font-mono">{selectedElement.tagName}</span>
                  </div>
                  <div className="prop-item">
                    <span className="prop-name">Type:</span>
                    <span className="prop-content font-mono">{selectedElement.type || 'N/A'}</span>
                  </div>
                  <div className="prop-item">
                    <span className="prop-name">Name Attribute:</span>
                    <span className="prop-content font-mono">{selectedElement.name || 'N/A'}</span>
                  </div>
                  <div className="prop-item">
                    <span className="prop-name">Current Value:</span>
                    <span className="prop-content font-mono">{selectedElement.currentValue || '""'}</span>
                  </div>
                  <div className="prop-item">
                    <span className="prop-name">Placeholder:</span>
                    <span className="prop-content">{selectedElement.placeholder || 'N/A'}</span>
                  </div>
                  <div className="prop-item">
                    <span className="prop-name">Required:</span>
                    <span className="prop-content">{selectedElement.isRequired ? 'True' : 'False'}</span>
                  </div>
                  <div className="prop-item">
                    <span className="prop-name">Disabled:</span>
                    <span className="prop-content">{selectedElement.isDisabled ? 'True' : 'False'}</span>
                  </div>
                </div>
              </div>

              {/* ARIA Attributes */}
              <div className="detail-section">
                <h4 className="detail-section-title">ARIA Attributes</h4>
                {Object.keys(selectedElement.ariaAttributes).length > 0 ? (
                  <div className="aria-badges-container">
                    {Object.entries(selectedElement.ariaAttributes).map(([key, val]) => (
                      <span key={key} className="aria-badge">
                        {key}="{val}"
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs">No explicit ARIA attributes present.</span>
                )}
              </div>

              {/* Geometry Bounding Box */}
              <div className="detail-section">
                <h4 className="detail-section-title">Geometry & Coordinates</h4>
                <div className="geometry-grid">
                  <div className="geo-cell">
                    <span className="geo-label">Width</span>
                    <span className="geo-val">{selectedElement.rect.width}px</span>
                  </div>
                  <div className="geo-cell">
                    <span className="geo-label">Height</span>
                    <span className="geo-val">{selectedElement.rect.height}px</span>
                  </div>
                  <div className="geo-cell">
                    <span className="geo-label">Left (X)</span>
                    <span className="geo-val">{selectedElement.rect.left}px</span>
                  </div>
                  <div className="geo-cell">
                    <span className="geo-label">Top (Y)</span>
                    <span className="geo-val">{selectedElement.rect.top}px</span>
                  </div>
                </div>
              </div>

              {/* Raw HTML Snippet */}
              <div className="detail-section">
                <h4 className="detail-section-title">HTML Opening Snippet</h4>
                <pre className="html-snippet-box font-mono">{selectedElement.htmlSnippet}</pre>
              </div>
            </div>
          ) : (
            <div className="sidebar-empty-state">
              <MousePointerClick size={32} className="text-slate-500 mb-2" />
              <p>Click on any element in the Mock Webpage or Element List to view detailed inspection data.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Backend Perception Plan & Requirements */}
      {activeTab === 'plan' && (
        <div className="sidebar-tab-body sidebar-details-panel">
          {backendTaskRecord ? (
            <div className="detail-view-container">
              {/* Header Card */}
              <div className="detail-header-card">
                <div className="flex items-center justify-between">
                  <div className="detail-tag-title">
                    <Cpu size={16} className="text-indigo-400" />
                    <span className="text-xs font-mono text-indigo-300">
                      ID: {backendTaskRecord.id}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {backendTaskRecord.status}
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-semibold mt-1">
                  Task: "{backendTaskRecord.rawTask}"
                </div>
              </div>

              {/* Adaptive Multi-Tier Inference Execution Mode */}
              {backendTaskRecord.adaptiveInferenceResult && (
                <div className="detail-section">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="detail-section-title mb-0">⚡ Adaptive Inference Modes</h4>
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 font-mono">
                      Final: {backendTaskRecord.adaptiveInferenceResult.finalMode.toUpperCase()}
                    </span>
                  </div>

                  {/* Escalation alert if triggered */}
                  {backendTaskRecord.adaptiveInferenceResult.escalated && (
                    <div className="mb-2 p-2 rounded bg-amber-950/40 border border-amber-800 text-xs text-amber-200">
                      <strong>Uncertainty Escalation Triggered:</strong>
                      <ul className="list-disc pl-4 mt-1 text-amber-300">
                        {backendTaskRecord.adaptiveInferenceResult.escalationReasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 3 Tier progression cards */}
                  <div className="space-y-2">
                    {backendTaskRecord.adaptiveInferenceResult.tierExecutionHistory.map((tier, idx) => (
                      <div
                        key={idx}
                        className={`locator-box ${
                          tier.mode === backendTaskRecord.adaptiveInferenceResult?.finalMode
                            ? 'border-indigo-500'
                            : ''
                        }`}
                      >
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-indigo-300">{tier.name}</span>
                          <span className="font-mono text-slate-400">
                            {tier.latencyMs}ms | {tier.computeCostUnits} Compute Unit(s)
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">{tier.findings}</p>
                        <div className="flex gap-2 mt-1 text-xs font-mono">
                          <span className="text-sky-300">Confidence: {tier.confidenceScore}%</span>
                          <span className="text-rose-300">Uncertainty: {Math.round(tier.uncertaintyScore * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 text-xs text-slate-400 flex justify-between font-mono">
                    <span>Total Latency: {backendTaskRecord.adaptiveInferenceResult.totalLatencyMs}ms</span>
                    <span>Total Compute: {backendTaskRecord.adaptiveInferenceResult.totalComputeCostUnits} Units</span>
                  </div>
                </div>
              )}

              {/* Attention Firewall Audit Trail & Semantic Placeholders */}
              {backendTaskRecord.adaptiveInferenceResult?.firewallSummary && (
                <div className="detail-section">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="detail-section-title mb-0">🛡️ Attention Firewall Audit</h4>
                    <span className="text-xs text-rose-300 font-mono">
                      {backendTaskRecord.adaptiveInferenceResult.firewallSummary.sensitiveElementsRedacted} Redacted
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-2">
                    Semantic placeholders applied to protect sensitive credentials before agent ingestion:
                  </p>

                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {backendTaskRecord.adaptiveInferenceResult.firewallSummary.auditLog
                      .filter((entry) => entry.action !== 'PASSED_CLEAN')
                      .map((entry, idx) => (
                        <div key={idx} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-xs">
                          <div className="flex justify-between font-mono text-indigo-300">
                            <span>#{entry.elementId}</span>
                            <span className="text-rose-400 font-bold">{entry.category}</span>
                          </div>
                          {entry.placeholderApplied && (
                            <div className="text-emerald-400 font-mono text-xs mt-0.5 break-all">
                              ↳ {entry.placeholderApplied}
                            </div>
                          )}
                          <div className="text-slate-500 text-xs mt-0.5 italic">{entry.ruleApplied}</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Perception Requirements */}
              <div className="detail-section">
                <h4 className="detail-section-title">1. Perception Requirements</h4>
                <div className="detail-property-table">
                  <div className="prop-item">
                    <span className="prop-name">Intent:</span>
                    <span className="prop-content font-mono font-bold text-indigo-300">
                      {backendTaskRecord.requirements.intent.toUpperCase()}
                    </span>
                  </div>
                  <div className="prop-item">
                    <span className="prop-name">Target Keywords:</span>
                    <span className="prop-content font-mono">
                      {backendTaskRecord.requirements.targetKeywords.join(', ') || 'N/A'}
                    </span>
                  </div>
                  <div className="prop-item">
                    <span className="prop-name">Target Element Roles:</span>
                    <span className="prop-content font-mono text-amber-300">
                      {backendTaskRecord.requirements.targetElementRoles.join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Allowed Regions (Least Privilege Scope) */}
              <div className="detail-section">
                <h4 className="detail-section-title">2. Allowed Spatial & DOM Regions</h4>
                <div className="detail-property-table">
                  <div className="prop-item">
                    <span className="prop-name">Region Scope:</span>
                    <span className="prop-content font-mono font-bold text-emerald-400">
                      {backendTaskRecord.requirements.allowedRegions.scope}
                    </span>
                  </div>
                  <div className="prop-item">
                    <span className="prop-name">Description:</span>
                    <span className="prop-content">
                      {backendTaskRecord.requirements.allowedRegions.description}
                    </span>
                  </div>
                  <div className="prop-item">
                    <span className="prop-name">Authorized Scopes:</span>
                    <span className="prop-content font-mono text-xs text-sky-300">
                      {backendTaskRecord.requirements.allowedRegions.allowedSelectorScopes.join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Forbidden Info & Privacy Redaction */}
              <div className="detail-section">
                <h4 className="detail-section-title">3. Forbidden Info & Privacy Policy</h4>
                <div className="sensitive-alert-box">
                  <ShieldAlert size={16} className="text-rose-400" />
                  <div>
                    <strong>Mask Sensitive Values: True</strong>
                    <p>{backendTaskRecord.requirements.forbiddenInfo.privacyReason}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {backendTaskRecord.requirements.forbiddenInfo.redactCategories.map((cat, i) => (
                    <span key={i} className="elem-sensitive-pill">
                      <Lock size={10} />
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Minimal Perception Plan Steps */}
              <div className="detail-section">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="detail-section-title mb-0">4. Perception Execution Steps</h4>
                  <span className="text-xs text-indigo-300 font-mono">
                    Confidence: {backendTaskRecord.perceptionPlan.confidenceScore}%
                  </span>
                </div>
                <div className="space-y-2 mt-2">
                  {backendTaskRecord.perceptionPlan.steps.map((step) => (
                    <div key={step.stepIndex} className="locator-box">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span className="font-bold text-indigo-400">
                          Step {step.stepIndex}: {step.action}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 mb-1">{step.description}</p>
                      <div className="text-xs text-slate-500 italic">
                        ↳ Expected Output: {step.expectedOutput}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safety Checks */}
              <div className="detail-section">
                <h4 className="detail-section-title">5. Privacy & Safety Verified</h4>
                <ul className="text-xs text-emerald-400 space-y-1">
                  {backendTaskRecord.perceptionPlan.safetyChecks.map((check, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <ShieldCheck size={13} className="shrink-0 mt-0.5" />
                      <span>{check}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="sidebar-empty-state">
              <Cpu size={32} className="text-slate-500 mb-2" />
              <p>Type an instruction in the top task input bar and click "Execute Task" to synthesize and inspect the backend perception requirements and plan.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Action Planner & Local Action Guard */}
      {activeTab === 'action' && (
        <div className="sidebar-tab-body sidebar-details-panel">
          {backendTaskRecord?.proposedAction && backendTaskRecord?.guardEvaluation ? (
            <div className="detail-view-container">
              {/* Header Banner */}
              <div className="detail-header-card">
                <div className="flex items-center justify-between">
                  <div className="detail-tag-title">
                    <Zap size={16} className="text-amber-400" />
                    <span className="text-xs font-mono text-amber-300">
                      Action ID: {backendTaskRecord.proposedAction.actionId}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-bold font-mono ${
                      backendTaskRecord.guardEvaluation.guardStatus === 'APPROVED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : backendTaskRecord.guardEvaluation.guardStatus === 'BLOCKED'
                        ? 'bg-rose-950 text-rose-300 border border-rose-700'
                        : 'bg-amber-950 text-amber-300 border border-amber-700'
                    }`}
                  >
                    GUARD: {backendTaskRecord.guardEvaluation.guardStatus}
                  </span>
                </div>
              </div>

              {/* Action Approval Live Feedback Alert */}
              {actionApprovalFeedback && (
                <div
                  className={`p-2 rounded text-xs ${
                    actionApprovalFeedback.includes('APPROVED')
                      ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-600'
                      : 'bg-rose-950/80 text-rose-200 border border-rose-600'
                  }`}
                >
                  {actionApprovalFeedback}
                </div>
              )}

              {/* 1. Action Planner Proposal */}
              <div className="detail-section">
                <h4 className="detail-section-title">1. Action Planner Proposal</h4>
                <div className="detail-property-table">
                  <div className="prop-item">
                    <span className="prop-name">Action Primitive:</span>
                    <span className="prop-content font-mono font-bold text-indigo-300">
                      {backendTaskRecord.proposedAction.actionType}
                    </span>
                  </div>
                  <div className="prop-item">
                    <span className="prop-name">Target Selector:</span>
                    <span className="prop-content font-mono text-sky-300 text-xs">
                      {backendTaskRecord.proposedAction.targetSelector}
                    </span>
                  </div>
                  {backendTaskRecord.proposedAction.valuePayload && (
                    <div className="prop-item">
                      <span className="prop-name">Value Payload:</span>
                      <span className="prop-content font-mono text-emerald-400 text-xs">
                        "{backendTaskRecord.proposedAction.valuePayload}"
                      </span>
                    </div>
                  )}
                  <div className="prop-item">
                    <span className="prop-name">Confidence:</span>
                    <span className="prop-content font-mono">
                      {backendTaskRecord.proposedAction.confidenceScore}%
                    </span>
                  </div>
                  <div className="prop-item">
                    <span className="prop-name">Estimated Risk:</span>
                    <span
                      className={`prop-content font-bold ${
                        backendTaskRecord.proposedAction.estimatedRisk === 'LOW'
                          ? 'text-emerald-400'
                          : backendTaskRecord.proposedAction.estimatedRisk === 'MEDIUM'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {backendTaskRecord.proposedAction.estimatedRisk}
                    </span>
                  </div>
                </div>
                <div className="mt-2 p-2 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300 italic">
                  Rationale: {backendTaskRecord.proposedAction.rationale}
                </div>
              </div>

              {/* 2. Local Action Guard Evaluation */}
              <div className="detail-section">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="detail-section-title mb-0">2. Local Action Guard Policies</h4>
                  <span className="text-xs text-slate-400 font-mono">
                    Safety Score: {backendTaskRecord.guardEvaluation.safetyConfidence}%
                  </span>
                </div>

                {backendTaskRecord.guardEvaluation.blockReason && (
                  <div className="sensitive-alert-box mb-2">
                    <AlertOctagon size={16} className="text-rose-400 shrink-0" />
                    <div>
                      <strong>Violation Detected:</strong>
                      <p>{backendTaskRecord.guardEvaluation.blockReason}</p>
                    </div>
                  </div>
                )}

                {/* Evaluated policies list */}
                <div className="space-y-1.5">
                  {backendTaskRecord.guardEvaluation.evaluatedPolicies.map((policy) => (
                    <div
                      key={policy.ruleId}
                      className={`p-2 rounded border text-xs ${
                        policy.passed
                          ? 'bg-slate-900/60 border-emerald-800/40 text-slate-200'
                          : 'bg-rose-950/40 border-rose-800 text-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-semibold">
                          {policy.passed ? (
                            <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                          ) : (
                            <AlertOctagon size={13} className="text-rose-400 shrink-0" />
                          )}
                          <span>{policy.name}</span>
                        </div>
                        <span
                          className={`font-mono text-xs px-1.5 py-0.2 rounded ${
                            policy.passed
                              ? 'bg-emerald-950 text-emerald-300'
                              : 'bg-rose-900 text-rose-200'
                          }`}
                        >
                          {policy.passed ? 'PASSED' : 'VIOLATION'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">{policy.description}</div>
                      {policy.violationMessage && (
                        <div className="text-xs text-rose-300 mt-1 font-semibold">
                          ↳ Reason: {policy.violationMessage}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Action Submission & Execution Button */}
              <div className="detail-section">
                <button
                  type="button"
                  className={`w-full py-2.5 px-4 rounded text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                    backendTaskRecord.guardEvaluation.guardStatus === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                      : backendTaskRecord.guardEvaluation.guardStatus === 'REQUIRES_USER_CONFIRMATION'
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-rose-800 hover:bg-rose-700 text-white'
                  }`}
                  onClick={handleApproveAction}
                >
                  <Play size={14} />
                  <span>
                    {backendTaskRecord.guardEvaluation.guardStatus === 'APPROVED'
                      ? 'Approve & Dispatch Action to Browser'
                      : backendTaskRecord.guardEvaluation.guardStatus === 'REQUIRES_USER_CONFIRMATION'
                      ? 'Confirm & Override Destructive Action'
                      : 'Submit Blocked Action to Test Guard Interception'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="sidebar-empty-state">
              <Zap size={32} className="text-slate-500 mb-2" />
              <p>
                Execute a task using the command bar to inspect the Action Planner proposal and Local
                Action Guard validation.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Agent JSON Representation */}
      {activeTab === 'json' && (
        <div className="sidebar-tab-body sidebar-json-panel">
          <div className="json-panel-header">
            <div className="json-panel-info">
              <Sparkles size={14} className="text-amber-400 mr-1" />
              <span>Accessibility snapshot consumed by AI Web Agents</span>
            </div>
            <button
              type="button"
              className="copy-json-btn"
              onClick={handleCopyJson}
              aria-label="Copy JSON representation"
            >
              {copiedJson ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copiedJson ? 'Copied!' : 'Copy JSON'}</span>
            </button>
          </div>

          <pre className="json-code-block font-mono">
            {JSON.stringify(
              elements.map((e) => ({
                tag: e.tagName,
                id: e.domId,
                name: e.name,
                role: e.role,
                accessibleName: e.accessibleName,
                isSensitive: e.isSensitive,
                category: e.sensitiveCategory,
                selector: e.cssSelector,
                required: e.isRequired,
                geometry: { width: e.rect.width, height: e.rect.height },
              })),
              null,
              2
            )}
          </pre>
        </div>
      )}
    </aside>
  );
};
