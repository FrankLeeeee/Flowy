import { Runner } from '../../types';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AppDialogContent, AppDialogHeader, AppDialogFooter } from '@/components/ui/app-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { DateFilterState, defaultDateFilter, DateFilterMode, getTodayDateString } from '@/lib/dateFilter';
import { cn } from '@/lib/utils';

export default function MobileFilterSheet({
  open, onClose, runners, search, onSearchChange,
  priorityFilter, onPriorityChange,
  runnerFilter, onRunnerChange,
  statusFilter, onStatusChange,
  showStatus = false,
  dateFilter, onDateFilterChange,
}: {
  open: boolean;
  onClose: () => void;
  runners: Runner[];
  search: string;
  onSearchChange: (v: string) => void;
  priorityFilter: string;
  onPriorityChange: (v: string) => void;
  runnerFilter: string;
  onRunnerChange: (v: string) => void;
  statusFilter?: string;
  onStatusChange?: (v: string) => void;
  showStatus?: boolean;
  dateFilter?: DateFilterState;
  onDateFilterChange?: (f: DateFilterState) => void;
}) {
  const activeDateFilter = dateFilter ?? defaultDateFilter();

  const handleDatePreset = (mode: DateFilterMode) => {
    if (!onDateFilterChange) return;
    const today = getTodayDateString();
    onDateFilterChange({ mode, startDate: today, endDate: today });
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AppDialogContent className="sm:max-w-[400px]">
        <AppDialogHeader>
          <DialogTitle className="text-[16px] font-semibold">Filters</DialogTitle>
          <DialogDescription className="sr-only">Filter tasks</DialogDescription>
        </AppDialogHeader>

        <div className="flex flex-col gap-4 px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/65" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-10 pl-10 text-[14px] rounded-xl"
            />
          </div>

          {showStatus && onStatusChange && (
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground/85">Status</label>
              <Select value={statusFilter ?? '_all'} onValueChange={onStatusChange}>
                <SelectTrigger className="h-10 text-[14px] rounded-xl"><SelectValue /></SelectTrigger>
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
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground/85">Priority</label>
            <Select value={priorityFilter} onValueChange={onPriorityChange}>
              <SelectTrigger className="h-10 text-[14px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground/85">Runner</label>
            <Select value={runnerFilter} onValueChange={onRunnerChange}>
              <SelectTrigger className="h-10 text-[14px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Runners</SelectItem>
                {runners.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {onDateFilterChange && (
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground/85">Date</label>
              <div className="flex gap-2">
                {(['today', 'week'] as DateFilterMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleDatePreset(mode)}
                    className={cn(
                      'flex-1 h-10 rounded-xl border text-[13px] font-medium transition-colors',
                      activeDateFilter.mode === mode
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border/60 bg-card text-muted-foreground hover:bg-muted/50',
                    )}
                  >
                    {mode === 'today' ? 'Today' : 'This week'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[11px] text-muted-foreground/70">From</label>
                  <Input
                    type="date"
                    value={activeDateFilter.startDate}
                    onChange={(e) => onDateFilterChange({ mode: 'custom', startDate: e.target.value, endDate: activeDateFilter.endDate >= e.target.value ? activeDateFilter.endDate : e.target.value })}
                    className="h-10 rounded-xl text-[13px]"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] text-muted-foreground/70">To</label>
                  <Input
                    type="date"
                    value={activeDateFilter.endDate}
                    min={activeDateFilter.startDate}
                    onChange={(e) => onDateFilterChange({ mode: 'custom', startDate: activeDateFilter.startDate, endDate: e.target.value })}
                    className="h-10 rounded-xl text-[13px]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <AppDialogFooter>
          <Button onClick={onClose} className="w-full rounded-xl h-10 text-[14px]">Done</Button>
        </AppDialogFooter>
      </AppDialogContent>
    </Dialog>
  );
}
