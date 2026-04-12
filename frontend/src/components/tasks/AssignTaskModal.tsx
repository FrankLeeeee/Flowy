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
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AppDialogBody, AppDialogContent, AppDialogEyebrow, AppDialogFooter, AppDialogHeader, AppDialogSection } from '@/components/ui/app-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import RunnerStatusBadge from '../runners/RunnerStatusBadge';
import { parseHarnessConfig } from '../../lib/harnessConfig';
import { AI_LABELS } from '../../lib/taskConstants';

const DEFAULT_SELECT = '__default__';
const DIALOG_CONTROL_CLASSNAME = 'h-9 rounded-xl border-border/60 bg-card text-[13px] shadow-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0';
const DIALOG_SELECT_TRIGGER_CLASSNAME = 'h-9 rounded-xl border-border/60 bg-card px-3 text-[13px] shadow-soft focus:ring-2 focus:ring-ring focus:ring-offset-0';

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
      <AppDialogContent className="sm:max-w-2xl max-h-[90vh]">
        <AppDialogHeader>
          <DialogTitle className="sr-only">Assign {task.task_key}</DialogTitle>
          <DialogDescription className="sr-only">Select a runner, choose a harness, and pass execution settings through to the CLI command.</DialogDescription>
          <AppDialogEyebrow>Task assignment</AppDialogEyebrow>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[18px] font-semibold tracking-[-0.025em] text-foreground">Assign {task.task_key}</h2>
              <p className="mt-1 text-[12px] leading-5 text-muted-foreground/85">Select a runner, choose a harness, and pass the execution settings through to the underlying CLI.</p>
            </div>
            <div className="max-w-full rounded-full bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground/85 ring-1 ring-primary/10 shadow-soft">
              <span className="block max-w-[240px] truncate">{task.title}</span>
            </div>
          </div>
        </AppDialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <ScrollArea className="max-h-[62vh]">
            <AppDialogBody className="space-y-4 pr-4">
              <AppDialogSection tone="primary" className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">Runner</Label>
                  <Select value={runnerId || undefined} onValueChange={(value) => { setRunnerId(value); setAiProvider(''); }}>
                    <SelectTrigger className={DIALOG_SELECT_TRIGGER_CLASSNAME}><SelectValue placeholder="Select a runner..." /></SelectTrigger>
                    <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                      {runners.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="rounded-lg py-2 text-[11px]">{r.name} ({r.status})</SelectItem>
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
                    <SelectTrigger className={DIALOG_SELECT_TRIGGER_CLASSNAME}><SelectValue placeholder="Select AI provider..." /></SelectTrigger>
                    <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                      {availableProviders.map((provider) => (
                        <SelectItem key={provider} value={provider} className="rounded-lg py-2 text-[11px]">{AI_LABELS[provider]}</SelectItem>
                      ))}
                      {availableProviders.length === 0 && runnerId && (
                        <div className="px-3 py-2 text-[13px] text-muted-foreground/75">No providers available</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </AppDialogSection>

              {aiProvider === 'codex' && (
                <AppDialogSection className="space-y-4">
                  <div>
                    <h3 className="text-[13px] font-semibold text-foreground">Codex settings</h3>
                    <p className="mt-1 text-[12px] text-muted-foreground/80">Maps to `codex exec` flags for workspace, model, and sandbox.</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Workspace</Label>
                      <Input value={codexConfig.workspace ?? ''} onChange={(e) => updateCodexConfig({ workspace: e.target.value || undefined })} placeholder="/path/to/repo" className={DIALOG_CONTROL_CLASSNAME} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Model</Label>
                      <Input value={codexConfig.model ?? ''} onChange={(e) => updateCodexConfig({ model: e.target.value || undefined })} placeholder="gpt-5.4" className={DIALOG_CONTROL_CLASSNAME} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Sandbox</Label>
                      <Select value={codexConfig.sandbox ?? 'workspace-write'} onValueChange={(value) => updateCodexConfig({ sandbox: value as CodexHarnessConfig['sandbox'] })}>
                        <SelectTrigger className={DIALOG_SELECT_TRIGGER_CLASSNAME}><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                          <SelectItem value="read-only" className="rounded-lg py-2 text-[11px]">read-only</SelectItem>
                          <SelectItem value="workspace-write" className="rounded-lg py-2 text-[11px]">workspace-write</SelectItem>
                          <SelectItem value="danger-full-access" className="rounded-lg py-2 text-[11px]">danger-full-access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AppDialogSection>
              )}

              {aiProvider === 'claude-code' && (
                <AppDialogSection className="space-y-4">
                  <div>
                    <h3 className="text-[13px] font-semibold text-foreground">Claude Code settings</h3>
                    <p className="mt-1 text-[12px] text-muted-foreground/80">Maps to `claude` flags for workspace, model, mode, and worktree.</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Workspace</Label>
                      <Input value={claudeConfig.workspace ?? ''} onChange={(e) => updateClaudeConfig({ workspace: e.target.value || undefined })} placeholder="/path/to/repo" className={DIALOG_CONTROL_CLASSNAME} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Model</Label>
                      <Input value={claudeConfig.model ?? ''} onChange={(e) => updateClaudeConfig({ model: e.target.value || undefined })} placeholder="sonnet" className={DIALOG_CONTROL_CLASSNAME} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Mode</Label>
                      <Select value={claudeConfig.mode ?? DEFAULT_SELECT} onValueChange={(value) => updateClaudeConfig({ mode: value === DEFAULT_SELECT ? undefined : value as ClaudeCodeHarnessConfig['mode'] })}>
                        <SelectTrigger className={DIALOG_SELECT_TRIGGER_CLASSNAME}><SelectValue placeholder="Default" /></SelectTrigger>
                        <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                          <SelectItem value={DEFAULT_SELECT} className="rounded-lg py-2 text-[11px]">Default</SelectItem>
                          <SelectItem value="acceptEdits" className="rounded-lg py-2 text-[11px]">acceptEdits</SelectItem>
                          <SelectItem value="auto" className="rounded-lg py-2 text-[11px]">auto</SelectItem>
                          <SelectItem value="bypassPermissions" className="rounded-lg py-2 text-[11px]">bypassPermissions</SelectItem>
                          <SelectItem value="dontAsk" className="rounded-lg py-2 text-[11px]">dontAsk</SelectItem>
                          <SelectItem value="plan" className="rounded-lg py-2 text-[11px]">plan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Worktree name</Label>
                      <Input value={claudeConfig.worktree ?? ''} onChange={(e) => updateClaudeConfig({ worktree: e.target.value || undefined })} placeholder="feature-branch" className={DIALOG_CONTROL_CLASSNAME} />
                    </div>
                  </div>
                </AppDialogSection>
              )}

              {aiProvider === 'cursor-agent' && (
                <AppDialogSection className="space-y-4">
                  <div>
                    <h3 className="text-[13px] font-semibold text-foreground">Cursor Agent settings</h3>
                    <p className="mt-1 text-[12px] text-muted-foreground/80">Maps to `agent` flags for workspace, model, mode, sandbox, and worktree.</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Workspace</Label>
                      <Input value={cursorConfig.workspace ?? ''} onChange={(e) => updateCursorConfig({ workspace: e.target.value || undefined })} placeholder="/path/to/repo" className={DIALOG_CONTROL_CLASSNAME} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Model</Label>
                      <Input value={cursorConfig.model ?? ''} onChange={(e) => updateCursorConfig({ model: e.target.value || undefined })} placeholder="gpt-5" className={DIALOG_CONTROL_CLASSNAME} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Mode</Label>
                      <Select value={cursorConfig.mode ?? DEFAULT_SELECT} onValueChange={(value) => updateCursorConfig({ mode: value === DEFAULT_SELECT ? undefined : value as CursorAgentHarnessConfig['mode'] })}>
                        <SelectTrigger className={DIALOG_SELECT_TRIGGER_CLASSNAME}><SelectValue placeholder="Default" /></SelectTrigger>
                        <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                          <SelectItem value={DEFAULT_SELECT} className="rounded-lg py-2 text-[11px]">Default</SelectItem>
                          <SelectItem value="plan" className="rounded-lg py-2 text-[11px]">plan</SelectItem>
                          <SelectItem value="ask" className="rounded-lg py-2 text-[11px]">ask</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Sandbox</Label>
                      <Select value={cursorConfig.sandbox ?? DEFAULT_SELECT} onValueChange={(value) => updateCursorConfig({ sandbox: value === DEFAULT_SELECT ? undefined : value as CursorAgentHarnessConfig['sandbox'] })}>
                        <SelectTrigger className={DIALOG_SELECT_TRIGGER_CLASSNAME}><SelectValue placeholder="Default" /></SelectTrigger>
                        <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                          <SelectItem value={DEFAULT_SELECT} className="rounded-lg py-2 text-[11px]">Default</SelectItem>
                          <SelectItem value="enabled" className="rounded-lg py-2 text-[11px]">enabled</SelectItem>
                          <SelectItem value="disabled" className="rounded-lg py-2 text-[11px]">disabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Worktree name</Label>
                      <Input value={cursorConfig.worktree ?? ''} onChange={(e) => updateCursorConfig({ worktree: e.target.value || undefined })} placeholder="feature-branch" className={DIALOG_CONTROL_CLASSNAME} />
                    </div>
                  </div>
                </AppDialogSection>
              )}
            </AppDialogBody>
          </ScrollArea>

          <AppDialogFooter>
            <div className="text-[11px] text-muted-foreground/80">
              {runnerId && aiProvider ? 'Ready to assign.' : 'Select a runner and provider to continue.'}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={onClose} className="rounded-full px-3.5 text-[11px] text-muted-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground">Cancel</Button>
              <Button type="submit" disabled={!runnerId || !aiProvider} className="rounded-full px-4 text-[11px]">Assign task</Button>
            </div>
          </AppDialogFooter>
        </form>
      </AppDialogContent>
    </Dialog>
  );
}
