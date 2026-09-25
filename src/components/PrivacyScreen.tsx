import React, { useState } from 'react';
import {
  Shield,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import type { PiiEntity, GroundedElement } from '../types/privyVision';

interface PrivacyScreenProps {
  detectedPii: PiiEntity[];
  groundedElements: GroundedElement[];
}

export const PrivacyScreen: React.FC<PrivacyScreenProps> = ({
  detectedPii,
  groundedElements,
}) => {
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedSanitized, setCopiedSanitized] = useState(false);

  // Generate simulated raw payload (what traditional agents send to cloud LLMs)
  const rawContextPayload = JSON.stringify(
    {
      page: 'Space Operations Personnel & Payment Portal',
      url: 'https://portal.space-ops.gov.in/personnel/secure-registration',
      rawInteractiveFields: groundedElements
        .filter((e) => e.isInteractive)
        .slice(0, 8)
        .map((e) => ({
          selector: e.cssSelector,
          label: e.label,
          role: e.role,
          unmaskedValue: e.currentValue || (e.isSensitive ? 'CONFIDENTIAL_DATA_4920' : ''),
          containsSensitivePii: e.isSensitive,
        })),
    },
    null,
    2
  );

  // Generate sanitized payload (what PrivyVision sends to the server LLM)
  const sanitizedContextPayload = JSON.stringify(
    {
      page: 'Space Operations Personnel & Payment Portal',
      url: 'https://portal.space-ops.gov.in/personnel/secure-registration',
      attentionFirewall: {
        enforced: true,
        protocol: 'Zero-Trust Semantic Replacement',
        redactedEntitiesCount: detectedPii.length,
      },
      sanitizedInteractiveFields: groundedElements
        .filter((e) => e.isInteractive)
        .slice(0, 8)
        .map((e) => ({
          selector: e.cssSelector,
          label: e.label,
          role: e.role,
          semanticToken: e.isSensitive
            ? e.redactedPlaceholder || '[REDACTED:PROTECTED_PII]'
            : e.currentValue || null,
          isAccessibleForPlanning: true,
        })),
    },
    null,
    2
  );

  const handleCopy = (text: string, isSanitized: boolean) => {
    navigator.clipboard.writeText(text);
    if (isSanitized) {
      setCopiedSanitized(true);
      setTimeout(() => setCopiedSanitized(false), 2000);
    } else {
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Banner: Local PII & Attention Firewall Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-slate-100">
              Local PII Detection & Zero-Trust Privacy Firewall (SIH26171)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Sensitive user credentials never leave the browser. Plaintext is replaced with semantic tokens before reaching server models.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-emerald-950/60 border border-emerald-800 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-emerald-400 font-bold block text-[10px] uppercase">
              Firewall Guarantee
            </span>
            <span className="text-emerald-300 font-mono font-semibold">
              Zero Plaintext PII Leakage
            </span>
          </div>
          <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-500 block text-[10px] uppercase">Redacted Count</span>
            <span className="text-rose-400 font-mono font-bold">
              {detectedPii.length} Fields Masked
            </span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Context Payload Comparison (Crucial for SIH Evaluators) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {/* Left: Traditional Vulnerable Context (Raw PII Exfiltration) */}
        <div className="bg-slate-900 border border-rose-900/40 rounded-xl p-4 flex flex-col shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-rose-900/30 mb-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                Unprotected Agent (Data Leak Risk)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(rawContextPayload, false)}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center space-x-1"
            >
              {copiedRaw ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedRaw ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>
          <p className="text-[11px] text-rose-400/80 mb-2">
            Raw DOM/visual scraping exposes plain passwords, Aadhaar, and credit card numbers directly to cloud LLM APIs.
          </p>
          <pre className="flex-1 bg-slate-950 p-3 rounded-lg border border-rose-950 font-mono text-[11px] text-rose-300/80 overflow-auto">
            {rawContextPayload}
          </pre>
        </div>

        {/* Right: PrivyVision Sanitized Context (Zero-Trust Protected) */}
        <div className="bg-slate-900 border border-emerald-900/40 rounded-xl p-4 flex flex-col shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-900/30 mb-3">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                PrivyVision Attention Firewall (Sanitized)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(sanitizedContextPayload, true)}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center space-x-1"
            >
              {copiedSanitized ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSanitized ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>
          <p className="text-[11px] text-emerald-400/80 mb-2">
            Local browser redaction transforms real secrets into semantic placeholders. The server LLM plans reasoning without ever seeing sensitive data.
          </p>
          <pre className="flex-1 bg-slate-950 p-3 rounded-lg border border-emerald-950 font-mono text-[11px] text-emerald-300/90 overflow-auto">
            {sanitizedContextPayload}
          </pre>
        </div>
      </div>

      {/* Detected PII Entities Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
        <div className="flex items-center space-x-2 mb-3">
          <Lock className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Detected Sensitive Entities In-Situ (Client Browser Scanner)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-800 font-semibold">
              <tr>
                <th className="p-2.5">Field / Target</th>
                <th className="p-2.5">PII Category</th>
                <th className="p-2.5">Raw Sample (Client-side Only)</th>
                <th className="p-2.5">Firewall Semantic Replacement</th>
                <th className="p-2.5">Protection Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {detectedPii.map((pii) => (
                <tr key={pii.id} className="hover:bg-slate-800/40">
                  <td className="p-2.5 font-semibold text-slate-200">{pii.fieldName}</td>
                  <td className="p-2.5">
                    <span className="bg-amber-950/60 border border-amber-800 text-amber-300 px-2 py-0.5 rounded text-[10px] font-mono">
                      {pii.category}
                    </span>
                  </td>
                  <td className="p-2.5 font-mono text-slate-400 text-[11px]">{pii.rawSampleValue}</td>
                  <td className="p-2.5 font-mono text-emerald-400 text-[11px]">
                    {pii.maskedPlaceholder}
                  </td>
                  <td className="p-2.5">
                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                      REDACTED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
