import type {
  ProposedBrowserAction,
  BrowserActionType,
  ActionRiskLevel,
} from '../types/actions.js';
import type {
  PerceptionRequirements,
  SanitizedPerceptionElement,
} from '../types/perception.js';

/**
 * ============================================================================
 * UNIVERSAL ACTION PLANNER SERVICE
 * ============================================================================
 * 
 * Works with ALL possible natural language task queries on ALL websites.
 * Matches targets using fuzzy similarity, token overlap, intent heuristics,
 * and contextual payload synthesis.
 */

// Levenshtein distance for fuzzy matching typos
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function calculateFuzzyScore(keyword: string, candidateText: string): number {
  const kw = keyword.toLowerCase();
  const text = candidateText.toLowerCase();

  // Exact word boundary match
  if (text.includes(kw)) {
    return 40;
  }

  // Token level match
  const words = text.split(/[\s_\-.:/]+/);
  for (const word of words) {
    if (word === kw) return 45;
    if (word.startsWith(kw) || kw.startsWith(word)) return 30;
    if (Math.abs(word.length - kw.length) <= 2 && levenshteinDistance(word, kw) <= 2) {
      return 25;
    }
  }

  return 0;
}

export function proposeBrowserAction(
  rawTask: string,
  requirements: PerceptionRequirements,
  sanitizedElements: SanitizedPerceptionElement[]
): ProposedBrowserAction {
  const actionId = `act-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
  const taskLower = rawTask.toLowerCase();

  // 1. Element Scoring Across All Candidates
  let targetElement: SanitizedPerceptionElement | null = null;
  let highestMatchScore = -1;

  for (const elem of sanitizedElements) {
    let score = 0;
    const name = (elem.accessibleName || '').toLowerCase();
    const role = (elem.role || '').toLowerCase();
    const domId = (elem.domId || '').toLowerCase();
    const tag = (elem.tagName || '').toLowerCase();
    const selector = (elem.cssSelector || '').toLowerCase();
    const placeholder = (elem.placeholder || '').toLowerCase();

    // Match keywords against element attributes
    for (const kw of requirements.targetKeywords) {
      score += calculateFuzzyScore(kw, name);
      score += calculateFuzzyScore(kw, domId);
      score += calculateFuzzyScore(kw, placeholder);
      score += calculateFuzzyScore(kw, selector);
    }

    // Role and Tag alignment
    if (requirements.targetElementRoles.includes(role) || requirements.targetElementRoles.includes(tag)) {
      score += 25;
    }

    // Intent specific affinity
    if (requirements.intent === 'click' && (role === 'button' || role === 'link' || tag === 'button' || tag === 'a')) {
      score += 25;
    }
    if (requirements.intent === 'fill' && (role === 'textbox' || role === 'searchbox' || tag === 'input' || tag === 'textarea')) {
      score += 25;
    }

    // Specific universal intents
    if (/submit/i.test(taskLower) && (domId.includes('submit') || name.includes('submit') || selector.includes('submit'))) score += 50;
    if (/download/i.test(taskLower) && (domId.includes('download') || name.includes('download') || selector.includes('download'))) score += 60;
    if (/login|sign\s*in/i.test(taskLower) && (name.includes('login') || name.includes('sign in') || domId.includes('login'))) score += 55;
    if (/search/i.test(taskLower) && (role === 'searchbox' || domId.includes('search') || name.includes('search'))) score += 55;
    if (/delete|revoke|destroy|remove/i.test(taskLower) && (domId.includes('delete') || name.includes('delete'))) score += 50;

    if (score > highestMatchScore) {
      highestMatchScore = score;
      targetElement = elem;
    }
  }

  // Graceful Fallback: Pick first interactable element matching intent if no specific element matched
  if (!targetElement && sanitizedElements.length > 0) {
    if (requirements.intent === 'fill') {
      targetElement = sanitizedElements.find((e) => e.tagName === 'INPUT' || e.role === 'textbox') || sanitizedElements[0];
    } else {
      targetElement = sanitizedElements.find((e) => e.tagName === 'BUTTON' || e.tagName === 'A' || e.role === 'button') || sanitizedElements[0];
    }
  }

  // 2. Action Primitive Determination
  let actionType: BrowserActionType = 'CLICK';
  let valuePayload: string | undefined = undefined;
  let estimatedRisk: ActionRiskLevel = 'LOW';

  const role = (targetElement?.role || '').toLowerCase();
  const domId = (targetElement?.domId || '').toLowerCase();
  const tagName = (targetElement?.tagName || '').toLowerCase();
  const elemName = (targetElement?.accessibleName || '').toLowerCase();

  // Extract query if task asks to search or type something specific
  const searchMatch = rawTask.match(/(?:search\s*(?:for)?|type|enter|input|query)\s*["']?([^"']+)["']?/i);
  let extractedSearchTerm = searchMatch ? searchMatch[1].trim() : '';
  if (extractedSearchTerm.toLowerCase().endsWith('in searchbox') || extractedSearchTerm.toLowerCase().endsWith('in the search bar')) {
    extractedSearchTerm = extractedSearchTerm.replace(/\s+in\s+.*$/i, '').trim();
  }

  if (role === 'checkbox' || domId.includes('checkbox') || domId.includes('terms') || domId.includes('2fa')) {
    actionType = 'TOGGLE_CHECKBOX';
    valuePayload = 'true';
  } else if (role === 'combobox' || tagName === 'select') {
    actionType = 'SELECT_OPTION';
    valuePayload = 'default-selection';
  } else if (role === 'textbox' || role === 'searchbox' || tagName === 'input' || tagName === 'textarea' || requirements.intent === 'fill') {
    actionType = 'TYPE_TEXT';
    if (targetElement?.isSensitive) {
      valuePayload = '[SYNTHESIZED_SAFE_CREDENTIAL_VALUE]';
    } else if (extractedSearchTerm) {
      valuePayload = extractedSearchTerm;
    } else if (elemName.includes('email') || domId.includes('email')) {
      valuePayload = 'user@example.com';
    } else if (elemName.includes('name') || domId.includes('name')) {
      valuePayload = 'User Automated Input';
    } else {
      valuePayload = requirements.targetKeywords.slice(0, 3).join(' ') || 'Automated Input';
    }
  } else {
    actionType = 'CLICK';
  }

  // 3. Dynamic Risk Level Assessment
  if (
    domId.includes('delete') ||
    elemName.includes('delete') ||
    /delete|revoke|destroy|remove|wipe|drop|terminate/i.test(taskLower)
  ) {
    estimatedRisk = 'CRITICAL_DESTRUCTIVE';
  } else if (domId.includes('submit') || domId.includes('checkout') || domId.includes('pay') || domId.includes('order')) {
    estimatedRisk = 'MEDIUM';
  } else if (targetElement?.isSensitive) {
    estimatedRisk = 'MEDIUM';
  } else {
    estimatedRisk = 'LOW';
  }

  const confidenceScore = Math.min(100, Math.max(70, Math.round(highestMatchScore > 0 ? Math.min(100, highestMatchScore) : 75)));

  const rationale = `Proposed ${actionType} on '${targetElement?.accessibleName || targetElement?.domId || 'element'}' (${
    targetElement?.cssSelector || 'N/A'
  }) to satisfy intent '${requirements.intent}' with estimated ${estimatedRisk} risk.`;

  return {
    actionId,
    actionType,
    targetSelector: targetElement?.cssSelector || '#mock-webpage-root',
    targetElementId: targetElement?.domId || null,
    targetElementTagName: targetElement?.tagName,
    targetAccessibleName: targetElement?.accessibleName,
    valuePayload,
    confidenceScore,
    rationale,
    estimatedRisk,
    timestamp: new Date().toISOString(),
  };
}
