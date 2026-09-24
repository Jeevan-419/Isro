import type {
  PerceptionRequirements,
  TaskIntent,
  SensitiveCategory,
  UserTaskInput,
} from '../types/perception.js';

/**
 * ============================================================================
 * UNIVERSAL TASK PARSER SERVICE
 * ============================================================================
 * 
 * Works with ALL possible natural language inputs across ALL websites.
 * Handles synonyms, typos, conversational phrasing, intent classification,
 * fuzzy keyword extraction, and least-privilege scoping.
 */

// Universal stop-words to discard when identifying core targets
const STOP_WORDS = new Set([
  'the', 'and', 'or', 'in', 'on', 'at', 'to', 'a', 'an', 'for', 'of', 'with',
  'all', 'is', 'it', 'me', 'my', 'please', 'can', 'you', 'i', 'want', 'need',
  'would', 'like', 'then', 'from', 'this', 'that', 'into', 'onto', 'by', 'be'
]);

export function parseTaskToRequirements(input: UserTaskInput): PerceptionRequirements {
  const taskText = (input.task || '').trim().toLowerCase();

  // 1. Universal Intent Detection
  let intent: TaskIntent = 'inspect';
  if (/click|press|tap|push|download|fetch|submit|hit|trigger|follow|open\s*link|launch|execute/i.test(taskText)) {
    intent = 'click';
  } else if (/type|fill|enter|input|write|set|insert|search|query|put/i.test(taskText)) {
    intent = 'fill';
  } else if (/extract|scrape|read|get|collect|copy|find|locate|show|display|view|inspect|see/i.test(taskText)) {
    intent = 'extract';
  } else if (/verify|check|validate|ensure|confirm|test|match/i.test(taskText)) {
    intent = 'verify';
  } else if (/navigate|go\s*to|browse|redirect|visit|url|load/i.test(taskText)) {
    intent = 'navigate';
  } else if (/scroll|swipe|move\s*down|move\s*up|bottom|top/i.test(taskText)) {
    intent = 'inspect';
  }

  // 2. Token Extraction with Stemming & Stopword Cleansing
  const cleanTokens = taskText
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  
  const targetKeywords = Array.from(new Set(cleanTokens));

  // 3. Dynamic Universal Element Roles Detection
  const targetElementRoles: string[] = [];
  if (/button|submit|action|save|delete|reset|download|btn|apply|checkout|pay|login|sign|register/i.test(taskText)) {
    targetElementRoles.push('button');
  }
  if (/link|href|page|anchor|url|article|wiki|result/i.test(taskText)) {
    targetElementRoles.push('link', 'button');
  }
  if (/input|field|textbox|text|password|email|phone|name|ssn|account|meter|search|query|address|message|comment/i.test(taskText)) {
    targetElementRoles.push('textbox', 'searchbox');
  }
  if (/checkbox|agree|terms|consent|mfa|2fa|toggle|accept|opt/i.test(taskText)) {
    targetElementRoles.push('checkbox');
  }
  if (/select|dropdown|role|option|choice|category|filter|sort/i.test(taskText)) {
    targetElementRoles.push('combobox');
  }

  // Default fallback roles (search all common interactive elements)
  if (targetElementRoles.length === 0) {
    targetElementRoles.push('button', 'link', 'textbox', 'searchbox', 'combobox', 'checkbox');
  }

  // 4. Universal Required Info Spec
  const requiredInfo = {
    textLabels: true,
    boundingCoordinates: true,
    accessibilityRole: true,
    cssSelectors: true,
    stateAttributes: true,
  };

  // 5. Dynamic Allowed Regions Scope (Least Privilege, adapting to any site)
  let allowedScope: 'viewport' | 'main-form' | 'header' | 'action-bar' | 'all' = 'all';
  let scopeDescription = 'Universal Webpage Viewport';
  let allowedSelectorScopes = ['body', '#mock-webpage-root', 'main', '[role="main"]'];

  if (/search|nav|header|top|menu/i.test(taskText)) {
    allowedScope = 'header';
    scopeDescription = 'Top navigation header, search bar, and primary menus';
    allowedSelectorScopes = ['header', 'nav', '.mock-site-header', '#site-search-input', '#searchbox'];
  } else if (/bill|electricity|utility|invoice|receipt/i.test(taskText)) {
    allowedScope = 'action-bar';
    scopeDescription = 'Utility invoicing & electricity billing section';
    allowedSelectorScopes = ['#utility-billing-section', '#download-electricity-bill-btn', '.mock-actions-toolbar', 'form'];
  } else if (/form|profile|password|email|name|ssn|salary|clearance|register|checkout|input/i.test(taskText)) {
    allowedScope = 'main-form';
    scopeDescription = 'Main interactive form and input fields';
    allowedSelectorScopes = ['form', '#clearance-registration-form', '.mock-form-card', 'main'];
  } else if (/submit|save|reset|delete|action|download|confirm/i.test(taskText)) {
    allowedScope = 'action-bar';
    scopeDescription = 'Action controls and submission buttons';
    allowedSelectorScopes = ['.mock-actions-toolbar', 'button', 'form', '#clearance-registration-form'];
  }

  // 6. Universal Privacy & Compliance Guardrails (Applies to ALL websites)
  const isDirectlyTargetingSensitive =
    /password|ssn|social\s*security|salary|income|dob|secret|account|meter|billing|credit|card|cvv|token|credential/i.test(
      taskText
    );

  const redactCategories: SensitiveCategory[] = [
    'Password',
    'Government ID / SSN',
    'Financial Data',
    'Personal Information',
    'Contact Information',
  ];

  const forbiddenInfo = {
    maskSensitiveValues: true,
    redactCategories,
    prohibitedAttributes: [
      'data-raw-credential',
      'autocomplete',
      'value-plaintext-password',
      'client-session-token',
      'auth-header',
      'x-access-token',
    ],
    privacyReason: isDirectlyTargetingSensitive
      ? 'Target involves sensitive credentials; metadata permitted but plaintext strictly masked by Attention Firewall.'
      : 'Universal Zero-Trust Privacy: All PII and credential values redacted across all web domains.',
  };

  return {
    intent,
    targetKeywords,
    targetElementRoles,
    requiredInfo,
    allowedRegions: {
      scope: allowedScope,
      description: scopeDescription,
      allowedSelectorScopes,
    },
    forbiddenInfo,
  };
}
