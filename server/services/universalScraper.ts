import { parse, HTMLElement } from 'node-html-parser';
import type { RawElementCandidate } from './attentionFirewall.js';
import type { SensitiveCategory } from '../types/perception.js';

/**
 * ============================================================================
 * UNIVERSAL WEB SCRAPER & DOM PARSER SERVICE
 * ============================================================================
 * 
 * Fetches and parses ANY live website or custom HTML payload into structured
 * interactive element candidates for the Attention Firewall and Action Planner.
 */

// Universal Regex Patterns for detecting Sensitive / PII elements
const SENSITIVE_DETECTORS = {
  password: /password|passwd|pwd|passphrase|secret|pin|security_code|auth_token/i,
  ssn: /ssn|social[-_\s]*security|national[-_\s]*id|tax[-_\s]*id|aadhaar|pan[-_\s]*card|id[-_\s]*number/i,
  financial: /salary|income|credit[-_\s]*card|card[-_\s]*number|cvv|cvc|bank[-_\s]*account|routing|billing|invoice|balance|payment/i,
  personal: /dob|birth[-_\s]*date|date[-_\s]*of[-_\s]*birth|mother[-_\s]*maiden|gender|ethnicity|meter[-_\s]*number/i,
  contact: /phone|mobile|tel|telephone|contact[-_\s]*number/i,
};

function classifyElementSensitivity(
  tag: string,
  attrs: Record<string, string>,
  text: string
): { isSensitive: boolean; category: SensitiveCategory | null } {
  const inputType = (attrs.type || '').toLowerCase();
  if (inputType === 'password') {
    return { isSensitive: true, category: 'Password' };
  }

  const combined = `${attrs.id || ''} ${attrs.name || ''} ${attrs['aria-label'] || ''} ${attrs.placeholder || ''} ${attrs.autocomplete || ''} ${text}`.toLowerCase();

  if (SENSITIVE_DETECTORS.password.test(combined)) {
    return { isSensitive: true, category: 'Password' };
  }
  if (SENSITIVE_DETECTORS.ssn.test(combined)) {
    return { isSensitive: true, category: 'Government ID / SSN' };
  }
  if (SENSITIVE_DETECTORS.financial.test(combined)) {
    return { isSensitive: true, category: 'Financial Data' };
  }
  if (SENSITIVE_DETECTORS.personal.test(combined)) {
    return { isSensitive: true, category: 'Personal Information' };
  }
  if (SENSITIVE_DETECTORS.contact.test(combined)) {
    return { isSensitive: true, category: 'Contact Information' };
  }

  return { isSensitive: false, category: null };
}

function computeSelector(el: HTMLElement, index: number): string {
  if (el.id) return `#${el.id.trim()}`;
  const name = el.getAttribute('name');
  if (name) return `${el.tagName.toLowerCase()}[name="${name}"]`;
  const role = el.getAttribute('role');
  if (role) return `${el.tagName.toLowerCase()}[role="${role}"]`;
  const className = el.getAttribute('class');
  if (className) {
    const firstClass = className.trim().split(/\s+/)[0];
    if (firstClass && !firstClass.includes(':')) {
      return `${el.tagName.toLowerCase()}.${firstClass}`;
    }
  }
  return `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
}

export async function fetchAndParseWebsite(targetUrl: string): Promise<{
  url: string;
  title: string;
  elements: RawElementCandidate[];
  htmlSnippet: string;
}> {
  let url = targetUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // Fetch with modern browser user agent
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch website (${response.status}: ${response.statusText})`);
  }

  const rawHtml = await response.text();
  return parseHtmlToCandidates(rawHtml, url);
}

export function parseHtmlToCandidates(
  htmlContent: string,
  baseUrl?: string
): {
  url: string;
  title: string;
  elements: RawElementCandidate[];
  htmlSnippet: string;
} {
  const root = parse(htmlContent);
  const title = root.querySelector('title')?.text?.trim() || 'Live Web Page';

  // Find all interactive and meaningful elements
  const query = 'button, a, input, select, textarea, form, [role="button"], [role="link"], [role="textbox"], [role="checkbox"], [tabindex="0"]';
  const nodes = root.querySelectorAll(query);

  const candidates: RawElementCandidate[] = [];
  const seenSelectors = new Set<string>();

  nodes.slice(0, 150).forEach((node, idx) => {
    const tagName = node.tagName.toUpperCase();
    const attrs = node.attributes || {};
    const text = node.text ? node.text.trim().replace(/\s+/g, ' ') : '';
    const domId = attrs.id || null;
    const name = attrs.name || null;
    const type = attrs.type || (tagName === 'BUTTON' ? 'button' : tagName === 'INPUT' ? 'text' : null);
    
    // Accessible Name heuristic
    let accessibleName =
      attrs['aria-label'] ||
      attrs.placeholder ||
      attrs.title ||
      attrs.value ||
      text ||
      (tagName === 'A' ? attrs.href : '') ||
      '';

    if (accessibleName.length > 80) {
      accessibleName = accessibleName.slice(0, 77) + '...';
    }

    const { isSensitive, category } = classifyElementSensitivity(tagName, attrs, `${accessibleName} ${text}`);
    const selector = computeSelector(node, idx);

    // Dedup identical selectors
    if (seenSelectors.has(selector)) return;
    seenSelectors.add(selector);

    let role = attrs.role;
    if (!role) {
      if (tagName === 'BUTTON') role = 'button';
      else if (tagName === 'A') role = 'link';
      else if (tagName === 'SELECT') role = 'combobox';
      else if (tagName === 'TEXTAREA') role = 'textbox';
      else if (tagName === 'INPUT') {
        if (['checkbox', 'radio'].includes(type || '')) role = type || 'checkbox';
        else role = 'textbox';
      } else {
        role = 'button';
      }
    }

    candidates.push({
      domId,
      id: domId || `elem-${idx}`,
      tagName,
      type,
      name,
      role,
      accessibleName: accessibleName || `${tagName.toLowerCase()} element`,
      textContent: text.slice(0, 100),
      currentValue: attrs.value || '',
      placeholder: attrs.placeholder || null,
      isSensitive,
      sensitiveCategory: category,
      cssSelector: selector,
      isDisabled: attrs.disabled !== undefined,
      isRequired: attrs.required !== undefined,
      isVisible: true,
      rect: {
        x: (idx % 2) * 350 + 20,
        y: Math.floor(idx / 2) * 60 + 20,
        width: tagName === 'BUTTON' ? 140 : 300,
        height: 38,
      },
      attributes: attrs,
    });
  });

  return {
    url: baseUrl || 'custom-html',
    title,
    elements: candidates,
    htmlSnippet: htmlContent.slice(0, 5000),
  };
}
