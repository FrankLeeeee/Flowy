import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/lib/theme';
import { fetchLists } from '@/api/client';
import { List } from '@/types';
import { cn } from '@/lib/utils';
import {
  CalendarDays, CalendarRange, Layers, Inbox, Tags,
  MessagesSquare, Bot, Sparkles, BarChart2, CheckSquare,
  FolderKanban, Plus, Sun, Moon, Monitor, Search, Command,
} from 'lucide-react';

interface PaletteItem {
  id: string;
  label: string;
  section: string;
  icon: React.ReactNode;
  keywords?: string;
  onSelect: () => void;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [lists, setLists] = useState<List[]>([]);
  const [createTaskRequested, setCreateTaskRequested] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (open) {
      fetchLists().then(setLists).catch(() => {});
    }
  }, [open]);

  const run = useCallback((fn: () => void) => {
    setOpen(false);
    fn();
  }, []);

  const items = useMemo<PaletteItem[]>(() => {
    const nav: PaletteItem[] = [
      { id: 'nav-today', label: 'Today', section: 'Navigation', icon: <CalendarDays className="h-4 w-4" />, keywords: 'schedule today', onSelect: () => run(() => navigate('/today')) },
      { id: 'nav-week', label: 'This Week', section: 'Navigation', icon: <CalendarRange className="h-4 w-4" />, keywords: 'schedule week', onSelect: () => run(() => navigate('/this-week')) },
      { id: 'nav-all', label: 'All Tasks', section: 'Navigation', icon: <Layers className="h-4 w-4" />, keywords: 'everything', onSelect: () => run(() => navigate('/all')) },
      { id: 'nav-inbox', label: 'Inbox', section: 'Navigation', icon: <Inbox className="h-4 w-4" />, keywords: 'tasks inbox', onSelect: () => run(() => navigate('/inbox')) },
      { id: 'nav-todos', label: 'Todos', section: 'Navigation', icon: <CheckSquare className="h-4 w-4" />, keywords: 'checklist todo', onSelect: () => run(() => navigate('/todos')) },
      { id: 'nav-labels', label: 'Labels', section: 'Navigation', icon: <Tags className="h-4 w-4" />, keywords: 'tags categories', onSelect: () => run(() => navigate('/labels')) },
      { id: 'nav-sessions', label: 'Sessions', section: 'Navigation', icon: <MessagesSquare className="h-4 w-4" />, keywords: 'chat interactive', onSelect: () => run(() => navigate('/sessions')) },
      { id: 'nav-runners', label: 'Runners', section: 'Navigation', icon: <Bot className="h-4 w-4" />, keywords: 'machines agents', onSelect: () => run(() => navigate('/runners')) },
      { id: 'nav-skills', label: 'Skills', section: 'Navigation', icon: <Sparkles className="h-4 w-4" />, keywords: 'abilities cli', onSelect: () => run(() => navigate('/skills')) },
      { id: 'nav-stats', label: 'Stats', section: 'Navigation', icon: <BarChart2 className="h-4 w-4" />, keywords: 'analytics dashboard statistics', onSelect: () => run(() => navigate('/stats')) },
    ];

    const listItems: PaletteItem[] = lists.map((l) => ({
      id: `list-${l.id}`,
      label: l.name,
      section: 'Lists',
      icon: l.icon ? <span className="text-sm leading-none">{l.icon}</span> : <FolderKanban className="h-4 w-4" />,
      keywords: 'list project board',
      onSelect: () => run(() => navigate(`/list/${l.id}`)),
    }));

    const actions: PaletteItem[] = [
      { id: 'act-new-task', label: 'Create Task', section: 'Actions', icon: <Plus className="h-4 w-4" />, keywords: 'new add task', onSelect: () => run(() => setCreateTaskRequested(true)) },
    ];

    const theme: PaletteItem[] = [
      { id: 'theme-light', label: 'Light Mode', section: 'Theme', icon: <Sun className="h-4 w-4" />, keywords: 'theme appearance', onSelect: () => run(() => setTheme('light')) },
      { id: 'theme-dark', label: 'Dark Mode', section: 'Theme', icon: <Moon className="h-4 w-4" />, keywords: 'theme appearance', onSelect: () => run(() => setTheme('dark')) },
      { id: 'theme-system', label: 'System Theme', section: 'Theme', icon: <Monitor className="h-4 w-4" />, keywords: 'theme appearance auto', onSelect: () => run(() => setTheme('system')) },
    ];

    return [...actions, ...nav, ...listItems, ...theme];
  }, [lists, navigate, setTheme, run]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((item) => {
      const haystack = `${item.label} ${item.section} ${item.keywords ?? ''}`.toLowerCase();
      return q.split(/\s+/).every((word) => haystack.includes(word));
    });
  }, [items, query]);

  const sections = useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    for (const item of filtered) {
      const arr = map.get(item.section) ?? [];
      arr.push(item);
      map.set(item.section, arr);
    }
    return map;
  }, [filtered]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Dispatch custom event to trigger CreateTaskModal in parent
  useEffect(() => {
    if (createTaskRequested) {
      setCreateTaskRequested(false);
      window.dispatchEvent(new CustomEvent('flowy:create-task'));
    }
  }, [createTaskRequested]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[activeIdx]?.onSelect();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }, [filtered, activeIdx]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!open) return null;

  let flatIdx = -1;

  return (
    <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/18 animate-in fade-in-0 duration-150" />

      {/* Palette */}
      <div
        className="absolute left-1/2 top-[min(20%,180px)] w-full max-w-[560px] -translate-x-1/2 animate-in fade-in-0 slide-in-from-top-2 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-xl border border-border/80 bg-popover shadow-lg">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-border/60 px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground/60" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search..."
              className="h-12 flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground/50 outline-none"
            />
            <kbd className="hidden shrink-0 items-center gap-0.5 rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/70 sm:flex">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[min(50vh,380px)] overflow-y-auto overscroll-contain p-1.5">
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-[13px] text-muted-foreground/60">
                No results found
              </div>
            )}

            {Array.from(sections.entries()).map(([section, sectionItems]) => (
              <div key={section} className="mb-1 last:mb-0">
                <div className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
                  {section}
                </div>
                {sectionItems.map((item) => {
                  flatIdx++;
                  const idx = flatIdx;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-active={idx === activeIdx}
                      onClick={item.onSelect}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors duration-75',
                        idx === activeIdx
                          ? 'bg-primary/[0.08] text-foreground'
                          : 'text-muted-foreground/80 hover:text-foreground',
                      )}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center opacity-60">
                        {item.icon}
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {idx === activeIdx && (
                        <span className="text-[10px] text-muted-foreground/40">Enter</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
