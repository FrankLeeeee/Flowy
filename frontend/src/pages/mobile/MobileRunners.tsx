import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Runner, Task, AiProvider } from '../../types';
import {
  fetchRunners, fetchTasks, deleteRunner, refreshRunnerProviders,
  fetchRunnerSecret, updateSettings,
} from '../../api/client';
import { AI_LABELS } from '@/lib/taskConstants';
import RunnerStatusBadge from '@/components/runners/RunnerStatusBadge';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AppDialogBody, AppDialogContent, AppDialogEyebrow, AppDialogHeader, AppDialogSection, APP_DIALOG_TONE_STYLES } from '@/components/ui/app-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, timeAgo } from '@/lib/utils';
import { getToneStyles, getAiProviderStyles, getRunnerStatusStyles } from '@/lib/semanticColors';
import {
  Bot, Plus, Shield, Copy, CheckCircle2, Sparkles, Terminal,
  Trash2, RefreshCw, Loader2, ArrowLeft,
} from 'lucide-react';

export default function MobileRunners() {
  const navigate = useNavigate();
  const neutralTone = getToneStyles('neutral');
  const successTone = getToneStyles('success');
  const dangerTone = getToneStyles('danger');

  const [runners, setRunners] = useState<Runner[]>([]);
  const [busyTasks, setBusyTasks] = useState<Map<string, Task>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [refreshingRunnerId, setRefreshingRunnerId] = useState<string | null>(null);
  const [registrationSecret, setRegistrationSecret] = useState('');
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [savedSecurity, setSavedSecurity] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedInstallCommand, setCopiedInstallCommand] = useState(false);
  const [copiedRegisterCommand, setCopiedRegisterCommand] = useState(false);
  const [tab, setTab] = useState<'runners' | 'security'>('runners');

  const loadData = useCallback(async () => {
    try {
      const [r, t, secret] = await Promise.all([
        fetchRunners(), fetchTasks({ status: 'in_progress' }), fetchRunnerSecret(),
      ]);
      setRunners(r);
      const taskMap = new Map<string, Task>();
      for (const task of t) { if (task.runner_id) taskMap.set(task.runner_id, task); }
      setBusyTasks(taskMap);
      setRegistrationSecret(secret.registrationSecret);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load runners');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { const iv = setInterval(loadData, 10_000); return () => clearInterval(iv); }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this runner?')) return;
    try { await deleteRunner(id); loadData(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to remove runner'); }
  };

  const handleRefresh = async (id: string) => {
    try {
      setRefreshingRunnerId(id);
      await refreshRunnerProviders(id);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh');
    } finally { setRefreshingRunnerId(null); }
  };

  const handleSaveSecurity = async () => {
    const s = registrationSecret.trim();
    if (!s) { setError('Secret cannot be empty.'); return; }
    setSavingSecurity(true);
    try {
      await updateSettings({ runner: { registrationSecret: s } });
      setRegistrationSecret(s);
      setSavedSecurity(true);
      setTimeout(() => setSavedSecurity(false), 3000);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally { setSavingSecurity(false); }
  };

  const handleCopy = async (text: string, setter: (v: boolean) => void) => {
    try { await navigator.clipboard.writeText(text); setter(true); setTimeout(() => setter(false), 2000); }
    catch (e) { setError(e instanceof Error ? e.message : 'Copy failed'); }
  };

  const onlineCount = runners.filter((r) => r.status === 'online' || r.status === 'busy').length;
  const offlineCount = runners.filter((r) => r.status === 'offline').length;
  const installCommand = 'npm install -g @frankleeeee/flowy-runner';
  const commandSecret = registrationSecret.trim() || '<registration-secret>';
  const runnerCommand = `flowy-runner \\\n  --name "my-device" \\\n  --url http://YOUR_HOST:PORT \\\n  --secret ${commandSecret}`;

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-24" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-lg px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 active:bg-muted/50"
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-[18px] font-bold tracking-tight text-foreground">Runners</h1>
              <div className="mt-1 flex items-center gap-2 text-[11px]">
                <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 font-semibold ring-1', successTone.pill)}>{onlineCount} online</span>
                <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 font-semibold ring-1', neutralTone.pill)}>{offlineCount} offline</span>
              </div>
            </div>
          </div>
          {tab === 'runners' && (
            <button
              type="button"
              onClick={() => setShowSetup(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft active:opacity-90"
            >
              <Plus className="h-4.5 w-4.5" />
            </button>
          )}
        </div>

        {/* Tab switcher */}
        <div className="mt-3 flex items-stretch border-t border-border/40">
          <button
            type="button"
            onClick={() => setTab('runners')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium transition-colors border-b-2',
              tab === 'runners' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground/75',
            )}
          >
            <Bot className="h-3.5 w-3.5" />
            Runners
          </button>
          <button
            type="button"
            onClick={() => setTab('security')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium transition-colors border-b-2',
              tab === 'security' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground/75',
            )}
          >
            <Shield className="h-3.5 w-3.5" />
            Security
          </button>
        </div>
      </div>

      {error && <div className={cn('mx-4 mt-3 rounded-xl px-3 py-2 text-[13px] ring-1', dangerTone.panel, dangerTone.text)}>{error}</div>}

      {tab === 'security' ? (
        <div className="space-y-4">
          <div className="border-b border-border/40 bg-card px-4 py-4 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground/65" />
              <h2 className="font-semibold text-[14px]">Registration Secret</h2>
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                value={registrationSecret}
                onChange={(e) => setRegistrationSecret(e.target.value)}
                placeholder="Enter a secret..."
                className="h-10 rounded-xl"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => void handleCopy(registrationSecret, setCopiedSecret)}
                  disabled={!registrationSecret}
                  className="h-9 flex-1 rounded-xl text-[12px]"
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  {copiedSecret ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  onClick={() => void handleSaveSecurity()}
                  disabled={savingSecurity || !registrationSecret.trim()}
                  className="h-9 flex-1 rounded-xl text-[12px]"
                >
                  {savingSecurity ? 'Saving...' : 'Save'}
                </Button>
              </div>
              {savedSecurity && (
                <span className={cn('flex items-center gap-1 text-[11px] font-medium', successTone.emphasis)}>
                  <CheckCircle2 className="h-3 w-3" /> Saved
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground/75">Every new runner must provide this secret when it registers.</p>
          </div>
        </div>
      ) : (
        <div>
          {runners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <Bot className="h-10 w-10 text-foreground/10 mb-4" />
              <p className="text-[14px] font-medium text-muted-foreground/80">No runners registered</p>
              <p className="mt-1 mb-5 text-[12px] text-muted-foreground/70">Add a runner to start executing tasks</p>
              <Button onClick={() => setShowSetup(true)} size="sm" className="h-9 rounded-xl text-[13px]">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Runner
              </Button>
            </div>
          ) : (
            runners.map((runner) => {
              const providers: AiProvider[] = JSON.parse(runner.ai_providers || '[]');
              const currentTask = busyTasks.get(runner.id);
              const busyStyles = getRunnerStatusStyles('busy');
              const cliRefreshPending = Boolean(
                runner.cli_refresh_requested_at &&
                (!runner.last_cli_scan_at || new Date(runner.cli_refresh_requested_at).getTime() > new Date(runner.last_cli_scan_at).getTime()),
              );

              return (
                <div key={runner.id} className="border-b border-border/40 bg-card px-4 py-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-semibold text-foreground truncate">{runner.name}</h3>
                      {runner.device_info && <p className="mt-0.5 text-[11px] text-muted-foreground/80 truncate">{runner.device_info}</p>}
                    </div>
                    <RunnerStatusBadge status={runner.status} />
                  </div>

                  {providers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {providers.map((p) => (
                        <span key={p} className={cn('inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ring-1', getAiProviderStyles(p).pill)}>
                          {AI_LABELS[p] ?? p}
                        </span>
                      ))}
                    </div>
                  )}

                  {currentTask && runner.status === 'busy' && (
                    <div className={cn('rounded-xl border px-3 py-2', busyStyles.panel)}>
                      <p className={cn('text-[11px] font-semibold', busyStyles.text)}>Running task</p>
                      <p className="text-[13px] text-foreground font-mono mt-0.5 truncate">{currentTask.task_key}: {currentTask.title}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                    <div className="min-w-0">
                      <span className="block text-[11px] text-muted-foreground/75">Heartbeat {timeAgo(runner.last_heartbeat)}</span>
                      {cliRefreshPending && <span className={cn('block text-[10px]', busyStyles.emphasis)}>Refresh requested</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleRefresh(runner.id)}
                        disabled={refreshingRunnerId === runner.id || runner.status === 'offline'}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/70 active:bg-muted/50 disabled:opacity-40"
                      >
                        {refreshingRunnerId === runner.id || cliRefreshPending
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <RefreshCw className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(runner.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/70 active:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add Runner Dialog */}
      <Dialog open={showSetup} onOpenChange={(open) => { if (!open) setShowSetup(false); }}>
        <AppDialogContent className="flex h-[calc(100svh-env(safe-area-inset-top)-0.75rem)] max-h-[calc(100svh-env(safe-area-inset-top)-0.75rem)] flex-col gap-0 rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-lg">
          <AppDialogHeader>
            <DialogTitle className="sr-only">Add a runner</DialogTitle>
            <DialogDescription className="sr-only">Get the command to register a runner.</DialogDescription>
            <AppDialogEyebrow><Sparkles className="h-3 w-3" /> New Runner</AppDialogEyebrow>
            <h2 className="hidden text-[18px] font-semibold tracking-[-0.025em] text-foreground sm:block">Connect another machine</h2>
          </AppDialogHeader>
          <ScrollArea className="min-h-0 flex-1">
              <AppDialogBody className="pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4">
                <AppDialogSection tone="primary">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className={cn('text-[10px] font-semibold uppercase tracking-[0.14em]', APP_DIALOG_TONE_STYLES.primary.label)}>Step 1</p>
                    <span className={cn('text-[10px]', APP_DIALOG_TONE_STYLES.primary.label)}>Install package</span>
                  </div>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <p className="text-[12px] leading-5 text-muted-foreground/85">Install the runner globally on the target machine.</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy(installCommand, setCopiedInstallCommand)} className="h-7 shrink-0 rounded-full px-3 text-[11px] shadow-none">
                      <Copy className="mr-1.5 h-3 w-3" />{copiedInstallCommand ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <pre className="terminal-surface overflow-x-auto rounded-[14px] px-4 py-3 font-mono text-[12px] leading-relaxed">{installCommand}</pre>
                </AppDialogSection>
                <AppDialogSection tone="primary">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className={cn('text-[10px] font-semibold uppercase tracking-[0.14em]', APP_DIALOG_TONE_STYLES.primary.label)}>Step 2</p>
                    <span className={cn('text-[10px]', APP_DIALOG_TONE_STYLES.primary.label)}>Register runner</span>
                  </div>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <p className="text-[12px] leading-5 text-muted-foreground/85">Run after <code className="rounded bg-card px-1 py-0.5 font-mono text-foreground/90">flowy-runner</code> is installed.</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy(runnerCommand, setCopiedRegisterCommand)} className="h-7 shrink-0 rounded-full px-3 text-[11px] shadow-none">
                      <Copy className="mr-1.5 h-3 w-3" />{copiedRegisterCommand ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <pre className="terminal-surface overflow-x-auto rounded-[14px] px-4 py-3 font-mono text-[12px] leading-relaxed">{runnerCommand}</pre>
                </AppDialogSection>
                <AppDialogSection>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Runner Notes</p>
                    <Terminal className="h-3.5 w-3.5 text-muted-foreground/65" />
                  </div>
                  <div className="grid gap-3 text-[11px] leading-5 text-muted-foreground/85">
                    <p><code className="rounded bg-foreground/[0.04] px-1 py-0.5 font-mono text-foreground/80">--name</code> Unique name for this machine</p>
                    <p><code className="rounded bg-foreground/[0.04] px-1 py-0.5 font-mono text-foreground/80">--url</code> URL to reach this hub backend</p>
                    <p><code className="rounded bg-foreground/[0.04] px-1 py-0.5 font-mono text-foreground/80">--secret</code> Required registration secret</p>
                    <p>The runner auto-detects installed CLIs on launch: <span className="font-mono text-foreground/85">claude, codex, cursor-agent</span></p>
                  </div>
                </AppDialogSection>
              </AppDialogBody>
            </ScrollArea>
        </AppDialogContent>
      </Dialog>
    </div>
  );
}
