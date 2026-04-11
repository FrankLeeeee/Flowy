import { useEffect, useState } from 'react';
import {
  Task,
  Runner,
  AiProvider,
  HarnessConfig,
  CodexHarnessConfig,
  ClaudeCodeHarnessConfig,
  CursorAgentHarnessConfig,
} from '../../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import RunnerStatusBadge from '../runners/RunnerStatusBadge';
import { parseHarnessConfig } from '../../lib/harnessConfig';

const AI_LABELS: Record<AiProvider, string> = {
  'claude-code': 'Claude Code',
  'codex': 'Codex',
  'cursor-agent': 'Cursor Agent',
};

const DEFAULT_SELECT = '__default__';

export default function AssignTaskModal({
  open, task, runners, onSubmit, onClose,
}: {
  open: boolean;
  task: Task;
  runners: Runner[];
  onSubmit: (data: { runnerId: string; aiProvider: AiProvider; harnessConfig: HarnessConfig }) => void;
  onClose: () => void;
}) {
  const [runnerId, setRunnerId] = useState('');
  const [aiProvider, setAiProvider] = useState<AiProvider | ''>('');
  const [harnessConfig, setHarnessConfig] = useState<HarnessConfig>({});

  useEffect(() => {
    setRunnerId(task.runner_id ?? '');
    setAiProvider(task.ai_provider ?? '');
    setHarnessConfig(parseHarnessConfig(task.harness_config));
  }, [task]);

  const selectedRunner = runners.find((r) => r.id === runnerId);
  const availableProviders: AiProvider[] = selectedRunner
    ? JSON.parse(selectedRunner.ai_providers || '[]')
    : [];

  const codexConfig = harnessConfig.codex ?? {};
  const claudeConfig = harnessConfig.claudeCode ?? {};
  const cursorConfig = harnessConfig.cursorAgent ?? {};

  const updateCodexConfig = (patch: Partial<CodexHarnessConfig>) => {
    setHarnessConfig((prev) => ({ ...prev, codex: { ...(prev.codex ?? {}), ...patch } }));
  };

  const updateClaudeConfig = (patch: Partial<ClaudeCodeHarnessConfig>) => {
    setHarnessConfig((prev) => ({ ...prev, claudeCode: { ...(prev.claudeCode ?? {}), ...patch } }));
  };

  const updateCursorConfig = (patch: Partial<CursorAgentHarnessConfig>) => {
    setHarnessConfig((prev) => ({ ...prev, cursorAgent: { ...(prev.cursorAgent ?? {}), ...patch } }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!runnerId || !aiProvider) return;
    onSubmit({ runnerId, aiProvider, harnessConfig });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold">Assign {task.task_key}</DialogTitle>
          <DialogDescription className="text-[13px]">Select a runner, choose a harness, and pass execution settings through to the CLI command.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4">
          <ScrollArea className="max-h-[62vh] pr-4">
            <div className="space-y-4 pr-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Runner</Label>
                <Select value={runnerId || undefined} onValueChange={(value) => { setRunnerId(value); setAiProvider(''); }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select a runner..." /></SelectTrigger>
                  <SelectContent>
                    {runners.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name} ({r.status})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRunner && (
                  <div className="flex items-center gap-2 pt-1">
                    <RunnerStatusBadge status={selectedRunner.status} />
                    {selectedRunner.device_info && (
                      <span className="text-[11px] text-muted-foreground/75">{selectedRunner.device_info}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">AI Provider</Label>
                <Select value={aiProvider || undefined} onValueChange={(value) => setAiProvider(value as AiProvider)} disabled={!runnerId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select AI provider..." /></SelectTrigger>
                  <SelectContent>
                    {availableProviders.map((provider) => (
                      <SelectItem key={provider} value={provider}>{AI_LABELS[provider]}</SelectItem>
                    ))}
                    {availableProviders.length === 0 && runnerId && (
                      <div className="px-3 py-2 text-[13px] text-muted-foreground/75">No providers available</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {aiProvider === 'codex' && (
                <div className="rounded-xl border border-border/60 bg-foreground/[0.02] p-4">
                  <div className="mb-4">
                    <h3 className="text-[13px] font-semibold text-foreground">Codex settings</h3>
                    <p className="mt-1 text-[12px] text-muted-foreground/80">Maps to `codex exec` flags for workspace, model, and sandbox.</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Workspace</Label>
                      <Input value={codexConfig.workspace ?? ''} onChange={(e) => updateCodexConfig({ workspace: e.target.value || undefined })} placeholder="/path/to/repo" className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Model</Label>
                      <Input value={codexConfig.model ?? ''} onChange={(e) => updateCodexConfig({ model: e.target.value || undefined })} placeholder="gpt-5.4" className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Sandbox</Label>
                      <Select value={codexConfig.sandbox ?? 'workspace-write'} onValueChange={(value) => updateCodexConfig({ sandbox: value as CodexHarnessConfig['sandbox'] })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read-only">read-only</SelectItem>
                          <SelectItem value="workspace-write">workspace-write</SelectItem>
                          <SelectItem value="danger-full-access">danger-full-access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {aiProvider === 'claude-code' && (
                <div className="rounded-xl border border-border/60 bg-foreground/[0.02] p-4">
                  <div className="mb-4">
                    <h3 className="text-[13px] font-semibold text-foreground">Claude Code settings</h3>
                    <p className="mt-1 text-[12px] text-muted-foreground/80">Maps to `claude` flags for workspace, model, mode, and worktree.</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Workspace</Label>
                      <Input value={claudeConfig.workspace ?? ''} onChange={(e) => updateClaudeConfig({ workspace: e.target.value || undefined })} placeholder="/path/to/repo" className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Model</Label>
                      <Input value={claudeConfig.model ?? ''} onChange={(e) => updateClaudeConfig({ model: e.target.value || undefined })} placeholder="sonnet" className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Mode</Label>
                      <Select value={claudeConfig.mode ?? DEFAULT_SELECT} onValueChange={(value) => updateClaudeConfig({ mode: value === DEFAULT_SELECT ? undefined : value as ClaudeCodeHarnessConfig['mode'] })}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Default" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={DEFAULT_SELECT}>Default</SelectItem>
                          <SelectItem value="acceptEdits">acceptEdits</SelectItem>
                          <SelectItem value="auto">auto</SelectItem>
                          <SelectItem value="bypassPermissions">bypassPermissions</SelectItem>
                          <SelectItem value="dontAsk">dontAsk</SelectItem>
                          <SelectItem value="plan">plan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Worktree name</Label>
                      <Input value={claudeConfig.worktree ?? ''} onChange={(e) => updateClaudeConfig({ worktree: e.target.value || undefined })} placeholder="feature-branch" className="h-9" />
                    </div>
                  </div>
                </div>
              )}

              {aiProvider === 'cursor-agent' && (
                <div className="rounded-xl border border-border/60 bg-foreground/[0.02] p-4">
                  <div className="mb-4">
                    <h3 className="text-[13px] font-semibold text-foreground">Cursor Agent settings</h3>
                    <p className="mt-1 text-[12px] text-muted-foreground/80">Maps to `agent` flags for workspace, model, mode, sandbox, and worktree.</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Workspace</Label>
                      <Input value={cursorConfig.workspace ?? ''} onChange={(e) => updateCursorConfig({ workspace: e.target.value || undefined })} placeholder="/path/to/repo" className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Model</Label>
                      <Input value={cursorConfig.model ?? ''} onChange={(e) => updateCursorConfig({ model: e.target.value || undefined })} placeholder="gpt-5" className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Mode</Label>
                      <Select value={cursorConfig.mode ?? DEFAULT_SELECT} onValueChange={(value) => updateCursorConfig({ mode: value === DEFAULT_SELECT ? undefined : value as CursorAgentHarnessConfig['mode'] })}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Default" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={DEFAULT_SELECT}>Default</SelectItem>
                          <SelectItem value="plan">plan</SelectItem>
                          <SelectItem value="ask">ask</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Sandbox</Label>
                      <Select value={cursorConfig.sandbox ?? DEFAULT_SELECT} onValueChange={(value) => updateCursorConfig({ sandbox: value === DEFAULT_SELECT ? undefined : value as CursorAgentHarnessConfig['sandbox'] })}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Default" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={DEFAULT_SELECT}>Default</SelectItem>
                          <SelectItem value="enabled">enabled</SelectItem>
                          <SelectItem value="disabled">disabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Worktree name</Label>
                      <Input value={cursorConfig.worktree ?? ''} onChange={(e) => updateCursorConfig({ worktree: e.target.value || undefined })} placeholder="feature-branch" className="h-9" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!runnerId || !aiProvider}>Assign</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
