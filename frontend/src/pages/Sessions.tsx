import { memo, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  fetchSessions, fetchSession, createSession, sendSessionInput,
  stopSession, deleteSession, fetchRunners,
} from '../api/client';
import { Session, SessionMessage, Runner } from '../types';
import PageTitle from '@/components/PageTitle';
import { MARKDOWN_PROSE_CLASSNAME } from '@/components/ui/markdown-editor';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AppDialogBody, AppDialogContent, AppDialogEyebrow, AppDialogFooter,
  AppDialogHeader, AppDialogSection,
} from '@/components/ui/app-dialog';
import {
  MessagesSquare, Plus, Send, Square, Trash2, Sparkles, Bot, User, ArrowRight,
  AlertTriangle, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getToneStyles } from '@/lib/semanticColors';

const SESSION_STATUS_TONES: Record<string, 'success' | 'warning' | 'neutral'> = {
  busy: 'warning',
  idle: 'success',
  stopped: 'neutral',
};

const PROVIDERS = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'codex', label: 'Codex' },
  { value: 'cursor-agent', label: 'Cursor Agent' },
  { value: 'gemini-cli', label: 'Gemini CLI' },
];

/** Parse trailing numbered options from assistant text: "1. foo\n2. bar" */
export function extractNumberedOptions(text: string): string[] {
  if (!text) return [];
  const lines = text.split('\n').map((l) => l.trimEnd()).filter((l) => l.length > 0);

  const options: string[] = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const match = lines[i].match(/^\s*(\d+)[.)]\s+(.+)$/);
    if (match) {
      options.unshift(match[2]);
    } else if (options.length > 0) {
      break;
    }
  }
  return options.length >= 2 ? options.slice(0, 6) : [];
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface SessionsPageProps {
  mobile?: boolean;
}

