import type { ExtractedElement, ElementRect, SensitiveCategory } from '../types/dom';

/**
 * ============================================================================
 * DOM & ACCESSIBILITY EXTRACTION UTILITY
 * ============================================================================
 * 
 * This module inspects a given HTML container and extracts structured metadata
 * about all visible interactive and meaningful elements.
 * 
 * Key extraction responsibilities:
 * 1. Querying interactive and semantic candidate elements.
 * 2. Computing W3C-compliant Accessible Names (AccName) using ARIA and label heuristics.
 * 3. Determining HTML5 implicit and explicit ARIA roles.
 * 4. Identifying Sensitive Personal Identifiable Information (PII) / credentials.
 * 5. Synthesizing unique CSS selectors and XPath locators for web agents.
 * 6. Measuring geometry and visibility bounding boxes.
 */

/**
 * Regular expressions and keyword dictionaries used to detect sensitive/PII fields.
 */
const SENSITIVE_PATTERNS = {
  password: /password|pwd|passphrase|secret|pin|security_code/i,
  ssn: /ssn|social.*security|national.*id|tax.*id|aadhaar|id_number/i,
  financial: /salary|income|credit.*card|card.*number|cvv|bank.*account|routing|bill|amount.*due|account.*no/i,
  personal: /dob|birth.*date|date.*of.*birth|mother.*maiden|gender|ethnicity|meter.*number|meter.*serial/i,
  contact: /phone|mobile|tel|contact.*number/i,
};

/**
 * Maps standard HTML tag names and type combinations to their default implicit ARIA roles
 * as specified in the W3C HTML-ARIA mapping specifications.
 */
function getImplicitRole(el: HTMLElement): string {
  const tagName = el.tagName.toLowerCase();

  if (tagName === 'button') {
    return 'button';
  }
  if (tagName === 'a' && el.hasAttribute('href')) {
    return 'link';
  }
  if (tagName === 'select') {
    return 'combobox';
  }
  if (tagName === 'textarea') {
    return 'textbox';
  }
  if (tagName === 'label') {
    return 'label';
  }

  if (tagName === 'input') {
    const inputType = (el.getAttribute('type') || 'text').toLowerCase();
    switch (inputType) {
      case 'button':
      case 'submit':
      case 'reset':
        return 'button';
      case 'checkbox':
        return 'checkbox';
      case 'radio':
        return 'radio';
      case 'search':
        return 'searchbox';
      case 'number':
        return 'spinbutton';
      case 'range':
        return 'slider';
      case 'password':
      case 'email':
      case 'tel':
      case 'url':
      case 'text':
      default:
        return 'textbox';
    }
  }

  // If explicit role is provided (e.g. role="status", role="alert")
  const explicitRole = el.getAttribute('role');
  if (explicitRole) {
    return explicitRole;
  }

  return tagName;
}

/**
 * Computes the W3C Accessible Name for an element following the AccName calculation hierarchy:
 * 1. aria-labelledby: Content of elements referenced by ID
 * 2. aria-label: Explicit text provided directly in the attribute
 * 3. Associated <label> tag: Via label[for="elementId"] or parent wrapping <label>
 * 4. Placeholder / title attribute: Fallback hints
 * 5. Inner text content: For buttons, links, and text elements
 * 
 * @param el The HTML element to compute the accessible name for
 * @param root The root container element
 */
function computeAccessibleName(el: HTMLElement, root: HTMLElement): string {
  // Step 1: aria-labelledby references
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelIds = labelledBy.split(/\s+/);
    const labelTexts = labelIds
      .map((id) => root.querySelector(`#${id}`)?.textContent?.trim())
      .filter(Boolean);
    if (labelTexts.length > 0) {
      return labelTexts.join(' ');
    }
  }

  // Step 2: aria-label direct attribute
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) {
    return ariaLabel.trim();
  }

  // Step 3: Associated HTML <label> elements
  if (el.id) {
    const associatedLabel = root.querySelector(`label[for="${el.id}"]`);
    if (associatedLabel && associatedLabel.textContent) {
      return associatedLabel.textContent.trim();
    }
  }

  // Check if inside a parent <label>
  const parentLabel = el.closest('label');
  if (parentLabel && parentLabel !== el) {
    // Clone and remove the input's own text to get the label text only
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    const innerInputs = clone.querySelectorAll('input, select, textarea, button');
    innerInputs.forEach((child) => child.remove());
    if (clone.textContent && clone.textContent.trim()) {
      return clone.textContent.trim();
    }
  }

  // Step 4: Text content for buttons, anchors, and labels
  const tagName = el.tagName.toLowerCase();
  if (tagName === 'button' || tagName === 'a' || tagName === 'label') {
    const text = el.innerText || el.textContent || '';
    if (text.trim()) {
      return text.trim();
    }
  }

  // Step 5: Input value for submit/button input types
  if (tagName === 'input') {
    const input = el as HTMLInputElement;
    const type = input.type.toLowerCase();
    if ((type === 'button' || type === 'submit' || type === 'reset') && input.value) {
      return input.value;
    }
  }

  // Step 6: Placeholder attribute fallback
  const placeholder = el.getAttribute('placeholder');
  if (placeholder && placeholder.trim()) {
    return placeholder.trim();
  }

  // Step 7: Title attribute fallback
  const title = el.getAttribute('title');
  if (title && title.trim()) {
    return title.trim();
  }

  return '';
}

