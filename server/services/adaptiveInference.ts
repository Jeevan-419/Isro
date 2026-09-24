import type {
  InferenceMode,
  TierInferenceDetail,
  AdaptiveInferenceResult,
  PerceptionRequirements,
  SanitizedPerceptionElement,
} from '../types/perception.js';
import {
  applyAttentionFirewall,
  RawElementCandidate,
} from './attentionFirewall.js';

/**
 * ============================================================================
 * THREE-LEVEL ADAPTIVE INFERENCE ENGINE
 * ============================================================================
 * 
 * Simulates a cost-aware, multi-tier perception system that minimizes latency
 * and compute expenditure while ensuring high task resolution accuracy:
 * 
 * TIER 1: GLANCE MODE
 * - Scope: Global DOM overview + fast coarse layout OCR mock.
 * - Compute Cost: 1 Unit | Latency: ~30-50ms.
 * - Purpose: Rapidly handles unambiguous, direct locator tasks (e.g., specific ID or single button).
 * 
 * TIER 2: FOCUS MODE
 * - Scope: Localized subregion crop & high-resolution container inspection.
 * - Compute Cost: 3 Units | Latency: ~100-150ms.
 * - Trigger: Triggered when Glance encounters moderate uncertainty (multiple candidate fields,
 *   container ambiguity, or partial keyword matches).
 * 
 * TIER 3: DEEP LOOK MODE
 * - Scope: Multi-pass semantic verification, OCR text alignment, and layout geometry parsing.
 * - Compute Cost: 8 Units | Latency: ~250-350ms.
 * - Trigger: Triggered when Focus remains uncertain, for complex form verification or disambiguation.
 */

