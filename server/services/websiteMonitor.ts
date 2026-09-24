import { parse } from 'node-html-parser';
import { applyAttentionFirewall, RawElementCandidate } from './attentionFirewall.js';
import { parseHtmlToCandidates } from './universalScraper.js';

export interface WebsiteAlert {
  id: string;
  level: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  description: string;
  timestamp: string;
}

export interface WebsiteMonitorSnapshot {
  id: string;
  url: string;
  timestamp: string;
  httpStatus: number;
  latencyMs: number;
  contentSizeBytes: number;
  pageTitle: string;
  domHealth: {
    totalElements: number;
    interactiveElementsCount: number;
    inputsCount: number;
    buttonsCount: number;
    formsCount: number;
    linksCount: number;
    scriptsCount: number;
    imagesCount: number;
    mutationDelta: number;
  };
  privacyAudit: {
    sensitiveFieldsCount: number;
    sensitiveCategories: string[];
    unmaskedPasswordInputs: number;
    unencryptedForms: number;
    redactedFields: number;
  };
  securityRisk: 'SECURE' | 'LOW' | 'MEDIUM' | 'CRITICAL';
  securityScore: number; // 0-100
  domFingerprint: string;
  alerts: WebsiteAlert[];
}

export interface WebsiteMonitorSummary {
  url: string;
  active: boolean;
  totalScans: number;
  lastScanned: string;
  avgLatencyMs: number;
  uptimePercent: number;
  currentSecurityScore: number;
  totalAlertsTriggered: number;
  latestSnapshot: WebsiteMonitorSnapshot | null;
}

// In-memory monitor history store: URL -> Array of snapshots
const monitorHistoryMap = new Map<string, WebsiteMonitorSnapshot[]>();

/**
 * Computes a quick structural fingerprint of the DOM for mutation tracking
 */
function computeDomFingerprint(root: any): string {
  const elementsCount = root.querySelectorAll('*').length;
  const formsCount = root.querySelectorAll('form').length;
  const inputsCount = root.querySelectorAll('input').length;
  const buttonsCount = root.querySelectorAll('button').length;
  const linksCount = root.querySelectorAll('a').length;
  return `el:${elementsCount}|f:${formsCount}|in:${inputsCount}|btn:${buttonsCount}|a:${linksCount}`;
}

/**
 * Scans any live website and returns a comprehensive real-time audit snapshot
 */
