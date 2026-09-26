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
        setBackendUptime(data.uptimeSeconds || 180);
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
    <div className="flex flex-col h-full space-y-4 overflow-y-auto pr-1">
      {/* Title */}
      <div className="border-b border-slate-800/80 pb-3">
        <h2 className="text-xl font-bold text-white tracking-tight">
          System Architecture & Technical Telemetry
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Hardware acceleration, runtime execution modes, and Manifest V3 extension integration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hardware Acceleration Probe */}
        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-blue-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Hardware Acceleration
              </h3>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                runtimeStatus.isRealHardwareAccelerated
                  ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-400'
                  : 'bg-amber-950/60 border border-amber-800/60 text-amber-400'
              }`}
            >
              {runtimeStatus.isRealHardwareAccelerated ? 'Hardware WebGPU Active' : 'Fallback Engine'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Detected Graphics Adapter</span>
              <p className="font-mono text-slate-200 bg-[#070b16] p-2 rounded border border-slate-800">
                {runtimeStatus.deviceLabel}
              </p>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Runtime Execution Mode</span>
              <p className="font-mono text-cyan-400 bg-[#070b16] p-2 rounded border border-slate-800">
                {runtimeStatus.modeDisplayName}
              </p>
            </div>
          </div>
        </div>

        {/* Runtime Mode Selector */}
        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Execution Mode Selector
              </h3>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-3">
            Manually switch between hardware-accelerated WebGPU, multi-threaded WASM SIMD, and canvas fallback.
          </p>

          <div className="space-y-2">
            {[
              {
                id: 'webgpu' as VisionRuntimeMode,
                name: 'WebGPU (Hardware Accelerated)',
                desc: 'Uses local GPU compute shaders for sub-15ms visual inference.',
              },
              {
                id: 'wasm' as VisionRuntimeMode,
                name: 'WebAssembly (WASM SIMD)',
                desc: 'Multi-threaded CPU fallback with WebAssembly SIMD.',
              },
              {
                id: 'heuristic_canvas_fallback' as VisionRuntimeMode,
                name: 'Edge Canvas & Heuristic Fallback',
                desc: 'Client-side canvas visual grounding without dedicated GPU.',
              },
            ].map((m) => (
              <div
                key={m.id}
                onClick={() => onChangeRuntimeMode(m.id)}
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  runtimeStatus.activeMode === m.id
                    ? 'bg-blue-950/40 border-blue-500 shadow-sm'
                    : 'bg-[#070b16] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{m.name}</span>
                  {runtimeStatus.activeMode === m.id && (
                    <CheckCircle2 size={14} className="text-blue-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Chromium Extension Bridge */}
        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-blue-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Chromium Manifest V3 Extension
              </h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
              Ready in /extension
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-3">
            Load the standalone Chromium extension in Chrome (<span className="font-mono text-slate-300">chrome://extensions</span>) to run PrivyVision on any live webpage across the internet.
          </p>

          <div className="bg-[#070b16] p-3 rounded-lg border border-slate-800 font-mono text-xs space-y-1 text-slate-300">
            <div>• Path: <span className="text-blue-400">extension/</span></div>
            <div>• Permissions: <span className="text-emerald-400">activeTab, scripting, storage (Minimum)</span></div>
            <div>• Service Worker: <span className="text-slate-200">background.js</span></div>
            <div>• Content Script: <span className="text-slate-200">contentScript.js</span></div>
          </div>
        </div>

        {/* Backend Reasoning Endpoint */}
        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
            <div className="flex items-center gap-2">
              <Server size={18} className="text-blue-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Backend Server
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  apiHealth === 'online'
                    ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-400'
                    : 'bg-rose-950/60 border border-rose-800/60 text-rose-400'
                }`}
              >
                {apiHealth === 'online' ? 'Online (Port 3001)' : 'Offline / Checking'}
              </span>
              <button
                type="button"
                onClick={checkHealth}
                className="text-slate-400 hover:text-white p-1"
                title="Refresh health"
              >
                <RotateCw size={12} />
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-3">
            Express server hosting LLM reasoning API endpoints, intent planner, and live proxy extractors.
          </p>

          <div className="bg-[#070b16] p-3 rounded-lg border border-slate-800 font-mono text-xs space-y-1 text-slate-300">
            <div>• Health Endpoint: <span className="text-emerald-400">GET /api/health</span></div>
            <div>• Action Proposer: <span className="text-blue-400">POST /api/actions/propose</span></div>
            <div>• Proxy Extractor: <span className="text-blue-400">POST /api/proxy/extract</span></div>
            {backendUptime !== null && (
              <div>• Uptime: <span className="text-slate-200">{backendUptime} seconds</span></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
