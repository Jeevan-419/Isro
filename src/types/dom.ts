/**
 * DOM and Accessibility Types for Web Extraction & Task Automation
 */

export interface ElementRect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  left: number;
}

export type SensitiveCategory =
  | 'Password'
  | 'Government ID / SSN'
  | 'Personal Information'
  | 'Financial Data'
  | 'Contact Information';

export interface ExtractedElement {
  /** Unique internal identifier for React keying and tracking */
  uid: string;
  /** HTML element tag name (e.g., 'BUTTON', 'INPUT', 'SELECT') */
  tagName: string;
  /** HTML DOM ID attribute if present */
  domId: string | null;
  /** HTML Name attribute if present */
  name: string | null;
  /** HTML Type attribute (for inputs and buttons) */
  type: string | null;
  /** Computed or explicit ARIA role (e.g., 'button', 'textbox', 'checkbox') */
  role: string;
  /** Computed accessible name derived from ARIA labels, <label> tags, placeholders, or text */
  accessibleName: string;
  /** Accessible description (e.g., from aria-describedby or title) */
  accessibleDescription: string | null;
  /** All relevant ARIA attributes on the element */
  ariaAttributes: Record<string, string>;
  /** Inner visible text or sanitized value */
  textContent: string;
  /** Current input value or placeholder value */
  currentValue: string;
  /** Placeholder attribute if present */
  placeholder: string | null;
  /** Whether this element contains or handles sensitive personal data */
  isSensitive: boolean;
  /** Category of sensitive data if flagged */
  sensitiveCategory: SensitiveCategory | null;
  /** Generated unique CSS selector for automation scripts */
  cssSelector: string;
  /** Generated XPath expression */
  xpath: string;
  /** Whether the element is currently visible in the DOM */
  isVisible: boolean;
  /** Whether the element is disabled */
  isDisabled: boolean;
  /** Whether the element is marked as required */
  isRequired: boolean;
  /** Bounding box coordinates relative to the mock container */
  rect: ElementRect;
  /** Short HTML markup representation */
  htmlSnippet: string;
}

export interface TaskMatchResult {
  matchedElement: ExtractedElement | null;
  confidenceScore: number;
  matchedReason: string;
  actionType: 'click' | 'fill' | 'inspect' | 'highlight' | 'scroll';
}

export type FilterCategory = 'all' | 'sensitive' | 'inputs' | 'buttons' | 'interactive';

export interface BackendPerceptionPlan {
  planId: string;
  strategy: string;
  confidenceScore: number;
  steps: Array<{
    stepIndex: number;
    action: string;
    description: string;
    parameters: Record<string, unknown>;
    expectedOutput: string;
  }>;
  safetyChecks: string[];
}

export interface BackendTaskRecord {
  id: string;
  rawTask: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  requirements: {
    intent: string;
    targetKeywords: string[];
    targetElementRoles: string[];
    requiredInfo: {
      textLabels: boolean;
      boundingCoordinates: boolean;
      accessibilityRole: boolean;
      cssSelectors: boolean;
      stateAttributes: boolean;
    };
    allowedRegions: {
      scope: string;
      description: string;
      allowedSelectorScopes: string[];
    };
    forbiddenInfo: {
      maskSensitiveValues: boolean;
      redactCategories: string[];
      prohibitedAttributes: string[];
      privacyReason: string;
    };
  };
  perceptionPlan: BackendPerceptionPlan;
  adaptiveInferenceResult?: {
    executionId: string;
    timestamp: string;
    initialMode: string;
    finalMode: string;
    escalated: boolean;
    escalationReasons: string[];
    tierExecutionHistory: Array<{
      mode: string;
      name: string;
      latencyMs: number;
      computeCostUnits: number;
      resolutionQuality: string;
      uncertaintyScore: number;
      confidenceScore: number;
      candidateMatchesFound: number;
      findings: string;
    }>;
    totalLatencyMs: number;
    totalComputeCostUnits: number;
    firewallSummary: {
      totalElementsScanned: number;
      sensitiveElementsRedacted: number;
      prohibitedAttributesStripped: number;
      auditLog: Array<{
        timestamp: string;
        elementId: string;
        tagName: string;
        attributeOrProperty: string;
        category: string;
        action: string;
        placeholderApplied?: string;
        ruleApplied: string;
      }>;
    };
    sanitizedPerceptionPayload: Array<{
      id: string;
      domId: string | null;
      tagName: string;
      role: string;
      accessibleName: string;
      displayValueOrText: string;
      placeholder: string | null;
      isSensitive: boolean;
      sensitiveCategory: string | null;
      semanticPlaceholder: string | null;
      cssSelector: string;
      rect: { x: number; y: number; width: number; height: number };
    }>;
    resolvedTarget: {
      targetSelector: string | null;
      confidence: number;
      recommendedAction: string;
    } | null;
  };
  proposedAction?: {
    actionId: string;
    actionType: string;
    targetSelector: string;
    targetElementId?: string | null;
    targetAccessibleName?: string;
    valuePayload?: string;
    confidenceScore: number;
    rationale: string;
    estimatedRisk: string;
  };
  guardEvaluation?: {
    actionId: string;
    guardStatus: 'APPROVED' | 'BLOCKED' | 'REQUIRES_USER_CONFIRMATION';
    isAllowed: boolean;
    blockReason?: string;
    safetyConfidence: number;
    evaluatedPolicies: Array<{
      ruleId: string;
      name: string;
      description: string;
      passed: boolean;
      violationMessage?: string;
    }>;
  };
}

export interface ExecutionHistoryItem {
  id: string;
  timestamp: string;
  taskQuery: string;
  intent: string;
  inferenceMode: string;
  pixelsProcessed: number;
  latencyMs: number;
  computeUnits: number;
  redactedFieldsCount: number;
  prohibitedAttributesStripped: number;
  proposedAction?: {
    actionType: string;
    targetSelector: string;
    estimatedRisk: string;
  };
  guardStatus: 'APPROVED' | 'BLOCKED' | 'REQUIRES_USER_CONFIRMATION';
  guardReason?: string;
}

export interface PerceptionDashboardMetrics {
  totalInferenceCalls: number;
  totalPixelsProcessed: number;
  avgLatencyMs: number;
  lastLatencyMs: number;
  totalRedactedFields: number;
  totalProhibitedAttributesStripped: number;
  currentInferenceMode: 'glance' | 'focus' | 'deep_look';
  modeDistribution: {
    glance: number;
    focus: number;
    deep_look: number;
  };
  guardDecisions: {
    approved: number;
    blocked: number;
    requiresConfirmation: number;
  };
}

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
  securityScore: number;
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



