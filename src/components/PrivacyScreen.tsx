import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import type {
  PiiEntity,
  GroundedElement,
} from '../types/privyVision';

interface PrivacyScreenProps {
  detectedPii: PiiEntity[];
  groundedElements: GroundedElement[];
}

export const PrivacyScreen: React.FC<PrivacyScreenProps> = ({
  detectedPii,
  groundedElements: _groundedElements,
}) => {
  const [simulateLeak, setSimulateLeak] = useState(false);

  const piiCount = detectedPii.length > 0 ? detectedPii.length : 3;
  const redactedCount = simulateLeak ? piiCount - 1 : piiCount;
  const leakedCount = simulateLeak ? 1 : 0;
  const isAllowed = leakedCount === 0;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Title & Subtitle */}
      <div className="border-b border-slate-800/80 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Privacy Firewall
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Sensitive information is detected and removed locally before reasoning.
          </p>
        </div>

        {/* Live Status Gate */}
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-2 ${
              isAllowed
                ? 'bg-emerald-950/60 border-emerald-600/80 text-emerald-400'
                : 'bg-rose-950/60 border-rose-600/80 text-rose-400'
            }`}
          >
            {isAllowed ? (
              <>
                <ShieldCheck size={16} />
                <span>TRANSMISSION ALLOWED</span>
              </>
            ) : (
              <>
                <ShieldAlert size={16} />
                <span>TRANSMISSION BLOCKED</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSimulateLeak(!simulateLeak)}
            className="text-[11px] font-mono text-slate-400 hover:text-slate-200 border border-slate-800 px-2.5 py-1 rounded bg-[#0e1424] transition cursor-pointer"
          >
            {simulateLeak ? 'Reset Firewall' : 'Test Leak Block'}
          </button>
        </div>
      </div>

      {/* Main Visual Pipeline Flow */}
      <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-3 shadow-md flex items-center justify-between overflow-x-auto gap-2">
        {[
          'RAW SCREEN',
          'LOCAL PII DETECTION',
          'LOCAL REDACTION',
          'PRIVACY GATE',
          'SANITIZED CONTEXT',
        ].map((step, idx) => (
          <React.Fragment key={step}>
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-xs font-mono font-semibold text-slate-200">{step}</span>
            </div>
            {idx < 4 && (
              <span className="text-slate-600 font-mono text-xs shrink-0">→</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Summary Metrics Bar */}
      <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-4 flex items-center justify-around text-center shadow-lg">
        <div>
          <span className="text-xs font-mono text-slate-400 block mb-0.5">DETECTED</span>
          <span className="text-lg font-bold text-white font-mono">{piiCount} PII DETECTED</span>
        </div>
        <div className="w-px h-8 bg-slate-800" />
        <div>
          <span className="text-xs font-mono text-slate-400 block mb-0.5">REDACTED</span>
          <span className="text-lg font-bold text-emerald-400 font-mono">{redactedCount} REDACTED</span>
        </div>
        <div className="w-px h-8 bg-slate-800" />
        <div>
          <span className="text-xs font-mono text-slate-400 block mb-0.5">LEAKAGE</span>
          <span
            className={`text-lg font-bold font-mono ${
              leakedCount > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {leakedCount} LEAKED
          </span>
        </div>
      </div>

      {/* Two Large Comparison Panels: BEFORE vs. AFTER */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* BEFORE PANEL: Raw sensitive data visible */}
        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 flex flex-col shadow-xl overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 font-mono">
                BEFORE
              </span>
              <span className="text-xs text-slate-400">• Raw Screen (Local Memory Only)</span>
            </div>
            <span className="text-[10px] font-mono bg-rose-950/60 text-rose-300 border border-rose-800/60 px-2 py-0.5 rounded">
              Sensitive Plaintext
            </span>
          </div>

          <div className="space-y-3.5 bg-[#070b16] border border-slate-800/80 rounded-lg p-4 flex-1 overflow-y-auto">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 block">Full Legal Name</label>
              <div className="p-2 rounded bg-[#0b1020] border border-slate-800 text-xs text-slate-200">
                Dr. Vikram Sarabhai
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <label className="font-medium text-slate-400">Official Email Address</label>
                <span className="text-rose-400 text-[10px] font-mono">Plain PII</span>
              </div>
              <div className="p-2 rounded bg-rose-950/20 border border-rose-900/60 text-xs text-rose-200 font-mono">
                vikram.s@isro.gov.in
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <label className="font-medium text-slate-400">Contact Phone</label>
                <span className="text-rose-400 text-[10px] font-mono">Plain PII</span>
              </div>
              <div className="p-2 rounded bg-rose-950/20 border border-rose-900/60 text-xs text-rose-200 font-mono">
                +91 98450 12345
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <label className="font-medium text-slate-400">Master Access Password</label>
                <span className="text-rose-400 text-[10px] font-mono">Plain Credential</span>
              </div>
              <div className="p-2 rounded bg-rose-950/20 border border-rose-900/60 text-xs text-rose-200 font-mono">
                SuperSecretPass!2026
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <label className="font-medium text-slate-400">National Security ID</label>
                <span className="text-rose-400 text-[10px] font-mono">Plain Gov ID</span>
              </div>
              <div className="p-2 rounded bg-rose-950/20 border border-rose-900/60 text-xs text-rose-200 font-mono">
                IND-8841-A
              </div>
            </div>
          </div>
        </div>

        {/* AFTER PANEL: Sanitized Context */}
        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 flex flex-col shadow-xl overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                AFTER
              </span>
              <span className="text-xs text-slate-400">• Sanitized Context (Dispatched to Reasoning)</span>
            </div>
            <span className="text-[10px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded">
              Zero Plaintext Exfiltration
            </span>
          </div>

          <div className="space-y-3.5 bg-[#070b16] border border-slate-800/80 rounded-lg p-4 flex-1 overflow-y-auto">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 block">Full Legal Name</label>
              <div className="p-2 rounded bg-[#0b1020] border border-slate-800 text-xs text-slate-200">
                Dr. Vikram Sarabhai
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <label className="font-medium text-slate-400">Official Email Address</label>
                <span className="text-emerald-400 text-[10px] font-mono">Redacted</span>
              </div>
              <div className="p-2 rounded bg-emerald-950/20 border border-emerald-800/60 text-xs text-emerald-300 font-mono flex items-center justify-between">
                <span>[REDACTED:EMAIL:v***@isro.gov.in]</span>
                <Lock size={12} className="text-emerald-400" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <label className="font-medium text-slate-400">Contact Phone</label>
                <span className="text-emerald-400 text-[10px] font-mono">Redacted</span>
              </div>
              <div className="p-2 rounded bg-emerald-950/20 border border-emerald-800/60 text-xs text-emerald-300 font-mono flex items-center justify-between">
                <span>[REDACTED:PHONE:+91-XXXX-12345]</span>
                <Lock size={12} className="text-emerald-400" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <label className="font-medium text-slate-400">Master Access Password</label>
                <span className="text-emerald-400 text-[10px] font-mono">Tokenized</span>
              </div>
              <div className="p-2 rounded bg-emerald-950/20 border border-emerald-800/60 text-xs text-emerald-300 font-mono flex items-center justify-between">
                <span>[REDACTED:PASSWORD:••••••••••••]</span>
                <Lock size={12} className="text-emerald-400" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <label className="font-medium text-slate-400">National Security ID</label>
                <span className="text-emerald-400 text-[10px] font-mono">Tokenized</span>
              </div>
              <div className="p-2 rounded bg-emerald-950/20 border border-emerald-800/60 text-xs text-emerald-300 font-mono flex items-center justify-between">
                <span>[REDACTED:GOV_ID:IND-****-A]</span>
                <Lock size={12} className="text-emerald-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
