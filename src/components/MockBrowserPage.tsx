import React, { useState, forwardRef } from 'react';
import {
  Lock,
  RotateCw,
  ArrowRight,
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  User,
  CheckCircle,
  Search,
  Download,
  Zap,
  Globe,
  Code,
  ExternalLink,
  Loader2,
  FileText,
  Activity,
} from 'lucide-react';
import type { ExtractedElement } from '../types/dom';

export type BrowserMode = 'portal' | 'live' | 'custom_html';

interface MockBrowserPageProps {
  /** Currently highlighted element from the sidebar or task executor */
  highlightedElementId: string | null;
  /** Currently selected element for deep inspection */
  selectedElementId: string | null;
  /** Callback when an element on the mock page is clicked */
  onElementClick: (elementDomId: string | null, tagName: string) => void;
  /** Callback when an element on the mock page is hovered */
  onElementHover: (elementDomId: string | null) => void;
  /** Callback when DOM contents change (to trigger auto extraction) */
  onDomMutation: () => void;
  /** Callback when a live website is extracted via proxy */
  onLiveElementsExtracted?: (elements: ExtractedElement[], url: string, title: string) => void;
  /** Callback to restore local simulated portal elements */
  onResetToLocalDom?: () => void;
  /** Callback to open website in live monitoring console */
  onOpenLiveMonitor?: (url: string) => void;
}

const DEFAULT_PORTAL_URL = 'https://portal.space-ops.gov.in/personnel/secure-registration';

const DEFAULT_CUSTOM_HTML = `<!-- Custom Webpage Sandbox: Paste any HTML snippet here -->
<div class="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md space-y-4">
  <div class="border-b pb-3">
    <h2 class="text-xl font-bold text-slate-800">Universal Payment & Checkout Gateway</h2>
    <p class="text-xs text-slate-500">Simulate any arbitrary e-commerce or financial transaction form.</p>
  </div>
  <form id="payment-checkout-form" onsubmit="event.preventDefault(); alert('Order placed!');" class="space-y-3">
    <div>
      <label for="cust-name" class="block text-xs font-semibold text-slate-700">Cardholder Full Name</label>
      <input id="cust-name" type="text" placeholder="John Doe" value="Ada Lovelace" class="w-full border rounded p-2 text-sm" />
    </div>
    <div>
      <label for="card-num" class="block text-xs font-semibold text-slate-700">Credit / Debit Card Number <span class="text-rose-500 text-xs font-bold">[Sensitive]</span></label>
      <input id="card-num" type="text" data-sensitive="true" data-sensitive-category="Financial Data" value="4532-8921-9941-8821" class="w-full border rounded p-2 text-sm font-mono" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label for="card-expiry" class="block text-xs font-semibold text-slate-700">Expiry (MM/YY)</label>
        <input id="card-expiry" type="text" placeholder="12/28" value="08/29" class="w-full border rounded p-2 text-sm" />
      </div>
      <div>
        <label for="card-cvv" class="block text-xs font-semibold text-slate-700">CVV / CVC <span class="text-rose-500 text-xs font-bold">[Sensitive]</span></label>
        <input id="card-cvv" type="password" data-sensitive="true" data-sensitive-category="Financial Data" value="984" class="w-full border rounded p-2 text-sm font-mono" />
      </div>
    </div>
    <div class="pt-2 flex gap-2">
      <button id="btn-submit-payment" type="submit" class="bg-indigo-600 text-white font-semibold px-4 py-2 rounded text-sm hover:bg-indigo-700">
        Authorize & Complete Payment
      </button>
      <button id="btn-cancel-payment" type="button" class="border border-slate-300 text-slate-700 px-4 py-2 rounded text-sm hover:bg-slate-100">
        Cancel Order
      </button>
    </div>
  </form>
</div>`;

