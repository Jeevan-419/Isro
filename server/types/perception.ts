/**
 * ============================================================================
 * PERCEPTION REQUIREMENTS & TASK CONTEXT TYPES
 * ============================================================================
 * 
 * Defines the schemas for user tasks, perception contracts (what information
 * is required vs forbidden), and step-by-step perception plans.
 */

export type TaskIntent = 'click' | 'fill' | 'inspect' | 'extract' | 'navigate' | 'verify';

export type SensitiveCategory =
  | 'Password'
  | 'Government ID / SSN'
  | 'Personal Information'
  | 'Financial Data'
  | 'Contact Information';

export interface UserTaskInput {
  /** Natural language instruction submitted by the user */
  task: string;
  /** Optional contextual hints (e.g. current page, target domain) */
  context?: {
    currentUrl?: string;
    userRole?: string;
    strictPrivacyMode?: boolean;
    allowedScope?: string;
  };
}

export interface RequiredPerceptionInfo {
  /** Whether textual labels / accessible names must be parsed */
  textLabels: boolean;
  /** Whether bounding box geometry (x, y, width, height) is needed */
  boundingCoordinates: boolean;
  /** Whether ARIA role and semantic tree must be extracted */
  accessibilityRole: boolean;
  /** Whether CSS selectors / XPath automation locators are required */
  cssSelectors: boolean;
  /** Whether interactive states (disabled, required, checked) are needed */
  stateAttributes: boolean;
}

export interface AllowedRegions {
  /** Scope region type */
  scope: 'viewport' | 'main-form' | 'header' | 'action-bar' | 'all';
  /** Human-readable description of permitted area */
  description: string;
  /** Target CSS selector boundaries where perception is authorized */
  allowedSelectorScopes: string[];
}

export interface ForbiddenInfo {
  /** Whether values of sensitive input fields must be redacted/masked */
  maskSensitiveValues: boolean;
  /** Categories of sensitive data that must NEVER be returned in plaintext */
  redactCategories: SensitiveCategory[];
  /** HTML attributes prohibited from extraction */
  prohibitedAttributes: string[];
  /** Privacy justification */
  privacyReason: string;
}

export interface PerceptionRequirements {
  /** Primary classified intent */
  intent: TaskIntent;
  /** Keywords extracted from task */
  targetKeywords: string[];
  /** Target candidate ARIA roles */
  targetElementRoles: string[];
  /** Data attributes required for this specific task */
  requiredInfo: RequiredPerceptionInfo;
  /** Spatial and DOM boundaries where perception is allowed */
  allowedRegions: AllowedRegions;
  /** Privacy constraints and forbidden sensitive data */
  forbiddenInfo: ForbiddenInfo;
}

export interface PerceptionStep {
  /** Sequential step order */
  stepIndex: number;
  /** Action type */
  action:
    | 'DOM_QUERY'
    | 'ACCESSIBILITY_SCAN'
    | 'SENSITIVE_DATA_REDACTION'
    | 'BOUNDING_BOX_FILTER'
    | 'TARGET_RESOLUTION';
  /** Plain English explanation of what this step does */
  description: string;
  /** Parameters passed to perception workers */
  parameters: Record<string, unknown>;
  /** Expected output artifact of this step */
  expectedOutput: string;
}

export interface PerceptionPlan {
  /** Unique plan identifier */
  planId: string;
  /** High-level strategy description */
  strategy: string;
  /** Estimated match confidence */
  confidenceScore: number;
  /** Ordered sequence of perception actions */
  steps: PerceptionStep[];
  /** Safety and privacy checks enforced prior to execution */
  safetyChecks: string[];
}

export type TaskStatus = 'CREATED' | 'PLAN_GENERATED' | 'SIMULATED' | 'ADAPTIVE_INFERENCE_COMPLETE' | 'FAILED';

export type InferenceMode = 'glance' | 'focus' | 'deep_look';

export interface FirewallAuditEntry {
  timestamp: string;
  elementId: string;
  tagName: string;
  attributeOrProperty: string;
  category: SensitiveCategory | 'PROHIBITED_ATTRIBUTE';
  action: 'MASKED_WITH_SEMANTIC_PLACEHOLDER' | 'STRIPPED_ATTRIBUTE' | 'PASSED_CLEAN';
  placeholderApplied?: string;
  ruleApplied: string;
}

export interface SanitizedPerceptionElement {
  id: string;
  domId: string | null;
  tagName: string;
  role: string;
  accessibleName: string;
  /** Sanitized text or semantic placeholder */
  displayValueOrText: string;
  placeholder: string | null;
  isSensitive: boolean;
  sensitiveCategory: SensitiveCategory | null;
  semanticPlaceholder: string | null;
  cssSelector: string;
  rect: { x: number; y: number; width: number; height: number };
  interactivity: {
    disabled: boolean;
    required: boolean;
    visible: boolean;
  };
}

export interface TierInferenceDetail {
  mode: InferenceMode;
  name: string;
  latencyMs: number;
  computeCostUnits: number;
  resolutionQuality: 'coarse_dom_overview' | 'cropped_subregion_high_res' | 'multi_pass_deep_scan';
  uncertaintyScore: number;
  confidenceScore: number;
  candidateMatchesFound: number;
  findings: string;
}

export interface AdaptiveInferenceResult {
  executionId: string;
  timestamp: string;
  initialMode: InferenceMode;
  finalMode: InferenceMode;
  escalated: boolean;
  escalationReasons: string[];
  tierExecutionHistory: TierInferenceDetail[];
  totalLatencyMs: number;
  totalComputeCostUnits: number;
  firewallSummary: {
    totalElementsScanned: number;
    sensitiveElementsRedacted: number;
    prohibitedAttributesStripped: number;
    auditLog: FirewallAuditEntry[];
  };
  sanitizedPerceptionPayload: SanitizedPerceptionElement[];
  resolvedTarget: {
    targetSelector: string | null;
    confidence: number;
    matchedElement: SanitizedPerceptionElement | null;
    recommendedAction: string;
  } | null;
}

export interface TaskContextRecord {
  /** Unique task identifier */
  id: string;
  /** Original user task query */
  rawTask: string;
  /** Timestamp when task was received */
  createdAt: string;
  /** Timestamp of last update */
  updatedAt: string;
  /** Current processing lifecycle status */
  status: TaskStatus;
  /** Parsed perception requirements (what is needed, allowed, forbidden) */
  requirements: PerceptionRequirements;
  /** Minimal generated perception plan */
  perceptionPlan: PerceptionPlan;
  /** Adaptive inference and firewall execution output */
  adaptiveInferenceResult?: AdaptiveInferenceResult;
  /** Mock simulation output if executed */
  simulationResult?: {
    matchedElementsCount: number;
    redactedFieldsCount: number;
    resolvedTargetSelector: string | null;
    redactedOutputSnippet: Record<string, unknown>;
    timestamp: string;
  };
}

