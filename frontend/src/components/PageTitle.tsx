import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type PageTitleProps = {
  icon: LucideIcon;
  title: string;
  className?: string;
  iconClassName?: string;
  iconWrapClassName?: string;
};

export default function PageTitle({ icon: Icon, title, className, iconClassName, iconWrapClassName }: PageTitleProps) {
  return (
    <h1
      className={cn(
        'inline-flex w-fit items-center gap-2.5 text-[15px] font-semibold tracking-[-0.02em] text-foreground',
        className
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-foreground/[0.03] text-primary shadow-soft',
          iconWrapClassName
        )}
        aria-hidden="true"
      >
        <Icon className={cn('h-3.5 w-3.5', iconClassName)} />
      </span>
      <span>{title}</span>
    </h1>
  );
}
