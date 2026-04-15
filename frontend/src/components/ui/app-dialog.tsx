import * as React from 'react';
import { cn } from '@/lib/utils';
import { DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';

export type AppDialogTone = 'primary' | 'neutral' | 'danger';

export const APP_DIALOG_TONE_STYLES: Record<AppDialogTone, {
  header: string;
  eyebrow: string;
  section: string;
  label: string;
}> = {
  primary: {
    header: 'bg-primary/[0.06]',
    eyebrow: 'bg-primary/10 text-primary ring-primary/10',
    section: 'border-primary/10 bg-primary/[0.03]',
    label: 'text-primary/70',
  },
  neutral: {
    header: 'bg-foreground/[0.02]',
    eyebrow: 'bg-foreground/[0.05] text-foreground/75 ring-foreground/10',
    section: 'border-border/60 bg-background/90',
    label: 'text-muted-foreground/85',
  },
  danger: {
    header: 'bg-destructive/[0.06]',
    eyebrow: 'bg-destructive/10 text-destructive ring-destructive/10',
    section: 'border-destructive/10 bg-destructive/[0.03]',
    label: 'text-destructive/70',
  },
};

export function AppDialogContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn(
        'overflow-hidden border-border/40 dark:border-border/60 bg-card p-0 shadow-float',
        // Mobile: top-sheet — cap height so the lower half stays free for the keyboard
        'max-h-[55vh]',
        'sm:max-h-none',
        className
      )}
      {...props}
    />
  );
}

export function AppDialogHeader({
  tone = 'primary',
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: AppDialogTone }) {
  return (
    <DialogHeader
      className={cn(
        'border-b border-border/40 px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5',
        APP_DIALOG_TONE_STYLES[tone].header,
        className
      )}
      {...props}
    />
  );
}

export function AppDialogEyebrow({
  tone = 'primary',
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: AppDialogTone }) {
  return (
    <div
      className={cn(
        'mb-2 inline-flex w-fit items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1',
        APP_DIALOG_TONE_STYLES[tone].eyebrow,
        className
      )}
      {...props}
    />
  );
}

export function AppDialogBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-3 px-4 py-3 sm:px-6 sm:py-4', className)} {...props} />;
}

export function AppDialogSection({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: AppDialogTone }) {
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2.5 sm:rounded-[18px] sm:px-4 sm:py-3',
        APP_DIALOG_TONE_STYLES[tone].section,
        className
      )}
      {...props}
    />
  );
}

export function AppDialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <DialogFooter
      className={cn(
        'flex-col items-center gap-3 border-t border-border/40 px-4 py-3 text-center sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-left sm:space-x-0 sm:[&>*:only-child]:mx-auto',
        className
      )}
      {...props}
    />
  );
}
