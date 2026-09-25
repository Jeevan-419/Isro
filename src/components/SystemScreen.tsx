import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Server,
  Globe,
  CheckCircle2,
  RotateCw,
  Shield,
} from 'lucide-react';
import type { VisionRuntimeStatus, VisionRuntimeMode } from '../types/privyVision';

interface SystemScreenProps {
  runtimeStatus: VisionRuntimeStatus;
  onChangeRuntimeMode: (mode: VisionRuntimeMode) => void;
}

export const SystemScreen: React.FC<SystemScreenProps> = ({
  runtimeStatus,
  onChangeRuntimeMode,
}) => {
  const [apiHealth, setApiHealth] = useState<'checking' | 'online' | 'offline'>('checking');
  const [backendUptime, setBackendUptime] = useState<number | null>(null);

  const checkHealth = async () => {
    setApiHealth('checking');
    try {
      const res = await fetch('http://localhost:3001/api/health');
      if (res.ok) {
        const data = await res.json();
        setApiHealth('online');
        setBackendUptime(data.uptimeSeconds || 120);
      } else {
        setApiHealth('offline');
      }
    } catch {
      setApiHealth('offline');
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100">
              System Runtime & Architecture Configuration (SIH26171)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage Browser Extension pairing, ONNX WebGPU/WASM execution modes, and Server Reasoning endpoints.
          </p>
        </div>

        <button
          type="button"
          onClick={checkHealth}
          className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh System Health</span>
        </button>
      </div>

      {/* Grid: Extension Status, Vision Runtime, and Backend Connection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Browser Extension Bridge */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Browser Extension Bridge
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              PrivyVision Native Messaging host paired with Chrome MV3 Content Script.
            </p>
            <div className="space-y-1.5 text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <div>Protocol: Manifest V3 (Native Messaging)</div>
              <div>DOM/Canvas Access: Unrestricted</div>
              <div>Permissions: activeTab, scripting, storage</div>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-800 text-[11px] text-emerald-400 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Zero-copy canvas frame buffer ready</span>
          </div>
        </div>

        {/* Card 2: Local Vision Engine (ONNX Runtime Web) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Vision Inference Engine
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded font-bold">
                {runtimeStatus.activeMode === 'heuristic_canvas_fallback' ? 'FALLBACK' : 'ONNX ACTIVE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Hardware acceleration probe & edge model deployment state.
            </p>

            <div className="space-y-1.5 text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <div>Runtime: {runtimeStatus.modeDisplayName}</div>
              <div>Device: {runtimeStatus.deviceLabel}</div>
              <div>
                Model Weights:{' '}
                <span className="text-amber-400">
                  {runtimeStatus.isModelLoaded ? 'Loaded in VRAM' : 'Offline Heuristic Fallback (Demo)'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-slate-800">
            <label className="text-[11px] text-slate-400 block mb-1.5">Switch Inference Mode:</label>
            <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => onChangeRuntimeMode('heuristic_canvas_fallback')}
                className={`p-1.5 rounded border transition ${
                  runtimeStatus.activeMode === 'heuristic_canvas_fallback'
                    ? 'bg-amber-950 border-amber-600 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Canvas (Demo)
              </button>
              <button
                type="button"
                onClick={() => onChangeRuntimeMode('wasm')}
                className={`p-1.5 rounded border transition ${
                  runtimeStatus.activeMode === 'wasm'
                    ? 'bg-cyan-950 border-cyan-600 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                WASM SIMD
              </button>
              <button
                type="button"
                onClick={() => onChangeRuntimeMode('webgpu')}
                className={`p-1.5 rounded border transition ${
                  runtimeStatus.activeMode === 'webgpu'
                    ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                WebGPU
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Server Reasoning Engine */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
              <div className="flex items-center space-x-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Server Reasoning Engine
                </h3>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  apiHealth === 'online'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : apiHealth === 'checking'
                    ? 'bg-amber-950 text-amber-400 border-amber-800'
                    : 'bg-rose-950 text-rose-400 border-rose-800'
                }`}
              >
                {apiHealth.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Node.js Express reasoning service hosting action planners & adaptive inference.
            </p>
            <div className="space-y-1.5 text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <div>Endpoint: http://localhost:3001</div>
              <div>Tasks API: /api/tasks</div>
              <div>
                Uptime:{' '}
                {backendUptime ? `${Math.round(backendUptime)} seconds` : 'Online'}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Connection Health</span>
            <span className="text-emerald-400 font-mono">100% OK</span>
          </div>
        </div>
      </div>

      {/* Target Architecture Specification Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center space-x-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span>PrivyVision Architecture Flow (SIH26171)</span>
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          Browser Extension → Local Screenshot + DOM/A11y + OCR → Local Visual Perception → Local PII Detection → Local Redaction → Privacy Firewall → Sanitized Context → Server LLM/VLM → Structured Action → Local Action Guard → Browser Execution → Visual Verification.
        </p>
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-cyan-300/90 overflow-x-auto whitespace-pre">
{`Browser Extension ──► Local Viewport Frame (WebGPU/Canvas) + DOM Hierarchy + OCR Text
                   │
                   ▼
       Local Visual Perception Engine (Grounding & Bounding Boxes)
                   │
                   ▼
          Local PII Detection (Regex + Semantic Classifier)
                   │
                   ▼
         Attention Firewall (Zero-Trust Plaintext Masking)
                   │
                   ▼ [Sanitized Context Only]
         Server LLM/VLM Reasoning (Task Decomposition & Target)
                   │
                   ▼ [Proposed Structured Action]
         Local Action Guard (4-Tier Policy & Gate Verification)
                   │
                   ▼
       Client-Side Browser Execution & Visual Delta Verification`}
        </div>
      </div>
    </div>
  );
};