// Default mock candidate elements representing the mock browser state
const DEFAULT_PAGE_CANDIDATES: RawElementCandidate[] = [
  {
    domId: 'site-search-input',
    tagName: 'INPUT',
    type: 'search',
    role: 'searchbox',
    accessibleName: 'Search SpaceOps mission database',
    cssSelector: '#site-search-input',
    rect: { x: 500, y: 15, width: 240, height: 32 },
  },
  {
    domId: 'btn-header-search',
    tagName: 'BUTTON',
    role: 'button',
    accessibleName: 'Execute search',
    cssSelector: '#btn-header-search',
    rect: { x: 745, y: 15, width: 32, height: 32 },
  },
  {
    domId: 'input-full-name',
    tagName: 'INPUT',
    type: 'text',
    role: 'textbox',
    accessibleName: 'Full Legal Name',
    currentValue: 'Dr. Vikram Sarabhai',
    isRequired: true,
    cssSelector: '#input-full-name',
    rect: { x: 40, y: 180, width: 320, height: 38 },
  },
  {
    domId: 'input-email',
    tagName: 'INPUT',
    type: 'email',
    role: 'textbox',
    accessibleName: 'Official Email Address',
    currentValue: 'vikram.s@isro.gov.in',
    isRequired: true,
    cssSelector: '#input-email',
    rect: { x: 380, y: 180, width: 320, height: 38 },
  },
  {
    domId: 'input-password',
    tagName: 'INPUT',
    type: 'password',
    role: 'textbox',
    accessibleName: 'Master Access Password',
    currentValue: 'SuperSecretPass!2026',
    isSensitive: true,
    sensitiveCategory: 'Password',
    isRequired: true,
    cssSelector: '#input-password',
    rect: { x: 40, y: 280, width: 320, height: 38 },
    attributes: { 'data-raw-credential': 'secret_hash_token_abc123' },
  },
  {
    domId: 'input-ssn',
    tagName: 'INPUT',
    type: 'text',
    role: 'textbox',
    accessibleName: 'National ID / SSN Number',
    currentValue: '987-65-4321',
    isSensitive: true,
    sensitiveCategory: 'Government ID / SSN',
    cssSelector: '#input-ssn',
    rect: { x: 380, y: 280, width: 320, height: 38 },
  },
  {
    domId: 'input-salary',
    tagName: 'INPUT',
    type: 'number',
    role: 'spinbutton',
    accessibleName: 'Annual Compensation (INR)',
    currentValue: '125000',
    isSensitive: true,
    sensitiveCategory: 'Financial Data',
    cssSelector: '#input-salary',
    rect: { x: 40, y: 360, width: 320, height: 38 },
  },
  {
    domId: 'select-role',
    tagName: 'SELECT',
    role: 'combobox',
    accessibleName: 'Primary Operational Role',
    currentValue: 'payload-engineer',
    cssSelector: '#select-role',
    rect: { x: 40, y: 440, width: 660, height: 38 },
  },
  {
    domId: 'checkbox-terms',
    tagName: 'INPUT',
    type: 'checkbox',
    role: 'checkbox',
    accessibleName: 'National Space Security Protocols agreement',
    isRequired: true,
    cssSelector: '#checkbox-terms',
    rect: { x: 40, y: 510, width: 18, height: 18 },
  },
  {
    domId: 'submit-registration-btn',
    tagName: 'BUTTON',
    type: 'submit',
    role: 'button',
    accessibleName: 'Submit Application',
    textContent: 'Submit Application',
    cssSelector: '#submit-registration-btn',
    rect: { x: 40, y: 560, width: 160, height: 42 },
  },
  {
    domId: 'save-draft-btn',
    tagName: 'BUTTON',
    type: 'button',
    role: 'button',
    accessibleName: 'Save Draft',
    textContent: 'Save Draft',
    cssSelector: '#save-draft-btn',
    rect: { x: 210, y: 560, width: 120, height: 42 },
  },
  {
    domId: 'delete-account-btn',
    tagName: 'BUTTON',
    type: 'button',
    role: 'button',
    accessibleName: 'Delete Profile',
    textContent: 'Delete Profile',
    cssSelector: '#delete-account-btn',
    rect: { x: 580, y: 560, width: 120, height: 42 },
  },
  {
    domId: 'input-bill-account',
    tagName: 'INPUT',
    type: 'text',
    role: 'textbox',
    accessibleName: 'Electricity Consumer Account No',
    currentValue: 'ACCT-8921-EL-77',
    isSensitive: true,
    sensitiveCategory: 'Financial Data',
    cssSelector: '#input-bill-account',
    rect: { x: 40, y: 640, width: 320, height: 38 },
    attributes: { 'data-raw-credential': 'meter_hash_token_bescom_99' },
  },
  {
    domId: 'input-meter-number',
    tagName: 'INPUT',
    type: 'text',
    role: 'textbox',
    accessibleName: 'Meter Serial Number',
    currentValue: 'MTR-9941-X',
    isSensitive: true,
    sensitiveCategory: 'Personal Information',
    cssSelector: '#input-meter-number',
    rect: { x: 380, y: 640, width: 320, height: 38 },
  },
  {
    domId: 'input-bill-amount',
    tagName: 'INPUT',
    type: 'text',
    role: 'textbox',
    accessibleName: 'Current Electricity Bill Due Amount',
    currentValue: '₹4,850.00',
    isSensitive: true,
    sensitiveCategory: 'Financial Data',
    cssSelector: '#input-bill-amount',
    rect: { x: 40, y: 700, width: 320, height: 38 },
  },
  {
    domId: 'download-electricity-bill-btn',
    tagName: 'BUTTON',
    type: 'button',
    role: 'button',
    accessibleName: 'Download Electricity Bill (PDF)',
    textContent: 'Download Electricity Bill (PDF)',
    cssSelector: '#download-electricity-bill-btn',
    rect: { x: 380, y: 700, width: 260, height: 42 },
  },
];

/**
 * Calculates match score for a candidate element against task requirements
 */
