import { AiProvider, LabelColor, RunnerStatus, TaskPriority, TaskStatus } from '../types';

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
  'gemini-cli': 'neutral',
};

export type LabelColorStyles = {
  dot: string;
  pill: string;
  text: string;
  bg: string;
  swatch: string;
};

export const LABEL_COLORS: Record<LabelColor, LabelColorStyles> = {
  // ── Red ──
  red:          { dot: 'bg-red-500',     pill: 'bg-red-500/10 text-red-700 dark:text-red-300 ring-red-500/20',               text: 'text-red-700 dark:text-red-300',         bg: 'bg-red-500/10',     swatch: 'bg-red-500' },
  'red-light':  { dot: 'bg-red-400',     pill: 'bg-red-400/10 text-red-600 dark:text-red-300 ring-red-400/20',               text: 'text-red-600 dark:text-red-300',         bg: 'bg-red-400/10',     swatch: 'bg-red-400' },
  'red-dark':   { dot: 'bg-red-700',     pill: 'bg-red-700/10 text-red-800 dark:text-red-400 ring-red-700/20',               text: 'text-red-800 dark:text-red-400',         bg: 'bg-red-700/10',     swatch: 'bg-red-700' },
  // ── Orange ──
  orange:         { dot: 'bg-orange-500',  pill: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-orange-500/20',  text: 'text-orange-700 dark:text-orange-300',  bg: 'bg-orange-500/10',  swatch: 'bg-orange-500' },
  'orange-light': { dot: 'bg-orange-400',  pill: 'bg-orange-400/10 text-orange-600 dark:text-orange-300 ring-orange-400/20',  text: 'text-orange-600 dark:text-orange-300',  bg: 'bg-orange-400/10',  swatch: 'bg-orange-400' },
  'orange-dark':  { dot: 'bg-orange-700',  pill: 'bg-orange-700/10 text-orange-800 dark:text-orange-400 ring-orange-700/20',  text: 'text-orange-800 dark:text-orange-400',  bg: 'bg-orange-700/10',  swatch: 'bg-orange-700' },
  // ── Amber ──
  amber:         { dot: 'bg-amber-500',   pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20',      text: 'text-amber-700 dark:text-amber-300',    bg: 'bg-amber-500/10',   swatch: 'bg-amber-500' },
  'amber-light': { dot: 'bg-amber-400',   pill: 'bg-amber-400/10 text-amber-600 dark:text-amber-300 ring-amber-400/20',      text: 'text-amber-600 dark:text-amber-300',    bg: 'bg-amber-400/10',   swatch: 'bg-amber-400' },
  'amber-dark':  { dot: 'bg-amber-700',   pill: 'bg-amber-700/10 text-amber-800 dark:text-amber-400 ring-amber-700/20',      text: 'text-amber-800 dark:text-amber-400',    bg: 'bg-amber-700/10',   swatch: 'bg-amber-700' },
  // ── Yellow ──
  yellow:         { dot: 'bg-yellow-500',  pill: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 ring-yellow-500/20',  text: 'text-yellow-700 dark:text-yellow-300',  bg: 'bg-yellow-500/10',  swatch: 'bg-yellow-500' },
  'yellow-light': { dot: 'bg-yellow-400',  pill: 'bg-yellow-400/10 text-yellow-600 dark:text-yellow-300 ring-yellow-400/20',  text: 'text-yellow-600 dark:text-yellow-300',  bg: 'bg-yellow-400/10',  swatch: 'bg-yellow-400' },
  'yellow-dark':  { dot: 'bg-yellow-700',  pill: 'bg-yellow-700/10 text-yellow-800 dark:text-yellow-400 ring-yellow-700/20',  text: 'text-yellow-800 dark:text-yellow-400',  bg: 'bg-yellow-700/10',  swatch: 'bg-yellow-700' },
  // ── Lime ──
  lime:         { dot: 'bg-lime-500',    pill: 'bg-lime-500/10 text-lime-700 dark:text-lime-300 ring-lime-500/20',            text: 'text-lime-700 dark:text-lime-300',      bg: 'bg-lime-500/10',    swatch: 'bg-lime-500' },
  'lime-light': { dot: 'bg-lime-400',    pill: 'bg-lime-400/10 text-lime-600 dark:text-lime-300 ring-lime-400/20',            text: 'text-lime-600 dark:text-lime-300',      bg: 'bg-lime-400/10',    swatch: 'bg-lime-400' },
  'lime-dark':  { dot: 'bg-lime-700',    pill: 'bg-lime-700/10 text-lime-800 dark:text-lime-400 ring-lime-700/20',            text: 'text-lime-800 dark:text-lime-400',      bg: 'bg-lime-700/10',    swatch: 'bg-lime-700' },
  // ── Green ──
  green:         { dot: 'bg-green-500',   pill: 'bg-green-500/10 text-green-700 dark:text-green-300 ring-green-500/20',       text: 'text-green-700 dark:text-green-300',    bg: 'bg-green-500/10',   swatch: 'bg-green-500' },
  'green-light': { dot: 'bg-green-400',   pill: 'bg-green-400/10 text-green-600 dark:text-green-300 ring-green-400/20',       text: 'text-green-600 dark:text-green-300',    bg: 'bg-green-400/10',   swatch: 'bg-green-400' },
  'green-dark':  { dot: 'bg-green-700',   pill: 'bg-green-700/10 text-green-800 dark:text-green-400 ring-green-700/20',       text: 'text-green-800 dark:text-green-400',    bg: 'bg-green-700/10',   swatch: 'bg-green-700' },
  // ── Emerald ──
  emerald:         { dot: 'bg-emerald-500', pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-500/10', swatch: 'bg-emerald-500' },
  'emerald-light': { dot: 'bg-emerald-400', pill: 'bg-emerald-400/10 text-emerald-600 dark:text-emerald-300 ring-emerald-400/20', text: 'text-emerald-600 dark:text-emerald-300', bg: 'bg-emerald-400/10', swatch: 'bg-emerald-400' },
  'emerald-dark':  { dot: 'bg-emerald-700', pill: 'bg-emerald-700/10 text-emerald-800 dark:text-emerald-400 ring-emerald-700/20', text: 'text-emerald-800 dark:text-emerald-400', bg: 'bg-emerald-700/10', swatch: 'bg-emerald-700' },
  // ── Teal ──
  teal:         { dot: 'bg-teal-500',    pill: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-teal-500/20',            text: 'text-teal-700 dark:text-teal-300',      bg: 'bg-teal-500/10',    swatch: 'bg-teal-500' },
  'teal-light': { dot: 'bg-teal-400',    pill: 'bg-teal-400/10 text-teal-600 dark:text-teal-300 ring-teal-400/20',            text: 'text-teal-600 dark:text-teal-300',      bg: 'bg-teal-400/10',    swatch: 'bg-teal-400' },
  'teal-dark':  { dot: 'bg-teal-700',    pill: 'bg-teal-700/10 text-teal-800 dark:text-teal-400 ring-teal-700/20',            text: 'text-teal-800 dark:text-teal-400',      bg: 'bg-teal-700/10',    swatch: 'bg-teal-700' },
  // ── Cyan ──
  cyan:         { dot: 'bg-cyan-500',    pill: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 ring-cyan-500/20',            text: 'text-cyan-700 dark:text-cyan-300',      bg: 'bg-cyan-500/10',    swatch: 'bg-cyan-500' },
  'cyan-light': { dot: 'bg-cyan-400',    pill: 'bg-cyan-400/10 text-cyan-600 dark:text-cyan-300 ring-cyan-400/20',            text: 'text-cyan-600 dark:text-cyan-300',      bg: 'bg-cyan-400/10',    swatch: 'bg-cyan-400' },
  'cyan-dark':  { dot: 'bg-cyan-700',    pill: 'bg-cyan-700/10 text-cyan-800 dark:text-cyan-400 ring-cyan-700/20',            text: 'text-cyan-800 dark:text-cyan-400',      bg: 'bg-cyan-700/10',    swatch: 'bg-cyan-700' },
  // ── Blue ──
  blue:         { dot: 'bg-blue-500',    pill: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/20',            text: 'text-blue-700 dark:text-blue-300',      bg: 'bg-blue-500/10',    swatch: 'bg-blue-500' },
  'blue-light': { dot: 'bg-blue-400',    pill: 'bg-blue-400/10 text-blue-600 dark:text-blue-300 ring-blue-400/20',            text: 'text-blue-600 dark:text-blue-300',      bg: 'bg-blue-400/10',    swatch: 'bg-blue-400' },
  'blue-dark':  { dot: 'bg-blue-700',    pill: 'bg-blue-700/10 text-blue-800 dark:text-blue-400 ring-blue-700/20',            text: 'text-blue-800 dark:text-blue-400',      bg: 'bg-blue-700/10',    swatch: 'bg-blue-700' },
  // ── Indigo ──
  indigo:         { dot: 'bg-indigo-500',  pill: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-indigo-500/20',   text: 'text-indigo-700 dark:text-indigo-300',  bg: 'bg-indigo-500/10',  swatch: 'bg-indigo-500' },
  'indigo-light': { dot: 'bg-indigo-400',  pill: 'bg-indigo-400/10 text-indigo-600 dark:text-indigo-300 ring-indigo-400/20',   text: 'text-indigo-600 dark:text-indigo-300',  bg: 'bg-indigo-400/10',  swatch: 'bg-indigo-400' },
  'indigo-dark':  { dot: 'bg-indigo-700',  pill: 'bg-indigo-700/10 text-indigo-800 dark:text-indigo-400 ring-indigo-700/20',   text: 'text-indigo-800 dark:text-indigo-400',  bg: 'bg-indigo-700/10',  swatch: 'bg-indigo-700' },
  // ── Violet ──
  violet:         { dot: 'bg-violet-500',  pill: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-500/20',   text: 'text-violet-700 dark:text-violet-300',  bg: 'bg-violet-500/10',  swatch: 'bg-violet-500' },
  'violet-light': { dot: 'bg-violet-400',  pill: 'bg-violet-400/10 text-violet-600 dark:text-violet-300 ring-violet-400/20',   text: 'text-violet-600 dark:text-violet-300',  bg: 'bg-violet-400/10',  swatch: 'bg-violet-400' },
  'violet-dark':  { dot: 'bg-violet-700',  pill: 'bg-violet-700/10 text-violet-800 dark:text-violet-400 ring-violet-700/20',   text: 'text-violet-800 dark:text-violet-400',  bg: 'bg-violet-700/10',  swatch: 'bg-violet-700' },
  // ── Purple ──
  purple:         { dot: 'bg-purple-500',  pill: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-purple-500/20',   text: 'text-purple-700 dark:text-purple-300',  bg: 'bg-purple-500/10',  swatch: 'bg-purple-500' },
  'purple-light': { dot: 'bg-purple-400',  pill: 'bg-purple-400/10 text-purple-600 dark:text-purple-300 ring-purple-400/20',   text: 'text-purple-600 dark:text-purple-300',  bg: 'bg-purple-400/10',  swatch: 'bg-purple-400' },
  'purple-dark':  { dot: 'bg-purple-700',  pill: 'bg-purple-700/10 text-purple-800 dark:text-purple-400 ring-purple-700/20',   text: 'text-purple-800 dark:text-purple-400',  bg: 'bg-purple-700/10',  swatch: 'bg-purple-700' },
  // ── Fuchsia ──
  fuchsia: { dot: 'bg-fuchsia-500', pill: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 ring-fuchsia-500/20', text: 'text-fuchsia-700 dark:text-fuchsia-300', bg: 'bg-fuchsia-500/10', swatch: 'bg-fuchsia-500' },
  // ── Pink ──
  pink:         { dot: 'bg-pink-500',    pill: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 ring-pink-500/20',            text: 'text-pink-700 dark:text-pink-300',      bg: 'bg-pink-500/10',    swatch: 'bg-pink-500' },
  'pink-light': { dot: 'bg-pink-400',    pill: 'bg-pink-400/10 text-pink-600 dark:text-pink-300 ring-pink-400/20',            text: 'text-pink-600 dark:text-pink-300',      bg: 'bg-pink-400/10',    swatch: 'bg-pink-400' },
  'pink-dark':  { dot: 'bg-pink-700',    pill: 'bg-pink-700/10 text-pink-800 dark:text-pink-400 ring-pink-700/20',            text: 'text-pink-800 dark:text-pink-400',      bg: 'bg-pink-700/10',    swatch: 'bg-pink-700' },
  // ── Rose ──
  rose:         { dot: 'bg-rose-500',    pill: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/20',            text: 'text-rose-700 dark:text-rose-300',      bg: 'bg-rose-500/10',    swatch: 'bg-rose-500' },
  'rose-light': { dot: 'bg-rose-400',    pill: 'bg-rose-400/10 text-rose-600 dark:text-rose-300 ring-rose-400/20',            text: 'text-rose-600 dark:text-rose-300',      bg: 'bg-rose-400/10',    swatch: 'bg-rose-400' },
  'rose-dark':  { dot: 'bg-rose-700',    pill: 'bg-rose-700/10 text-rose-800 dark:text-rose-400 ring-rose-700/20',            text: 'text-rose-800 dark:text-rose-400',      bg: 'bg-rose-700/10',    swatch: 'bg-rose-700' },
  // ── Neutrals ──
  sky:   { dot: 'bg-sky-500',   pill: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/20',       text: 'text-sky-700 dark:text-sky-300',       bg: 'bg-sky-500/10',   swatch: 'bg-sky-500' },
  gray:         { dot: 'bg-gray-500',    pill: 'bg-gray-500/10 text-gray-700 dark:text-gray-300 ring-gray-500/20',            text: 'text-gray-700 dark:text-gray-300',      bg: 'bg-gray-500/10',    swatch: 'bg-gray-500' },
  'gray-light': { dot: 'bg-gray-400',    pill: 'bg-gray-400/10 text-gray-600 dark:text-gray-300 ring-gray-400/20',            text: 'text-gray-600 dark:text-gray-300',      bg: 'bg-gray-400/10',    swatch: 'bg-gray-400' },
  'gray-dark':  { dot: 'bg-gray-700',    pill: 'bg-gray-700/10 text-gray-800 dark:text-gray-400 ring-gray-700/20',            text: 'text-gray-800 dark:text-gray-400',      bg: 'bg-gray-700/10',    swatch: 'bg-gray-700' },
  slate: { dot: 'bg-slate-500', pill: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/20', text: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-500/10', swatch: 'bg-slate-500' },
  zinc:  { dot: 'bg-zinc-500',  pill: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 ring-zinc-500/20',    text: 'text-zinc-700 dark:text-zinc-300',  bg: 'bg-zinc-500/10',  swatch: 'bg-zinc-500' },
  stone: { dot: 'bg-stone-500', pill: 'bg-stone-500/10 text-stone-700 dark:text-stone-300 ring-stone-500/20', text: 'text-stone-700 dark:text-stone-300', bg: 'bg-stone-500/10', swatch: 'bg-stone-500' },
};

export const LABEL_COLOR_LIST: LabelColor[] = [
  // Row 1: light shades
  'red-light', 'orange-light', 'amber-light', 'yellow-light', 'lime-light', 'green-light', 'emerald-light', 'teal-light', 'cyan-light', 'blue-light',
  // Row 2: base shades
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'blue',
  // Row 3: dark shades
  'red-dark', 'orange-dark', 'amber-dark', 'yellow-dark', 'lime-dark', 'green-dark', 'emerald-dark', 'teal-dark', 'cyan-dark', 'blue-dark',
  // Row 4: light shades continued
  'indigo-light', 'violet-light', 'purple-light', 'pink-light', 'rose-light', 'sky', 'fuchsia', 'gray-light', 'slate', 'stone',
  // Row 5: base shades continued
  'indigo', 'violet', 'purple', 'pink', 'rose', 'gray', 'zinc', 'gray-dark',
];

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

/** Get styles for a label by looking up its color from a labels list, falling back to neutral tone. */
export function getLabelColorStyles(labelName: string, labels: Array<{ name: string; color: LabelColor }>): LabelColorStyles {
  const found = labels.find((l) => l.name.toLowerCase() === labelName.trim().toLowerCase());
  return LABEL_COLORS[found?.color ?? 'gray'];
}