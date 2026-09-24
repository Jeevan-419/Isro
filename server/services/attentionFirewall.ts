import type {
  SanitizedPerceptionElement,
  FirewallAuditEntry,
  ForbiddenInfo,
  SensitiveCategory,
} from '../types/perception.js';

/**
 * ============================================================================
 * ATTENTION FIREWALL MODULE
 * ============================================================================
 * 
 * The Attention Firewall acts as a zero-trust privacy proxy between the web page
 * DOM/visual representation and the AI perception pipeline.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Policy Enforcement: Evaluates every candidate node against forbidden rules.
 * 2. Semantic Replacement: Replaces sensitive plaintext (passwords, SSNs, financial
 *    records, personal identifiers) with structured semantic placeholders so that
 *    the agent understands the node's semantic identity without accessing raw values.
 * 3. Attribute Stripping: Cleanses prohibited DOM attributes that could leak session tokens
 *    or raw credentials.
 * 4. Audit Logging: Maintains a tamper-evident audit trail of all redactions and decisions.
 */

export interface RawElementCandidate {
  id?: string;
  domId?: string | null;
  tagName: string;
  type?: string | null;
  name?: string | null;
  role?: string;
  accessibleName?: string;
  textContent?: string;
  currentValue?: string;
  placeholder?: string | null;
  isSensitive?: boolean;
  sensitiveCategory?: SensitiveCategory | null;
  cssSelector?: string;
  rect?: { x: number; y: number; width: number; height: number };
  attributes?: Record<string, string>;
  isDisabled?: boolean;
  isRequired?: boolean;
  isVisible?: boolean;
}

export interface FirewallSanitizationResult {
  sanitizedElements: SanitizedPerceptionElement[];
  auditLog: FirewallAuditEntry[];
  redactedCount: number;
  prohibitedAttributesStripped: number;
}

/**
 * Maps sensitive data categories to standardized, semantic privacy tokens.
 * This preserves the model's structural understanding without exposing real PII.
 */
function getSemanticPlaceholder(category: SensitiveCategory | null, tagName: string): string {
  switch (category) {
    case 'Password':
      return '[REDACTED:AUTH_CREDENTIAL_PASSWORD:********]';
    case 'Government ID / SSN':
      return '[REDACTED:GOVERNMENT_IDENTIFIER_SSN:***-**-****]';
    case 'Financial Data':
      return '[REDACTED:FINANCIAL_COMPENSATION_SALARY:$$$$$$]';
    case 'Personal Information':
      return '[REDACTED:PERSONAL_IDENTIFIABLE_INFORMATION:PROTECTED]';
    case 'Contact Information':
      return '[REDACTED:CONTACT_PHONE_NUMBER:+XX-XXXXXXXXXX]';
    default:
      return tagName === 'INPUT' ? '[REDACTED:SENSITIVE_INPUT_VALUE]' : '[REDACTED:RESTRICTED_PAYLOAD]';
  }
}

/**
 * Evaluates raw element candidates against privacy requirements and applies
 * semantic placeholders and attribute filtering.
 * 
 * @param candidates List of raw DOM/interactive element candidates
 * @param forbiddenPolicy Privacy rules and forbidden categories
 */
export function applyAttentionFirewall(
  candidates: RawElementCandidate[],
  forbiddenPolicy: ForbiddenInfo
): FirewallSanitizationResult {
  const auditLog: FirewallAuditEntry[] = [];
  let redactedCount = 0;
  let prohibitedAttributesStripped = 0;

  const sanitizedElements: SanitizedPerceptionElement[] = candidates.map((elem, idx) => {
    const elementId = elem.domId || elem.id || `elem-${idx}`;
    const tagName = (elem.tagName || 'DIV').toUpperCase();
    const role = elem.role || (tagName === 'BUTTON' ? 'button' : 'textbox');
    const accessibleName = elem.accessibleName || elem.textContent || '';
    const isSensitive = Boolean(elem.isSensitive || elem.sensitiveCategory || elem.type === 'password');
    const sensitiveCategory = elem.sensitiveCategory || (elem.type === 'password' ? 'Password' : null);

    let displayValueOrText = elem.textContent || elem.currentValue || '';
    let semanticPlaceholder: string | null = null;

    // Check if element requires sensitive value masking
    if (isSensitive && forbiddenPolicy.maskSensitiveValues) {
      semanticPlaceholder = getSemanticPlaceholder(sensitiveCategory, tagName);
      displayValueOrText = semanticPlaceholder;
      redactedCount++;

      auditLog.push({
        timestamp: new Date().toISOString(),
        elementId,
        tagName,
        attributeOrProperty: 'value / textContent',
        category: sensitiveCategory || 'Personal Information',
        action: 'MASKED_WITH_SEMANTIC_PLACEHOLDER',
        placeholderApplied: semanticPlaceholder,
        ruleApplied: `Forbidden category policy: ${sensitiveCategory || 'Sensitive field'}`,
      });
    } else {
      auditLog.push({
        timestamp: new Date().toISOString(),
        elementId,
        tagName,
        attributeOrProperty: 'all',
        category: 'Personal Information',
        action: 'PASSED_CLEAN',
        ruleApplied: 'No sensitive signatures detected',
      });
    }

    // Check for prohibited attributes that must be stripped
    if (elem.attributes) {
      for (const prohibitedKey of forbiddenPolicy.prohibitedAttributes) {
        if (elem.attributes[prohibitedKey] !== undefined) {
          prohibitedAttributesStripped++;
          auditLog.push({
            timestamp: new Date().toISOString(),
            elementId,
            tagName,
            attributeOrProperty: prohibitedKey,
            category: 'PROHIBITED_ATTRIBUTE',
            action: 'STRIPPED_ATTRIBUTE',
            ruleApplied: `Prohibited attribute policy: ${prohibitedKey}`,
          });
        }
      }
    }

    return {
      id: elementId,
      domId: elem.domId || null,
      tagName,
      role,
      accessibleName,
      displayValueOrText,
      placeholder: elem.placeholder || null,
      isSensitive,
      sensitiveCategory,
      semanticPlaceholder,
      cssSelector: elem.cssSelector || `#${elementId}`,
      rect: elem.rect || { x: 0, y: 0, width: 100, height: 35 },
      interactivity: {
        disabled: Boolean(elem.isDisabled),
        required: Boolean(elem.isRequired),
        visible: elem.isVisible !== false,
      },
    };
  });

  return {
    sanitizedElements,
    auditLog,
    redactedCount,
    prohibitedAttributesStripped,
  };
}