export const MockBrowserPage = forwardRef<HTMLDivElement, MockBrowserPageProps>(
  (
    {
      highlightedElementId,
      selectedElementId,
      onElementClick,
      onElementHover,
      onDomMutation,
      onLiveElementsExtracted,
      onResetToLocalDom,
      onOpenLiveMonitor,
    },
    ref
  ) => {
    // Browser Modes: 'portal' | 'live' | 'custom_html'
    const [browserMode, setBrowserMode] = useState<BrowserMode>('portal');
    const [urlInput, setUrlInput] = useState<string>(DEFAULT_PORTAL_URL);
    const [activeUrl, setActiveUrl] = useState<string>(DEFAULT_PORTAL_URL);
    const [isLoadingUrl, setIsLoadingUrl] = useState<boolean>(false);
    const [urlLoadError, setUrlLoadError] = useState<string | null>(null);
    const [customHtml, setCustomHtml] = useState<string>(DEFAULT_CUSTOM_HTML);
    const [livePageTitle, setLivePageTitle] = useState<string>('SpaceOps Secure Portal');
    const [liveElementCount, setLiveElementCount] = useState<number>(0);

    // Local form state for interactive simulation (Portal Mode)
    const [fullName, setFullName] = useState('Dr. Vikram Sarabhai');
    const [email, setEmail] = useState('vikram.s@isro.gov.in');
    const [password, setPassword] = useState('SuperSecretPass!2026');
    const [showPassword, setShowPassword] = useState(false);
    const [ssn, setSsn] = useState('987-65-4321');
    const [phone, setPhone] = useState('+91 98450 12345');
    const [dob, setDob] = useState('1990-08-15');
    const [address, setAddress] = useState('Sector 4, Space Research Complex, Sriharikota, AP - 524124');
    const [apiKey, setApiKey] = useState('sk-live_948201948201958201');
    const [salary, setSalary] = useState('125000');
    const [secretQuestion, setSecretQuestion] = useState('Chandrayaan-3 Landing Site');
    const [role, setRole] = useState('payload-engineer');
    const [agreedTerms, setAgreedTerms] = useState(true);
    const [enable2FA, setEnable2FA] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [billAccount, setBillAccount] = useState('ACCT-8921-EL-77');
    const [meterNumber, setMeterNumber] = useState('MTR-9941-X');
    const [billAmount, setBillAmount] = useState('₹4,850.00');
    const [billDownloaded, setBillDownloaded] = useState(false);

    // Handles electricity bill download
    const handleDownloadBill = () => {
      setBillDownloaded(true);
      setStatusMessage('⚡ Electricity Bill PDF downloaded successfully! Sensitive billing metrics preserved.');
      setTimeout(() => {
        setBillDownloaded(false);
        setStatusMessage(null);
      }, 4000);
      onDomMutation();
    };

    // Handles form submission event
    const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setStatusMessage('Registration form submitted successfully! Validation passed.');
      setTimeout(() => setStatusMessage(null), 4000);
      onDomMutation();
    };

    // Helper to determine if an element is currently highlighted or selected
    const getHighlightClass = (domId: string) => {
      let classes = 'mock-interactive-element';
      if (highlightedElementId === domId) {
        classes += ' is-task-highlighted';
      }
      if (selectedElementId === domId) {
        classes += ' is-inspector-selected';
      }
      return classes;
    };

    // Navigate to any live URL on the internet
    const navigateToUrl = async (targetUrl: string) => {
      const trimmed = targetUrl.trim();
      if (!trimmed) return;

      setUrlInput(trimmed);
      setActiveUrl(trimmed);
      setUrlLoadError(null);

      // Check if user requested the default SpaceOps portal
      if (trimmed.includes('portal.space-ops.gov.in') || trimmed === 'spaceops') {
        setBrowserMode('portal');
        onResetToLocalDom?.();
        return;
      }

      setBrowserMode('live');
      setIsLoadingUrl(true);

      try {
        const res = await fetch('http://localhost:3001/api/proxy/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: trimmed }),
        });

        if (!res.ok) {
          throw new Error(`Failed to load URL (${res.status}: ${res.statusText})`);
        }

        const data = await res.json();
        setLivePageTitle(data.title || trimmed);
        setLiveElementCount(data.totalElementsExtracted || 0);

        if (data.elements && onLiveElementsExtracted) {
          // Map to ExtractedElement format
          const mapped: ExtractedElement[] = data.elements.map((e: any, idx: number) => ({
            uid: e.id || `live-${idx}`,
            tagName: e.tagName,
            domId: e.domId || null,
            name: e.name || null,
            type: e.type || null,
            role: e.role,
            accessibleName: e.accessibleName,
            accessibleDescription: null,
            ariaAttributes: {},
            textContent: e.displayValueOrText || '',
            currentValue: e.displayValueOrText || '',
            placeholder: e.placeholder || null,
            isSensitive: e.isSensitive,
            sensitiveCategory: e.sensitiveCategory,
            cssSelector: e.cssSelector,
            xpath: `//${e.tagName.toLowerCase()}`,
            isVisible: true,
            isDisabled: Boolean(e.interactivity?.disabled),
            isRequired: Boolean(e.interactivity?.required),
            rect: { ...e.rect, top: e.rect.y, left: e.rect.x },
            htmlSnippet: `<${e.tagName.toLowerCase()} id="${e.domId || ''}">${e.accessibleName}</${e.tagName.toLowerCase()}>`,
          }));

          onLiveElementsExtracted(mapped, trimmed, data.title);
        }
      } catch (err) {
        setUrlLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoadingUrl(false);
      }
    };

    const handleUrlSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      navigateToUrl(urlInput);
    };

    const handleSwitchMode = (mode: BrowserMode) => {
      setBrowserMode(mode);
      if (mode === 'portal') {
        setUrlInput(DEFAULT_PORTAL_URL);
        setActiveUrl(DEFAULT_PORTAL_URL);
        onResetToLocalDom?.();
      } else if (mode === 'custom_html') {
        setUrlInput('sandbox://custom-html-payload');
        setActiveUrl('sandbox://custom-html-payload');
        setTimeout(() => onDomMutation(), 100);
      } else if (mode === 'live' && activeUrl.includes('portal.space-ops.gov.in')) {
        navigateToUrl('https://example.com');
      }
    };

    return (
      <div className="browser-window-container">
        {/* Browser Chrome: Top Bar & Address Bar */}
        <div className="browser-chrome-header">
          <div className="browser-window-buttons">
            <span className="window-dot dot-red" />
            <span className="window-dot dot-yellow" />
            <span className="window-dot dot-green" />
          </div>

          <div className="browser-nav-controls">
            <button
              className="chrome-icon-btn"
              aria-label="Reload Page"
              onClick={() => {
                if (browserMode === 'live') navigateToUrl(activeUrl);
                else onDomMutation();
              }}
              title="Reload and Refresh DOM Extraction"
            >
              <RotateCw size={13} className={isLoadingUrl ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-md text-xs font-semibold">
            <button
              type="button"
              className={`px-2 py-1 rounded transition-all flex items-center gap-1.5 ${
                browserMode === 'portal' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => handleSwitchMode('portal')}
            >
              <Shield size={12} />
              <span>Simulated Portal</span>
            </button>
            <button
              type="button"
              className={`px-2 py-1 rounded transition-all flex items-center gap-1.5 ${
                browserMode === 'live' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => handleSwitchMode('live')}
            >
              <Globe size={12} />
              <span>Live Web (Any URL)</span>
            </button>
            <button
              type="button"
              className={`px-2 py-1 rounded transition-all flex items-center gap-1.5 ${
                browserMode === 'custom_html' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => handleSwitchMode('custom_html')}
            >
              <Code size={12} />
              <span>HTML Sandbox</span>
            </button>
          </div>

          {/* Interactive Universal Address Bar */}
          <form onSubmit={handleUrlSubmit} className="flex-1 flex items-center relative">
            <div className="browser-url-bar w-full flex items-center gap-1.5">
              <Lock size={12} className="text-emerald-500 shrink-0" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter any website URL (e.g., https://en.wikipedia.org, https://example.com)..."
                className="bg-transparent border-none text-xs text-slate-800 font-medium focus:outline-none w-full"
                aria-label="Website address input"
              />
              <button
                type="submit"
                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded shrink-0"
                title="Navigate to URL"
              >
                <ArrowRight size={13} />
              </button>
            </div>
          </form>

          {/* Status Chip & Live Monitor Shortcut */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              className="px-2 py-1 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-xs font-semibold flex items-center gap-1 border border-slate-200 transition-all shrink-0 cursor-pointer"
              onClick={() => onOpenLiveMonitor?.(activeUrl)}
              title="Open this website in the Continuous Live Monitoring Console"
            >
              <Activity size={12} className="text-emerald-500" />
              <span>Live Monitor</span>
            </button>
            <div className="browser-status-chip shrink-0">
              <span className="status-indicator-live" />
              <span className="text-xs font-mono">
                {browserMode === 'live' ? (isLoadingUrl ? 'LOADING' : 'LIVE PROXY') : browserMode === 'custom_html' ? 'SANDBOX' : 'PORTAL'}
              </span>
            </div>
          </div>
        </div>

        {/* Preset URL Navigation Bar for 1-Click Universal Browsing */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-3 py-1.5 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wide shrink-0">Quick Websites:</span>
          <button
            type="button"
            className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 font-medium shrink-0 flex items-center gap-1"
            onClick={() => navigateToUrl(DEFAULT_PORTAL_URL)}
          >
            🛰️ SpaceOps Portal
          </button>
          <button
            type="button"
            className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 font-medium shrink-0 flex items-center gap-1"
            onClick={() => navigateToUrl('https://example.com')}
          >
            🌐 Example Domain
          </button>
          <button
            type="button"
            className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 font-medium shrink-0 flex items-center gap-1"
            onClick={() => navigateToUrl('https://en.wikipedia.org/wiki/Main_Page')}
          >
            📖 Wikipedia Main
          </button>
          <button
            type="button"
            className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 font-medium shrink-0 flex items-center gap-1"
            onClick={() => navigateToUrl('https://news.ycombinator.com')}
          >
            📰 Hacker News
          </button>
        </div>

        {/* =========================================================================
            VIEWPORT MODE 1: LIVE PROXY WEBPAGE EMBEDDING
           ========================================================================= */}
        {browserMode === 'live' && (
          <div className="flex-1 flex flex-col relative bg-white overflow-hidden">
            {isLoadingUrl ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-slate-500">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
                <p className="font-semibold text-sm">Fetching and parsing live website DOM...</p>
                <p className="text-xs text-slate-400 font-mono">{activeUrl}</p>
              </div>
            ) : urlLoadError ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
                  <AlertTriangle size={24} />
                </div>
                <h4 className="font-bold text-slate-800 mb-1">Failed to Proxy Website</h4>
                <p className="text-xs text-slate-500 max-w-md mb-4">{urlLoadError}</p>
                <button
                  type="button"
                  className="mock-btn-primary"
                  onClick={() => navigateToUrl(DEFAULT_PORTAL_URL)}
                >
                  Return to Simulated Portal
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full">
                {/* Live Banner info */}
                <div className="bg-indigo-50/70 border-b border-indigo-100 px-3 py-1.5 flex items-center justify-between text-xs text-indigo-900 shrink-0">
                  <div className="flex items-center gap-2">
                    <Globe size={13} className="text-indigo-600" />
                    <span className="font-bold">{livePageTitle}</span>
                    <span className="text-slate-500 text-[11px]">({activeUrl})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-white border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-semibold text-indigo-700">
                      {liveElementCount} Interactive Elements Extracted
                    </span>
                    <a
                      href={activeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      Open in New Tab <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                {/* Proxied Live Iframe Viewport */}
                <iframe
                  src={`http://localhost:3001/api/proxy/page?url=${encodeURIComponent(activeUrl)}`}
                  className="flex-1 w-full border-none h-full bg-white"
                  title="Live Proxied Webpage"
                  sandbox="allow-same-origin allow-scripts allow-forms"
                />
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            VIEWPORT MODE 2: CUSTOM HTML SANDBOX
           ========================================================================= */}
        {browserMode === 'custom_html' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            <div className="grid grid-cols-2 flex-1 overflow-hidden divide-x divide-slate-200">
              {/* Left Column: Raw HTML Editor */}
              <div className="flex flex-col p-3 overflow-hidden bg-slate-900 text-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText size={13} />
                    Custom HTML Code Input
                  </span>
                  <button
                    type="button"
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-2 py-1 rounded"
                    onClick={onDomMutation}
                  >
                    Re-extract DOM
                  </button>
                </div>
                <textarea
                  value={customHtml}
                  onChange={(e) => {
                    setCustomHtml(e.target.value);
                    onDomMutation();
                  }}
                  className="flex-1 w-full bg-slate-950 font-mono text-xs text-emerald-400 p-2.5 rounded border border-slate-700 focus:outline-none focus:border-indigo-500 resize-none"
                  placeholder="Paste or write any HTML markup here..."
                />
              </div>

              {/* Right Column: Live Rendered Viewport */}
              <div
                ref={ref}
                className="flex-1 p-4 overflow-y-auto bg-white"
                id="mock-webpage-root"
                dangerouslySetInnerHTML={{ __html: customHtml }}
              />
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEWPORT MODE 3: SPACEOPS SECURE SIMULATED PORTAL (DEFAULT)
           ========================================================================= */}
        {browserMode === 'portal' && (
          <div
            ref={ref}
            className="browser-viewport-content"
            id="mock-webpage-root"
            role="main"
            aria-label="Simulated Webpage Viewport"
          >
            {/* Mock Page Top Navigation Bar */}
            <header className="mock-site-header">
              <div className="mock-brand-badge">
                <Shield size={20} className="text-indigo-400" />
                <div className="mock-brand-text">
                  <span className="brand-title">SpaceOps Secure Portal</span>
                  <span className="brand-sub">Mission Control Access</span>
                </div>
              </div>

              {/* Header Search Widget */}
              <div className="mock-header-search">
                <input
                  id="site-search-input"
                  type="search"
                  className={`mock-input-search ${getHighlightClass('site-search-input')}`}
                  placeholder="Search protocols, missions, team..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search SpaceOps mission database"
                  onMouseEnter={() => onElementHover('site-search-input')}
                  onMouseLeave={() => onElementHover(null)}
                  onClick={() => onElementClick('site-search-input', 'INPUT')}
                />
                <button
                  id="btn-header-search"
                  type="button"
                  className={`mock-btn-icon ${getHighlightClass('btn-header-search')}`}
                  aria-label="Execute search"
                  onMouseEnter={() => onElementHover('btn-header-search')}
                  onMouseLeave={() => onElementHover(null)}
                  onClick={() => onElementClick('btn-header-search', 'BUTTON')}
                >
                  <Search size={15} />
                </button>
              </div>
            </header>

            {/* Submission Status Alert Banner */}
            {statusMessage && (
              <div className="mock-alert-success" role="status" aria-live="polite">
                <CheckCircle size={18} />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Main Content Area */}
            <div className="mock-form-card">
              <div className="mock-form-header flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="form-header-icon">
                    <User size={22} />
                  </div>
                  <div>
                    <h1 className="mock-page-title">Officer Clearance & Onboarding Form</h1>
                    <p className="mock-page-desc">
                      Please complete the form below to register your credentials. Fields with sensitive security markers are encrypted.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <img
                    id="officer-face-avatar"
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80"
                    alt="Officer Identity Face Portrait"
                    data-sensitive="true"
                    data-sensitive-category="Face / Biometric"
                    className="w-11 h-11 rounded-full border-2 border-indigo-400 object-cover shadow"
                    onClick={() => onElementClick('officer-face-avatar', 'IMG')}
                  />
                  <span className="text-[9px] font-mono text-slate-400 mt-0.5">[Biometric Photo]</span>
                </div>
              </div>

              <form onSubmit={handleFormSubmit} id="clearance-registration-form" noValidate>
                {/* SECTION 1: Personal Information */}
                <div className="mock-form-section">
                  <h2 className="mock-section-title">1. Personal & Contact Information</h2>

                  <div className="mock-grid-2">
                    {/* Full Name */}
                    <div className="mock-form-group">
                      <label htmlFor="input-full-name" className="mock-label">
                        Full Legal Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="input-full-name"
                        name="fullName"
                        type="text"
                        required
                        aria-required="true"
                        className={`mock-input ${getHighlightClass('input-full-name')}`}
                        placeholder="e.g. Vikram Sarabhai"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        onMouseEnter={() => onElementHover('input-full-name')}
                        onMouseLeave={() => onElementHover(null)}
                        onClick={() => onElementClick('input-full-name', 'INPUT')}
                      />
                    </div>

                    {/* Email Address */}
                    <div className="mock-form-group">
                      <label htmlFor="input-email" className="mock-label">
                        Official Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="input-email"
                        name="email"
                        type="email"
                        required
                        aria-describedby="email-hint"
                        className={`mock-input ${getHighlightClass('input-email')}`}
                        placeholder="name@isro.gov.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onMouseEnter={() => onElementHover('input-email')}
                        onMouseLeave={() => onElementHover(null)}
                        onClick={() => onElementClick('input-email', 'INPUT')}
                      />
                      <span id="email-hint" className="mock-field-hint">
                        Must be an authorized government space agency email.
                      </span>
                    </div>
                  </div>

                  <div className="mock-grid-2">
                    {/* Phone Number */}
                    <div className="mock-form-group">
                      <label htmlFor="input-phone" className="mock-label">
                        Contact Phone (Mobile)
                      </label>
                      <input
                        id="input-phone"
                        name="phone"
                        type="tel"
                        className={`mock-input ${getHighlightClass('input-phone')}`}
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onMouseEnter={() => onElementHover('input-phone')}
                        onMouseLeave={() => onElementHover(null)}
                        onClick={() => onElementClick('input-phone', 'INPUT')}
                      />
                    </div>

                    {/* Date of Birth (Personal Info) */}
                    <div className="mock-form-group">
                      <label htmlFor="input-dob" className="mock-label">
                        Date of Birth <span className="mock-badge-sensitive">Personal Info</span>
                      </label>
                      <input
                        id="input-dob"
                        name="dob"
                        type="date"
                        data-sensitive="true"
                        data-sensitive-category="Personal Information"
                        className={`mock-input ${getHighlightClass('input-dob')}`}
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        onMouseEnter={() => onElementHover('input-dob')}
                        onMouseLeave={() => onElementHover(null)}
                        onClick={() => onElementClick('input-dob', 'INPUT')}
                      />
                    </div>

                    {/* Address Field */}
                    <div className="mock-form-group col-span-2">
                      <label htmlFor="input-address" className="mock-label">
                        Permanent Residential Address <span className="mock-badge-sensitive">Address</span>
                      </label>
                      <input
                        id="input-address"
                        name="address"
                        type="text"
                        data-sensitive="true"
                        data-sensitive-category="Address"
                        className={`mock-input ${getHighlightClass('input-address')}`}
                        placeholder="Street, Research Complex, Pin: 524124"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        onMouseEnter={() => onElementHover('input-address')}
                        onMouseLeave={() => onElementHover(null)}
                        onClick={() => onElementClick('input-address', 'INPUT')}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Sensitive Credentials & National Identifiers */}
                <div className="mock-form-section mock-section-sensitive">
                  <div className="mock-section-header-sensitive">
                    <AlertTriangle size={16} className="text-amber-400" />
                    <h2 className="mock-section-title text-amber-300">
                      2. Security Credentials & Sensitive Identifiers
                    </h2>
                  </div>

                  <div className="mock-grid-2">
                    {/* Password Field (Sensitive) */}
                    <div className="mock-form-group">
                      <label htmlFor="input-password" className="mock-label">
                        Master Access Password <span className="mock-badge-sensitive">Sensitive</span>
                      </label>
                      <div className="mock-password-wrapper">
                        <input
                          id="input-password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          data-sensitive="true"
                          data-sensitive-category="Password"
                          className={`mock-input pr-10 ${getHighlightClass('input-password')}`}
                          placeholder="Enter 12+ characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onMouseEnter={() => onElementHover('input-password')}
                          onMouseLeave={() => onElementHover(null)}
                          onClick={() => onElementClick('input-password', 'INPUT')}
                        />
                        <button
                          type="button"
                          id="btn-toggle-password"
                          className={`mock-password-toggle ${getHighlightClass('btn-toggle-password')}`}
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onMouseEnter={() => onElementHover('btn-toggle-password')}
                          onMouseLeave={() => onElementHover(null)}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Social Security / National ID Number (Sensitive) */}
                    <div className="mock-form-group">
                      <label htmlFor="input-ssn" className="mock-label">
                        National ID / SSN Number <span className="mock-badge-sensitive">Govt ID</span>
                      </label>
                      <input
                        id="input-ssn"
                        name="ssn"
                        type="text"
                        data-sensitive="true"
                        data-sensitive-category="Government ID / SSN"
                        className={`mock-input font-mono ${getHighlightClass('input-ssn')}`}
                        placeholder="XXX-XX-XXXX"
                        value={ssn}
                        onChange={(e) => setSsn(e.target.value)}
                        onMouseEnter={() => onElementHover('input-ssn')}
                        onMouseLeave={() => onElementHover(null)}
                        onClick={() => onElementClick('input-ssn', 'INPUT')}
                      />
                    </div>
                  </div>

                  <div className="mock-grid-2">
                    {/* Annual Compensation / Financial Info */}
                    <div className="mock-form-group">
                      <label htmlFor="input-salary" className="mock-label">
                        Annual Compensation (INR) <span className="mock-badge-sensitive">Financial</span>
                      </label>
                      <input
                        id="input-salary"
                        name="salary"
                        type="number"
                        data-sensitive="true"
                        data-sensitive-category="Financial Data"
                        className={`mock-input ${getHighlightClass('input-salary')}`}
                        placeholder="e.g. 1500000"
                        value={salary}
                        onChange={(e) => setSalary(e.target.value)}
                        onMouseEnter={() => onElementHover('input-salary')}
                        onMouseLeave={() => onElementHover(null)}
                        onClick={() => onElementClick('input-salary', 'INPUT')}
                      />
                    </div>

                    {/* Secret Security Recovery Question */}
                    <div className="mock-form-group">
                      <label htmlFor="input-secret-question" className="mock-label">
                        Emergency Security Answer <span className="mock-badge-sensitive">Secret</span>
                      </label>
                      <input
                        id="input-secret-question"
                        name="secretAnswer"
                        type="text"
                        data-sensitive="true"
                        data-sensitive-category="Personal Information"
                        className={`mock-input ${getHighlightClass('input-secret-question')}`}
                        placeholder="Recovery keyword"
                        value={secretQuestion}
                        onChange={(e) => setSecretQuestion(e.target.value)}
                        onMouseEnter={() => onElementHover('input-secret-question')}
                        onMouseLeave={() => onElementHover(null)}
                        onClick={() => onElementClick('input-secret-question', 'INPUT')}
                      />
                    </div>

                    {/* API Key / Secret Token */}
                    <div className="mock-form-group col-span-2">
                      <label htmlFor="input-api-key" className="mock-label">
                        Orbital API Access Token <span className="mock-badge-sensitive">API Key</span>
                      </label>
                      <input
                        id="input-api-key"
                        name="apiKey"
                        type="password"
                        data-sensitive="true"
                        data-sensitive-category="API Key / Secret Token"
                        className={`mock-input font-mono ${getHighlightClass('input-api-key')}`}
                        placeholder="sk-****************"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        onMouseEnter={() => onElementHover('input-api-key')}
                        onMouseLeave={() => onElementHover(null)}
                        onClick={() => onElementClick('input-api-key', 'INPUT')}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Role & Organization */}
                <div className="mock-form-section">
                  <h2 className="mock-section-title">3. Mission Role & Preferences</h2>

                  <div className="mock-form-group">
                    <label htmlFor="select-role" className="mock-label">
                      Primary Operational Role <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="select-role"
                      name="role"
                      className={`mock-select ${getHighlightClass('select-role')}`}
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      onMouseEnter={() => onElementHover('select-role')}
                      onMouseLeave={() => onElementHover(null)}
                      onClick={() => onElementClick('select-role', 'SELECT')}
                    >
                      <option value="flight-director">Flight Director / Mission Commander</option>
                      <option value="payload-engineer">Payload & Propulsion Engineer</option>
                      <option value="telemetry-specialist">Telemetry & Satellite Ground Station</option>
                      <option value="security-auditor">Cyber & Cryptographic Security Auditor</option>
                    </select>
                  </div>

                  {/* Checkbox controls */}
                  <div className="mock-checkbox-group">
                    <label htmlFor="checkbox-2fa" className="mock-checkbox-label">
                      <input
                        id="checkbox-2fa"
                        name="enable2fa"
                        type="checkbox"
                        className={`mock-checkbox ${getHighlightClass('checkbox-2fa')}`}
                        checked={enable2FA}
                        onChange={(e) => setEnable2FA(e.target.checked)}
                        onMouseEnter={() => onElementHover('checkbox-2fa')}
                        onMouseLeave={() => onElementHover(null)}
                        onClick={() => onElementClick('checkbox-2fa', 'INPUT')}
                      />
                      <span className="checkbox-text">
                        <strong>Enable Multi-Factor Authentication (MFA)</strong> - Require hardware security key or TOTP on every login.
                      </span>
                    </label>

                    <label htmlFor="checkbox-terms" className="mock-checkbox-label">
                      <input
                        id="checkbox-terms"
                        name="agreeTerms"
                        type="checkbox"
                        required
                        aria-required="true"
                        className={`mock-checkbox ${getHighlightClass('checkbox-terms')}`}
                        checked={agreedTerms}
                        onChange={(e) => setAgreedTerms(e.target.checked)}
                        onMouseEnter={() => onElementHover('checkbox-terms')}
                        onMouseLeave={() => onElementHover(null)}
                        onClick={() => onElementClick('checkbox-terms', 'INPUT')}
                      />
                      <span className="checkbox-text">
                        I agree to the <strong>National Space Security Protocols</strong> and clearance terms.
                      </span>
                    </label>
                  </div>
                </div>

                {/* SECTION 4: Utility Invoicing & Electricity Billing */}
                <div className="mock-form-section" id="utility-billing-section">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-md bg-amber-100 text-amber-700">
                      <Zap size={18} />
                    </div>
                    <div>
                      <h2 className="mock-section-title">4. Ground Station Utility & Electricity Billing</h2>
                      <p className="text-xs text-slate-500">
                        Manage substation power consumption statements and invoices. Sensitive financial metrics are masked during perception.
                      </p>
                    </div>
                  </div>

                  <div className="mock-grid-2">
                    {/* Consumer Account Number (Sensitive) */}
                    <div className="mock-form-group">
                      <label htmlFor="input-bill-account" className="mock-label">
                        Electricity Consumer Account No <span className="mock-badge-sensitive">Financial</span>
                      </label>
                      <input
                        id="input-bill-account"
                        name="billAccount"
                        type="text"
                        data-sensitive="true"
                        data-sensitive-category="Financial Data"
                        className={`mock-input font-mono ${getHighlightClass('input-bill-account')}`}
                        value={billAccount}
                        onChange={(e) => setBillAccount(e.target.value)}
                        onMouseEnter={() => onElementHover('input-bill-account')}
                        onMouseLeave={() => onElementHover(null)}
                        onClick={() => onElementClick('input-bill-account', 'INPUT')}
                        aria-label="Electricity Consumer Account No"
                      />
                    </div>

                    {/* Meter Serial Number (Sensitive) */}
                    <div className="mock-form-group">
                      <label htmlFor="input-meter-number" className="mock-label">
                        Meter Serial Number <span className="mock-badge-sensitive">Personal Info</span>
                      </label>
                      <input
                        id="input-meter-number"
                        name="meterNumber"
                        type="text"
                        data-sensitive="true"
                        data-sensitive-category="Personal Information"
                        className={`mock-input font-mono ${getHighlightClass('input-meter-number')}`}
                        value={meterNumber}
                        onChange={(e) => setMeterNumber(e.target.value)}
                        onMouseEnter={() => onElementHover('input-meter-number')}
                        onMouseLeave={() => onElementHover(null)}
                        onClick={() => onElementClick('input-meter-number', 'INPUT')}
                        aria-label="Meter Serial Number"
                      />
                    </div>
                  </div>

                  <div className="mock-grid-2 items-end">
                    {/* Current Bill Due Amount (Sensitive) */}
                    <div className="mock-form-group">
                      <label htmlFor="input-bill-amount" className="mock-label">
                        Current Electricity Bill Due Amount <span className="mock-badge-sensitive">Financial</span>
                      </label>
                      <input
                        id="input-bill-amount"
                        name="billAmount"
                        type="text"
                        data-sensitive="true"
                        data-sensitive-category="Financial Data"
                        className={`mock-input font-semibold text-slate-800 ${getHighlightClass('input-bill-amount')}`}
                        value={billAmount}
                        onChange={(e) => setBillAmount(e.target.value)}
                        onMouseEnter={() => onElementHover('input-bill-amount')}
                        onMouseLeave={() => onElementHover(null)}
                        onClick={() => onElementClick('input-bill-amount', 'INPUT')}
                        aria-label="Current Electricity Bill Due Amount"
                      />
                    </div>

                    {/* Download Electricity Bill Button */}
                    <div className="mock-form-group">
                      <button
                        id="download-electricity-bill-btn"
                        type="button"
                        className={`mock-btn-secondary w-full flex items-center justify-center gap-2 ${
                          billDownloaded ? 'border-emerald-500 text-emerald-700 bg-emerald-50' : ''
                        } ${getHighlightClass('download-electricity-bill-btn')}`}
                        aria-label="Download Electricity Bill (PDF)"
                        onClick={handleDownloadBill}
                        onMouseEnter={() => onElementHover('download-electricity-bill-btn')}
                        onMouseLeave={() => onElementHover(null)}
                      >
                        <Download size={16} className={billDownloaded ? 'text-emerald-600' : 'text-indigo-600'} />
                        <span className="font-medium">
                          {billDownloaded ? 'Bill Downloaded (PDF)' : 'Download Electricity Bill (PDF)'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Toolbar */}
                <div className="mock-actions-toolbar">
                  <div className="mock-actions-left">
                    {/* Submit Button */}
                    <button
                      id="submit-registration-btn"
                      type="submit"
                      className={`mock-btn-primary ${getHighlightClass('submit-registration-btn')}`}
                      aria-label="Submit Registration Application"
                      onMouseEnter={() => onElementHover('submit-registration-btn')}
                      onMouseLeave={() => onElementHover(null)}
                      onClick={() => onElementClick('submit-registration-btn', 'BUTTON')}
                    >
                      <CheckCircle size={16} />
                      <span>Submit Application</span>
                    </button>

                    {/* Save Draft Button */}
                    <button
                      id="save-draft-btn"
                      type="button"
                      className={`mock-btn-secondary ${getHighlightClass('save-draft-btn')}`}
                      aria-label="Save draft application"
                      onMouseEnter={() => onElementHover('save-draft-btn')}
                      onMouseLeave={() => onElementHover(null)}
                      onClick={() => onElementClick('save-draft-btn', 'BUTTON')}
                    >
                      Save Draft
                    </button>

                    {/* Reset Form Button */}
                    <button
                      id="reset-form-btn"
                      type="reset"
                      className={`mock-btn-ghost ${getHighlightClass('reset-form-btn')}`}
                      aria-label="Reset all form fields"
                      onMouseEnter={() => onElementHover('reset-form-btn')}
                      onMouseLeave={() => onElementHover(null)}
                      onClick={() => onElementClick('reset-form-btn', 'BUTTON')}
                    >
                      Reset Form
                    </button>
                  </div>

                  <div className="mock-actions-right">
                    {/* Danger / Sensitive Action */}
                    <button
                      id="delete-account-btn"
                      type="button"
                      className={`mock-btn-danger ${getHighlightClass('delete-account-btn')}`}
                      aria-label="Revoke clearance and delete profile"
                      onMouseEnter={() => onElementHover('delete-account-btn')}
                      onMouseLeave={() => onElementHover(null)}
                      onClick={() => onElementClick('delete-account-btn', 'BUTTON')}
                    >
                      Delete Profile
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }
);

MockBrowserPage.displayName = 'MockBrowserPage';
