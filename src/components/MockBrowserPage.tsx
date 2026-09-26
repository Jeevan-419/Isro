import React, { useState, forwardRef } from 'react';
import {
  Lock,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Shield,
  Eye,
  EyeOff,
  User,
  CheckCircle,
} from 'lucide-react';
import type { ExtractedElement } from '../types/dom';

export type BrowserMode = 'portal' | 'live' | 'custom_html';

interface MockBrowserPageProps {
  highlightedElementId: string | null;
  selectedElementId: string | null;
  onElementClick: (elementDomId: string | null, tagName: string) => void;
  onElementHover: (elementDomId: string | null) => void;
  onDomMutation: () => void;
  onLiveElementsExtracted?: (elements: ExtractedElement[], url: string, title: string) => void;
  onResetToLocalDom?: () => void;
  onOpenLiveMonitor?: (url: string) => void;
}

const DEFAULT_PORTAL_URL = 'https://portal.space-ops.gov.in/onboarding';

export const MockBrowserPage = forwardRef<HTMLDivElement, MockBrowserPageProps>(
  (
    {
      highlightedElementId,
      selectedElementId,
      onElementClick,
      onElementHover,
      onDomMutation,
    },
    ref
  ) => {
    const [fullName, setFullName] = useState('Dr. Vikram Sarabhai');
    const [email, setEmail] = useState('vikram.s@isro.gov.in');
    const [phone, setPhone] = useState('+91 98450 12345');
    const [govId, setGovId] = useState('IND-8841-A');
    const [password, setPassword] = useState('SuperSecretPass!2026');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState('telemetry');
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setStatusMessage('Registration form submitted successfully.');
      setTimeout(() => setStatusMessage(null), 4000);
      onDomMutation();
    };

    const getHighlightClass = (domId: string) => {
      let classes = '';
      if (highlightedElementId === domId) {
        classes += ' ring-2 ring-blue-500';
      }
      if (selectedElementId === domId) {
        classes += ' ring-2 ring-amber-400';
      }
      return classes;
    };

    return (
      <div
        ref={ref}
        className="flex flex-col h-full bg-white border border-slate-700/80 rounded-lg overflow-hidden shadow-lg select-none"
      >
        {/* Browser Top Toolbar (Realistic Chrome) */}
        <div className="bg-[#1e293b] border-b border-slate-700 px-3 py-2 flex items-center gap-3 shrink-0">
          {/* Window control dots */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-1 text-slate-400 shrink-0">
            <button type="button" className="p-0.5 hover:text-white" title="Back">
              <ArrowLeft size={13} />
            </button>
            <button type="button" className="p-0.5 hover:text-white" title="Forward">
              <ArrowRight size={13} />
            </button>
            <button
              type="button"
              className="p-0.5 hover:text-white"
              title="Reload"
              onClick={onDomMutation}
            >
              <RotateCw size={13} />
            </button>
          </div>

          {/* Realistic URL Address Bar */}
          <div className="flex-1 flex items-center bg-[#0f172a] border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 font-mono gap-1.5 max-w-lg mx-auto">
            <Lock size={12} className="text-emerald-400 shrink-0" />
            <span className="text-emerald-400 font-medium shrink-0">https://</span>
            <span className="text-slate-300 truncate">{DEFAULT_PORTAL_URL.replace('https://', '')}</span>
          </div>

          {/* Secure indicator badge */}
          <div className="shrink-0 flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
            <Shield size={11} />
            <span>SECURE</span>
          </div>
        </div>

        {/* Real Webpage Area (Bright / Light Background) */}
        <div className="flex-1 light-webpage-container p-6 overflow-y-auto bg-slate-50">
          <div className="max-w-xl mx-auto light-portal-card p-6 shadow-sm">
            {/* Real Portal Header */}
            <div className="border-b border-slate-200 pb-4 mb-5 flex items-center justify-between">
              <div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  SpaceOps Secure Portal
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Officer Clearance & Onboarding
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <User size={18} />
              </div>
            </div>

            {statusMessage && (
              <div className="mb-4 bg-emerald-50 border border-emerald-300 rounded p-2.5 flex items-center gap-2 text-xs text-emerald-800 font-medium">
                <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Real Form Fields */}
            <form onSubmit={handleFormSubmit} id="clearance-registration-form" className="space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="input-full-name" className="light-form-label">
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
                  className={`light-form-input ${getHighlightClass('input-full-name')}`}
                  placeholder="e.g. Vikram Sarabhai"
                />
              </div>

              {/* Email Address (PII) */}
              <div>
                <label htmlFor="input-email" className="light-form-label flex justify-between">
                  <span>Official Email Address</span>
                  <span className="text-[10px] text-slate-400 font-normal">Confidential</span>
                </label>
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
                  className={`light-form-input font-mono ${getHighlightClass('input-email')}`}
                  placeholder="name@isro.gov.in"
                />
              </div>

              {/* Phone & Govt ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="input-phone" className="light-form-label">
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
                    className={`light-form-input font-mono ${getHighlightClass('input-phone')}`}
                    placeholder="+91 98450 12345"
                  />
                </div>

                <div>
                  <label htmlFor="input-gov-id" className="light-form-label">
                    Government ID
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
                    className={`light-form-input font-mono ${getHighlightClass('input-gov-id')}`}
                    placeholder="IND-8841-A"
                  />
                </div>
              </div>

              {/* Password (PII) */}
              <div>
                <label htmlFor="input-password" className="light-form-label flex justify-between">
                  <span>Password</span>
                  <span className="text-[10px] text-slate-400 font-normal">Encrypted</span>
                </label>
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
                    className={`light-form-input font-mono pr-9 ${getHighlightClass('input-password')}`}
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Operational Role Dropdown */}
              <div>
                <label htmlFor="select-role" className="light-form-label">
                  Operational Unit
                </label>
                <select
                  id="select-role"
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  onMouseEnter={() => onElementHover('select-role')}
                  onMouseLeave={() => onElementHover(null)}
                  onClick={() => onElementClick('select-role', 'SELECT')}
                  className={`light-form-input bg-white ${getHighlightClass('select-role')}`}
                >
                  <option value="telemetry">Satellite Ground Telemetry & Propulsion</option>
                  <option value="crypto">Cryptographic Security & Action Guard</option>
                  <option value="commander">Mission Flight Director</option>
                </select>
              </div>

              {/* Form Actions */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  id="submit-registration-btn"
                  type="submit"
                  onMouseEnter={() => onElementHover('submit-registration-btn')}
                  onMouseLeave={() => onElementHover(null)}
                  onClick={() => onElementClick('submit-registration-btn', 'BUTTON')}
                  className={`flex-1 light-btn-primary ${getHighlightClass('submit-registration-btn')}`}
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
                    setStatusMessage('Draft saved.');
                    setTimeout(() => setStatusMessage(null), 3000);
                  }}
                  className={`light-btn-secondary ${getHighlightClass('save-draft-btn')}`}
                >
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }
);

MockBrowserPage.displayName = 'MockBrowserPage';
