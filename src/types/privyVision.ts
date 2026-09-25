/**
 * ============================================================================
 * PRIVYVISION TYPE DEFINITIONS (SIH26171)
 * On-Device Visual Perception & Privacy-Preserving Browser Agent
 * ============================================================================
 */

export type NavigationSection = 
  | 'agent'
  | 'perception'
  | 'privacy'
  | 'actions'
  | 'evaluation'
  | 'system';

export type PipelineStage = 
  | 'capture'
  | 'perceive'
  | 'detect_pii'
  | 'redact'
  | 'protect'
  | 'reason'
  | 'act'
  | 'verify';

export interface PipelineStageInfo {
  id: PipelineStage;
  label: string;
  description: string;
  status: 'idle' | 'running' | 'completed' | 'blocked' | 'failed';
  durationMs?: number;
  details?: string;
}

export type DetectionSource = 
  | 'Vision + DOM + A11y + OCR'
  | 'Vision + DOM'
  | 'Vision + OCR'
  | 'DOM + A11y'
  | 'Vision Only'
  | 'OCR Only';

export type UIElementType = 
  | 'button'
  | 'input'
  | 'link'
  | 'checkbox'
  | 'dropdown'
  | 'text'
  | 'image'
  | 'dialog';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GroundedElement {
  id: string;
  uid: string;
  type: UIElementType;
  label: string;
  role: string;
  source: DetectionSource;
  confidence: number;
  boundingBox: BoundingBox;
  domId?: string;
  tagName: string;
  cssSelector: string;
  xpath?: string;
  currentValue?: string;
  isSensitive: boolean;
  sensitiveCategory?: string;
  redactedPlaceholder?: string;
  isInteractive: boolean;
  isVisible: boolean;
  ocrText?: string;
}

export interface PiiEntity {
  id: string;
  category: 'Password' | 'Government ID / SSN' | 'Personal Information' | 'Financial Data' | 'Contact Information';
  fieldName: string;
  rawSampleValue: string;
  maskedPlaceholder: string;
  boundingBox: BoundingBox;
  confidence: number;
  redactionStatus: 'REDACTED' | 'EXEMPT';
}

export type ActionType = 'click' | 'fill' | 'select' | 'check' | 'scroll' | 'press_key';

export interface StructuredBrowserAction {
  actionId: string;
  actionType: ActionType;
  targetElementUid: string;
  targetSelector: string;
  targetDescription: string;
  payload?: string;
  coordinates?: { x: number; y: number };
  confidence: number;
  intent: string;
}

export interface ActionGuardEvaluationResult {
  isAllowed: boolean;
  status: 'APPROVED' | 'BLOCKED' | 'REQUIRES_USER_CONFIRMATION';
  ruleViolations: string[];
  scopePassed: boolean;
  credentialLeakPrevented: boolean;
  destructiveRiskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  explanation: string;
}

export type VisionRuntimeMode = 
  | 'webgpu'
  | 'wasm'
  | 'heuristic_canvas_fallback';

export interface VisionRuntimeStatus {
  activeMode: VisionRuntimeMode;
  modeDisplayName: string;
  isModelLoaded: boolean;
  modelName: string;
  isRealHardwareAccelerated: boolean;
  deviceLabel: string;
  lastInferenceMs: number;
  elementsDetectedCount: number;
  resolution: { width: number; height: number };
}