export default function SessionsPage({ mobile = false }: SessionsPageProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([fetchSessions(), fetchRunners()]);
      setSessions(s);
      setRunners(r);
      if (!selectedId && s.length > 0) setSelectedId(s[0].id);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const loadMessages = useCallback(async (id: string) => {
    try {
      const { session, messages: msgs } = await fetchSession(id);
      setMessages(msgs);
      setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)));
    } catch {/* ignore */}
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    const iv = setInterval(loadSessions, 5_000);
    return () => clearInterval(iv);
  }, [loadSessions]);

  useEffect(() => {
    if (!selectedId) return;
    loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  // WebSocket for real-time streaming
  useEffect(() => {
    if (!selectedId) return;

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    const ws = new WebSocket(`${proto}://${host}/ws/sessions/${selectedId}`);

    ws.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data) as
          | { type: 'chunk'; messageId: string; data: string }
          | { type: 'status'; status: string }
          | { type: 'title'; title: string };

        if (event.type === 'chunk') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === event.messageId
                ? { ...m, content: m.content + event.data }
                : m,
            ),
          );
        } else if (event.type === 'status') {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === selectedId
                ? { ...s, status: event.status as Session['status'] }
                : s,
            ),
          );
          if (event.status === 'idle' || event.status === 'stopped') {
            loadMessages(selectedId);
          }
        } else if (event.type === 'title') {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === selectedId ? { ...s, title: event.title } : s,
            ),
          );
        }
      } catch { /* ignore malformed messages */ }
    };

    return () => {
      ws.close();
    };
  }, [selectedId, loadMessages]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedId) ?? null,
    [sessions, selectedId],
  );

  const lastAssistantOptions = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && m.content.trim().length > 0);
    if (!lastAssistant || selectedSession?.status === 'busy') return [];
    return extractNumberedOptions(lastAssistant.content);
  }, [messages, selectedSession]);

  const runnerName = (id: string) => runners.find((r) => r.id === id)?.name ?? 'Unknown runner';

  const handleSend = async (content: string) => {
    if (!selectedId || !content.trim() || sending) return;
    setSending(true);
    try {
      await sendSessionInput(selectedId, content);
      setInput('');
      await loadMessages(selectedId);
    } finally {
      setSending(false);
    }
  };

  const handleStop = async () => {
    if (!selectedId) return;
    await stopSession(selectedId);
    await loadMessages(selectedId);
  };

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    if (selectedId === id) setSelectedId(null);
    await loadSessions();
  };

  const busyCount = sessions.filter((s) => s.status === 'busy').length;
  const idleCount = sessions.filter((s) => s.status === 'idle').length;
  const stoppedCount = sessions.filter((s) => s.status === 'stopped').length;

  const isBusy = selectedSession?.status === 'busy';
  const lastMessage = messages[messages.length - 1];
  const showTyping = isBusy && lastMessage?.role === 'assistant' && !lastMessage.content.trim();

  return (
    <div className={cn('flex flex-col p-6', mobile ? 'min-h-full' : 'h-screen')}>
      <div
        className="motion-section mb-6 shrink-0 flex flex-wrap items-center justify-between gap-3"
        style={{ '--motion-delay': '80ms' } as React.CSSProperties}
      >
        <div>
          <PageTitle icon={MessagesSquare} title="Sessions" />
          <p className="mt-1.5 text-[12px] text-muted-foreground/85">
            Hold multi-turn conversations with a runner's AI CLI. Ideal for guiding, clarifying, and iterating.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className={cn('inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1', getToneStyles('warning').pill)}>
              {busyCount} busy
            </span>
            <span className={cn('inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1', getToneStyles('success').pill)}>
              {idleCount} idle
            </span>
            <span className={cn('inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1', getToneStyles('neutral').pill)}>
              {stoppedCount} stopped
            </span>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          className="h-8 text-[13px] shadow-soft"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          New session
        </Button>
      </div>

      <div
        className={cn('motion-section min-h-0 flex-1', mobile ? 'flex flex-col gap-3' : 'grid grid-cols-[280px_1fr] gap-4')}
        style={{ '--motion-delay': '140ms' } as React.CSSProperties}
      >
        {/* Session list */}
        <div className={cn('rounded-lg border border-border/60 bg-background/80', mobile && 'max-h-[38vh]')}>
          <ScrollArea className={cn(mobile ? 'h-[38vh]' : 'h-full')}>
            <div className="flex flex-col gap-0.5 p-1.5">
              {loading && (
                <>
                  <Skeleton className="h-14 w-full rounded-md" />
                  <Skeleton className="h-14 w-full rounded-md" />
                </>
              )}
              {!loading && sessions.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
                  <MessagesSquare className="h-6 w-6 text-muted-foreground/40" />
                  <p className="text-[12px] text-muted-foreground/75">
                    No sessions yet.
                  </p>
                </div>
              )}
              {sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={cn(
                    'group flex w-full flex-col gap-1 rounded-md border border-transparent px-3 py-2.5 text-left transition-colors',
                    selectedId === s.id
                      ? 'border-primary/40 bg-primary/8 text-foreground'
                      : 'text-muted-foreground/90 hover:bg-primary/4 hover:text-foreground',
                  )}
                >
                  <div className="flex w-full items-center gap-2">
                    <span className="truncate flex-1 text-[13px] font-medium">{s.title}</span>
                    <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider ring-1', getToneStyles(SESSION_STATUS_TONES[s.status] ?? 'neutral').pill)}>
                      {s.status}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                      className="shrink-0 rounded-md p-1 text-muted-foreground/60 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      aria-label="Delete session"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex w-full items-center gap-1.5 text-[10.5px] text-muted-foreground/60">
                    <span className="truncate">{runnerName(s.runner_id)}</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span>{s.ai_provider}</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="shrink-0">{formatRelativeTime(s.updated_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Session detail */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-border/60 bg-background/80">
          {!selectedSession ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/8 text-primary/60">
                <MessagesSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-foreground/80">No session selected</p>
                <p className="mt-1 text-[12px] text-muted-foreground/65">
                  Select a session or create a new one to start chatting.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-foreground">{selectedSession.title}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
                    <Bot className="h-3 w-3" />
                    {runnerName(selectedSession.runner_id)}
                    <span className="text-muted-foreground/30">·</span>
                    <span>{selectedSession.ai_provider}</span>
                    {isBusy && (
                      <>
                        <span className="text-muted-foreground/30">·</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          Thinking
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {isBusy && (
                  <Button size="sm" variant="ghost" onClick={handleStop} className="rounded-full text-[11px]">
                    <Square className="mr-1 h-3 w-3" />
                    Stop
                  </Button>
                )}
              </div>

              {/* Messages */}
              <div
                ref={transcriptRef}
                className="min-h-0 flex-1 overflow-y-auto px-4 py-5"
              >
                {messages.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <Sparkles className="h-5 w-5 text-muted-foreground/35" />
                    <p className="text-[12px] text-muted-foreground/60">
                      Send your first prompt to get started.
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-5">
                  {messages.map((m) => (
                    <MessageBubble key={m.id} message={m} isBusy={isBusy} isLast={m.id === lastMessage?.id} />
                  ))}
                  {showTyping && (
                    <div className="flex items-center gap-2 pl-8 text-[12px] text-muted-foreground/60">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Generating response…</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick replies */}
              {lastAssistantOptions.length > 0 && (
                <div className="border-t border-border/60 bg-primary/[0.03] px-4 py-2.5">
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Quick replies
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {lastAssistantOptions.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSend(opt)}
                          disabled={sending || selectedSession.status !== 'idle'}
                          className="rounded-full border border-border/60 bg-background px-3 py-1 text-[11px] text-foreground transition-colors hover:border-primary/50 hover:bg-primary/8 disabled:opacity-50"
                        >
                          {i + 1}. {opt.length > 80 ? opt.slice(0, 80) + '…' : opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Input */}
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                className="border-t border-border/60 p-3"
              >
                <div className="flex items-end gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !mobile) {
                        e.preventDefault();
                        handleSend(input);
                      }
                    }}
                    placeholder={
                      selectedSession.status === 'stopped'
                        ? 'Session is stopped'
                        : isBusy
                          ? 'Waiting for response…'
                          : 'Type your prompt…'
                    }
                    disabled={selectedSession.status !== 'idle' || sending}
                    rows={2}
                    className="min-h-[44px] resize-none text-[13px]"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!input.trim() || selectedSession.status !== 'idle' || sending}
                    className="shrink-0 rounded-full"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      <CreateSessionDialog
        open={showCreate}
        runners={runners}
        onClose={() => setShowCreate(false)}
        onCreated={async (s) => {
          setShowCreate(false);
          await loadSessions();
          setSelectedId(s.id);
        }}
      />
    </div>
  );
}

const MessageBubble = memo(function MessageBubble({ message, isBusy, isLast }: { message: SessionMessage; isBusy: boolean; isLast: boolean }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const hasContent = message.content.trim().length > 0;
  const isStreaming = isBusy && isLast && !isUser && !isSystem;

  if (!hasContent && !isStreaming) return null;

  return (
    <div className="flex gap-3">
      <div
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full mt-0.5',
          isUser
            ? 'bg-primary/12 text-primary'
            : isSystem
              ? 'bg-amber-500/12 text-amber-600 dark:text-amber-400'
              : 'bg-foreground/8 text-foreground/70',
        )}
      >
        {isUser
          ? <User className="h-3 w-3" />
          : isSystem
            ? <AlertTriangle className="h-3 w-3" />
            : <Bot className="h-3 w-3" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn(
          'mb-1 text-[10.5px] font-semibold uppercase tracking-wide',
          isUser
            ? 'text-primary/70'
            : isSystem
              ? 'text-amber-600/70 dark:text-amber-400/70'
              : 'text-foreground/50',
        )}>
          {isUser ? 'You' : isSystem ? 'System' : 'Assistant'}
        </div>
        <div
          className={cn(
            'rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed',
            isUser
              ? 'border border-primary/20 bg-primary/6 text-foreground'
              : isSystem
                ? 'border border-amber-500/25 bg-amber-500/5 text-amber-800 dark:text-amber-200'
                : 'border border-border/50 bg-foreground/[0.02] text-foreground',
          )}
        >
          {isUser || isSystem ? (
            <pre className="whitespace-pre-wrap break-words font-sans">{message.content}</pre>
          ) : (
            <div className={MARKDOWN_PROSE_CLASSNAME}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || '…'}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

function CreateSessionDialog({
  open, runners, onClose, onCreated,
}: {
  open: boolean;
  runners: Runner[];
  onClose: () => void;
  onCreated: (session: Session) => void;
}) {
  const [runnerId, setRunnerId] = useState('');
  const [provider, setProvider] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onlineRunners = useMemo(
    () => runners.filter((r) => r.status !== 'offline'),
    [runners],
  );

  const selectedRunner = runners.find((r) => r.id === runnerId);
  const availableProviders = useMemo(() => {
    if (!selectedRunner) return PROVIDERS;
    const supported = new Set<string>(JSON.parse(selectedRunner.ai_providers || '[]'));
    return PROVIDERS.filter((p) => supported.has(p.value));
  }, [selectedRunner]);

  useEffect(() => {
    if (!open) {
      setRunnerId(''); setProvider(''); setError('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!runnerId || !provider) {
      setError('Runner and provider are required');
      return;
    }
    setSubmitting(true);
    try {
      const session = await createSession({
        title: 'New session',
        runnerId,
        aiProvider: provider,
      });
      onCreated(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AppDialogContent className="sm:max-w-[480px]">
        <AppDialogHeader>
          <DialogTitle className="sr-only">Create a new session</DialogTitle>
          <DialogDescription className="sr-only">Start a multi-turn conversation with a runner's AI CLI.</DialogDescription>
          <AppDialogEyebrow>
            <Sparkles className="h-3 w-3" />
            New Session
          </AppDialogEyebrow>
          <div className="hidden flex-wrap items-end justify-between gap-3 sm:flex">
            <h2 className="text-[18px] font-semibold tracking-[-0.025em] text-foreground">Start an interactive session</h2>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground/70">
            The session title will be generated automatically from your first message.
          </p>
        </AppDialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <AppDialogBody>
            <AppDialogSection tone="neutral">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">Runner</label>
              <Select value={runnerId} onValueChange={(v) => { setRunnerId(v); setProvider(''); }}>
                <SelectTrigger><SelectValue placeholder="Select a runner" /></SelectTrigger>
                <SelectContent>
                  {onlineRunners.length === 0 && (
                    <div className="px-3 py-2 text-[12px] text-muted-foreground/70">No online runners.</div>
                  )}
                  {onlineRunners.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AppDialogSection>

            <AppDialogSection tone="neutral">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">AI Provider</label>
              <Select value={provider} onValueChange={setProvider} disabled={!runnerId}>
                <SelectTrigger><SelectValue placeholder="Select an AI CLI" /></SelectTrigger>
                <SelectContent>
                  {availableProviders.length === 0 && runnerId && (
                    <div className="px-3 py-2 text-[12px] text-muted-foreground/70">This runner has no available CLIs.</div>
                  )}
                  {availableProviders.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AppDialogSection>

            {error && <p className="text-[12px] text-destructive/85">{error}</p>}
          </AppDialogBody>

          <AppDialogFooter>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={onClose} className="rounded-full px-3.5 text-[11px]">Cancel</Button>
              <Button type="submit" disabled={submitting || !runnerId || !provider} className="rounded-full px-4 text-[11px]">
                Create session
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </AppDialogFooter>
        </form>
      </AppDialogContent>
    </Dialog>
  );
}
