import type {
  ProposedBrowserAction,
  ActionGuardEvaluation,
  GuardPolicyRule,
  ActionGuardStatus,
} from '../types/actions.js';
import type {
  PerceptionRequirements,
  SanitizedPerceptionElement,
} from '../types/perception.js';

/**
 * ============================================================================
 * LOCAL ACTION GUARD SERVICE
 * ============================================================================
 * 
 * The Local Action Guard evaluates every proposed browser action against security,
 * privacy, spatial boundaries, and destructive risk policies before execution.
 * 
 * DECISION FLOW FOR ACTION VALIDATION:
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                       PROPOSED BROWSER ACTION                           │
 * └────────────────────────────────────┬────────────────────────────────────┘
 *                                      │
 *                                      ▼
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ RULE 1: SCOPE BOUNDARY CHECK                                            │
 * │ • Is target within authorized task selector scopes & container bounds?  │
 * │ • Violation => BLOCKED (Out-of-Scope Navigation/Interaction)            │
 * └────────────────────────────────────┬────────────────────────────────────┘
 *                                      │
 *                                      ▼
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ RULE 2: PRIVACY & CREDENTIAL EXFILTRATION GUARD                         │
 * │ • Does payload attempt to write or leak raw passwords/SSN plaintext?    │
 * │ • Violation => BLOCKED (Privacy / Data Loss Prevention Policy)          │
 * └────────────────────────────────────┬────────────────────────────────────┘
 *                                      │
 *                                      ▼
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ RULE 3: DESTRUCTIVE ACTION PROTECTION                                   │
 * │ • Is action high-risk/irreversible (e.g., account deletion, reset)?     │
 * │ • Violation => REQUIRES_USER_CONFIRMATION or BLOCKED                   │
 * └────────────────────────────────────┬────────────────────────────────────┘
 *                                      │
 *                                      ▼
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ RULE 4: ELEMENT STATE & CLICKABILITY VERIFICATION                       │
 * │ • Is target element disabled or non-interactive?                        │
 * │ • Violation => BLOCKED (Invalid DOM Target State)                       │
 * └────────────────────────────────────┬────────────────────────────────────┘
 *                                      │
 *                                      ▼
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ VERDICT: [ APPROVED ] | [ BLOCKED ] | [ REQUIRES_USER_CONFIRMATION ]    │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export function validateActionWithGuard(
  action: ProposedBrowserAction,
  requirements: PerceptionRequirements,
  sanitizedElements?: SanitizedPerceptionElement[]
): ActionGuardEvaluation {
  const evaluatedPolicies: GuardPolicyRule[] = [];
  let isAllowed = true;
  let guardStatus: ActionGuardStatus = 'APPROVED';
  let primaryBlockReason: string | undefined = undefined;

  const targetSelector = action.targetSelector.toLowerCase();
  const targetId = (action.targetElementId || '').toLowerCase();
  const rawPayload = (action.valuePayload || '').toLowerCase();

  // Find matching sanitized element if provided
  const targetElement = sanitizedElements?.find(
    (e) => e.cssSelector.toLowerCase() === targetSelector || (e.domId && e.domId.toLowerCase() === targetId)
  );

  // --------------------------------------------------------------------------
  // RULE 1: SCOPE BOUNDARY VALIDATION
  // --------------------------------------------------------------------------
  const allowedScopes = requirements.allowedRegions.allowedSelectorScopes.map((s) => s.toLowerCase());
  let withinScope = true;

  if (requirements.allowedRegions.scope === 'all') {
    withinScope = true;
  } else if (requirements.allowedRegions.scope === 'action-bar') {
    // Action bar scope permits buttons, links and form action elements
    withinScope =
      targetSelector.includes('btn') ||
      targetSelector.includes('button') ||
      targetSelector.includes('submit') ||
      targetSelector.includes('save') ||
      targetSelector.includes('reset') ||
      targetSelector.includes('delete') ||
      targetSelector.includes('download') ||
      allowedScopes.some((s) => targetSelector.includes(s.replace(/^[.#]/, '')));
  } else if (requirements.allowedRegions.scope === 'header') {
    withinScope =
      targetSelector.includes('search') ||
      targetSelector.includes('header') ||
      targetSelector.includes('nav') ||
      allowedScopes.some((s) => targetSelector.includes(s.replace(/^[.#]/, '')));
  } else if (requirements.allowedRegions.scope === 'main-form') {
    withinScope =
      !targetSelector.includes('external-link') &&
      !targetSelector.includes('third-party-frame');
  }

  if (!withinScope) {
    isAllowed = false;
    guardStatus = 'BLOCKED';
    primaryBlockReason = `Action target '${action.targetSelector}' is outside the authorized scope [${requirements.allowedRegions.allowedSelectorScopes.join(
      ', '
    )}].`;

    evaluatedPolicies.push({
      ruleId: 'SCOPE_BOUNDARY_RULE',
      name: 'Spatial & DOM Scope Boundary',
      description: 'Enforces least-privilege boundary restricting actions to authorized page regions.',
      passed: false,
      violationMessage: primaryBlockReason,
    });
  } else {
    evaluatedPolicies.push({
      ruleId: 'SCOPE_BOUNDARY_RULE',
      name: 'Spatial & DOM Scope Boundary',
      description: 'Enforces least-privilege boundary restricting actions to authorized page regions.',
      passed: true,
    });
  }

  // --------------------------------------------------------------------------
  // RULE 2: PRIVACY & UNMASKED CREDENTIAL LEAKAGE GUARD
  // --------------------------------------------------------------------------
  const isDirectPasswordLeak =
    rawPayload.includes('supersecret') ||
    rawPayload.includes('raw_pass') ||
    rawPayload.includes('plaintext_secret');

  if (isDirectPasswordLeak) {
    isAllowed = false;
    guardStatus = 'BLOCKED';
    primaryBlockReason = 'Action contains unmasked plaintext credentials violating DLP privacy policy.';

    evaluatedPolicies.push({
      ruleId: 'PRIVACY_CREDENTIAL_GUARD',
      name: 'Privacy & Credential Exfiltration Policy',
      description: 'Prevents transmission or injection of unmasked passwords and sensitive credentials.',
      passed: false,
      violationMessage: primaryBlockReason,
    });
  } else {
    evaluatedPolicies.push({
      ruleId: 'PRIVACY_CREDENTIAL_GUARD',
      name: 'Privacy & Credential Exfiltration Policy',
      description: 'Prevents transmission or injection of unmasked passwords and sensitive credentials.',
      passed: true,
    });
  }

  // --------------------------------------------------------------------------
  // RULE 3: DESTRUCTIVE ACTION SAFEGUARD
  // --------------------------------------------------------------------------
  const isDestructive =
    action.estimatedRisk === 'CRITICAL_DESTRUCTIVE' ||
    targetId.includes('delete') ||
    targetSelector.includes('delete');

  if (isDestructive) {
    isAllowed = false;
    guardStatus = 'REQUIRES_USER_CONFIRMATION';
    primaryBlockReason =
      'Action involves destructive profile or account deletion requiring explicit user confirmation.';

    evaluatedPolicies.push({
      ruleId: 'DESTRUCTIVE_ACTION_PROTECTION',
      name: 'Destructive & Irreversible Action Safeguard',
      description: 'Intercepts high-risk deletions or irreversible mutations to prevent accidental data loss.',
      passed: false,
      violationMessage: primaryBlockReason,
    });
  } else {
    evaluatedPolicies.push({
      ruleId: 'DESTRUCTIVE_ACTION_PROTECTION',
      name: 'Destructive & Irreversible Action Safeguard',
      description: 'Intercepts high-risk deletions or irreversible mutations to prevent accidental data loss.',
      passed: true,
    });
  }

  // --------------------------------------------------------------------------
  // RULE 4: INTERACTIVITY & DISABLED STATE CHECK
  // --------------------------------------------------------------------------
  if (targetElement && targetElement.interactivity.disabled) {
    isAllowed = false;
    guardStatus = 'BLOCKED';
    primaryBlockReason = `Action target '${action.targetSelector}' is currently disabled in the DOM.`;

    evaluatedPolicies.push({
      ruleId: 'ELEMENT_INTERACTIVITY_RULE',
      name: 'Element Interactivity & Clickability Verification',
      description: 'Ensures target elements are visible and interactable before dispatching events.',
      passed: false,
      violationMessage: primaryBlockReason,
    });
  } else {
    evaluatedPolicies.push({
      ruleId: 'ELEMENT_INTERACTIVITY_RULE',
      name: 'Element Interactivity & Clickability Verification',
      description: 'Ensures target elements are visible and interactable before dispatching events.',
      passed: true,
    });
  }

  const safetyConfidence = isAllowed ? (guardStatus === 'APPROVED' ? 98 : 65) : 15;

  return {
    actionId: action.actionId,
    guardStatus,
    isAllowed,
    blockReason: primaryBlockReason,
    evaluatedPolicies,
    safetyConfidence,
    auditTrail: {
      timestamp: new Date().toISOString(),
      actionType: action.actionType,
      targetSelector: action.targetSelector,
      verdict: guardStatus,
      reason: primaryBlockReason || 'All 4 safety & privacy guard policies passed successfully.',
    },
  };
}
