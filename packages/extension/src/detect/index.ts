import * as vscode from 'vscode';

/**
 * Agent event emitted by detection signals.
 */
export interface AgentEvent {
  kind: 'start' | 'end';
  source: string;
  at: number;
}

/**
 * Detection signal interface.
 * Each signal source implements this to report agent activity.
 */
export interface Signal {
  id: string;
  /** Higher priority wins when multiple signals fire */
  priority: number;
  /** Start listening. Returns a disposable to stop. */
  start(emit: (e: AgentEvent) => void): vscode.Disposable;
}

interface TrackedTask {
  source: string;
  priority: number;
  startedAt: number;
}

/** Maximum agent task duration before auto-end (15 minutes) */
const MAX_TASK_MS = 15 * 60 * 1000;

/**
 * AgentActivityMonitor merges signals by priority.
 *
 * A task is "running" from the first start until the matching end
 * from the same source, or the 15-minute ceiling. When several
 * signals claim a task, the highest-priority source owns the end event.
 */
export class AgentActivityMonitor {
  private _signals: Signal[] = [];
  private _disposables: vscode.Disposable[] = [];
  private _activeTasks: Map<string, TrackedTask> = new Map();
  private _ceilingTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  /**
   * Register a detection signal source.
   */
  addSignal(signal: Signal): void {
    this._signals.push(signal);
    // Keep sorted by priority descending
    this._signals.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Start all registered signals. Returns a composite disposable.
   */
  start(onEvent: (e: AgentEvent) => void): vscode.Disposable {
    for (const signal of this._signals) {
      const disposable = signal.start((event) => {
        this._handleEvent(event, onEvent);
      });
      this._disposables.push(disposable);
    }

    return {
      dispose: () => {
        for (const d of this._disposables) {
          d.dispose();
        }
        this._disposables = [];
        for (const timer of this._ceilingTimers.values()) {
          clearTimeout(timer);
        }
        this._ceilingTimers.clear();
        this._activeTasks.clear();
      },
    };
  }

  private _handleEvent(
    event: AgentEvent,
    onEvent: (e: AgentEvent) => void,
  ): void {
    const { kind, source, at } = event;

    if (kind === 'start') {
      // If no task is active, or this source has higher priority, emit
      const signal = this._signals.find((s) => s.id === source);
      const priority = signal?.priority ?? 0;

      this._activeTasks.set(source, { source, priority, startedAt: at });

      // Set ceiling timer
      const timer = setTimeout(() => {
        this._ceilingTimers.delete(source);
        this._activeTasks.delete(source);
        onEvent({ kind: 'end', source, at: Date.now() });
      }, MAX_TASK_MS);
      this._ceilingTimers.set(source, timer);

      // Only emit if this is the highest-priority active task
      if (this._isHighestPriority(source)) {
        onEvent(event);
      }
    } else {
      // End event
      const task = this._activeTasks.get(source);
      if (!task) return;

      this._activeTasks.delete(source);

      // Clear ceiling timer
      const timer = this._ceilingTimers.get(source);
      if (timer) {
        clearTimeout(timer);
        this._ceilingTimers.delete(source);
      }

      // Only emit end if no other active tasks remain
      if (this._activeTasks.size === 0) {
        onEvent(event);
      }
    }
  }

  private _isHighestPriority(source: string): boolean {
    const task = this._activeTasks.get(source);
    if (!task) return false;

    for (const other of this._activeTasks.values()) {
      if (other.source !== source && other.priority > task.priority) {
        return false;
      }
    }
    return true;
  }
}