/**
 * Computes the accessible description for an element (e.g. from aria-describedby or title).
 */
function computeAccessibleDescription(el: HTMLElement, root: HTMLElement): string | null {
  const describedBy = el.getAttribute('aria-describedby');
  if (describedBy) {
    const descIds = describedBy.split(/\s+/);
    const descTexts = descIds
      .map((id) => root.querySelector(`#${id}`)?.textContent?.trim())
      .filter(Boolean);
    if (descTexts.length > 0) {
      return descTexts.join(' ');
    }
  }

  const title = el.getAttribute('title');
  if (title && title.trim()) {
    return title.trim();
  }

  return null;
}

/**
 * Inspects element attributes, type, name, id, and labels to classify sensitive/PII data.
 */
function checkIsSensitive(
  el: HTMLElement,
  accessibleName: string
): { isSensitive: boolean; category: SensitiveCategory | null } {
  // Explicit data attribute overrides
  if (el.getAttribute('data-sensitive') === 'true') {
    const customCategory = el.getAttribute('data-sensitive-category') as SensitiveCategory;
    return {
      isSensitive: true,
      category: customCategory || 'Personal Information',
    };
  }

  // Check type="password"
  const inputType = el.getAttribute('type')?.toLowerCase() || '';
  if (inputType === 'password') {
    return { isSensitive: true, category: 'Password' };
  }

  // Check combined string signatures (id, name, autocomplete, aria-label, accessibleName)
  const combinedSignatures = [
    el.id,
    el.getAttribute('name') || '',
    el.getAttribute('autocomplete') || '',
    accessibleName,
  ].join(' ');

  if (SENSITIVE_PATTERNS.password.test(combinedSignatures)) {
    return { isSensitive: true, category: 'Password' };
  }
  if (SENSITIVE_PATTERNS.ssn.test(combinedSignatures)) {
    return { isSensitive: true, category: 'Government ID / SSN' };
  }
  if (SENSITIVE_PATTERNS.financial.test(combinedSignatures)) {
    return { isSensitive: true, category: 'Financial Data' };
  }
  if (SENSITIVE_PATTERNS.personal.test(combinedSignatures)) {
    return { isSensitive: true, category: 'Personal Information' };
  }
  if (SENSITIVE_PATTERNS.contact.test(combinedSignatures)) {
    return { isSensitive: true, category: 'Contact Information' };
  }

  return { isSensitive: false, category: null };
}

/**
 * Generates a clean, robust CSS selector for automation scripts.
 */
function generateCssSelector(el: HTMLElement, root: HTMLElement): string {
  // 1. If element has an ID, use #id
  if (el.id) {
    return `#${el.id}`;
  }

  // 2. If it's a named form control, use tag[name="..."]
  const name = el.getAttribute('name');
  if (name) {
    return `${el.tagName.toLowerCase()}[name="${name}"]`;
  }

  // 3. If it has a test id or unique data attribute
  const testId = el.getAttribute('data-testid');
  if (testId) {
    return `[data-testid="${testId}"]`;
  }

  // 4. If it has aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) {
    return `${el.tagName.toLowerCase()}[aria-label="${ariaLabel}"]`;
  }

  // 5. Fallback to path hierarchy from root
  const path: string[] = [];
  let current: HTMLElement | null = el;

  while (current && current !== root && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    if (current.className && typeof current.className === 'string') {
      const firstClass = current.className.trim().split(/\s+/)[0];
      if (firstClass && !firstClass.startsWith('hover:') && !firstClass.startsWith('focus:')) {
        selector += `.${firstClass}`;
      }
    }

    // Add nth-of-type if siblings share same tag
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === current?.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ') || el.tagName.toLowerCase();
}

