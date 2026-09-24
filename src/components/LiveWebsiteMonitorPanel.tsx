import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity,
  Play,
  Pause,
  RotateCw,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Globe,
  Clock,
  Layers,
  ArrowRight,
  Server,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import type { WebsiteMonitorSnapshot, WebsiteAlert } from '../types/dom';

interface LiveWebsiteMonitorPanelProps {
  currentUrl: string;
  onNavigateToUrl?: (url: string) => void;
}

export const LiveWebsiteMonitorPanel: React.FC<LiveWebsiteMonitorPanelProps> = ({
  currentUrl,
  onNavigateToUrl,
}) => {
  const [targetUrl, setTargetUrl] = useState<string>(
    currentUrl || 'https://en.wikipedia.org/wiki/Main_Page'
  );
  const [isMonitoringActive, setIsMonitoringActive] = useState<boolean>(true);
  const [pollIntervalSec, setPollIntervalSec] = useState<number>(5);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [latestSnapshot, setLatestSnapshot] = useState<WebsiteMonitorSnapshot | null>(null);
  const [history, setHistory] = useState<WebsiteMonitorSnapshot[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);

  const timerRef = useRef<any>(null);

  // Sync if currentUrl changes externally
  useEffect(() => {
    if (currentUrl && currentUrl !== targetUrl && !currentUrl.includes('sandbox://')) {
      setTargetUrl(currentUrl);
    }
  }, [currentUrl]);

  /**
   * Executes a single live scan on the target website
   */
  const performScan = useCallback(async (urlToScan?: string) => {
    const url = (urlToScan || targetUrl).trim();
    if (!url || url.includes('sandbox://')) return;

    setIsScanning(true);
    setErrorMsg(null);

    try {
      const response = await fetch('http://localhost:3001/api/monitor/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`Monitor scan failed with status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        const snap = result.data as WebsiteMonitorSnapshot;
        setLatestSnapshot(snap);
        setHistory((prev) => [snap, ...prev.slice(0, 49)]);
        setLastScanTime(new Date().toLocaleTimeString());
      } else {
        throw new Error(result.error || 'Unknown scan error');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to scan target website');
    } finally {
      setIsScanning(false);
    }
  }, [targetUrl]);

  // Initial scan on mount or URL change
  useEffect(() => {
    performScan(targetUrl);
  }, [targetUrl, performScan]);

  // Continuous live monitoring polling timer
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (isMonitoringActive) {
      timerRef.current = setInterval(() => {
        performScan();
      }, pollIntervalSec * 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isMonitoringActive, pollIntervalSec, performScan]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetUrl) {
      performScan(targetUrl);
      onNavigateToUrl?.(targetUrl);
    }
  };

  const handleSelectPreset = (presetUrl: string) => {
    setTargetUrl(presetUrl);
    performScan(presetUrl);
    onNavigateToUrl?.(presetUrl);
  };

  const handleClearHistory = async () => {
    try {
      await fetch(`http://localhost:3001/api/monitor/history?url=${encodeURIComponent(targetUrl)}`, {
        method: 'DELETE',
      });
      setHistory(latestSnapshot ? [latestSnapshot] : []);
    } catch {
      setHistory([]);
    }
  };

  // Aggregated metrics from session history
  const totalScans = history.length;
  const avgLatency =
    totalScans > 0
      ? Math.round(history.reduce((acc, h) => acc + h.latencyMs, 0) / totalScans)
      : latestSnapshot?.latencyMs || 0;
  const successfulScans = history.filter((h) => h.httpStatus >= 200 && h.httpStatus < 400).length;
  const uptimeRate = totalScans > 0 ? Math.round((successfulScans / totalScans) * 100) : 100;
  const totalAlertsCount = history.reduce((acc, h) => acc + h.alerts.length, 0);

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'SECURE':
        return <span className="monitor-badge badge-success">SECURE (Grade A)</span>;
      case 'LOW':
        return <span className="monitor-badge badge-info">LOW RISK (Grade B)</span>;
      case 'MEDIUM':
        return <span className="monitor-badge badge-warning">MODERATE RISK (Grade C)</span>;
      case 'CRITICAL':
      default:
        return <span className="monitor-badge badge-critical">CRITICAL RISK</span>;
    }
  };

  return (
    <div className="monitor-panel-root">
      {/* Top Banner & Control HUD */}
      <div className="monitor-top-banner">
        <div className="monitor-header-row">
          <div className="monitor-brand-section">
            <div className="monitor-icon-badge">
              <Activity size={22} />
            </div>
            <div className="monitor-title-text">
              <div className="monitor-main-title">
                <span>Universal Live Website Monitor</span>
                <div className={`monitor-status-pill ${!isMonitoringActive ? 'paused' : ''}`}>
                  <span className="monitor-status-dot" />
                  <span>{isMonitoringActive ? `LIVE (${pollIntervalSec}s poll)` : 'PAUSED'}</span>
                </div>
              </div>
              <p className="monitor-subtitle">
                Continuous real-time DOM integrity verification, Attention Firewall privacy auditing, and latency telemetry.
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="monitor-toolbar">
            <div className="monitor-interval-group">
              <span className="monitor-interval-label">Interval:</span>
              {[3, 5, 10, 30].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setPollIntervalSec(sec)}
                  className={`monitor-interval-btn ${pollIntervalSec === sec ? 'active' : ''}`}
                >
                  {sec}s
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsMonitoringActive(!isMonitoringActive)}
              className={`monitor-action-btn ${isMonitoringActive ? 'monitor-btn-pause' : 'monitor-btn-resume'}`}
            >
              {isMonitoringActive ? (
                <>
                  <Pause size={13} />
                  <span>Pause Monitor</span>
                </>
              ) : (
                <>
                  <Play size={13} />
                  <span>Resume Live Monitor</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => performScan()}
              disabled={isScanning}
              className="monitor-action-btn monitor-btn-scan"
              title="Trigger an immediate scan"
            >
              <RotateCw size={13} className={isScanning ? 'animate-spin' : ''} />
              <span>Scan Now</span>
            </button>
          </div>
        </div>

        {/* Target URL Input Bar */}
        <form onSubmit={handleUrlSubmit} className="monitor-url-form">
          <div className="monitor-url-input-wrap">
            <Globe size={15} className="text-slate-400" />
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="Enter any website URL to monitor (e.g., https://example.com, https://en.wikipedia.org)..."
              className="monitor-url-input"
            />
            {latestSnapshot && (
              <a
                href={latestSnapshot.url}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-indigo-600"
                title="Open live site in new tab"
              >
                <ExternalLink size={13} />
              </a>
            )}
          </div>
          <button type="submit" className="monitor-submit-btn">
            <span>Monitor Website</span>
            <ArrowRight size={13} />
          </button>
        </form>

        {/* Quick Website Presets */}
        <div className="monitor-presets-row">
          <span className="monitor-preset-tag">Quick Sites:</span>
          {[
            { label: '🌐 Example Domain', url: 'https://example.com' },
            { label: '📖 Wikipedia Main', url: 'https://en.wikipedia.org/wiki/Main_Page' },
            { label: '📰 Hacker News', url: 'https://news.ycombinator.com' },
            { label: '🛰️ SpaceOps Gov', url: 'https://portal.space-ops.gov.in/personnel/secure-registration' },
          ].map((preset) => (
            <button
              key={preset.url}
              type="button"
              onClick={() => handleSelectPreset(preset.url)}
              className={`monitor-preset-chip ${targetUrl === preset.url ? 'active' : ''}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => performScan()}
            className="monitor-action-btn monitor-btn-scan text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Status Grid */}
      <div className="monitor-kpi-grid">
        {/* Card 1: Server Availability & Latency */}
        <div className="monitor-kpi-card">
          <div className="monitor-kpi-card-header">
            <span>Health & Latency</span>
            <Server size={15} className="text-indigo-600" />
          </div>
          <div className="monitor-kpi-val-row">
            <span className="monitor-kpi-number">
              {latestSnapshot?.latencyMs ?? 0}
              <span className="monitor-kpi-unit">ms</span>
            </span>
            <span className="monitor-badge badge-success">
              HTTP {latestSnapshot?.httpStatus || 200}
            </span>
          </div>
          <div className="monitor-kpi-footer">
            <span>Avg Latency: <strong>{avgLatency}ms</strong></span>
            <span>Uptime: <strong className="text-emerald-600">{uptimeRate}%</strong></span>
          </div>
        </div>

        {/* Card 2: DOM Health & Mutations */}
        <div className="monitor-kpi-card">
          <div className="monitor-kpi-card-header">
            <span>DOM Integrity</span>
            <Layers size={15} className="text-blue-600" />
          </div>
          <div className="monitor-kpi-val-row">
            <span className="monitor-kpi-number">
              {latestSnapshot?.domHealth?.totalElements ?? 0}
              <span className="monitor-kpi-unit">Nodes</span>
            </span>
            {latestSnapshot?.domHealth?.mutationDelta !== 0 && (
              <span className="monitor-badge badge-info">
                {latestSnapshot?.domHealth?.mutationDelta! > 0 ? '+' : ''}
                {latestSnapshot?.domHealth?.mutationDelta} delta
              </span>
            )}
          </div>
          <div className="monitor-kpi-footer">
            <span>Interactive: <strong>{latestSnapshot?.domHealth?.interactiveElementsCount || 0}</strong></span>
            <span>Forms: <strong>{latestSnapshot?.domHealth?.formsCount || 0}</strong></span>
          </div>
        </div>

        {/* Card 3: Attention Firewall Privacy Shield */}
        <div className="monitor-kpi-card">
          <div className="monitor-kpi-card-header">
            <span>Firewall Privacy Shield</span>
            <ShieldCheck size={15} className="text-emerald-600" />
          </div>
          <div className="monitor-kpi-val-row">
            <span className="monitor-kpi-number">
              {latestSnapshot?.privacyAudit?.redactedFields ?? 0}
              <span className="monitor-kpi-unit">Redacted</span>
            </span>
          </div>
          <div className="monitor-kpi-footer">
            <span>Sensitive: <strong>{latestSnapshot?.privacyAudit?.sensitiveFieldsCount || 0}</strong></span>
            <span>Unmasked: <strong className={(latestSnapshot?.privacyAudit?.unmaskedPasswordInputs || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}>{latestSnapshot?.privacyAudit?.unmaskedPasswordInputs || 0}</strong></span>
          </div>
        </div>

        {/* Card 4: Security Score & Action Guard Status */}
        <div className="monitor-kpi-card">
          <div className="monitor-kpi-card-header">
            <span>Security Score</span>
            <Shield size={15} className="text-purple-600" />
          </div>
          <div className="monitor-kpi-val-row">
            <span className="monitor-kpi-number">
              {latestSnapshot?.securityScore ?? 100}
              <span className="monitor-kpi-unit">/100</span>
            </span>
            {latestSnapshot && getRiskBadge(latestSnapshot.securityRisk)}
          </div>
          <div className="monitor-kpi-footer">
            <span>Alerts: <strong className={totalAlertsCount > 0 ? 'text-amber-600' : ''}>{totalAlertsCount}</strong></span>
            <span>Last: <strong>{lastScanTime || 'Now'}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Alert Feed & Historical Telemetry Timeline */}
      <div className="monitor-main-grid">
        {/* Left Column: Live Event & Alert Stream */}
        <div className="monitor-card">
          <div className="monitor-card-header">
            <div className="monitor-card-title">
              <Activity size={16} className="text-indigo-600" />
              <span>Live Monitor Event Stream & Alerts</span>
              <span className="monitor-badge badge-info">
                {latestSnapshot?.alerts?.length || 0} Alerts
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Target: {latestSnapshot?.pageTitle || targetUrl}
            </span>
          </div>

          <div className="monitor-feed-list">
            {latestSnapshot?.alerts && latestSnapshot.alerts.length > 0 ? (
              latestSnapshot.alerts.map((alert: WebsiteAlert) => (
                <div
                  key={alert.id}
                  className={`monitor-feed-item ${
                    alert.level === 'critical'
                      ? 'feed-critical'
                      : alert.level === 'warning'
                      ? 'feed-warning'
                      : alert.level === 'success'
                      ? 'feed-success'
                      : ''
                  }`}
                >
                  <div className="mt-0.5">
                    {alert.level === 'critical' && <AlertTriangle size={15} className="text-rose-600" />}
                    {alert.level === 'warning' && <AlertTriangle size={15} className="text-amber-600" />}
                    {alert.level === 'success' && <ShieldCheck size={15} className="text-emerald-600" />}
                    {alert.level === 'info' && <Activity size={15} className="text-indigo-600" />}
                  </div>
                  <div className="monitor-feed-content">
                    <div className="monitor-feed-header">
                      <span className="monitor-feed-title">{alert.title}</span>
                      <span className="monitor-feed-time">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p>{alert.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No active security or privacy alerts for this website. System operating in optimal state.
              </div>
            )}
          </div>

          {/* Privacy & Guard Audit Breakdown Table */}
          <div className="monitor-checklist-section">
            <h4 className="monitor-checklist-title">
              Real-Time Security & Privacy Checklist
            </h4>
            <div className="monitor-checklist-grid">
              <div className="monitor-checklist-item">
                <span className="monitor-checklist-label">HTTPS Encryption</span>
                <span className={`monitor-checklist-value ${targetUrl.startsWith('https://') ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {targetUrl.startsWith('https://') ? '✓ TLS Active' : '✕ Insecure HTTP'}
                </span>
              </div>
              <div className="monitor-checklist-item">
                <span className="monitor-checklist-label">Form Actions</span>
                <span className={`monitor-checklist-value ${(latestSnapshot?.privacyAudit?.unencryptedForms || 0) === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {(latestSnapshot?.privacyAudit?.unencryptedForms || 0) === 0 ? '✓ All Secure' : `⚠️ ${latestSnapshot?.privacyAudit?.unencryptedForms} Insecure`}
                </span>
              </div>
              <div className="monitor-checklist-item">
                <span className="monitor-checklist-label">Password Exposure</span>
                <span className={`monitor-checklist-value ${(latestSnapshot?.privacyAudit?.unmaskedPasswordInputs || 0) === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {(latestSnapshot?.privacyAudit?.unmaskedPasswordInputs || 0) === 0 ? '✓ Shielded' : `⚠️ ${latestSnapshot?.privacyAudit?.unmaskedPasswordInputs} Exposed`}
                </span>
              </div>
              <div className="monitor-checklist-item">
                <span className="monitor-checklist-label">PII Attention Firewall</span>
                <span className="monitor-checklist-value text-indigo-600">
                  ✓ {latestSnapshot?.privacyAudit?.redactedFields || 0} Shielded
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Scan History & Telemetry Log */}
        <div className="monitor-card">
          <div className="monitor-card-header">
            <div className="monitor-card-title">
              <Clock size={16} className="text-indigo-600" />
              <span>Scan Checkpoints</span>
              <span className="monitor-badge badge-info">{history.length}</span>
            </div>
            <button
              type="button"
              onClick={handleClearHistory}
              className="text-slate-400 hover:text-rose-600 text-xs flex items-center gap-1 cursor-pointer bg-transparent border-none"
              title="Clear scan history"
            >
              <Trash2 size={12} />
              <span>Clear</span>
            </button>
          </div>

          <div className="monitor-history-list">
            {history.map((item, idx) => (
              <div key={item.id || idx} className="monitor-history-item">
                <div className="monitor-history-top">
                  <span>HTTP {item.httpStatus}</span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="monitor-history-metrics">
                  <span>Latency: <strong>{item.latencyMs}ms</strong></span>
                  <span>Nodes: <strong>{item.domHealth?.totalElements}</strong></span>
                  <span className="font-bold text-indigo-600">Score: {item.securityScore}</span>
                </div>
                {item.domHealth?.mutationDelta !== 0 && (
                  <div className="text-[10px] text-blue-600 font-medium">
                    ⚡ Mutation: {item.domHealth.mutationDelta > 0 ? '+' : ''}{item.domHealth.mutationDelta} elements
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