export async function scanWebsiteLive(rawUrl: string): Promise<WebsiteMonitorSnapshot> {
  let targetUrl = rawUrl.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  const startTime = Date.now();
  let httpStatus = 0;
  let contentSizeBytes = 0;
  let html = '';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 AgenticPrivacyMonitor/2.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    clearTimeout(timeoutId);
    httpStatus = res.status;
    html = await res.text();
    contentSizeBytes = Buffer.byteLength(html, 'utf8');
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const errorSnapshot: WebsiteMonitorSnapshot = {
      id: `mon-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      httpStatus: 504,
      latencyMs,
      contentSizeBytes: 0,
      pageTitle: 'Connection Error',
      domHealth: {
        totalElements: 0,
        interactiveElementsCount: 0,
        inputsCount: 0,
        buttonsCount: 0,
        formsCount: 0,
        linksCount: 0,
        scriptsCount: 0,
        imagesCount: 0,
        mutationDelta: 0,
      },
      privacyAudit: {
        sensitiveFieldsCount: 0,
        sensitiveCategories: [],
        unmaskedPasswordInputs: 0,
        unencryptedForms: 0,
        redactedFields: 0,
      },
      securityRisk: 'CRITICAL',
      securityScore: 10,
      domFingerprint: 'offline',
      alerts: [
        {
          id: `alt-${Date.now()}-1`,
          level: 'critical',
          title: 'Target Unreachable / Network Timeout',
          description: `Failed to fetch target website ${targetUrl}: ${err.message || 'Host offline or blocking requests'}`,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    saveSnapshot(targetUrl, errorSnapshot);
    return errorSnapshot;
  }

  const latencyMs = Date.now() - startTime;
  const root = parse(html);

  // Extract metadata
  const titleNode = root.querySelector('title');
  const pageTitle = titleNode ? titleNode.text.trim() : new URL(targetUrl).hostname;

  // DOM node counts
  const allElements = root.querySelectorAll('*');
  const forms = root.querySelectorAll('form');
  const inputs = root.querySelectorAll('input');
  const buttons = root.querySelectorAll('button');
  const links = root.querySelectorAll('a');
  const scripts = root.querySelectorAll('script');
  const images = root.querySelectorAll('img');

  // Extract interactive candidate elements for Attention Firewall analysis
  const parsedCandidates = parseHtmlToCandidates(html, targetUrl);
  const candidates: RawElementCandidate[] = parsedCandidates.elements;

  // Apply Attention Firewall privacy scan
  const firewallResult = applyAttentionFirewall(candidates, {
    maskSensitiveValues: true,
    redactCategories: [
      'Password',
      'Government ID / SSN',
      'Financial Data',
      'Personal Information',
      'Contact Information',
    ],
    prohibitedAttributes: ['data-ssn', 'data-credit-card', 'data-auth-token'],
    privacyReason: 'Live Continuous Security & Privacy Website Monitoring',
  });

  // Calculate unencrypted forms (submitting over HTTP instead of HTTPS)
  let unencryptedFormsCount = 0;
  forms.forEach((form) => {
    const action = form.getAttribute('action') || '';
    if (action.startsWith('http://') && !targetUrl.startsWith('http://localhost')) {
      unencryptedFormsCount++;
    }
  });

  // Check unmasked passwords in DOM markup
  let unmaskedPasswords = 0;
  inputs.forEach((input) => {
    const type = (input.getAttribute('type') || '').toLowerCase();
    const val = input.getAttribute('value') || '';
    if (type === 'password' && val && val !== '••••••••' && !val.includes('REDACTED')) {
      unmaskedPasswords++;
    }
  });

  const sensitiveCategoriesFound = Array.from(
    new Set(
      candidates
        .filter((c) => c.isSensitive && c.sensitiveCategory)
        .map((c) => c.sensitiveCategory as string)
    )
  );

  // Compute Security Score (0 to 100)
  let score = 100;
  if (!targetUrl.startsWith('https://') && !targetUrl.startsWith('http://localhost')) {
    score -= 25; // Insecure transport
  }
  if (unencryptedFormsCount > 0) {
    score -= 20; // Insecure form actions
  }
  if (unmaskedPasswords > 0) {
    score -= 30; // Plaintext credentials in DOM
  }
  if (latencyMs > 1500) {
    score -= 10; // High latency
  }
  if (httpStatus >= 400) {
    score -= 35; // Server error
  }
  score = Math.max(10, Math.min(100, score));

  let securityRisk: 'SECURE' | 'LOW' | 'MEDIUM' | 'CRITICAL' = 'SECURE';
  if (score < 50) securityRisk = 'CRITICAL';
  else if (score < 75) securityRisk = 'MEDIUM';
  else if (score < 90) securityRisk = 'LOW';

  // Compute Mutation Delta against previous snapshot
  const prevSnapshots = monitorHistoryMap.get(targetUrl) || [];
  const lastSnapshot = prevSnapshots.length > 0 ? prevSnapshots[0] : null;
  const currentTotalElements = allElements.length;
  const mutationDelta = lastSnapshot ? currentTotalElements - lastSnapshot.domHealth.totalElements : 0;
  const domFingerprint = computeDomFingerprint(root);

  // Formulate Granular Alerts
  const alerts: WebsiteAlert[] = [];
  const nowIso = new Date().toISOString();

  if (httpStatus === 200) {
    alerts.push({
      id: `alt-${Date.now()}-ok`,
      level: 'success',
      title: 'Target Online & Operational',
      description: `Server responded with HTTP 200 OK (${latencyMs}ms latency, ${(contentSizeBytes / 1024).toFixed(1)} KB payload).`,
      timestamp: nowIso,
    });
  } else {
    alerts.push({
      id: `alt-${Date.now()}-status`,
      level: httpStatus >= 500 ? 'critical' : 'warning',
      title: `HTTP Status ${httpStatus}`,
      description: `Target returned non-standard status ${httpStatus}.`,
      timestamp: nowIso,
    });
  }

  if (mutationDelta !== 0) {
    alerts.push({
      id: `alt-${Date.now()}-drift`,
      level: 'info',
      title: 'Real-Time DOM Mutation Detected',
      description: `DOM element count changed by ${mutationDelta > 0 ? '+' : ''}${mutationDelta} nodes since last scan.`,
      timestamp: nowIso,
    });
  }

  if (firewallResult.sensitiveElementsRedacted > 0) {
    alerts.push({
      id: `alt-${Date.now()}-fw`,
      level: 'warning',
      title: 'Attention Firewall Shield Engaged',
      description: `Detected and masked ${firewallResult.sensitiveElementsRedacted} sensitive candidate elements (${sensitiveCategoriesFound.join(', ') || 'PII'}).`,
      timestamp: nowIso,
    });
  }

  if (unmaskedPasswords > 0) {
    alerts.push({
      id: `alt-${Date.now()}-pwd`,
      level: 'critical',
      title: 'Critical Privacy Alert: Exposed Credentials',
      description: `${unmaskedPasswords} password field(s) have unmasked hardcoded values in HTML markup.`,
      timestamp: nowIso,
    });
  }

  if (unencryptedFormsCount > 0) {
    alerts.push({
      id: `alt-${Date.now()}-form`,
      level: 'warning',
      title: 'Insecure Form Transmission',
      description: `${unencryptedFormsCount} form(s) submit via unencrypted HTTP actions.`,
      timestamp: nowIso,
    });
  }

  const snapshot: WebsiteMonitorSnapshot = {
    id: `mon-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
    url: targetUrl,
    timestamp: nowIso,
    httpStatus,
    latencyMs,
    contentSizeBytes,
    pageTitle,
    domHealth: {
      totalElements: allElements.length,
      interactiveElementsCount: candidates.length,
      inputsCount: inputs.length,
      buttonsCount: buttons.length,
      formsCount: forms.length,
      linksCount: links.length,
      scriptsCount: scripts.length,
      imagesCount: images.length,
      mutationDelta,
    },
    privacyAudit: {
      sensitiveFieldsCount: candidates.filter((c) => c.isSensitive).length,
      sensitiveCategories: sensitiveCategoriesFound,
      unmaskedPasswordInputs: unmaskedPasswords,
      unencryptedForms: unencryptedFormsCount,
      redactedFields: firewallResult.sensitiveElementsRedacted,
    },
    securityRisk,
    securityScore: score,
    domFingerprint,
    alerts,
  };

  saveSnapshot(targetUrl, snapshot);
  return snapshot;
}

