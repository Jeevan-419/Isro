import React, { useState } from 'react';
import {
  Eye,
  Cpu,
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
  runtimeStatus,
  groundedElements,
  onSelectElement,
  selectedElement,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredElements = groundedElements.filter((el) => {
    if (filterType !== 'all' && el.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        el.label.toLowerCase().includes(q) ||
        el.cssSelector.toLowerCase().includes(q) ||
        (el.domId && el.domId.toLowerCase().includes(q)) ||
        el.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header Banner: Real Hardware Runtime & Perception Engine */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100">
              On-Device Visual Perception Engine (SIH26171)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Fusing Browser-side Canvas Vision, DOM Hierarchy, W3C Accessibility Tree, and In-situ OCR.
          </p>
        </div>

        {/* Runtime Probe Status */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-500 block text-[10px]">Execution Mode</span>
            <span className="font-mono text-cyan-400 font-semibold">
              {runtimeStatus.modeDisplayName}
            </span>
          </div>
          <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-500 block text-[10px]">Perception Latency</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {runtimeStatus.lastInferenceMs.toFixed(1)} ms
            </span>
          </div>
          <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-500 block text-[10px]">Grounded Targets</span>
            <span className="font-mono text-amber-400 font-semibold">
              {groundedElements.length} Elements
            </span>
          </div>
        </div>
      </div>

      {/* Main Grounding Matrix Table & Detailed Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Table List (8 Cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-lg">
          {/* Controls Bar */}
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by label, ID, selector..."
                className="w-full bg-slate-900 text-xs text-slate-200 pl-9 pr-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Type Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              {['all', 'button', 'input', 'link', 'checkbox', 'dropdown', 'dialog'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 rounded capitalize font-medium transition ${
                    filterType === t
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Grounding Matrix Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 sticky top-0 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Element / Label</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Detection Source</th>
                  <th className="p-3">Confidence</th>
                  <th className="p-3">Bounding Box (x,y,w,h)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredElements.map((el) => {
                  const isSelected = selectedElement?.uid === el.uid;
                  return (
                    <tr
                      key={el.uid}
                      onClick={() => onSelectElement(el)}
                      className={`cursor-pointer transition hover:bg-slate-800/50 ${
                        isSelected ? 'bg-cyan-950/40 border-l-2 border-cyan-400' : ''
                      }`}
                    >
                      <td className="p-3 max-w-[200px] truncate">
                        <span className="font-semibold text-slate-200 block truncate">
                          {el.label || el.ocrText || 'Unnamed'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 block truncate">
                          {el.cssSelector}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="font-mono uppercase text-[10px] bg-slate-800 px-2 py-0.5 rounded text-cyan-300">
                          {el.type}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="text-[11px] text-amber-300 font-mono flex items-center space-x-1">
                          <Eye className="w-3 h-3 text-amber-400" />
                          <span>{el.source}</span>
                        </span>
                      </td>

                      <td className="p-3 font-mono text-emerald-400 font-semibold">
                        {(el.confidence * 100).toFixed(0)}%
                      </td>

                      <td className="p-3 font-mono text-[10px] text-slate-400">
                        {el.boundingBox.x}, {el.boundingBox.y}, {el.boundingBox.width}x{el.boundingBox.height}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Deep Grounding Spec Inspector (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col space-y-4 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">Multi-Modal Fusion Details</h3>
            </div>
            {selectedElement && (
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded">
                Grounded
              </span>
            )}
          </div>

          {selectedElement ? (
            <div className="space-y-3 text-xs overflow-auto flex-1">
              <div>
                <span className="text-slate-500 text-[11px] block">Accessible Label & OCR:</span>
                <div className="bg-slate-950 p-2 rounded border border-slate-800 text-slate-200 font-medium">
                  {selectedElement.label || selectedElement.ocrText || 'None'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Visual UI Type</span>
                  <span className="font-bold text-cyan-300 uppercase">{selectedElement.type}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">ARIA Role</span>
                  <span className="font-bold text-emerald-400 font-mono">{selectedElement.role}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Detection Pipeline Origin:</span>
                <div className="bg-slate-950 p-2 rounded border border-slate-800 text-amber-300 font-mono text-[11px]">
                  {selectedElement.source}
                </div>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Spatial Coordinate Spec:</span>
                <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                  <div>X: {selectedElement.boundingBox.x}px | Y: {selectedElement.boundingBox.y}px</div>
                  <div>Width: {selectedElement.boundingBox.width}px | Height: {selectedElement.boundingBox.height}px</div>
                </div>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">CSS Target Selector:</span>
                <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[10px] text-cyan-400 truncate">
                  {selectedElement.cssSelector}
                </div>
              </div>

              {selectedElement.isSensitive && (
                <div className="bg-rose-950/40 border border-rose-800 p-2.5 rounded-lg text-rose-300 text-xs">
                  <div className="font-bold mb-1">Confidential PII Protected:</div>
                  <div className="text-[11px] text-rose-400">
                    Category: {selectedElement.sensitiveCategory}
                  </div>
                  <div className="text-[10px] font-mono mt-1 bg-rose-950 p-1 rounded">
                    Token: {selectedElement.redactedPlaceholder}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs text-center p-4 space-y-2">
              <Eye className="w-8 h-8 text-slate-700 animate-pulse" />
              <p>Select any row from the grounding matrix table to inspect its coordinate spec, OCR string, and multi-modal fusion origin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
