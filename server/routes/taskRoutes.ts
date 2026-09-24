import { Router, Request, Response } from 'express';
import { taskStore } from '../storage/taskStore.js';
import { runAdaptiveInference } from '../services/adaptiveInference.js';
import type { UserTaskInput, TaskContextRecord } from '../types/perception.js';

export const taskRouter = Router();

/**
 * ============================================================================
 * ENDPOINT 1: POST /api/tasks
 * ============================================================================
 * 
 * Receives a user task as input, parses perception requirements (required info,
 * allowed regions, forbidden info), generates an adaptive perception plan, runs
 * the Attention Firewall and adaptive inference, and saves the task context to in-memory storage.
 * 
 * Request Body:
 * {
 *   "task": "Locate and click the submit button",
 *   "context": { "currentUrl": "https://portal.space-ops.gov.in/onboarding" }
 * }
 */
taskRouter.post('/tasks', (req: Request, res: Response): void => {
  try {
    const { task, context, candidates } = req.body as UserTaskInput & {
      candidates?: import('../services/attentionFirewall.js').RawElementCandidate[];
    };

    if (!task || typeof task !== 'string' || task.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid input: "task" string is required in request body.',
      });
      return;
    }

    // 1. Create task, parse requirements, and synthesize plan
    const taskRecord: TaskContextRecord = taskStore.createTask({
      task: task.trim(),
      context,
    });

    // 2. Automatically execute Adaptive Multi-Tier Inference with Attention Firewall
    const adaptiveResult = runAdaptiveInference(
      taskRecord.rawTask,
      taskRecord.requirements,
      Array.isArray(candidates) && candidates.length > 0 ? candidates : undefined
    );

    // 3. Update task record in storage
    const enrichedRecord = taskStore.updateTask(taskRecord.id, {
      status: 'ADAPTIVE_INFERENCE_COMPLETE',
      adaptiveInferenceResult: adaptiveResult,
    });

    res.status(201).json({
      success: true,
      message: 'Task received, perception plan synthesized, and adaptive inference executed.',
      data: enrichedRecord,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to process task: ' + (error instanceof Error ? error.message : String(error)),
    });
  }
});

/**
 * ============================================================================
 * ENDPOINT 2: GET /api/tasks
 * ============================================================================
 * 
 * Retrieves all stored user tasks, their perception requirements, plans,
 * and adaptive inference results from memory.
 */
taskRouter.get('/tasks', (_req: Request, res: Response): void => {
  const tasks = taskStore.getAllTasks();
  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks,
  });
});

/**
 * ============================================================================
 * ENDPOINT 3: GET /api/tasks/:id
 * ============================================================================
 * 
 * Retrieves the details, requirements, plan, and adaptive inference state for a single task.
 */
taskRouter.get('/tasks/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const task = taskStore.getTaskById(id);

  if (!task) {
    res.status(404).json({
      success: false,
      error: `Task with ID "${id}" not found.`,
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: task,
  });
});

/**
 * ============================================================================
 * ENDPOINT 4: POST /api/tasks/:id/adaptive-inference
 * ============================================================================
 * 
 * Runs or re-runs the Three-Level Adaptive Inference Engine (Glance -> Focus -> Deep Look)
 * and passes all perception candidates through the Attention Firewall.
 * 
 * Request Body (optional custom elements):
 * {
 *   "candidates": [ ... ]
 * }
 */
taskRouter.post('/tasks/:id/adaptive-inference', (req: Request, res: Response): void => {
  const { id } = req.params;
  const task = taskStore.getTaskById(id);

  if (!task) {
    res.status(404).json({
      success: false,
      error: `Task with ID "${id}" not found.`,
    });
    return;
  }

  const customCandidates = req.body?.candidates;
  const adaptiveResult = runAdaptiveInference(
    task.rawTask,
    task.requirements,
    customCandidates
  );

  const updated = taskStore.updateTask(id, {
    status: 'ADAPTIVE_INFERENCE_COMPLETE',
    adaptiveInferenceResult: adaptiveResult,
  });

  res.status(200).json({
    success: true,
    message: 'Adaptive inference complete with Attention Firewall sanitization.',
    data: updated,
  });
});

/**
 * ============================================================================
 * ENDPOINT 5: POST /api/perception/firewall-inspect
 * ============================================================================
 * 
 * Standalone direct endpoint to run the Attention Firewall & Adaptive Inference
 * on any ad-hoc task query without creating a persistent task record.
 */
taskRouter.post('/perception/firewall-inspect', (req: Request, res: Response): void => {
  try {
    const { task, candidates } = req.body;
    const taskQuery = task || 'Find password and sensitive fields';
    const tempRecord = taskStore.createTask({ task: taskQuery });

    const adaptiveResult = runAdaptiveInference(
      taskQuery,
      tempRecord.requirements,
      candidates
    );

    // Delete temporary record to keep store clean
    taskStore.deleteTask(tempRecord.id);

    res.status(200).json({
      success: true,
      message: 'Attention Firewall and Adaptive Inference evaluated.',
      requirements: tempRecord.requirements,
      adaptiveResult,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Firewall inspection failed: ' + (error instanceof Error ? error.message : String(error)),
    });
  }
});

/**
 * ============================================================================
 * ENDPOINT 6: DELETE /api/tasks/:id
 * ============================================================================
 * 
 * Removes a task record from memory.
 */
taskRouter.delete('/tasks/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const deleted = taskStore.deleteTask(id);

  if (!deleted) {
    res.status(404).json({
      success: false,
      error: `Task with ID "${id}" not found.`,
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: `Task "${id}" deleted successfully.`,
  });
});
