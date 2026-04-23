import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  fetchSessions, fetchSession, createSession, sendSessionInput,
  stopSession, deleteSession, fetchRunners,
} from '../../api/client';
import { Session, SessionMessage, Runner } from '../../types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessagesSquare, Plus, Send, Square, Trash2, Sparkles, Bot, User, Menu, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { extractNumberedOptions } from '../Sessions';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AppDialogBody, AppDialogContent, AppDialogEyebrow, AppDialogFooter,
  AppDialogHeader, AppDialogSection,
} from '@/components/ui/app-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight } from 'lucide-react';

const PROVIDERS = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'codex', label: 'Codex' },
  { value: 'cursor-agent', label: 'Cursor Agent' },
  { value: 'gemini-cli', label: 'Gemini CLI' },
];

export default function MobileSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    if (!confirm('Delete this session?')) return;
    await deleteSession(id);
    if (selectedId === id) {
      setSelectedId(null);
      setMessages([]);
    }
    await loadSessions();
  };

  const selectSession = (id: string) => {
    setSelectedId(id);
    setIsSidebarOpen(false);
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-border/60 bg-background/95 px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)] backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 active:bg-muted/50"
          >
            <Menu className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-bold tracking-tight text-foreground">
              {selectedSession?.title || 'Sessions'}
            </h1>
            {selectedSession && (
              <p className="truncate text-[10px] text-muted-foreground/70">
                {runnerName(selectedSession.runner_id)} · {selectedSession.ai_provider}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedSession?.status === 'busy' && (
            <button
              onClick={handleStop}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 active:bg-amber-500/20"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft active:opacity-90"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="relative flex min-h-0 flex-1 flex-col">
        {!selectedSession ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/5 text-primary">
              <MessagesSquare className="h-8 w-8" />
            </div>
            <h2 className="text-[16px] font-semibold text-foreground">No session selected</h2>
            <p className="mt-1 text-[13px] text-muted-foreground/75">
              Select an existing session from the menu or start a new one.
            </p>
            <Button
              onClick={() => setShowCreate(true)}
              className="mt-6 h-10 rounded-xl px-6"
            >
              <Plus className="mr-2 h-4 w-4" />
              New session
            </Button>
          </div>
        ) : (
          <>
            <div
              ref={transcriptRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
            >
              <div className="mx-auto flex max-w-2xl flex-col gap-4">
                {messages.length === 0 && (
                  <div className="py-12 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground/40">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <p className="text-[13px] text-muted-foreground/60">
                      New conversation started.
                    </p>
                  </div>
                )}
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
              </div>
            </div>

            {/* Quick replies */}
            {lastAssistantOptions.length > 0 && (
              <div className="shrink-0 border-t border-border/40 bg-muted/30 px-4 py-3">
                <ScrollArea className="w-full">
                  <div className="flex gap-2 pb-1">
                    {lastAssistantOptions.map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSend(opt)}
                        disabled={sending || selectedSession.status !== 'idle'}
                        className="whitespace-nowrap rounded-xl border border-border/60 bg-background px-4 py-2 text-[12px] font-medium text-foreground shadow-sm transition-colors active:bg-muted/50 disabled:opacity-50"
                      >
                        {opt.length > 40 ? opt.slice(0, 40) + '…' : opt}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Input area */}
            <div className="shrink-0 border-t border-border/60 bg-background/95 p-3 pb-[calc(4rem+1rem+env(safe-area-inset-bottom))] backdrop-blur-lg">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                className="relative flex items-end gap-2"
              >
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    selectedSession.status === 'stopped'
                      ? 'Session is stopped'
                      : selectedSession.status === 'busy'
                        ? 'Waiting for response…'
                        : 'Ask anything…'
                  }
                  disabled={selectedSession.status !== 'idle' || sending}
                  rows={1}
                  className="min-h-[44px] max-h-32 resize-none rounded-2xl border-border/60 bg-muted/30 py-3 pl-4 pr-12 text-[14px] leading-relaxed focus-visible:ring-primary/20"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || selectedSession.status !== 'idle' || sending}
                  className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft transition-all active:scale-95 disabled:bg-muted disabled:text-muted-foreground/50 disabled:shadow-none"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </>
        )}
      </main>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Collapsible Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-border/60 bg-card transition-transform duration-300 ease-in-out",
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border/60 px-4">
          <span className="text-[15px] font-bold">History</span>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:bg-muted/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch]">
          <div className="flex flex-col gap-1 p-3">
            {loading && sessions.length === 0 ? (
              <div className="space-y-2 py-4">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-12 text-center px-4">
                <MessagesSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground/20" />
                <p className="text-[12px] text-muted-foreground/60">No history found.</p>
              </div>
            ) : (
              sessions.map((s) => (
                <div key={s.id} className="group relative">
                  <button
                    onClick={() => selectSession(s.id)}
                    className={cn(
                      "flex w-full flex-col items-start gap-1 rounded-xl border border-transparent px-3 py-3 text-left transition-all active:scale-[0.98]",
                      selectedId === s.id
                        ? "bg-primary/10 ring-1 ring-primary/20"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className={cn(
                        "truncate text-[13px] font-medium",
                        selectedId === s.id ? "text-primary" : "text-foreground/90"
                      )}>
                        {s.title}
                      </span>
                      {s.status === 'busy' && (
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                      )}
                    </div>
                    <div className="flex w-full items-center gap-1.5 text-[10px] text-muted-foreground/60">
                      <span className="truncate">{runnerName(s.runner_id)}</span>
                      <span>·</span>
                      <span className="capitalize">{s.status}</span>
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border-t border-border/60 p-4">
          <Button
            onClick={() => {
              setShowCreate(true);
              setIsSidebarOpen(false);
            }}
            variant="outline"
            className="w-full justify-start rounded-xl border-dashed py-6"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Session
          </Button>
        </div>
      </aside>

      {/* Create Session Dialog */}
      <CreateSessionDialog
        open={showCreate}
        runners={runners}
        onClose={() => setShowCreate(false)}
        onCreated={async (s) => {
          setShowCreate(false);
          await loadSessions();
          setSelectedId(s.id);
          setIsSidebarOpen(false);
        }}
      />
    </div>
  );
}

function MessageBubble({ message }: { message: SessionMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isAssistant = message.role === 'assistant';

  return (
    <div className={cn(
      'flex w-full gap-3',
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      <div className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 shadow-sm',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'
      )}>
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div className={cn(
        'relative max-w-[85%] rounded-[18px] px-4 py-2.5 text-[14px] leading-relaxed shadow-sm ring-1 ring-border/50',
        isUser
          ? 'rounded-tr-none bg-primary/[0.08] text-foreground'
          : isSystem
            ? 'border-amber-500/30 bg-amber-500/5 text-amber-700'
            : 'rounded-tl-none bg-card text-foreground'
      )}>
        <pre className="whitespace-pre-wrap break-words font-sans">
          {message.content || (isAssistant ? <span className="flex gap-1 py-1"><span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground/40" /><span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0.2s]" /><span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0.4s]" /></span> : '')}
        </pre>
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
      <AppDialogContent className="flex h-[calc(100svh-env(safe-area-inset-top)-0.75rem)] max-h-[calc(100svh-env(safe-area-inset-top)-0.75rem)] flex-col gap-0 rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-[480px] sm:rounded-lg">
        <AppDialogHeader>
          <DialogTitle className="sr-only">Create a new session</DialogTitle>
          <DialogDescription className="sr-only">Start a multi-turn conversation with a runner's AI CLI.</DialogDescription>
          <AppDialogEyebrow>
            <Sparkles className="h-3 w-3" />
            New Session
          </AppDialogEyebrow>
        </AppDialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <AppDialogBody className="pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4">
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
                <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select a runner" /></SelectTrigger>
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
                <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select an AI CLI" /></SelectTrigger>
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

            {error && <p className="mt-2 text-[12px] text-destructive/85">{error}</p>}
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
