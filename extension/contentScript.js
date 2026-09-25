/**
 * ============================================================================
 * PRIVYVISION CONTENT SCRIPT (Manifest V3)
 * Runs locally inside any live web page:
 * 1. Viewport DOM & Visual Perception
 * 2. 9-Category Local PII Scanner & Redaction
 * 3. Local Action Execution Engine
 * 4. In-Page Visual Bounding Box Overlays
 * ============================================================================
 */

(function () {
  // Prevent duplicate script execution
  if (window.__PRIVY_VISION_INITIALIZED__) return;
  window.__PRIVY_VISION_INITIALIZED__ = true;

  console.log('[PrivyVision] Content script active on:', window.location.href);

  // Overlay container injected into page
  let overlayContainer = null;
  let isOverlaysVisible = false;

  // 9 PII Detector Definitions
  const PII_DETECTORS = [
    {
      category: 'Password',
      regex: /(password|pwd|secret_key|master_pass|pin_code)/i,
      attrKw: ['password', 'pwd', 'passcode', 'pin'],
      token: '[REDACTED:PASSWORD:********]',
      format: () => '••••••••',
    },
    {
      category: 'Government ID',
      regex: /\b\d{4}\s?\d{4}\s?\d{4}\b|\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b|\b\d{3}-\d{2}-\d{4}\b|\b[A-Z][0-9]{7}\b/i,
      attrKw: ['ssn', 'aadhaar', 'pan', 'passport', 'voter_id', 'gov_id'],
      token: '[REDACTED:GOV_ID:***-**-****]',
      format: (r) => (r.length > 4 ? `***-**-${r.slice(-4)}` : '***-**-****'),
    },
    {
      category: 'Bank / Card Number',
      regex: /\b(?:\d{4}[ -]?){3}\d{4}\b|\b\d{3,4}\b(?=.*(?:cvv|cvc))|\b[A-Z]{4}0[A-Z0-9]{6}\b/i,
      attrKw: ['card', 'cvv', 'cvc', 'account', 'routing', 'ifsc', 'iban', 'cc_num'],
      token: '[REDACTED:FINANCIAL:****-****-****-****]',
      format: (r) => (r.length > 4 ? `****-****-****-${r.slice(-4)}` : '****-****-****-****'),
    },
    {
      category: 'Email',
      regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i,
      attrKw: ['email', 'mail', 'e-mail'],
      token: '[REDACTED:EMAIL:e***@***.com]',
      format: (r) => {
        const parts = r.split('@');
        return parts.length === 2 ? `${parts[0].slice(0, 1)}***@${parts[1]}` : 'e***@***.com';
      },
    },
    {
      category: 'Phone',
      regex: /(?:\+?\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}\b|\b(?:\+91|0)?[6-9]\d{9}\b/i,
      attrKw: ['phone', 'mobile', 'tel', 'cell'],
      token: '[REDACTED:PHONE:+XX-XXXX-XXXX]',
      format: (r) => (r.length > 4 ? `+XX-XXXX-${r.slice(-4)}` : '+XX-XXXX-XXXX'),
    },
    {
      category: 'Date of Birth (DOB)',
      regex: /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/i,
      attrKw: ['dob', 'birth_date', 'birthdate', 'bday'],
      token: '[REDACTED:DOB:****-**-**]',
      format: () => '****-**-**',
    },
    {
      category: 'Address',
      regex: /\b\d{5}(?:-\d{4})?\b|\b[1-9][0-9]{5}\b/i,
      attrKw: ['address', 'residence', 'street', 'city', 'pincode', 'zipcode'],
      token: '[REDACTED:ADDRESS:PROTECTED_RESIDENCE]',
      format: (r) => (r.length > 3 ? `Res-**, Pin: ${r.slice(-3)}***` : 'Protected Residence'),
    },
    {
      category: 'API Key / Secret Token',
      regex: /\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|ey[a-zA-Z0-9_-]{15,}\.[a-zA-Z0-9_-]{15,}|bearer\s+[a-zA-Z0-9._-]+)\b/i,
      attrKw: ['api_key', 'apikey', 'secret_token', 'access_token', 'jwt'],
      token: '[REDACTED:API_KEY:sk-****************]',
      format: (r) => (r.startsWith('sk-') ? `sk-****${r.slice(-4)}` : 'token-********'),
    },
    {
      category: 'Face / Biometric',
      regex: /(face|avatar|biometric|profile_pic|user_photo|portrait)/i,
      attrKw: ['avatar', 'face', 'portrait', 'user-photo'],
      token: '[REDACTED:FACE:BIOMETRIC_ANONYMIZED]',
      format: () => '[Facial Biometric Masked]',
    },
  ];

  /**
   * Scans the active page and grounds elements + detects PII locally
   */
  function scanCurrentPage() {
    const startTime = performance.now();
    const grounded = [];
    const piiList = [];

    const candidates = document.querySelectorAll(
      'button, input, select, textarea, a[href], [role="button"], [role="link"], [role="checkbox"], [role="combobox"], [role="dialog"], [role="alertdialog"], img, h1, h2, h3, label, p, .clickable'
    );

    let idx = 0;
    candidates.forEach((node) => {
      const rect = node.getBoundingClientRect();
      if (rect.width <= 2 || rect.height <= 2) return;
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

      idx++;
      const uid = node.getAttribute('data-pv-id') || `pv-live-${idx}`;
      node.setAttribute('data-pv-id', uid);

      const tagName = node.tagName.toUpperCase();
      const typeAttr = (node.getAttribute('type') || '').toLowerCase();
      const roleAttr = node.getAttribute('role') || '';
      const domId = node.id || null;
      const nameAttr = node.getAttribute('name') || '';
      const ariaLabel = node.getAttribute('aria-label') || '';
      const altText = node.getAttribute('alt') || '';

      let elementType = 'text';
      if (tagName === 'BUTTON' || roleAttr === 'button' || typeAttr === 'button' || typeAttr === 'submit') {
        elementType = 'button';
      } else if (tagName === 'INPUT' && (typeAttr === 'checkbox' || roleAttr === 'checkbox')) {
        elementType = 'checkbox';
      } else if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
        elementType = 'input';
      } else if (tagName === 'SELECT' || roleAttr === 'combobox') {
        elementType = 'dropdown';
      } else if (tagName === 'A' || roleAttr === 'link') {
        elementType = 'link';
      } else if (tagName === 'IMG' || roleAttr === 'img') {
        elementType = 'image';
      } else if (roleAttr === 'dialog' || roleAttr === 'alertdialog') {
        elementType = 'dialog';
      }

      const ocrText = (node.textContent || node.value || node.placeholder || altText || '').trim();
      const label = ariaLabel || node.getAttribute('title') || altText || ocrText;

      // Multi-signal PII check
      let isSensitive = false;
      let sensitiveCategory = null;
      let placeholder = null;

      const rawVal = (node.value || ocrText).toString();
      const attrBlob = `${domId || ''} ${nameAttr} ${typeAttr} ${ariaLabel} ${node.className}`.toLowerCase();

      for (const det of PII_DETECTORS) {
        const domMatch = det.attrKw.some((k) => attrBlob.includes(k)) || (det.category === 'Password' && typeAttr === 'password');
        const regexMatch = det.regex.test(rawVal) || det.regex.test(ocrText);

        if (domMatch || regexMatch) {
          isSensitive = true;
          sensitiveCategory = det.category;
          placeholder = det.token;

          piiList.push({
            id: `pii-${piiList.length + 1}`,
            category: det.category,
            fieldName: label || domId || tagName,
            rawSample: det.format(rawVal || ocrText),
            maskedToken: det.token,
            box: {
              x: Math.round(rect.left + window.scrollX),
              y: Math.round(rect.top + window.scrollY),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
          });
          break;
        }
      }

      const cssSelector = domId ? `#${domId}` : `${tagName.toLowerCase()}${typeAttr ? `[type="${typeAttr}"]` : ''}`;

      grounded.push({
        uid,
        type: elementType,
        role: roleAttr || elementType,
        label: label.slice(0, 60),
        cssSelector,
        domId,
        isSensitive,
        sensitiveCategory,
        placeholder,
        box: {
          x: Math.round(rect.left + window.scrollX),
          y: Math.round(rect.top + window.scrollY),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
      });
    });

    const durationMs = Math.round((performance.now() - startTime) * 10) / 10;

    return {
      url: window.location.href,
      title: document.title,
      elementsCount: grounded.length,
      piiCount: piiList.length,
      durationMs,
      elements: grounded,
      pii: piiList,
    };
  }

  /**
   * Executes a verified browser action locally
   */
  function executeLocalAction(action) {
    const { actionType, targetSelector, payload } = action;
    const target = document.querySelector(targetSelector);

    if (!target) {
      return { success: false, error: `Target element not found: ${targetSelector}` };
    }

    try {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });

      if (actionType === 'click') {
        target.focus();
        target.click();
        return { success: true, message: `Clicked element: ${targetSelector}` };
      }

      if (actionType === 'fill') {
        target.focus();
        target.value = payload || '';
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true, message: `Filled value into: ${targetSelector}` };
      }

      if (actionType === 'check') {
        target.checked = Boolean(payload !== false);
        target.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true, message: `Toggled checkbox: ${targetSelector}` };
      }

      return { success: false, error: `Unsupported action type: ${actionType}` };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  /**
   * Renders visual bounding box overlays on top of the live page
   */
  function renderVisualOverlays(scanResult) {
    if (!overlayContainer) {
      overlayContainer = document.createElement('div');
      overlayContainer.id = 'privyvision-overlay-container';
      document.body.appendChild(overlayContainer);
    }

    overlayContainer.innerHTML = '';

    scanResult.elements.forEach((el) => {
      const box = document.createElement('div');
      box.className = `pv-bbox ${el.isSensitive ? 'pv-bbox-sensitive' : 'pv-bbox-interactive'}`;
      box.style.left = `${el.box.x}px`;
      box.style.top = `${el.box.y}px`;
      box.style.width = `${el.box.width}px`;
      box.style.height = `${el.box.height}px`;

      const tag = document.createElement('div');
      tag.className = 'pv-bbox-tag';
      tag.textContent = el.isSensitive ? `🔒 ${el.sensitiveCategory}` : el.type;
      box.appendChild(tag);

      overlayContainer.appendChild(box);
    });

    isOverlaysVisible = true;
  }

  function removeVisualOverlays() {
    if (overlayContainer) {
      overlayContainer.innerHTML = '';
      isOverlaysVisible = false;
    }
  }

  // Inject corner floating status indicator
  function renderCornerBadge(scanResult) {
    let badge = document.getElementById('privyvision-floating-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'privyvision-floating-badge';
      document.body.appendChild(badge);
    }

    badge.innerHTML = `
      <div class="pv-badge-inner">
        <span class="pv-dot"></span>
        <span class="pv-title">PrivyVision Agent Active</span>
        <span class="pv-stat">${scanResult.elementsCount} Grounded</span>
        <span class="pv-stat pv-pii">${scanResult.piiCount} Protected</span>
      </div>
    `;
  }

  // Listen to messages from background service worker or popup
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'RUN_LOCAL_PERCEPTION') {
      const scanResult = scanCurrentPage();
      renderCornerBadge(scanResult);
      sendResponse(scanResult);
      return true;
    }

    if (message.type === 'EXECUTE_ACTION') {
      const result = executeLocalAction(message.action);
      sendResponse(result);
      return true;
    }

    if (message.type === 'TOGGLE_VISUAL_OVERLAYS') {
      if (message.enabled) {
        const scan = scanCurrentPage();
        renderVisualOverlays(scan);
      } else {
        removeVisualOverlays();
      }
      sendResponse({ visible: isOverlaysVisible });
      return true;
    }
  });

  // Initial passive scan on idle
  setTimeout(() => {
    const scan = scanCurrentPage();
    renderCornerBadge(scan);
  }, 1000);
})();
