import { AiProvider, RunnerStatus, TaskPriority, TaskStatus } from '../types';

type SemanticTone = 'neutral' | 'brand' | 'warning' | 'success' | 'danger';

type ToneStyles = {
  dot: string;
  icon: string;
  pill: string;
  border: string;
  surface: string;
  bar: string;
  panel: string;
  text: string;
  emphasis: string;
};

export const SEMANTIC_TONES: Record<SemanticTone, ToneStyles> = {
  neutral: {
    dot: 'bg-foreground/20 dark:bg-foreground/28',
    icon: 'text-muted-foreground',
    pill: 'bg-foreground/[0.045] text-muted-foreground ring-foreground/10',
    border: 'border-foreground/8',
    surface: 'from-foreground/[0.05] via-transparent to-transparent',
    bar: 'bg-foreground/10',
    panel: 'border-border/60 bg-foreground/[0.03]',
    text: 'text-muted-foreground',
    emphasis: 'text-foreground/72 dark:text-foreground/78',
  },
  brand: {
    dot: 'bg-primary',
    icon: 'text-primary',
    pill: 'bg-primary/10 text-primary ring-primary/15',
    border: 'border-primary/14',
    surface: 'from-primary/10 via-transparent to-transparent',
    bar: 'bg-primary',
    panel: 'border-primary/14 bg-primary/[0.06]',
    text: 'text-primary',
    emphasis: 'text-primary/80',
  },
  warning: {
    dot: 'bg-amber-500',
    icon: 'text-amber-600 dark:text-amber-400',
    pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/15',
    border: 'border-amber-500/14',
    surface: 'from-amber-500/12 via-transparent to-transparent',
    bar: 'bg-amber-500',
    panel: 'border-amber-500/14 bg-amber-500/[0.08]',
    text: 'text-amber-700 dark:text-amber-400',
    emphasis: 'text-amber-600 dark:text-amber-400',
  },
  success: {
    dot: 'bg-emerald-500',
    icon: 'text-emerald-600 dark:text-emerald-400',
    pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/15',
    border: 'border-emerald-500/14',
    surface: 'from-emerald-500/12 via-transparent to-transparent',
    bar: 'bg-emerald-500',
    panel: 'border-emerald-500/14 bg-emerald-500/[0.08]',
    text: 'text-emerald-700 dark:text-emerald-400',
    emphasis: 'text-emerald-600 dark:text-emerald-400',
  },
  danger: {
    dot: 'bg-destructive',
    icon: 'text-destructive',
    pill: 'bg-destructive/10 text-destructive ring-destructive/15',
    border: 'border-destructive/14',
    surface: 'from-destructive/12 via-transparent to-transparent',
    bar: 'bg-destructive',
    panel: 'border-destructive/14 bg-destructive/[0.08]',
    text: 'text-destructive',
    emphasis: 'text-destructive/80',
  },
};

export const TASK_STATUS_TONES: Record<TaskStatus, SemanticTone> = {
  backlog: 'neutral',
  todo: 'brand',
  in_progress: 'warning',
  failed: 'danger',
  done: 'success',
  cancelled: 'neutral',
};

export const TASK_PRIORITY_TONES: Record<TaskPriority, SemanticTone> = {
  none: 'neutral',
  low: 'brand',
  medium: 'warning',
  high: 'warning',
  urgent: 'danger',
};

export const RUNNER_STATUS_TONES: Record<RunnerStatus, SemanticTone> = {
  online: 'success',
  busy: 'warning',
  offline: 'neutral',
};

export const AI_PROVIDER_TONES: Record<AiProvider, SemanticTone> = {
  'claude-code': 'warning',
  codex: 'brand',
  'cursor-agent': 'neutral',
};

const LABEL_TONES: Record<string, SemanticTone> = {
  bug: 'danger',
  feature: 'brand',
  improvement: 'success',
  documentation: 'neutral',
  design: 'warning',
};

export function getToneStyles(tone: SemanticTone): ToneStyles {
  return SEMANTIC_TONES[tone];
}

export function getTaskStatusStyles(status: TaskStatus): ToneStyles {
  return getToneStyles(TASK_STATUS_TONES[status]);
}

export function getTaskPriorityStyles(priority: TaskPriority): ToneStyles {
  return getToneStyles(TASK_PRIORITY_TONES[priority]);
}

export function getRunnerStatusStyles(status: RunnerStatus): ToneStyles {
  return getToneStyles(RUNNER_STATUS_TONES[status]);
}

export function getAiProviderStyles(provider: AiProvider | string): ToneStyles {
  return getToneStyles(AI_PROVIDER_TONES[provider as AiProvider] ?? 'neutral');
}

export function getLabelStyles(label: string): ToneStyles {
  return getToneStyles(LABEL_TONES[label.trim().toLowerCase()] ?? 'neutral');
}
