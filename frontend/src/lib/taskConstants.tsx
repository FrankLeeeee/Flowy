import React from 'react';
import { TaskStatus, TaskPriority, AiProvider } from '../types';
import {
  Circle, CheckCircle2, XCircle, Clock, Archive, AlertTriangle,
  SignalHigh, SignalMedium, SignalLow, Minus,
} from 'lucide-react';

/** Icon and display label for each task status. */
export const STATUS_CONFIG: Record<TaskStatus, { icon: React.ReactNode; label: string }> = {
  backlog:     { icon: <Archive className="h-3.5 w-3.5" />,       label: 'Backlog' },
  todo:        { icon: <Circle className="h-3.5 w-3.5" />,        label: 'Todo' },
  in_progress: { icon: <Clock className="h-3.5 w-3.5" />,         label: 'In Progress' },
  failed:      { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: 'Failed' },
  done:        { icon: <CheckCircle2 className="h-3.5 w-3.5" />,  label: 'Done' },
  cancelled:   { icon: <XCircle className="h-3.5 w-3.5" />,       label: 'Cancelled' },
};

/** Icon for each task priority level. */
export const PRIORITY_ICON: Record<TaskPriority, React.ReactNode> = {
  urgent: <AlertTriangle className="h-3.5 w-3.5" />,
  high:   <SignalHigh className="h-3.5 w-3.5" />,
  medium: <SignalMedium className="h-3.5 w-3.5" />,
  low:    <SignalLow className="h-3.5 w-3.5" />,
  none:   <Minus className="h-3.5 w-3.5" />,
};

/** Human-readable display names for AI providers. */
export const AI_LABELS: Record<AiProvider, string> = {
  'claude-code':  'Claude Code',
  'codex':        'Codex',
  'cursor-agent': 'Cursor Agent',
};

/** Ordered list of all task statuses for column/group layout. */
export const TASK_STATUSES: TaskStatus[] = [
  'backlog', 'todo', 'in_progress', 'failed', 'done', 'cancelled',
];
