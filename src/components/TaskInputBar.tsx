import React, { useState } from 'react';
import { Sparkles, Play, RotateCcw, Target, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { TaskMatchResult } from '../types/dom';

interface TaskInputBarProps {
  /** Callback triggered when the user executes a task */
  onExecuteTask: (taskQuery: string) => void;
  /** Active match result from the DOM extraction engine */
  activeMatch: TaskMatchResult | null;
  /** Callback to clear the active task and highlights */
  onClearTask: () => void;
}

/**
 * TaskInputBar Component
 * 
 * Provides an input interface where users or AI agents can type high-level natural language
 * instructions (e.g., "Locate and click the submit button" or "Find all sensitive personal info fields").
 * It also offers preset prompt chips for rapid testing.
 */
export const TaskInputBar: React.FC<TaskInputBarProps> = ({
  onExecuteTask,
  activeMatch,
  onClearTask,
}) => {
  const [taskText, setTaskText] = useState<string>('Locate and click the submit button');

  // Preset task examples for quick interactive testing
  const presetTasks = [
    'Download electricity bill',
    'Locate and click the submit button',
    'Find password and sensitive fields',
    'Locate the national ID / SSN field',
    'Find the email input field',
    'Inspect terms agreement checkbox',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskText.trim()) {
      onExecuteTask(taskText.trim());
    }
  };

  const handleSelectPreset = (preset: string) => {
    setTaskText(preset);
    onExecuteTask(preset);
  };

  const handleClear = () => {
    setTaskText('');
    onClearTask();
  };

  return (
    <div className="task-input-container">
      <div className="task-input-header">
        <div className="task-title-group">
          <div className="task-icon-badge">
            <Sparkles className="icon-sparkle" size={18} />
          </div>
          <div>
            <h2 className="task-title">Agent Task Simulation & Element Locator</h2>
            <p className="task-subtitle">
              Type a natural language instruction to simulate how an agent parses the DOM and resolves elements.
            </p>
          </div>
        </div>

        {activeMatch?.matchedElement && (
          <div className="task-match-badge">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span>
              Matched <strong>&lt;{activeMatch.matchedElement.tagName.toLowerCase()}&gt;</strong> ({activeMatch.confidenceScore}% confidence)
            </span>
          </div>
        )}
      </div>

      {/* Main Task Form */}
      <form onSubmit={handleSubmit} className="task-form">
        <div className="task-input-wrapper">
          <Target className="task-input-icon" size={18} />
          <input
            id="agent-task-input"
            type="text"
            className="task-text-input"
            placeholder='e.g., "Locate and click the submit button" or "Find sensitive password field"'
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            aria-label="User automation task instruction"
          />
          {taskText && (
            <button
              type="button"
              className="task-clear-btn"
              onClick={handleClear}
              title="Clear input"
              aria-label="Clear task input"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>

        <button
          type="submit"
          className="task-submit-btn"
          id="btn-run-task"
          aria-label="Execute task simulation"
        >
          <Play size={16} />
          <span>Execute Task</span>
        </button>
      </form>

      {/* Preset Quick Actions */}
      <div className="task-presets-wrapper">
        <span className="task-presets-label">Quick Suggestions:</span>
        <div className="task-chips-scroll">
          {presetTasks.map((preset, index) => (
            <button
              key={index}
              type="button"
              className={`task-chip ${taskText === preset ? 'active' : ''}`}
              onClick={() => handleSelectPreset(preset)}
            >
              {preset.includes('sensitive') || preset.includes('SSN') ? (
                <ShieldAlert size={12} className="chip-icon-sensitive" />
              ) : null}
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
