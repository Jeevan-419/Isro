import React from 'react';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileCode,
  Lock,
  Compass,
} from 'lucide-react';
import type {
  StructuredBrowserAction,
  ActionGuardEvaluationResult,
} from '../types/privyVision';

interface ActionsScreenProps {
  lastAction: StructuredBrowserAction | null;
  guardResult: ActionGuardEvaluationResult | null;
  onExecuteApprovedAction: (action: StructuredBrowserAction) => void;
}

export const ActionsScreen: React.FC<ActionsScreenProps> = ({
  lastAction,
  guardResult,
  onExecuteApprovedAction,
}) => {

  // Fallback demo action if none triggered yet
  const displayAction: StructuredBrowserAction = lastAction || {
    actionId: 'act-001',
    actionType: 'click',
    targetElementUid: 'btn-submit-registration',
    targetSelector: '#btn-submit-registration',
    targetDescription: 'Submit Personnel Registration',
    coordinates: { x: 540, y: 480 },
    confidence: 0.97,
    intent: 'Register researcher credentials with sanitized payloads',
  };

  const displayGuard: ActionGuardEvaluationResult = guardResult || {
    isAllowed: true,
    status: 'APPROVED',
    ruleViolations: [],
    scopePassed: true,
    credentialLeakPrevented: true,
    destructiveRiskLevel: 'LOW',
    explanation: 'Target within authorized task container. No plain credential exfiltration detected.',
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100">
              Local Action Guard & Safety Verification (SIH26171)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Browser-side policy engine that intercepts and verifies every server-proposed action before DOM event execution.
          </p>
        </div>

        {/* Action Guard Decision Badge */}
        <div className="flex items-center space-x-3">
          <div
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold uppercase ${
              displayGuard.status === 'APPROVED'
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-400'
                : displayGuard.status === 'BLOCKED'
                ? 'bg-rose-950/80 border-rose-700 text-rose-400'
                : 'bg-amber-950/80 border-amber-700 text-amber-400'
            }`}
          >
            Decision: {displayGuard.status}
          </div>
        </div>
      </div>

      {/* Grid: Structured Action Schema vs. 4-Tier Guard Policy Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left: Structured Action JSON Schema (6 Cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Structured Browser Action Schema
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded">
              W3C DOM Protocol
            </span>
          </div>

          <div className="space-y-3 text-xs mb-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Action Type</span>
                <span className="font-bold text-cyan-300 uppercase font-mono">{displayAction.actionType}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Target Selector</span>
                <span className="font-bold text-emerald-400 font-mono truncate block">
                  {displayAction.targetSelector}
                </span>
              </div>
            </div>

            <div className="bg-slate-950 p-2 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Target Intent</span>
              <span className="text-slate-200 font-medium">{displayAction.intent}</span>
            </div>
          </div>

          <pre className="flex-1 bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-auto">
            {JSON.stringify(displayAction, null, 2)}
          </pre>
        </div>

        {/* Right: 4-Tier Guard Policy Rules & Gate (6 Cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col space-y-4 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Action Guard Policy Verification (4 Tiers)
              </h3>
            </div>
          </div>

          {/* 4 Policy Rules */}
          <div className="space-y-2.5 flex-1">
            {/* Rule 1: Scope Boundary */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-start space-x-3">
              <Compass className="w-4 h-4 text-cyan-400 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-slate-200">Tier 1: Scope Boundary Check</span>
                  <span className="text-emerald-400 font-mono text-[10px] flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> PASSED
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Validates target selector is constrained within task authorized workspace.
                </p>
              </div>
            </div>

            {/* Rule 2: Credential Exfiltration Guard */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-start space-x-3">
              <Lock className="w-4 h-4 text-emerald-400 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-slate-200">Tier 2: Credential & PII Leak Guard</span>
                  <span className="text-emerald-400 font-mono text-[10px] flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> PROTECTED
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Prevents payload exfiltration of plain passwords, SSN/Aadhaar, or CVV.
                </p>
              </div>
            </div>

            {/* Rule 3: Destructive Action Gate */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-start space-x-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-slate-200">Tier 3: Destructive Action Risk Gate</span>
                  <span className="text-amber-400 font-mono text-[10px]">
                    Risk: {displayGuard.destructiveRiskLevel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Flags irreversible modifications (account deletion, fund transfer) for explicit human signoff.
                </p>
              </div>
            </div>

            {/* Rule 4: Visual Target Verification */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-start space-x-3">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-slate-200">Tier 4: Target State & Clickability</span>
                  <span className="text-emerald-400 font-mono text-[10px] flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> VERIFIED
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ensures element is visible, non-disabled, and within active viewport bounds.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Execution Gate */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Browser Dispatch Status: <strong className="text-slate-200">Ready</strong>
            </span>
            <button
              type="button"
              onClick={() => onExecuteApprovedAction(displayAction)}
              disabled={displayGuard.status === 'BLOCKED'}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-4 py-2 rounded-lg text-xs font-semibold transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Simulate Local Browser Dispatch</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
