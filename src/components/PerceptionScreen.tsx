import React, { useState } from 'react';
import {
  Lock,
  Search,
} from 'lucide-react';
import type {
  GroundedElement,
  VisionRuntimeStatus,
} from '../types/privyVision';

interface PerceptionScreenProps {
  runtimeStatus: VisionRuntimeStatus;
  groundedElements: GroundedElement[];
  onSelectElement: (elem: GroundedElement) => void;
  selectedElement: GroundedElement | null;
}

export const PerceptionScreen: React.FC<PerceptionScreenProps> = ({
  runtimeStatus: _runtimeStatus,
  groundedElements,
  onSelectElement,
  selectedElement,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredElements = groundedElements.filter((el) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      el.label.toLowerCase().includes(q) ||
      el.type.toLowerCase().includes(q) ||
      (el.domId && el.domId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Title */}
      <div className="border-b border-slate-800/80 pb-3">
        <h2 className="text-lg font-bold text-white tracking-tight">
          Visual Perception Analysis
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Multi-modal element grounding fusing on-device Canvas Vision, DOM attributes, W3C Accessibility, and OCR.
        </p>
      </div>

      {/* Analysis Workspace: Split Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* LEFT: Large Screenshot / Visual Canvas (8 Cols) */}
        <div className="lg:col-span-8 bg-[#0e1424] border border-slate-800 rounded-xl p-4 flex flex-col shadow-xl overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800/80 mb-3">
            <span className="font-mono text-[11px] text-slate-400">GROUNDED FRAME BUFFER (100% ON-DEVICE)</span>
            {selectedElement && (
              <span className="text-blue-400 font-mono text-[11px]">
                Selected: {selectedElement.label} ({selectedElement.type.toUpperCase()})
              </span>
            )}
          </div>

          {/* Realistic Viewport Canvas Simulation */}
          <div className="flex-1 bg-[#070b16] border border-slate-800/80 rounded-lg p-5 relative overflow-y-auto min-h-[460px]">
            {/* Rendered mockup of the page */}
            <div className="max-w-md mx-auto space-y-4 pt-2">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-200">SpaceOps Clearance Portal</h3>
                <p className="text-[11px] text-slate-400">Personnel Identity Registration</p>
              </div>

              {/* Form item: Name */}
              <div className="space-y-1 relative">
                <label className="text-[11px] text-slate-400 block">Full Legal Name</label>
                <div
                  onClick={() => {
                    const el = groundedElements.find((e) => e.domId === 'input-full-name');
                    if (el) onSelectElement(el);
                  }}
                  className={`p-2 rounded bg-[#0b1020] border text-xs text-slate-200 cursor-pointer transition ${
                    selectedElement?.domId === 'input-full-name'
                      ? 'border-blue-500 ring-2 ring-blue-500/40 bg-blue-950/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  Dr. Vikram Sarabhai
                </div>
              </div>

              {/* Form item: Email */}
              <div className="space-y-1 relative">
                <div className="flex justify-between items-center text-[11px]">
                  <label className="text-slate-400">Official Email Address</label>
                  <span className="text-[9px] text-rose-400 font-mono">PII</span>
                </div>
                <div
                  onClick={() => {
                    const el = groundedElements.find((e) => e.domId === 'input-email');
                    if (el) onSelectElement(el);
                  }}
                  className={`p-2 rounded bg-[#0b1020] border text-xs text-slate-200 cursor-pointer font-mono transition ${
                    selectedElement?.domId === 'input-email'
                      ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-950/20'
                      : 'border-rose-900/60 hover:border-rose-700'
                  }`}
                >
                  vikram.s@isro.gov.in
                </div>
              </div>

              {/* Form item: Phone */}
              <div className="space-y-1 relative">
                <div className="flex justify-between items-center text-[11px]">
                  <label className="text-slate-400">Phone Number</label>
                  <span className="text-[9px] text-rose-400 font-mono">PII</span>
                </div>
                <div
                  onClick={() => {
                    const el = groundedElements.find((e) => e.domId === 'input-phone');
                    if (el) onSelectElement(el);
                  }}
                  className={`p-2 rounded bg-[#0b1020] border text-xs text-slate-200 cursor-pointer font-mono transition ${
                    selectedElement?.domId === 'input-phone'
                      ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-950/20'
                      : 'border-rose-900/60 hover:border-rose-700'
                  }`}
                >
                  +91 98450 12345
                </div>
              </div>

              {/* Form item: Password */}
              <div className="space-y-1 relative">
                <div className="flex justify-between items-center text-[11px]">
                  <label className="text-slate-400">Master Password</label>
                  <span className="text-[9px] text-rose-400 font-mono">PII</span>
                </div>
                <div
                  onClick={() => {
                    const el = groundedElements.find((e) => e.domId === 'input-password');
                    if (el) onSelectElement(el);
                  }}
                  className={`p-2 rounded bg-[#0b1020] border text-xs text-slate-200 cursor-pointer font-mono transition ${
                    selectedElement?.domId === 'input-password'
                      ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-950/20'
                      : 'border-rose-900/60 hover:border-rose-700'
                  }`}
                >
                  ••••••••••••••••
                </div>
              </div>

              {/* Form item: Submit Button */}
              <div className="pt-3">
                <div
                  onClick={() => {
                    const el = groundedElements.find((e) => /submit/i.test(e.label) || e.domId?.includes('submit'));
                    if (el) onSelectElement(el);
                  }}
                  className={`w-full py-2.5 px-4 rounded-lg bg-blue-600 text-white text-xs font-semibold text-center cursor-pointer transition ${
                    selectedElement?.type === 'button' && /submit/i.test(selectedElement.label)
                      ? 'ring-2 ring-emerald-400 bg-blue-500 shadow-md'
                      : 'hover:bg-blue-500'
                  }`}
                >
                  Submit Application
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Detected Elements List (4 Cols) */}
        <div className="lg:col-span-4 bg-[#0e1424] border border-slate-800 rounded-xl p-4 flex flex-col shadow-xl">
          {/* Header & Search */}
          <div className="pb-3 border-b border-slate-800/80 mb-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
                Detected Elements
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {filteredElements.length} targets
              </span>
            </div>

            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter elements..."
                className="w-full bg-[#070b16] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Compact Rows List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredElements.map((el) => {
              const isSelected = selectedElement?.uid === el.uid;
              const isPii = el.isSensitive;

              return (
                <div
                  key={el.uid}
                  onClick={() => onSelectElement(el)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500 shadow-sm'
                      : 'bg-[#070b16] border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-200 truncate max-w-[160px]">
                      {el.label || el.domId || el.type}
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {el.type.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="text-blue-400 font-semibold">
                      {(el.confidence * 100).toFixed(0)}%
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[10px]">
                        {el.source.replace('Vision + DOM + A11y + OCR', 'VISION + DOM')}
                      </span>
                      {isPii && (
                        <span className="flex items-center gap-0.5 text-rose-400 bg-rose-950/60 px-1 py-0.2 rounded text-[9px] font-bold">
                          <Lock size={9} />
                          PII
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
