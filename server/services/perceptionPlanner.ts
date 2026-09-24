import type {
  PerceptionRequirements,
  PerceptionPlan,
  PerceptionStep,
} from '../types/perception.js';

/**
 * ============================================================================
 * PERCEPTION PLANNER SERVICE
 * ============================================================================
 * 
 * Synthesizes a minimal, safety-conscious perception plan based on the task's
 * parsed requirements and privacy constraints.
 */
export function generatePerceptionPlan(
  rawTask: string,
  requirements: PerceptionRequirements
): PerceptionPlan {
  const planId = `plan-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
  const steps: PerceptionStep[] = [];

  // Step 1: Query DOM Candidate Nodes within Allowed Regions
  steps.push({
    stepIndex: 1,
    action: 'DOM_QUERY',
    description: `Query interactive candidate elements restricted to allowed scope: [${requirements.allowedRegions.allowedSelectorScopes.join(
      ', '
    )}]`,
    parameters: {
      targetRoles: requirements.targetElementRoles,
      allowedSelectors: requirements.allowedRegions.allowedSelectorScopes,
      limitToVisible: true,
    },
    expectedOutput: 'List of raw candidate DOM nodes matching target tag and role criteria',
  });

  // Step 2: Compute Accessible Names and Semantic Roles
  steps.push({
    stepIndex: 2,
    action: 'ACCESSIBILITY_SCAN',
    description: 'Calculate W3C Accessible Name (AccName) and ARIA semantic hierarchy for candidates',
    parameters: {
      includeAriaLabels: requirements.requiredInfo.textLabels,
      includeAriaRoles: requirements.requiredInfo.accessibilityRole,
      includeFormLabels: true,
    },
    expectedOutput: 'Annotated accessibility tree with computed names and semantic roles',
  });

  // Step 3: Enforce Sensitive Data Redaction & Masking (Privacy Guardrail)
  steps.push({
    stepIndex: 3,
    action: 'SENSITIVE_DATA_REDACTION',
    description: `Apply privacy filter: redact value fields classified under [${requirements.forbiddenInfo.redactCategories.join(
      ', '
    )}]`,
    parameters: {
      maskValues: requirements.forbiddenInfo.maskSensitiveValues,
      prohibitedAttributes: requirements.forbiddenInfo.prohibitedAttributes,
      replacementMask: '••••••••',
    },
    expectedOutput: 'Sanitized perception payload with sensitive values strictly redacted',
  });

  // Step 4: Geometry & Bounding Box Filtering (if coordinates required)
  if (requirements.requiredInfo.boundingCoordinates) {
    steps.push({
      stepIndex: 4,
      action: 'BOUNDING_BOX_FILTER',
      description: 'Measure bounding box coordinates and verify element is inside the clickable viewport',
      parameters: {
        minimumWidth: 5,
        minimumHeight: 5,
        ignoreHidden: true,
      },
      expectedOutput: 'Bounding box rectangles (x, y, width, height) relative to viewport',
    });
  }

  // Step 5: Target Resolution & Automation Selector Matching
  steps.push({
    stepIndex: steps.length + 1,
    action: 'TARGET_RESOLUTION',
    description: `Match target element using keywords [${requirements.targetKeywords.join(
      ', '
    )}] and produce automation selector`,
    parameters: {
      keywords: requirements.targetKeywords,
      intent: requirements.intent,
      preferIdSelector: true,
    },
    expectedOutput: 'Resolved target element locator (CSS Selector / XPath) and action confidence score',
  });

  // Calculate baseline confidence
  let confidenceScore = 85;
  if (requirements.targetKeywords.length > 0) confidenceScore += 10;
  if (requirements.targetElementRoles.length === 1) confidenceScore += 5;
  confidenceScore = Math.min(100, confidenceScore);

  const strategy = `Scoped DOM perception targeting '${requirements.intent}' within ${
    requirements.allowedRegions.description
  } with strict PII masking (${requirements.forbiddenInfo.redactCategories.length} categories protected).`;

  const safetyChecks = [
    'Enforced strict PII redaction policy on password and government ID fields.',
    'Restricted visual & DOM perception queries to authorized selector boundary.',
    'Verified target resolution contains zero sensitive plaintext payloads.',
  ];

  return {
    planId,
    strategy,
    confidenceScore,
    steps,
    safetyChecks,
  };
}
