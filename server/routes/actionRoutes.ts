import { Router, Request, Response } from 'express';
import { taskStore } from '../storage/taskStore.js';
import { proposeBrowserAction } from '../services/actionPlanner.js';
import { validateActionWithGuard } from '../services/localActionGuard.js';
import { runAdaptiveInference } from '../services/adaptiveInference.js';
import type { ProposedBrowserAction } from '../types/actions.js';

export const actionRouter = Router();

/**
 * ============================================================================
 * ENDPOINT 1: POST /api/actions/propose
 * ============================================================================
 * 
 * Generates a proposed browser action based on a task instruction and minimal
 * perception context.
 * 
 * Request Body:
 * {
 *   "taskId": "task-xyz..." (optional),
 *   "task": "Locate and click the submit button" (optional if taskId provided)
 * }
 */
actionRouter.post('/actions/propose', (req: Request, res: Response): void => {
  try {
    const { taskId, task } = req.body;

    let targetTask = task;
    let requirements;
    let sanitizedElements;

    if (taskId) {
      const stored = taskStore.getTaskById(taskId);
      if (!stored) {
        res.status(404).json({ success: false, error: `Task with ID "${taskId}" not found.` });
        return;
      }
      targetTask = stored.rawTask;
      requirements = stored.requirements;
      sanitizedElements = stored.adaptiveInferenceResult?.sanitizedPerceptionPayload;
    }

    if (!requirements) {
      const temp = taskStore.createTask({ task: targetTask || 'Locate and click the submit button' });
      requirements = temp.requirements;
      const adaptiveResult = runAdaptiveInference(temp.rawTask, requirements);
      sanitizedElements = adaptiveResult.sanitizedPerceptionPayload;
      taskStore.deleteTask(temp.id);
    }

    const proposedAction = proposeBrowserAction(targetTask, requirements, sanitizedElements || []);

    res.status(200).json({
      success: true,
      message: 'Browser action proposed successfully from perception context.',
      data: proposedAction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to propose action: ' + (error instanceof Error ? error.message : String(error)),
    });
  }
});

/**
 * ============================================================================
 * ENDPOINT 2: POST /api/actions/validate
 * ============================================================================
 * 
 * Evaluates a proposed browser action through the Local Action Guard to ensure
 * scope boundaries, privacy rules, and destructive action safeguards pass.
 * 
 * Request Body:
 * {
 *   "action": { ...ProposedBrowserAction },
 *   "taskId": "task-xyz..." (optional)
 * }
 */
actionRouter.post('/actions/validate', (req: Request, res: Response): void => {
  try {
    const { action, taskId } = req.body as { action: ProposedBrowserAction; taskId?: string };

    if (!action || !action.targetSelector) {
      res.status(400).json({
        success: false,
        error: 'Invalid input: "action" object with "targetSelector" is required.',
      });
      return;
    }

    let requirements;
    let sanitizedElements;

    if (taskId) {
      const stored = taskStore.getTaskById(taskId);
      if (stored) {
        requirements = stored.requirements;
        sanitizedElements = stored.adaptiveInferenceResult?.sanitizedPerceptionPayload;
      }
    }

    if (!requirements) {
      const temp = taskStore.createTask({ task: 'General browser automation task' });
      requirements = temp.requirements;
      taskStore.deleteTask(temp.id);
    }

    const guardEvaluation = validateActionWithGuard(action, requirements, sanitizedElements);

    res.status(200).json({
      success: true,
      data: guardEvaluation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to validate action: ' + (error instanceof Error ? error.message : String(error)),
    });
  }
});

/**
 * ============================================================================
 * ENDPOINT 3: POST /api/actions/approve
 * ============================================================================
 * 
 * Submits an action for validation and approval. If the action violates scope or
 * privacy policies, it is immediately blocked with a clear reason.
 * 
 * Request Body:
 * {
 *   "action": { ...ProposedBrowserAction },
 *   "taskId": "task-xyz..." (optional)
 * }
 * 
 * Response:
 * - 200 OK: Action approved & ready for execution.
 * - 403 Forbidden: Action blocked by Local Action Guard with block reason.
 */
actionRouter.post('/actions/approve', (req: Request, res: Response): void => {
  try {
    const { action, taskId } = req.body as { action: ProposedBrowserAction; taskId?: string };

    if (!action) {
      res.status(400).json({ success: false, error: '"action" object is required in body.' });
      return;
    }

    let requirements;
    let sanitizedElements;

    if (taskId) {
      const stored = taskStore.getTaskById(taskId);
      if (stored) {
        requirements = stored.requirements;
        sanitizedElements = stored.adaptiveInferenceResult?.sanitizedPerceptionPayload;
      }
    }

    if (!requirements) {
      const temp = taskStore.createTask({ task: 'General browser task' });
      requirements = temp.requirements;
      taskStore.deleteTask(temp.id);
    }

    const evaluation = validateActionWithGuard(action, requirements, sanitizedElements);

    if (evaluation.guardStatus === 'BLOCKED') {
      res.status(403).json({
        success: false,
        status: 'BLOCKED',
        error: 'Action blocked by Local Action Guard',
        reason: evaluation.blockReason,
        evaluation,
      });
      return;
    }

    if (evaluation.guardStatus === 'REQUIRES_USER_CONFIRMATION') {
      res.status(200).json({
        success: false,
        status: 'REQUIRES_USER_CONFIRMATION',
        message: 'Action requires explicit user confirmation before execution.',
        reason: evaluation.blockReason,
        evaluation,
      });
      return;
    }

    res.status(200).json({
      success: true,
      status: 'APPROVED',
      message: 'Action validated and approved by Local Action Guard.',
      evaluation,
      executionResult: {
        dispatched: true,
        actionType: action.actionType,
        targetSelector: action.targetSelector,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Approval pipeline failed: ' + (error instanceof Error ? error.message : String(error)),
    });
  }
});

/**
 * ============================================================================
 * ENDPOINT 4: POST /api/tasks/:id/actions/plan-and-guard
 * ============================================================================
 * 
 * End-to-end task endpoint: Takes a stored task ID, uses Action Planner to
 * propose the next browser action, evaluates it through Local Action Guard,
 * and returns the combined plan and approval decision.
 */
actionRouter.post('/tasks/:id/actions/plan-and-guard', (req: Request, res: Response): void => {
  const { id } = req.params;
  const task = taskStore.getTaskById(id);

  if (!task) {
    res.status(404).json({ success: false, error: `Task with ID "${id}" not found.` });
    return;
  }

  const sanitizedElements =
    task.adaptiveInferenceResult?.sanitizedPerceptionPayload ||
    runAdaptiveInference(task.rawTask, task.requirements).sanitizedPerceptionPayload;

  // 1. Propose action
  const proposedAction = proposeBrowserAction(task.rawTask, task.requirements, sanitizedElements);

  // 2. Validate with guard
  const guardEvaluation = validateActionWithGuard(proposedAction, task.requirements, sanitizedElements);

  res.status(200).json({
    success: true,
    taskId: id,
    rawTask: task.rawTask,
    proposedAction,
    guardEvaluation,
    isApproved: guardEvaluation.guardStatus === 'APPROVED',
    status: guardEvaluation.guardStatus,
    timestamp: new Date().toISOString(),
  });
});
