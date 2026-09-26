import {
  CheckCircle2,
  ArrowDown,
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
  onExecuteApprovedAction: _onExecuteApprovedAction,
}) => {
  const displayAction: StructuredBrowserAction = lastAction || {
    actionId: 'act-001',
    actionType: 'click',
    targetElementUid: 'submit-registration-btn',
    targetSelector: '#submit-registration-btn',
    targetDescription: 'Submit Application',
    coordinates: { x: 540, y: 480 },
    confidence: 0.96,
    intent: 'Find and click Submit',
  };

  const isBlocked = guardResult?.status === 'BLOCKED';

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Title */}
      <div className="border-b border-slate-800/80 pb-3">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Action Execution Timeline
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Local Action Guard safety interception and deterministic DOM dispatch.
        </p>
      </div>

      {/* Execution Timeline Card */}
      <div className="flex-1 bg-[#0e1424] border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center shadow-xl overflow-y-auto">
        <div className="max-w-md w-full space-y-4">
          {/* STEP 1: USER INTENT */}
          <div className="bg-[#070b16] border border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block mb-1">
              USER INTENT
            </span>
            <p className="text-sm font-semibold text-slate-100 font-sans">
              "{displayAction.intent || 'Find and click Submit'}"
            </p>
          </div>

          {/* Arrow */}
          <div className="flex justify-center text-slate-600">
            <ArrowDown size={18} />
          </div>

          {/* STEP 2: AI COMMAND */}
          <div className="bg-[#070b16] border border-blue-900/60 rounded-xl p-4 shadow-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-semibold block mb-1">
              AI COMMAND
            </span>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-base font-bold text-white font-mono uppercase">
                  {displayAction.actionType}
                </span>
                <p className="text-xs text-slate-300 mt-0.5">
                  Target: <span className="font-semibold text-white">{displayAction.targetDescription || 'Submit'}</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-mono block">Confidence</span>
                <span className="text-sm font-mono font-bold text-blue-400">
                  {((displayAction.confidence || 0.96) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center text-slate-600">
            <ArrowDown size={18} />
          </div>

          {/* STEP 3: LOCAL ACTION GUARD */}
          <div
            className={`rounded-xl p-4 border shadow-sm ${
              isBlocked
                ? 'bg-rose-950/20 border-rose-800/80 text-rose-300'
                : 'bg-emerald-950/20 border-emerald-800/80 text-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                LOCAL ACTION GUARD
              </span>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  isBlocked ? 'bg-rose-900/80 text-rose-200' : 'bg-emerald-900/80 text-emerald-200'
                }`}
              >
                {isBlocked ? 'BLOCKED' : 'PASSED'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isBlocked
                ? 'Rule Violation: Action rejected by local safety firewall.'
                : '4-Tier Verification: Scope Boundary, Zero Plaintext Leak, Clickability, Non-Destructive.'}
            </p>
          </div>

          {/* Arrow */}
          <div className="flex justify-center text-slate-600">
            <ArrowDown size={18} />
          </div>

          {/* STEP 4: BROWSER EXECUTION */}
          <div className="bg-[#070b16] border border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block mb-0.5">
                BROWSER
              </span>
              <span className="text-xs font-semibold text-slate-200 font-mono">
                {isBlocked ? 'EXECUTION ABORTED' : 'CLICK EXECUTED'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              target: {displayAction.targetSelector}
            </span>
          </div>

          {/* Arrow */}
          <div className="flex justify-center text-slate-600">
            <ArrowDown size={18} />
          </div>

          {/* STEP 5: VERIFICATION */}
          <div className="bg-[#070b16] border border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block mb-0.5">
                VERIFICATION
              </span>
              <span
                className={`text-xs font-bold font-mono ${
                  isBlocked ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {isBlocked ? 'PREVENTED' : 'SUCCESS'}
              </span>
            </div>
            <CheckCircle2 size={18} className={isBlocked ? 'text-rose-400' : 'text-emerald-400'} />
          </div>
        </div>
      </div>
    </div>
  );
};