function scoreCandidate(candidate: RawElementCandidate, reqs: PerceptionRequirements): number {
  let score = 0;
  const name = (candidate.accessibleName || '').toLowerCase();
  const text = (candidate.textContent || '').toLowerCase();
  const tag = (candidate.tagName || '').toLowerCase();
  const role = (candidate.role || '').toLowerCase();
  const domId = (candidate.domId || '').toLowerCase();

  // Role alignment
  if (reqs.targetElementRoles.includes(role) || reqs.targetElementRoles.includes(tag)) {
    score += 30;
  }

  // Keyword match
  for (const kw of reqs.targetKeywords) {
    if (name.includes(kw)) score += 25;
    if (text.includes(kw)) score += 20;
    if (domId.includes(kw)) score += 25;
  }

  // Intent specific boost
  if (reqs.intent === 'click' && (role === 'button' || tag === 'button')) {
    score += 20;
  }
  if (reqs.intent === 'fill' && (role === 'textbox' || tag === 'input')) {
    score += 20;
  }

  return score;
}

/**
 * Simulates Adaptive Multi-tier Perception Inference with Uncertainty Escalation.
 */
export function runAdaptiveInference(
  rawTask: string,
  requirements: PerceptionRequirements,
  customCandidates?: RawElementCandidate[]
): AdaptiveInferenceResult {
  const candidates = customCandidates && customCandidates.length > 0 ? customCandidates : DEFAULT_PAGE_CANDIDATES;
  const executionId = `exec-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
  const tierHistory: TierInferenceDetail[] = [];
  const escalationReasons: string[] = [];

  let currentMode: InferenceMode = 'glance';
  let totalLatencyMs = 0;
  let totalComputeCost = 0;

  // Filter candidates by allowed regions
  const scopedCandidates = candidates.filter((c) => {
    if (requirements.allowedRegions.scope === 'action-bar') {
      return (
        c.role === 'button' ||
        (c.domId &&
          (c.domId.includes('btn') ||
            c.domId.includes('bill') ||
            c.domId.includes('account') ||
            c.domId.includes('meter')))
      );
    }
    if (requirements.allowedRegions.scope === 'header') {
      return c.domId && (c.domId.includes('search') || c.domId.includes('header'));
    }
    return true;
  });

  // Rank candidate elements
  const scored = scopedCandidates.map((c) => ({
    candidate: c,
    score: scoreCandidate(c, requirements),
  })).sort((a, b) => b.score - a.score);

  const topScore = scored.length > 0 ? scored[0].score : 0;
  const runnerUpScore = scored.length > 1 ? scored[1].score : 0;
  const scoreGap = topScore - runnerUpScore;

  // --------------------------------------------------------------------------
  // TIER 1: GLANCE INFERENCE
  // --------------------------------------------------------------------------
  const glanceLatency = 42;
  const glanceCompute = 1;
  totalLatencyMs += glanceLatency;
  totalComputeCost += glanceCompute;

  // Compute Glance Uncertainty (high if score gap is narrow or topScore is modest)
  let glanceUncertainty = 0.2;
  if (topScore < 50) glanceUncertainty = 0.75;
  else if (scoreGap < 20) glanceUncertainty = 0.55;
  else if (scored.filter((s) => s.score > 40).length > 2) glanceUncertainty = 0.45;

  const glanceConfidence = Math.max(10, Math.min(100, Math.round(topScore * 0.9)));

  tierHistory.push({
    mode: 'glance',
    name: 'Glance Mode (Global DOM + Fast Layout Overview)',
    latencyMs: glanceLatency,
    computeCostUnits: glanceCompute,
    resolutionQuality: 'coarse_dom_overview',
    uncertaintyScore: glanceUncertainty,
    confidenceScore: glanceConfidence,
    candidateMatchesFound: scored.filter((s) => s.score > 20).length,
    findings: `Global scan identified ${scored.length} interactive elements. Top candidate '${
      scored[0]?.candidate.accessibleName || 'None'
    }' with uncertainty ${Math.round(glanceUncertainty * 100)}%.`,
  });

  // --------------------------------------------------------------------------
  // ESCALATION CHECK: GLANCE -> FOCUS
  // --------------------------------------------------------------------------
  if (glanceUncertainty > 0.35 || glanceConfidence < 75) {
    currentMode = 'focus';
    const reason = `Glance uncertainty (${Math.round(
      glanceUncertainty * 100
    )}%) exceeded threshold (35%). Ambiguous candidates detected in target scope.`;
    escalationReasons.push(reason);

    // TIER 2: FOCUS INFERENCE
    const focusLatency = 115;
    const focusCompute = 3;
    totalLatencyMs += focusLatency;
    totalComputeCost += focusCompute;

    let focusUncertainty = Math.max(0.08, glanceUncertainty - 0.3);
    const focusConfidence = Math.min(96, glanceConfidence + 22);

    tierHistory.push({
      mode: 'focus',
      name: 'Focus Mode (Cropped Subregion & Container Inspection)',
      latencyMs: focusLatency,
      computeCostUnits: focusCompute,
      resolutionQuality: 'cropped_subregion_high_res',
      uncertaintyScore: focusUncertainty,
      confidenceScore: focusConfidence,
      candidateMatchesFound: scored.filter((s) => s.score > 35).length,
      findings: `Localized container crop narrowed focus to ${requirements.allowedRegions.description}. Uncertainty reduced to ${Math.round(
        focusUncertainty * 100
      )}%.`,
    });

    // ------------------------------------------------------------------------
    // ESCALATION CHECK: FOCUS -> DEEP LOOK
    // ------------------------------------------------------------------------
    if (focusUncertainty > 0.20 || /sensitive|password|ssn|secret|financial/i.test(rawTask)) {
      currentMode = 'deep_look';
      const deepReason = `High-security or ambiguous intent requires Deep Look multi-pass semantic layout alignment.`;
      escalationReasons.push(deepReason);

      // TIER 3: DEEP LOOK INFERENCE
      const deepLatency = 280;
      const deepCompute = 8;
      totalLatencyMs += deepLatency;
      totalComputeCost += deepCompute;

      const deepUncertainty = 0.03;
      const deepConfidence = 99;

      tierHistory.push({
        mode: 'deep_look',
        name: 'Deep Look Mode (Multi-Pass Semantic & Geometry Alignment)',
        latencyMs: deepLatency,
        computeCostUnits: deepCompute,
        resolutionQuality: 'multi_pass_deep_scan',
        uncertaintyScore: deepUncertainty,
        confidenceScore: deepConfidence,
        candidateMatchesFound: 1,
        findings: `Multi-pass OCR alignment & accessibility graph verified target node '${
          scored[0]?.candidate.accessibleName || 'Element'
        }' with 99% accuracy.`,
      });
    }
  }

  // --------------------------------------------------------------------------
  // ATTENTION FIREWALL ENFORCEMENT ON PERCEPTION PAYLOAD
  // --------------------------------------------------------------------------
  const firewallResult = applyAttentionFirewall(scopedCandidates, requirements.forbiddenInfo);

  // Identify Best Target from Sanitized Pool
  const bestCandidate = scored[0]?.candidate;
  let matchedSanitized: SanitizedPerceptionElement | null = null;
  if (bestCandidate) {
    matchedSanitized = firewallResult.sanitizedElements.find(
      (e) => e.domId === bestCandidate.domId || e.id === bestCandidate.id
    ) || null;
  }

  const finalConfidence = tierHistory[tierHistory.length - 1].confidenceScore;

  return {
    executionId,
    timestamp: new Date().toISOString(),
    initialMode: 'glance',
    finalMode: currentMode,
    escalated: escalationReasons.length > 0,
    escalationReasons,
    tierExecutionHistory: tierHistory,
    totalLatencyMs,
    totalComputeCostUnits: totalComputeCost,
    firewallSummary: {
      totalElementsScanned: firewallResult.sanitizedElements.length,
      sensitiveElementsRedacted: firewallResult.redactedCount,
      prohibitedAttributesStripped: firewallResult.prohibitedAttributesStripped,
      auditLog: firewallResult.auditLog,
    },
    sanitizedPerceptionPayload: firewallResult.sanitizedElements,
    resolvedTarget: matchedSanitized
      ? {
          targetSelector: matchedSanitized.cssSelector,
          confidence: finalConfidence,
          matchedElement: matchedSanitized,
          recommendedAction: requirements.intent,
        }
      : null,
  };
}
