/**
 * ============================================================================
 * BROWSER ACTION PLANNING & LOCAL ACTION GUARD TYPES
 * ============================================================================
 */

import type { PerceptionRequirements, SanitizedPerceptionElement } from './perception.js';

export type BrowserActionType =
  | 'CLICK'
  | 'TYPE_TEXT'
  | 'SELECT_OPTION'
  | 'TOGGLE_CHECKBOX'
  | 'SCROLL_INTO_VIEW'
  | 'HOVER'
  | 'CLEAR_INPUT';

export type ActionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL_DESTRUCTIVE';

export type ActionGuardStatus = 'APPROVED' | 'BLOCKED' | 'REQUIRES_USER_CONFIRMATION';

export interface ProposedBrowserAction {
  actionId: string;
  actionType: BrowserActionType;
  targetSelector: string;
  targetElementId?: string | null;
  targetElementTagName?: string;
  targetAccessibleName?: string;
  valuePayload?: string;
  confidenceScore: number;
  rationale: string;
  estimatedRisk: ActionRiskLevel;
  timestamp: string;
}

export interface GuardPolicyRule {
  ruleId: string;
  name: string;
  description: string;
  passed: boolean;
  violationMessage?: string;
}

export interface ActionGuardEvaluation {
  actionId: string;
  guardStatus: ActionGuardStatus;
  isAllowed: boolean;
  blockReason?: string;
  evaluatedPolicies: GuardPolicyRule[];
  safetyConfidence: number;
  auditTrail: {
    timestamp: string;
    actionType: BrowserActionType;
    targetSelector: string;
    verdict: ActionGuardStatus;
    reason: string;
  };
}

export interface ActionPlanAndApprovalResult {
  taskId?: string;
  rawTask?: string;
  proposedAction: ProposedBrowserAction;
  guardEvaluation: ActionGuardEvaluation;
  executionSimulated: boolean;
  timestamp: string;
}
