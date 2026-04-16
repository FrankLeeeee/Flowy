import * as Popover from '@radix-ui/react-popover';
import { useState, useRef, useEffect } from 'react';
import { Label, LabelColor } from '../types';
import { createLabel } from '../api/client';
import { LABEL_COLORS, LABEL_COLOR_LIST, getLabelColorStyles } from '@/lib/semanticColors';
import { cn } from '@/lib/utils';
import { Tag, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LabelPicker({
  selectedLabels,
  allLabels,
  onToggle,
  onLabelsChange,
  allowCreate = true,
}: {
  selectedLabels: string[];
  allLabels: Label[];
  onToggle: (labelName: string) => void;
  onLabelsChange: () => void;
  allowCreate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creatingColor, setCreatingColor] = useState<LabelColor | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const trimmed = search.trim();
  const filtered = allLabels.filter((l) =>
    l.name.toLowerCase().includes(trimmed.toLowerCase())
  );
  const exactMatch = allLabels.some((l) => l.name.toLowerCase() === trimmed.toLowerCase());
  const showCreate = allowCreate && trimmed.length > 0 && !exactMatch;

  useEffect(() => {
    if (!open) {
      setSearch('');
      setCreatingColor(null);
      return;
    }

    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!allowCreate) {
      setCreatingColor(null);
    }
  }, [allowCreate]);

  const handleCreate = async (color: LabelColor) => {
    await createLabel({ name: trimmed, color });
    onLabelsChange();
    onToggle(trimmed);
    setSearch('');
    setCreatingColor(null);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger ref={triggerRef} asChild>
        <Button
          type="button"
          variant="outline"
          className="h-8 gap-2 rounded-full border-border/60 bg-card px-3 text-[11px] font-medium shadow-soft hover:bg-accent"
        >
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          Labels
          {selectedLabels.length > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {selectedLabels.length}
            </span>
          )}
        </Button>
      </Popover.Trigger>

      <Popover.Portal
        container={triggerRef.current?.closest<HTMLElement>('[role="dialog"]') ?? undefined}
      >
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="z-[60] w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border border-border/60 bg-popover p-1 shadow-lg"
        >
          <div className="px-2 pb-1 pt-1">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCreatingColor(null); }}
              placeholder={allowCreate ? 'Search or create label...' : 'Search labels...'}
              className="w-full bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground/50 outline-none"
            />
          </div>
          <div className="border-t border-border/40" />

          {creatingColor === null ? (
            <div className="max-h-48 overflow-y-auto py-1">
              {filtered.map((label) => {
                const selected = selectedLabels.some(
                  (s) => s.toLowerCase() === label.name.toLowerCase()
                );
                const colorStyles = getLabelColorStyles(label.name, allLabels);
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => onToggle(label.name)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors hover:bg-accent',
                      selected && 'bg-accent'
                    )}
                  >
                    <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', colorStyles.dot)} />
                    <span className="flex-1 text-left truncate">{label.name}</span>
                    {selected && <Check className="h-3 w-3 text-primary shrink-0" />}
                  </button>
                );
              })}

              {showCreate && (
                <button
                  type="button"
                  onClick={() => setCreatingColor('blue')}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-accent"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create "{trimmed}"
                </button>
              )}

              {filtered.length === 0 && !showCreate && (
                <p className="px-2 py-2 text-[11px] text-muted-foreground/70">No labels found</p>
              )}
            </div>
          ) : (
            <div className="py-2 px-2">
              <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                Pick a color for "{trimmed}"
              </p>
              <div className="grid grid-cols-10 gap-1.5">
                {LABEL_COLOR_LIST.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleCreate(color)}
                    className={cn(
                      'h-5 w-5 rounded-full transition-all hover:scale-110 hover:ring-2 hover:ring-offset-1 hover:ring-offset-popover',
                      LABEL_COLORS[color].swatch,
                      creatingColor === color
                        ? 'ring-2 ring-foreground ring-offset-1 ring-offset-popover'
                        : 'ring-1 ring-black/10 dark:ring-white/15'
                    )}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
