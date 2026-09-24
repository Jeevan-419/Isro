import type { TaskContextRecord } from '../types/perception.js';
import { parseTaskToRequirements } from '../services/taskParser.js';
import { generatePerceptionPlan } from '../services/perceptionPlanner.js';

/**
 * ============================================================================
 * IN-MEMORY TASK CONTEXT STORE
 * ============================================================================
 * 
 * Manages active and historical user tasks, parsed perception requirements,
 * and perception plan lifecycle states in memory.
 */
class TaskStore {
  private tasks: Map<string, TaskContextRecord> = new Map();

  constructor() {
    this.seedDefaultTasks();
  }

  /**
   * Seeds realistic default tasks for demonstration and immediate API testing.
   */
  private seedDefaultTasks() {
    const seedTasks = [
      'Locate and click the submit button',
      'Find master password and national ID sensitive fields',
      'Inspect terms of service agreement checkbox',
    ];

    seedTasks.forEach((rawTask) => {
      this.createTask({ task: rawTask });
    });
  }

  /**
   * Creates a new task context record from a user task input.
   */
  public createTask(input: { task: string; context?: Record<string, unknown> }): TaskContextRecord {
    const id = `task-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();

    const requirements = parseTaskToRequirements(input);
    const perceptionPlan = generatePerceptionPlan(input.task, requirements);

    const record: TaskContextRecord = {
      id,
      rawTask: input.task,
      createdAt: now,
      updatedAt: now,
      status: 'PLAN_GENERATED',
      requirements,
      perceptionPlan,
    };

    this.tasks.set(id, record);
    return record;
  }

  /**
   * Retrieves all stored tasks sorted by creation date descending.
   */
  public getAllTasks(): TaskContextRecord[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Retrieves a single task record by ID.
   */
  public getTaskById(id: string): TaskContextRecord | null {
    return this.tasks.get(id) || null;
  }

  /**
   * Updates an existing task record.
   */
  public updateTask(id: string, updates: Partial<TaskContextRecord>): TaskContextRecord | null {
    const existing = this.tasks.get(id);
    if (!existing) return null;

    const updated: TaskContextRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.tasks.set(id, updated);
    return updated;
  }

  /**
   * Deletes a task from memory.
   */
  public deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  /**
   * Clears all stored tasks.
   */
  public clear(): void {
    this.tasks.clear();
  }
}

// Export singleton instance
export const taskStore = new TaskStore();
