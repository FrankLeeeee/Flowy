import { useState, useEffect, useCallback } from 'react';
import { Runner, Task } from '../types';
import { fetchRunners, fetchTasks, deleteRunner, refreshRunnerProviders, fetchRunnerSecret, updateSettings } from '../api/client';
import RunnerCard from '../components/runners/RunnerCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Bot, Plus, Terminal, Shield, CheckCircle2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Runners() {
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
  const [tab, setTab] = useState<'runners' | 'security'>('runners');

  const loadData = useCallback(async () => {
    try {
      const [r, t, runnerSecurity] = await Promise.all([fetchRunners(), fetchTasks({ status: 'in_progress' }), fetchRunnerSecret()]);
      setRunners(r);
      const taskMap = new Map<string, Task>();
      for (const task of t) { if (task.runner_id) taskMap.set(task.runner_id, task); }
      setBusyTasks(taskMap);
      setRegistrationSecret(runnerSecurity.registrationSecret);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load runners');
    } finally {
      setLoading(false);
    }
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
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh runner CLIs');
    } finally {
      setRefreshingRunnerId(null);
    }
  };

  const handleSaveSecurity = async () => {
    setSavingSecurity(true);
    try {
      await updateSettings({ runner: { registrationSecret } });
      setSavedSecurity(true);
      setTimeout(() => setSavedSecurity(false), 3000);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save runner security');
    } finally {
      setSavingSecurity(false);
    }
  };

  const handleCopySecret = async () => {
    if (!registrationSecret) return;
    try {
      await navigator.clipboard.writeText(registrationSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to copy registration secret');
    }
  };

  const onlineCount = runners.filter((r) => r.status === 'online' || r.status === 'busy').length;
  const offlineCount = runners.filter((r) => r.status === 'offline').length;
  const runnerCommand = `my-hub-runner \\
  --name "my-device" \\
  --url http://YOUR_HOST:3001${registrationSecret ? ` \\
  --secret ${registrationSecret}` : ''}`;

  if (loading) {
    return (
      <div className="p-6 space-y-5">
        <Skeleton className="h-6 w-24" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[15px] font-semibold text-foreground">Runners</h1>
          <p className="text-[12px] text-muted-foreground/60 mt-0.5">
            {tab === 'runners' ? (
              <>
                <span className="text-emerald-500">{onlineCount} online</span>
                {offlineCount > 0 && <span className="ml-2 text-muted-foreground/40">{offlineCount} offline</span>}
              </>
            ) : (
              'Manage runner registration security'
            )}
          </p>
        </div>
        {tab === 'runners' && (
          <Button size="sm" onClick={() => setShowSetup(true)} className="h-8 text-[13px] shadow-soft">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Runner
          </Button>
        )}
      </div>

      {error && <div className="mb-4 bg-red-500/[0.06] text-red-500 px-3 py-2 rounded-md text-[13px]">{error}</div>}

      <div className="flex items-center gap-1 mb-6 border-b border-border/50">
        <button
          onClick={() => setTab('runners')}
          className={cn(
            'flex items-center gap-1.5 px-3 pb-2.5 text-[13px] font-medium border-b-2 transition-colors duration-150 -mb-px',
            tab === 'runners' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground/60 hover:text-muted-foreground'
          )}
        >
          <Bot className="h-3.5 w-3.5" />
          Runners
        </button>
        <button
          onClick={() => setTab('security')}
          className={cn(
            'flex items-center gap-1.5 px-3 pb-2.5 text-[13px] font-medium border-b-2 transition-colors duration-150 -mb-px',
            tab === 'security' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground/60 hover:text-muted-foreground'
          )}
        >
          <Shield className="h-3.5 w-3.5" />
          Security
        </button>
      </div>

      {tab === 'security' ? (
        <div className="max-w-2xl">
          <div className="mb-6">
            <h1 className="text-[15px] font-semibold text-foreground">Security</h1>
            <p className="text-[12px] text-muted-foreground/60 mt-0.5">Manage runner registration access and shared secrets</p>
          </div>

          <div className="rounded-lg border border-border/80 bg-card shadow-soft overflow-hidden">
            <div className="h-0.5 bg-foreground/10" />
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-4 w-4 text-muted-foreground/40" />
                <h2 className="font-semibold text-[13px] text-foreground">Runner Security</h2>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Registration Secret</Label>
                <div className="flex items-center gap-2 max-w-xl">
                  <Input
                    type="password"
                    value={registrationSecret}
                    onChange={(e) => setRegistrationSecret(e.target.value)}
                    placeholder="Enter a secret..."
                    className="h-9 max-w-md"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleCopySecret()}
                    disabled={!registrationSecret}
                    className="h-9 text-[12px]"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    {copiedSecret ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground/50">Required for runner registration. Leave empty for open access.</p>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <Button onClick={() => void handleSaveSecurity()} disabled={savingSecurity} className="h-8 text-[13px]">
                  {savingSecurity ? 'Saving...' : 'Save configurations'}
                </Button>
                {savedSecurity && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                    <CheckCircle2 className="h-3 w-3" /> Saved
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {runners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Bot className="h-10 w-10 text-foreground/10 mb-4" />
              <p className="text-[14px] font-medium text-muted-foreground/60">No runners registered</p>
              <p className="text-[12px] text-muted-foreground/40 mt-1 mb-5">Add a runner to start executing tasks</p>
              <Button onClick={() => setShowSetup(true)} size="sm" className="h-8 text-[13px]">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Runner
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {runners.map((runner) => (
                <RunnerCard
                  key={runner.id}
                  runner={runner}
                  currentTask={busyTasks.get(runner.id)}
                  onDelete={handleDelete}
                  onRefresh={handleRefresh}
                  refreshing={refreshingRunnerId === runner.id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showSetup && (
        <Dialog open onOpenChange={(open) => { if (!open) setShowSetup(false); }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold">
                <Terminal className="h-4 w-4 opacity-60" />
                Add Runner
              </DialogTitle>
              <DialogDescription className="text-[13px]">
                Run this on the target machine after installing the released runner package.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border border-border/80 bg-card shadow-soft overflow-hidden">
                <div className="border-b border-border/60 px-4 py-3">
                  <p className="text-[12px] font-medium text-foreground">Installed package command</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">This assumes <code className="bg-foreground/[0.04] rounded px-1 py-0.5 text-foreground/80 font-mono">my-hub-runner</code> is already installed on that machine.</p>
                </div>
                <div className="space-y-3 p-4">
                  <pre className="bg-[#16161a] text-gray-300 rounded-lg px-4 py-3 text-[12px] overflow-x-auto leading-relaxed font-mono">
{runnerCommand}
                  </pre>
                  <div className="grid gap-3 sm:grid-cols-2 text-[11px] text-muted-foreground/60">
                    <p><code className="bg-foreground/[0.04] rounded px-1 py-0.5 text-foreground/80 font-mono">--name</code> Unique name for this machine, like <span className="font-mono">office-mac</span></p>
                    <p><code className="bg-foreground/[0.04] rounded px-1 py-0.5 text-foreground/80 font-mono">--url</code> URL the runner can use to reach this hub backend</p>
                    <p>The runner auto-detects installed CLIs on launch: <span className="font-mono">claude, codex</span></p>
                    <p><code className="bg-foreground/[0.04] rounded px-1 py-0.5 text-foreground/80 font-mono">--secret</code> {registrationSecret ? 'Included from the current runner security settings' : 'Optional because runner registration is currently open'}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border/80 bg-foreground/[0.02] px-4 py-3 text-[11px] text-muted-foreground/60">
                <p>The runner saves its token to <code className="bg-foreground/[0.04] rounded px-1 py-0.5 text-foreground/80 font-mono">~/.config/my-hub/runner-&lt;name&gt;.json</code> and reuses it on the next launch.</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
