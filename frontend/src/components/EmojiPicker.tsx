import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Smile, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESET_EMOJIS = [
  '📋', '📝', '✅', '⭐', '🔥', '💡', '🎯', '🚀',
  '📌', '📁', '📂', '🗂️', '📅', '📆', '🗓️', '⏰',
  '💼', '🏠', '🛒', '🍔', '🏋️', '🎮', '🎵', '📚',
  '✏️', '🔧', '🛠️', '⚙️', '🧪', '🧠', '💰', '💳',
  '❤️', '🌟', '✨', '🎉', '🎁', '🐛', '🌈', '☀️',
  '🌙', '🍎', '🌱', '🌳', '🐱', '🐶', '🦄', '🐢',
];

export default function EmojiPicker({
  value,
  onChange,
  triggerClassName,
}: {
  value: string | null;
  onChange: (emoji: string | null) => void;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const select = (emoji: string | null) => {
    onChange(emoji);
    setOpen(false);
    setDraft('');
  };

  const handleDraftChange = (next: string) => {
    setDraft(next);
    const trimmed = next.trim();
    if (!trimmed) return;
    // Use Intl.Segmenter when available so combined emojis stay a single grapheme
    const segmenter = (globalThis as unknown as { Intl: { Segmenter?: new (...args: unknown[]) => { segment: (s: string) => Iterable<{ segment: string }> } } }).Intl.Segmenter;
    let first: string | undefined;
    if (segmenter) {
      const seg = new segmenter(undefined, { granularity: 'grapheme' });
      first = seg.segment(trimmed)[Symbol.iterator]().next().value?.segment;
    } else {
      first = Array.from(trimmed)[0];
    }
    if (first) select(first);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={value ? `Change icon (current ${value})` : 'Choose icon'}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-[18px] leading-none transition-colors hover:border-primary/50 hover:bg-primary/5',
            triggerClassName,
          )}
        >
          {value ?? <Smile className="h-4 w-4 text-muted-foreground/60" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-2.5" align="start">
        <div className="mb-2 flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            placeholder="Type or paste any emoji"
            className="h-8 text-[12px]"
            autoFocus
          />
          {value && (
            <button
              type="button"
              onClick={() => select(null)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-foreground/[0.06] hover:text-destructive"
              aria-label="Clear icon"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-8 gap-1">
          {PRESET_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => select(emoji)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md text-[16px] leading-none transition-colors hover:bg-primary/10',
                value === emoji && 'bg-primary/15 ring-1 ring-primary/40',
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
