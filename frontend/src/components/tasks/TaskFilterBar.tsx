import type { CSSProperties } from 'react';
import { Runner } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, LayoutGrid, List as ListIcon, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import DateFilter from '@/components/DateFilter';
import { DateFilterState } from '@/lib/dateFilter';

export type ViewMode = 'todo' | 'list' | 'kanban';

const VIEW_CONFIG: Record<ViewMode, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  todo: { icon: ListTodo, label: 'Todo view' },
  list: { icon: ListIcon, label: 'List view' },
  kanban: { icon: LayoutGrid, label: 'Kanban view' },
};

interface TaskFilterBarProps {
  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (value: string) => void;
  runnerFilter: string;
  onRunnerFilterChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  dateFilter: DateFilterState;
  onDateFilterChange: (value: DateFilterState) => void;
  runners: Runner[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  availableViews: ViewMode[];
  taskCount: number;
  taskCountLabel?: string;
}

export default function TaskFilterBar({
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  runnerFilter,
  onRunnerFilterChange,
  search,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  runners,
  viewMode,
  onViewModeChange,
  availableViews,
  taskCount,
  taskCountLabel = 'tasks',
}: TaskFilterBarProps) {
  return (
    <div className="motion-section mb-6 flex shrink-0 flex-wrap items-center gap-2" style={{ '--motion-delay': '140ms' } as CSSProperties}>
      {statusFilter !== undefined && onStatusFilterChange && (
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[120px] h-8 text-[13px] border-border/60"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Statuses</SelectItem>
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      )}
      <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
        <SelectTrigger className="w-[120px] h-8 text-[13px] border-border/60"><SelectValue placeholder="Priority" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Priorities</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="none">None</SelectItem>
        </SelectContent>
      </Select>
      <Select value={runnerFilter} onValueChange={onRunnerFilterChange}>
        <SelectTrigger className="w-[120px] h-8 text-[13px] border-border/60"><SelectValue placeholder="Runner" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Runners</SelectItem>
          {runners.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="relative flex-1 min-w-[120px]">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/65" />
        <Input placeholder="Search..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="h-8 pl-8 text-[13px] border-border/60" />
      </div>

      <div className="flex items-center border border-border/60 bg-card rounded-md overflow-hidden ml-auto shrink-0 shadow-soft">
        {availableViews.map((mode) => {
          const config = VIEW_CONFIG[mode];
          const Icon = config.icon;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange(mode)}
              aria-label={config.label}
              className={cn(
                'interactive-lift px-2.5 py-1.5 transition-colors duration-100',
                viewMode === mode ? 'bg-foreground/[0.06] text-foreground' : 'text-muted-foreground/75 hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          );
        })}
      </div>

      <DateFilter value={dateFilter} onChange={onDateFilterChange} />

      <span className="shrink-0 text-[11px] font-medium text-muted-foreground/70">{taskCount} {taskCountLabel}</span>
    </div>
  );
}