/**
 * Generates an XPath expression for the element relative to container.
 */
function generateXPath(el: HTMLElement): string {
  if (el.id) {
    return `//*[@id="${el.id}"]`;
  }
  const name = el.getAttribute('name');
  if (name) {
    return `//${el.tagName.toLowerCase()}[@name="${name}"]`;
  }
  return `//${el.tagName.toLowerCase()}[contains(text(), '${(el.textContent || '').trim().slice(0, 15)}')]`;
}

/**
 * Extracts all relevant ARIA attributes from the element.
 */
function extractAriaAttributes(el: HTMLElement): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    if (attr.name.startsWith('aria-')) {
      attrs[attr.name] = attr.value;
    }
  }
  return attrs;
}

/**
 * Main DOM extraction entry point.
 * Traverses the mock browser container and parses every interactive and significant element.
 * 
 * @param container The container DOM element (ref) holding the mock webpage.
 * @returns Array of ExtractedElement objects containing DOM & accessibility data.
 */
export function extractInteractiveElements(container: HTMLElement | null): ExtractedElement[] {
  if (!container) return [];

  // Query all candidate interactive elements and form fields
  const selectorQuery = [
    'input',
    'button',
    'select',
    'textarea',
    'a[href]',
    'label',
    '[role]',
    '[tabindex]:not([tabindex="-1"])',
    '[data-interactive="true"]',
  ].join(', ');

  const candidateNodes = Array.from(container.querySelectorAll<HTMLElement>(selectorQuery));
  const containerRect = container.getBoundingClientRect();

  const extractedList: ExtractedElement[] = [];

  candidateNodes.forEach((el, index) => {
    // Determine visibility
    const style = window.getComputedStyle(el);
    const isVisible =
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      el.offsetWidth > 0 &&
      el.offsetHeight > 0;

    // Calculate relative bounding box
    const rect = el.getBoundingClientRect();
    const elementRect: ElementRect = {
      x: Math.round(rect.x - containerRect.x),
      y: Math.round(rect.y - containerRect.y),
      top: Math.round(rect.top - containerRect.top),
      left: Math.round(rect.left - containerRect.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };

    // Calculate Accessible Name & Description
    const accessibleName = computeAccessibleName(el, container);
    const accessibleDescription = computeAccessibleDescription(el, container);

    // Compute Role
    const role = getImplicitRole(el);

    // Check for Sensitive / PII data
    const { isSensitive, category: sensitiveCategory } = checkIsSensitive(el, accessibleName);

    // Current value or content
    let currentValue = '';
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      currentValue = el.value;
      // Mask value if sensitive password
      if (isSensitive && el.type === 'password' && currentValue) {
        currentValue = '•'.repeat(currentValue.length);
      }
    }

    // Required and Disabled states
    const isRequired =
      el.hasAttribute('required') ||
      el.getAttribute('aria-required') === 'true';
    const isDisabled =
      el.hasAttribute('disabled') ||
      el.getAttribute('aria-disabled') === 'true';

    // HTML snippet preview
    const outerHtml = el.outerHTML;
    const closingTagIndex = outerHtml.indexOf('>');
    const openTagSnippet = closingTagIndex !== -1 ? outerHtml.slice(0, closingTagIndex + 1) : outerHtml;

    const extracted: ExtractedElement = {
      uid: `elem-${index}-${el.tagName.toLowerCase()}-${el.id || Math.random().toString(36).substr(2, 5)}`,
      tagName: el.tagName.toUpperCase(),
      domId: el.id || null,
      name: el.getAttribute('name'),
      type: el.getAttribute('type'),
      role,
      accessibleName,
      accessibleDescription,
      ariaAttributes: extractAriaAttributes(el),
      textContent: (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
      currentValue,
      placeholder: el.getAttribute('placeholder'),
      isSensitive,
      sensitiveCategory,
      cssSelector: generateCssSelector(el, container),
      xpath: generateXPath(el),
      isVisible,
      isDisabled,
      isRequired,
      rect: elementRect,
      htmlSnippet: openTagSnippet,
    };

    extractedList.push(extracted);
  });

  return extractedList;
}

/**
 * Simulates finding the best element candidate matching a user task.
 * E.g., "Locate and click the submit button" -> finds button with type="submit" or name="Submit"
 * 
 * @param query The natural language user task query
 * @param elements The list of extracted DOM elements
 */
export function matchTaskToElement(query: string, elements: ExtractedElement[]) {
  if (!query || query.trim() === '') {
    return { matchedElement: null, confidenceScore: 0, matchedReason: 'No query provided', actionType: 'inspect' as const };
  }

  const q = query.toLowerCase().trim();

  // Universal Intent detection
  let actionType: 'click' | 'fill' | 'inspect' | 'highlight' | 'scroll' = 'inspect';
  if (/click|press|tap|submit|push|download|hit|follow|trigger|open|launch/i.test(q)) actionType = 'click';
  else if (/type|fill|enter|input|write|insert|query/i.test(q)) actionType = 'fill';
  else if (/locate|find|highlight|show|search|view|inspect/i.test(q)) actionType = 'highlight';
  else if (/scroll|down|up|bottom|top/i.test(q)) actionType = 'scroll';

  let bestMatch: ExtractedElement | null = null;
  let highestScore = 0;
  let reason = '';

  const stopWords = new Set(['the', 'and', 'or', 'in', 'on', 'at', 'to', 'a', 'an', 'for', 'of', 'with', 'all', 'is', 'it', 'me', 'please', 'can', 'you']);
  const cleanTokens = q.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));

  for (const elem of elements) {
    let score = 0;
    const reasons: string[] = [];

    const name = (elem.accessibleName || '').toLowerCase();
    const tag = elem.tagName.toLowerCase();
    const role = elem.role.toLowerCase();
    const type = (elem.type || '').toLowerCase();
    const id = (elem.domId || '').toLowerCase();
    const text = elem.textContent.toLowerCase();
    const selector = elem.cssSelector.toLowerCase();
    const placeholder = (elem.placeholder || '').toLowerCase();

    // Universal token matching
    for (const token of cleanTokens) {
      if (name.includes(token)) {
        score += 35;
        reasons.push(`Matched "${token}" in accessible name`);
      }
      if (id.includes(token)) {
        score += 35;
        reasons.push(`Matched "${token}" in element id`);
      }
      if (placeholder.includes(token)) {
        score += 30;
        reasons.push(`Matched "${token}" in placeholder`);
      }
      if (text.includes(token)) {
        score += 20;
        reasons.push(`Matched "${token}" in text content`);
      }
      if (selector.includes(token)) {
        score += 15;
      }
    }

    // Role & Tag alignment with query intent
    if (actionType === 'click' && (role === 'button' || role === 'link' || tag === 'button' || tag === 'a')) {
      score += 20;
    }
    if (actionType === 'fill' && (role === 'textbox' || role === 'searchbox' || tag === 'input' || tag === 'textarea')) {
      score += 25;
    }

    // Specific universal intents
    if (/download/i.test(q) && (id.includes('download') || name.includes('download') || text.includes('download'))) {
      score += 60;
      reasons.push('Matched "download" document action');
    }
    if (/search/i.test(q) && (role === 'searchbox' || id.includes('search') || placeholder.includes('search') || name.includes('search'))) {
      score += 55;
      reasons.push('Matched searchbox input');
    }
    if (/submit|save|continue|confirm|proceed/i.test(q) && (type === 'submit' || name.includes('submit') || text.includes('submit') || id.includes('submit'))) {
      score += 55;
      reasons.push('Matched submission trigger');
    }
    if (/login|sign\s*in/i.test(q) && (name.includes('login') || text.includes('login') || id.includes('login') || name.includes('sign in'))) {
      score += 55;
      reasons.push('Matched authentication control');
    }
    if (/sensitive|password|ssn|secret|financial/i.test(q) && elem.isSensitive) {
      score += 50;
      reasons.push(`Sensitive data category (${elem.sensitiveCategory || 'PII'})`);
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = elem;
      reason = reasons.join(', ');
    }
  }

  // Graceful Universal Fallback if no specific keyword matched
  if (!bestMatch && elements.length > 0) {
    if (actionType === 'fill') {
      bestMatch = elements.find((e) => e.tagName === 'INPUT' || e.role === 'textbox') || elements[0];
    } else {
      bestMatch = elements.find((e) => e.tagName === 'BUTTON' || e.tagName === 'A' || e.role === 'button') || elements[0];
    }
    highestScore = 65;
    reason = `Fallback: Best interactive ${bestMatch?.tagName.toLowerCase()} candidate for intent '${actionType}'`;
  }

  const confidence = Math.min(100, Math.max(65, Math.round(highestScore)));

  return {
    matchedElement: bestMatch,
    confidenceScore: confidence,
    matchedReason: reason || 'Element matches query intent',
    actionType,
  };
}
