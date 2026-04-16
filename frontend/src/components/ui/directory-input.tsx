import { useCallback, useEffect, useRef, useState } from 'react';
import { Folder, FolderOpen, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { browseRunnerDirectory, BrowseEntry } from '@/api/client';

interface DirectoryInputProps {
  value: string;
  onChange: (value: string) => void;
  runnerId?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

type BrowseState = 'idle' | 'loading' | 'open' | 'error';

export function DirectoryInput({
  value,
  onChange,
  runnerId,
  placeholder = '/path/to/repo',
  className,
  disabled,
}: DirectoryInputProps) {
  const [entries, setEntries] = useState<BrowseEntry[]>([]);
  const [browseState, setBrowseState] = useState<BrowseState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastQueriedRef = useRef<string>('');

  const canBrowse = !!runnerId && !disabled;

  const fetchEntries = useCallback(async (dirPath: string) => {
    if (!runnerId) return;

    // Normalise: browse the parent directory when path doesn't end with /
    const browsePath = dirPath.endsWith('/') ? dirPath : dirPath.substring(0, dirPath.lastIndexOf('/') + 1) || '/';

    if (lastQueriedRef.current === browsePath) return;
    lastQueriedRef.current = browsePath;

    abortRef.current?.abort();

    setBrowseState('loading');
    setErrorMsg('');
    setActiveIndex(-1);

    try {
      const results = await browseRunnerDirectory(runnerId, browsePath || '/');
      setEntries(results.filter((e) => e.isDirectory));
      setBrowseState('open');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to browse directory';
      setErrorMsg(msg.includes('408') ? 'Runner did not respond. Is it online?' : msg);
      setBrowseState('error');
    }
  }, [runnerId]);

  // Debounce browse on value change
  useEffect(() => {
    if (!canBrowse || !value) {
      setBrowseState('idle');
      setEntries([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchEntries(value), 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, canBrowse, fetchEntries]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setBrowseState('idle');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectEntry = (entry: BrowseEntry) => {
    const base = value.endsWith('/')
      ? value
      : value.substring(0, value.lastIndexOf('/') + 1) || '/';
    const next = base.endsWith('/') ? `${base}${entry.name}/` : `${base}/${entry.name}/`;
    lastQueriedRef.current = '';
    onChange(next);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (browseState !== 'open' || entries.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, entries.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectEntry(entries[activeIndex]);
    } else if (e.key === 'Escape') {
      setBrowseState('idle');
    } else if (e.key === 'Tab') {
      if (activeIndex >= 0) {
        e.preventDefault();
        selectEntry(entries[activeIndex]);
      }
    }
  };

  const showDropdown = browseState === 'open' || browseState === 'loading' || browseState === 'error';

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'flex h-9 w-full rounded-xl border border-border/60 bg-card px-3 py-2 pr-8 text-[13px] shadow-soft',
            'placeholder:text-muted-foreground/50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        />

        {/* Status icon */}
        <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
          {browseState === 'loading' && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/50" />
          )}
          {browseState === 'error' && (
            <AlertCircle className="h-3.5 w-3.5 text-destructive/60" />
          )}
          {(browseState === 'idle' || browseState === 'open') && canBrowse && value && (
            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground/40" />
          )}
          {!canBrowse && (
            <Folder className="h-3.5 w-3.5 text-muted-foreground/30" />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && canBrowse && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border/60 bg-popover shadow-md">
          {browseState === 'loading' && (
            <div className="flex items-center gap-2 px-3 py-2.5 text-[12px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Browsing runner…
            </div>
          )}

          {browseState === 'error' && (
            <div className="flex items-center gap-2 px-3 py-2.5 text-[12px] text-destructive/80">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {errorMsg}
            </div>
          )}

          {browseState === 'open' && entries.length === 0 && (
            <div className="px-3 py-2.5 text-[12px] text-muted-foreground/70">
              No subdirectories found
            </div>
          )}

          {browseState === 'open' && entries.length > 0 && (
            <ul className="max-h-48 overflow-y-auto py-1">
              {entries.map((entry, i) => (
                <li key={entry.name}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); selectEntry(entry); }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors',
                      i === activeIndex
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground hover:bg-accent/50',
                    )}
                  >
                    <Folder className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                    <span className="truncate">{entry.name}</span>
                    <ChevronRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground/40" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
