import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  fetchSessions, fetchSession, createSession, sendSessionInput,
  stopSession, deleteSession, fetchRunners,
} from '../api/client';
import { Session, SessionMessage, Runner } from '../types';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PROVIDERS = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'codex', label: 'Codex' },
  { value: 'cursor-agent', label: 'Cursor Agent' },
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
    const iv = setInterval(() => loadMessages(selectedId), 1500);
    return () => clearInterval(iv);
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

  return (
    <div className={cn('flex flex-col', mobile ? 'min-h-full' : 'h-screen')}>
      <div className="shrink-0 px-4 pt-5 pb-3 md:px-8 md:pt-7 md:pb-4">
        <div className="flex items-center justify-between gap-2">
          <PageTitle icon={MessagesSquare} title="Sessions" />
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            className="rounded-full px-3 text-[11px]"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            New session
          </Button>
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground/85">
          Hold multi-turn conversations with a runner's AI CLI. Ideal for guiding, clarifying, and iterating.
        </p>
      </div>

      <div className={cn('min-h-0 flex-1 px-4 pb-4 md:px-8 md:pb-8', mobile ? 'flex flex-col gap-3' : 'grid grid-cols-[280px_1fr] gap-4')}>
        {/* Session list */}
        <div className={cn('rounded-lg border border-border/60 bg-background/80', mobile && 'max-h-[38vh]')}>
          <ScrollArea className={cn(mobile ? 'h-[38vh]' : 'h-full')}>
            <div className="flex flex-col gap-1 p-2">
              {loading && (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              )}
              {!loading && sessions.length === 0 && (
                <p className="px-3 py-6 text-center text-[12px] text-muted-foreground/75">
                  No sessions yet.
                </p>
              )}
              {sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={cn(
                    'group relative flex w-full flex-col items-start gap-1 rounded-md border border-transparent px-3 py-2 text-left transition-colors',
                    selectedId === s.id
                      ? 'border-primary/40 bg-primary/8 text-foreground'
                      : 'text-muted-foreground/90 hover:bg-primary/4 hover:text-foreground',
                  )}
                >
                  <div className="flex w-full items-center gap-2">
                    <span className="truncate flex-1 text-[13px] font-medium">{s.title}</span>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider',
                        s.status === 'busy' && 'bg-amber-500/15 text-amber-600',
                        s.status === 'idle' && 'bg-emerald-500/15 text-emerald-600',
                        s.status === 'stopped' && 'bg-muted-foreground/15 text-muted-foreground',
                      )}
                    >
                      {s.status}
                    </span>
                  </div>
                  <div className="flex w-full items-center gap-2 text-[11px] text-muted-foreground/70">
                    <span className="truncate">{runnerName(s.runner_id)}</span>
                    <span>·</span>
                    <span>{s.ai_provider}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                    className="absolute right-1.5 top-1.5 rounded-md p-1 text-muted-foreground/60 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    aria-label="Delete session"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Session detail */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-border/60 bg-background/80">
          {!selectedSession ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-[13px] text-muted-foreground/75">
              Select a session or create a new one to start chatting.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-foreground">{selectedSession.title}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
                    <Bot className="h-3 w-3" />
                    {runnerName(selectedSession.runner_id)}
                    <span>·</span>
                    <span>{selectedSession.ai_provider}</span>
                  </div>
                </div>
                {selectedSession.status === 'busy' && (
                  <Button size="sm" variant="ghost" onClick={handleStop} className="rounded-full text-[11px]">
                    <Square className="mr-1 h-3 w-3" />
                    Stop
                  </Button>
                )}
              </div>

              <div
                ref={transcriptRef}
                className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
              >
                {messages.length === 0 && (
                  <p className="text-center text-[12px] text-muted-foreground/70">
                    No messages yet. Send your first prompt below.
                  </p>
                )}
                <div className="flex flex-col gap-3">
                  {messages.map((m) => (
                    <MessageBubble key={m.id} message={m} />
                  ))}
                </div>
              </div>

              {lastAssistantOptions.length > 0 && (
                <div className="border-t border-border/60 bg-primary/[0.04] px-4 py-2">
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
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
              )}

              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                className="flex items-end gap-2 border-t border-border/60 p-3"
              >
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
                      : selectedSession.status === 'busy'
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

function MessageBubble({ message }: { message: SessionMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/70',
          isUser ? 'bg-primary/10 text-primary' : 'bg-muted/40 text-muted-foreground',
        )}
      >
        {isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
      </div>
      <div
        className={cn(
          'max-w-[85%] rounded-lg border px-3 py-2 text-[12.5px] leading-relaxed',
          isUser
            ? 'border-primary/30 bg-primary/8 text-foreground'
            : isSystem
              ? 'border-amber-500/30 bg-amber-500/5 text-amber-700'
              : 'border-border/60 bg-background text-foreground',
        )}
      >
        <pre className="whitespace-pre-wrap break-words font-sans">{message.content || (isUser ? '' : '…')}</pre>
      </div>
    </div>
  );
}

function CreateSessionDialog({
  open, runners, onClose, onCreated,
}: {
  open: boolean;
  runners: Runner[];
  onClose: () => void;
  onCreated: (session: Session) => void;
}) {
  const [title, setTitle] = useState('');
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
      setTitle(''); setRunnerId(''); setProvider(''); setError('');
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
        title: title.trim() || 'New session',
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
        </AppDialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <AppDialogBody>
            <AppDialogSection tone="primary">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/80">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Refactor auth module"
                className="h-auto border-0 bg-transparent px-0 py-0 text-[18px] font-semibold tracking-[-0.02em] focus-visible:ring-0"
              />
            </AppDialogSection>

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
