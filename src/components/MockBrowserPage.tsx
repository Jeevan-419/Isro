import React, { useState, forwardRef } from 'react';
import {
  Lock,
  RotateCw,
  ArrowRight,
  Eye,
  EyeOff,
  AlertTriangle,
  User,
  CheckCircle,
  Loader2,
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

const DEFAULT_PORTAL_URL = 'https://portal.space-ops.gov.in/onboarding';

const DEFAULT_CUSTOM_HTML = `<div class="p-8 max-w-lg mx-auto bg-slate-900 text-slate-100 rounded-xl border border-slate-800 space-y-4">
  <h2 class="text-lg font-bold text-white">Payment Gateway</h2>
  <form onsubmit="event.preventDefault();" class="space-y-3">
    <div>
      <label class="block text-xs text-slate-400 mb-1">Cardholder Name</label>
      <input type="text" value="Ada Lovelace" class="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200" />
    </div>
    <div>
      <label class="block text-xs text-slate-400 mb-1">Card Number (Sensitive)</label>
      <input type="text" data-sensitive="true" value="4532-8921-9941-8821" class="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm font-mono text-slate-200" />
    </div>
    <button id="submit-custom-btn" type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded text-sm transition">
      Submit Payment
    </button>
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
    },
    ref
  ) => {
    const [browserMode, setBrowserMode] = useState<BrowserMode>('portal');
    const [urlInput, setUrlInput] = useState<string>(DEFAULT_PORTAL_URL);
    const [activeUrl, setActiveUrl] = useState<string>(DEFAULT_PORTAL_URL);
    const [isLoadingUrl, setIsLoadingUrl] = useState<boolean>(false);
    const [urlLoadError, setUrlLoadError] = useState<string | null>(null);
    const [customHtml, _setCustomHtml] = useState<string>(DEFAULT_CUSTOM_HTML);

    // Form inputs state
    const [fullName, setFullName] = useState('Dr. Vikram Sarabhai');
    const [email, setEmail] = useState('vikram.s@isro.gov.in');
    const [phone, setPhone] = useState('+91 98450 12345');
    const [password, setPassword] = useState('SuperSecretPass!2026');
    const [govId, setGovId] = useState('IND-8841-A');
    const [showPassword, setShowPassword] = useState(false);
    const [operationalRole, setOperationalRole] = useState('telemetry');
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setStatusMessage('Registration form submitted successfully.');
      setTimeout(() => setStatusMessage(null), 4000);
      onDomMutation();
    };

    const getHighlightClass = (domId: string) => {
      let classes = 'transition-all duration-150';
      if (highlightedElementId === domId) {
        classes += ' ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900';
      }
      if (selectedElementId === domId) {
        classes += ' ring-2 ring-amber-400';
      }
      return classes;
    };

    const navigateToUrl = async (targetUrl: string) => {
      const trimmed = targetUrl.trim();
      if (!trimmed) return;

      setUrlInput(trimmed);
      setActiveUrl(trimmed);
      setUrlLoadError(null);

      if (trimmed.includes('portal.space-ops.gov.in') || trimmed === 'portal') {
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
          throw new Error(`Failed to load URL (${res.status})`);
        }

        const data = await res.json();
        if (data.elements && onLiveElementsExtracted) {
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
            htmlSnippet: `<${e.tagName.toLowerCase()}>${e.accessibleName}</${e.tagName.toLowerCase()}>`,
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

    return (
      <div
        ref={ref}
        className="flex flex-col h-full bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-2xl"
      >
        {/* Realistic Browser Toolbar */}
        <div className="bg-[#0e1424] border-b border-slate-800/90 px-3 py-2 flex items-center gap-3 shrink-0">
          {/* Window dots */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
          </div>

          {/* Minimal reload button */}
          <button
            type="button"
            className="text-slate-400 hover:text-slate-200 transition p-1"
            aria-label="Reload"
            onClick={() => {
              if (browserMode === 'live') navigateToUrl(activeUrl);
              else onDomMutation();
            }}
          >
            <RotateCw size={13} className={isLoadingUrl ? 'animate-spin' : ''} />
          </button>

          {/* Clean realistic URL address bar */}
          <form onSubmit={handleUrlSubmit} className="flex-1 flex items-center">
            <div className="w-full max-w-xl mx-auto bg-[#070b16] border border-slate-800/80 rounded-md px-2.5 py-1 flex items-center gap-2">
              <Lock size={12} className="text-emerald-400 shrink-0" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter URL..."
                className="bg-transparent border-none text-xs text-slate-300 font-mono focus:outline-none w-full"
              />
              <button type="submit" className="text-slate-400 hover:text-white shrink-0 p-0.5">
                <ArrowRight size={12} />
              </button>
            </div>
          </form>

          {/* Subtle mode tabs */}
          <div className="flex items-center gap-1 bg-[#070b16] p-0.5 rounded border border-slate-800 text-[11px]">
            <button
              type="button"
              className={`px-2 py-0.5 rounded font-medium transition ${
                browserMode === 'portal' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => {
                setBrowserMode('portal');
                setUrlInput(DEFAULT_PORTAL_URL);
                setActiveUrl(DEFAULT_PORTAL_URL);
              }}
            >
              Portal
            </button>
            <button
              type="button"
              className={`px-2 py-0.5 rounded font-medium transition ${
                browserMode === 'live' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => {
                setBrowserMode('live');
                navigateToUrl('https://example.com');
              }}
            >
              Live Web
            </button>
          </div>
        </div>

        {/* Browser Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#090d18] p-6">
          {browserMode === 'live' && (
            <div className="flex flex-col items-center justify-center min-h-[380px] text-center p-6">
              {isLoadingUrl ? (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                  <p className="text-xs">Fetching live website...</p>
                </div>
              ) : urlLoadError ? (
                <div className="text-slate-400 max-w-sm">
                  <AlertTriangle size={24} className="text-rose-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-rose-400">Failed to load website</p>
                  <p className="text-[11px] text-slate-500 mt-1">{urlLoadError}</p>
                </div>
              ) : (
                <div className="text-slate-400 text-xs">
                  Live page extracted: <span className="font-mono text-blue-400">{activeUrl}</span>
                </div>
              )}
            </div>
          )}

          {browserMode === 'custom_html' && (
            <div
              id="mock-webpage-root"
              dangerouslySetInnerHTML={{ __html: customHtml }}
            />
          )}

          {browserMode === 'portal' && (
            <div className="max-w-xl mx-auto bg-[#0e1424] border border-slate-800/90 rounded-xl p-6 shadow-xl">
              {/* Clean Portal Header */}
              <div className="border-b border-slate-800/80 pb-4 mb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-lg font-bold text-slate-100 tracking-tight">
                      SpaceOps Clearance Portal
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Personnel Identity & Secure Access Registration
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400">
                    <User size={18} />
                  </div>
                </div>

                {statusMessage && (
                  <div className="mt-3 bg-emerald-950/40 border border-emerald-800/60 rounded-md p-2 flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                    <span>{statusMessage}</span>
                  </div>
                )}
              </div>

              {/* Realistic Form */}
              <form onSubmit={handleFormSubmit} id="clearance-registration-form" className="space-y-4">
                {/* Full Name */}
                <div>
                  <label htmlFor="input-full-name" className="block text-xs font-medium text-slate-300 mb-1">
                    Full Legal Name
                  </label>
                  <input
                    id="input-full-name"
                    name="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onMouseEnter={() => onElementHover('input-full-name')}
                    onMouseLeave={() => onElementHover(null)}
                    onClick={() => onElementClick('input-full-name', 'INPUT')}
                    className={`w-full bg-[#070b16] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 ${getHighlightClass('input-full-name')}`}
                    placeholder="e.g. Vikram Sarabhai"
                  />
                </div>

                {/* Email Address (PII) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="input-email" className="block text-xs font-medium text-slate-300">
                      Official Email Address
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">PII Entity</span>
                  </div>
                  <input
                    id="input-email"
                    name="email"
                    type="email"
                    required
                    data-sensitive="true"
                    data-sensitive-category="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onMouseEnter={() => onElementHover('input-email')}
                    onMouseLeave={() => onElementHover(null)}
                    onClick={() => onElementClick('input-email', 'INPUT')}
                    className={`w-full bg-[#070b16] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono ${getHighlightClass('input-email')}`}
                    placeholder="name@isro.gov.in"
                  />
                </div>

                {/* Phone & Govt ID */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="input-phone" className="block text-xs font-medium text-slate-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      id="input-phone"
                      name="phone"
                      type="tel"
                      data-sensitive="true"
                      data-sensitive-category="Phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onMouseEnter={() => onElementHover('input-phone')}
                      onMouseLeave={() => onElementHover(null)}
                      onClick={() => onElementClick('input-phone', 'INPUT')}
                      className={`w-full bg-[#070b16] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono ${getHighlightClass('input-phone')}`}
                      placeholder="+91 98450 12345"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-gov-id" className="block text-xs font-medium text-slate-300 mb-1">
                      National Security ID
                    </label>
                    <input
                      id="input-gov-id"
                      name="govId"
                      type="text"
                      data-sensitive="true"
                      data-sensitive-category="Government ID"
                      value={govId}
                      onChange={(e) => setGovId(e.target.value)}
                      onMouseEnter={() => onElementHover('input-gov-id')}
                      onMouseLeave={() => onElementHover(null)}
                      onClick={() => onElementClick('input-gov-id', 'INPUT')}
                      className={`w-full bg-[#070b16] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono ${getHighlightClass('input-gov-id')}`}
                      placeholder="IND-8841-A"
                    />
                  </div>
                </div>

                {/* Password (PII) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="input-password" className="block text-xs font-medium text-slate-300">
                      Master Access Password
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">Sensitive</span>
                  </div>
                  <div className="relative">
                    <input
                      id="input-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      data-sensitive="true"
                      data-sensitive-category="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onMouseEnter={() => onElementHover('input-password')}
                      onMouseLeave={() => onElementHover(null)}
                      onClick={() => onElementClick('input-password', 'INPUT')}
                      className={`w-full bg-[#070b16] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono pr-9 ${getHighlightClass('input-password')}`}
                    />
                    <button
                      type="button"
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Operational Role Dropdown */}
                <div>
                  <label htmlFor="select-role" className="block text-xs font-medium text-slate-300 mb-1">
                    Operational Assignment
                  </label>
                  <select
                    id="select-role"
                    name="role"
                    value={operationalRole}
                    onChange={(e) => setOperationalRole(e.target.value)}
                    onMouseEnter={() => onElementHover('select-role')}
                    onMouseLeave={() => onElementHover(null)}
                    onClick={() => onElementClick('select-role', 'SELECT')}
                    className={`w-full bg-[#070b16] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 ${getHighlightClass('select-role')}`}
                  >
                    <option value="telemetry">Satellite Ground Telemetry & Propulsion</option>
                    <option value="crypto">Cryptographic Security & Action Guard</option>
                    <option value="commander">Mission Flight Director</option>
                  </select>
                </div>

                {/* Actions: Primary Submit and Secondary Save */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    id="submit-registration-btn"
                    type="submit"
                    onMouseEnter={() => onElementHover('submit-registration-btn')}
                    onMouseLeave={() => onElementHover(null)}
                    onClick={() => onElementClick('submit-registration-btn', 'BUTTON')}
                    className={`flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-sm ${getHighlightClass('submit-registration-btn')}`}
                  >
                    <CheckCircle size={14} />
                    <span>Submit Application</span>
                  </button>

                  <button
                    id="save-draft-btn"
                    type="button"
                    onMouseEnter={() => onElementHover('save-draft-btn')}
                    onMouseLeave={() => onElementHover(null)}
                    onClick={() => {
                      setStatusMessage('Draft saved locally.');
                      setTimeout(() => setStatusMessage(null), 3000);
                    }}
                    className={`px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium py-2.5 rounded-lg text-xs transition border border-slate-700/80 ${getHighlightClass('save-draft-btn')}`}
                  >
                    Save Draft
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }
);

MockBrowserPage.displayName = 'MockBrowserPage';