/**
 * Saves a snapshot to the in-memory history map (capped at 50 per URL)
 */
function saveSnapshot(url: string, snapshot: WebsiteMonitorSnapshot) {
  const existing = monitorHistoryMap.get(url) || [];
  existing.unshift(snapshot);
  if (existing.length > 50) {
    existing.length = 50;
  }
  monitorHistoryMap.set(url, existing);
}

/**
 * Retrieves monitor history for a given website URL
 */
export function getWebsiteMonitorHistory(rawUrl: string): WebsiteMonitorSnapshot[] {
  let targetUrl = rawUrl.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }
  return monitorHistoryMap.get(targetUrl) || [];
}

/**
 * Retrieves a summary overview across all monitored websites
 */
export function getMonitoredWebsitesSummary(): WebsiteMonitorSummary[] {
  const summaries: WebsiteMonitorSummary[] = [];

  monitorHistoryMap.forEach((snapshots, url) => {
    if (snapshots.length === 0) return;
    const latest = snapshots[0];
    const total = snapshots.length;
    const successful = snapshots.filter((s) => s.httpStatus >= 200 && s.httpStatus < 400).length;
    const avgLatency = Math.round(
      snapshots.reduce((acc, s) => acc + s.latencyMs, 0) / total
    );
    const totalAlerts = snapshots.reduce((acc, s) => acc + s.alerts.length, 0);

    summaries.push({
      url,
      active: true,
      totalScans: total,
      lastScanned: latest.timestamp,
      avgLatencyMs: avgLatency,
      uptimePercent: Math.round((successful / total) * 100),
      currentSecurityScore: latest.securityScore,
      totalAlertsTriggered: totalAlerts,
      latestSnapshot: latest,
    });
  });

  return summaries;
}

/**
 * Clears monitoring history
 */
export function clearWebsiteMonitorHistory(rawUrl?: string): void {
  if (rawUrl) {
    let targetUrl = rawUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    monitorHistoryMap.delete(targetUrl);
  } else {
    monitorHistoryMap.clear();
  }
}
