import { useState } from 'react';
import {
  Runner,
  AiProvider,
  HarnessConfig,
  CodexHarnessConfig,
  ClaudeCodeHarnessConfig,
  CursorAgentHarnessConfig,
  GeminiHarnessConfig,
  Workspace,
} from '../../types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DirectoryInput } from '@/components/ui/directory-input';
import { AppDialogSection } from '@/components/ui/app-dialog';
import RunnerStatusBadge from '../runners/RunnerStatusBadge';
import { AI_LABELS } from '../../lib/taskConstants';

const DEFAULT_SELECT = '__default__';
const CUSTOM_BROWSE = '__browse__';
const FIELD_CLASSNAME = 'h-9 rounded-xl border-border/60 bg-card text-[13px] shadow-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0';
const SELECT_TRIGGER_CLASSNAME = 'h-9 rounded-xl border-border/60 bg-card px-3 text-[13px] shadow-soft focus:ring-2 focus:ring-ring focus:ring-offset-0';

function WorkspaceField({
  value,
  onChange,
  runnerId,
  listWorkspaces,
}: {
  value: string;
  onChange: (v: string) => void;
  runnerId?: string;
  listWorkspaces?: Workspace[];
}) {
  const hasRegistered = listWorkspaces && listWorkspaces.length > 0;
  const matchedRegistered = hasRegistered ? listWorkspaces.find((w) => w.path === value) : undefined;
  const isCustom = !hasRegistered || (value !== '' && !matchedRegistered);
  const [showBrowse, setShowBrowse] = useState(isCustom && value !== '');

  if (!hasRegistered) {
    return (
      <DirectoryInput
        value={value}
        onChange={(v) => onChange(v || '')}
        runnerId={runnerId}
        className={FIELD_CLASSNAME}
      />
    );
  }

  const renderTriggerLabel = () => {
    if (showBrowse) return <span className="text-muted-foreground">Browse custom path...</span>;
    if (!matchedRegistered) return <span className="text-muted-foreground">No workspace</span>;
    return (
      <span className="flex items-baseline gap-2 min-w-0">
        <span className="truncate">{matchedRegistered.name}</span>
        {matchedRegistered.name !== matchedRegistered.path && (
          <span className="truncate font-mono text-[10px] text-muted-foreground/70">{matchedRegistered.path}</span>
        )}
      </span>
    );
  };

  return (
    <div className="space-y-2">
      <Select
        value={showBrowse ? CUSTOM_BROWSE : (value || DEFAULT_SELECT)}
        onValueChange={(v) => {
          if (v === CUSTOM_BROWSE) {
            setShowBrowse(true);
            onChange('');
          } else if (v === DEFAULT_SELECT) {
            setShowBrowse(false);
            onChange('');
          } else {
            setShowBrowse(false);
            onChange(v);
          }
        }}
      >
        <SelectTrigger className={SELECT_TRIGGER_CLASSNAME}>
          <SelectValue placeholder="Select workspace...">{renderTriggerLabel()}</SelectValue>
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
          <SelectItem value={DEFAULT_SELECT} className="rounded-lg py-2 text-[11px]">
            No workspace
          </SelectItem>
          {listWorkspaces.map((ws) => (
            <SelectItem key={ws.path} value={ws.path} className="rounded-lg py-1.5 text-[11px]">
              <span className="flex flex-col leading-tight">
                <span className="text-[11px] font-medium text-foreground">{ws.name}</span>
                {ws.name !== ws.path && (
                  <span className="text-[10px] font-mono text-muted-foreground/70">{ws.path}</span>
                )}
              </span>
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_BROWSE} className="rounded-lg py-2 text-[11px] text-muted-foreground">
            Browse custom path...
          </SelectItem>
        </SelectContent>
      </Select>
      {showBrowse && (
        <DirectoryInput
          value={value}
          onChange={(v) => onChange(v || '')}
          runnerId={runnerId}
          placeholder="Browse runner filesystem..."
          className={FIELD_CLASSNAME}
        />
      )}
    </div>
  );
}

export default function RunnerAssignmentFields({
  runners,
  runnerId,
  aiProvider,
  harnessConfig,
  listWorkspaces,
  onRunnerIdChange,
  onAiProviderChange,
  onHarnessConfigChange,
}: {
  runners: Runner[];
  runnerId: string;
  aiProvider: AiProvider | '';
  harnessConfig: HarnessConfig;
  listWorkspaces?: Workspace[];
  onRunnerIdChange: (id: string) => void;
  onAiProviderChange: (provider: AiProvider | '') => void;
  onHarnessConfigChange: (config: HarnessConfig) => void;
}) {
  const selectedRunner = runners.find((r) => r.id === runnerId);
  const availableProviders: AiProvider[] = selectedRunner
    ? JSON.parse(selectedRunner.ai_providers || '[]')
    : [];

  const codexConfig = harnessConfig.codex ?? {};
  const claudeConfig = harnessConfig.claudeCode ?? {};
  const cursorConfig = harnessConfig.cursorAgent ?? {};
  const geminiConfig = harnessConfig.gemini ?? {};

  const updateCodexConfig = (patch: Partial<CodexHarnessConfig>) => {
    onHarnessConfigChange({ ...harnessConfig, codex: { ...codexConfig, ...patch } });
  };
  const updateClaudeConfig = (patch: Partial<ClaudeCodeHarnessConfig>) => {
    onHarnessConfigChange({ ...harnessConfig, claudeCode: { ...claudeConfig, ...patch } });
  };
  const updateCursorConfig = (patch: Partial<CursorAgentHarnessConfig>) => {
    onHarnessConfigChange({ ...harnessConfig, cursorAgent: { ...cursorConfig, ...patch } });
  };
  const updateGeminiConfig = (patch: Partial<GeminiHarnessConfig>) => {
    onHarnessConfigChange({ ...harnessConfig, gemini: { ...geminiConfig, ...patch } });
  };

  return (
    <div className="space-y-4">
      <AppDialogSection tone="primary" className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[13px] font-medium">Runner</Label>
          <Select
            value={runnerId || undefined}
            onValueChange={(value) => { onRunnerIdChange(value); onAiProviderChange(''); }}
          >
            <SelectTrigger className={SELECT_TRIGGER_CLASSNAME}><SelectValue placeholder="Select a runner..." /></SelectTrigger>
            <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
              {runners.length === 0 && (
                <div className="px-3 py-2 text-[13px] text-muted-foreground/75">No runners available</div>
              )}
              {runners.map((r) => (
                <SelectItem key={r.id} value={r.id} className="rounded-lg py-2 text-[11px]">
                  {r.name} ({r.status})
                </SelectItem>
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
          <Select
            value={aiProvider || undefined}
            onValueChange={(value) => onAiProviderChange(value as AiProvider)}
            disabled={!runnerId}
          >
            <SelectTrigger className={SELECT_TRIGGER_CLASSNAME}><SelectValue placeholder="Select AI provider..." /></SelectTrigger>
            <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
              {availableProviders.map((provider) => (
                <SelectItem key={provider} value={provider} className="rounded-lg py-2 text-[11px]">
                  {AI_LABELS[provider]}
                </SelectItem>
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
            <p className="mt-1 text-[12px] text-muted-foreground/80">Maps to `codex exec` flags for workspace, model, and sandbox. Leave worktree blank to run against the workspace directly.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Workspace</Label>
              <WorkspaceField
                value={codexConfig.workspace ?? ''}
                onChange={(v) => updateCodexConfig({ workspace: v || undefined })}
                runnerId={runnerId || undefined}
                listWorkspaces={listWorkspaces}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Model</Label>
              <Input
                value={codexConfig.model ?? ''}
                onChange={(e) => updateCodexConfig({ model: e.target.value || undefined })}
                placeholder="gpt-5.4"
                className={FIELD_CLASSNAME}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Sandbox</Label>
              <Select
                value={codexConfig.sandbox ?? 'workspace-write'}
                onValueChange={(value) => updateCodexConfig({ sandbox: value as CodexHarnessConfig['sandbox'] })}
              >
                <SelectTrigger className={SELECT_TRIGGER_CLASSNAME}><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                  <SelectItem value="read-only" className="rounded-lg py-2 text-[11px]">read-only</SelectItem>
                  <SelectItem value="workspace-write" className="rounded-lg py-2 text-[11px]">workspace-write</SelectItem>
                  <SelectItem value="danger-full-access" className="rounded-lg py-2 text-[11px]">danger-full-access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Worktree name</Label>
              <Input
                value={codexConfig.worktree ?? ''}
                onChange={(e) => updateCodexConfig({ worktree: e.target.value || undefined })}
                placeholder="feature-branch"
                className={FIELD_CLASSNAME}
              />
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
              <WorkspaceField
                value={claudeConfig.workspace ?? ''}
                onChange={(v) => updateClaudeConfig({ workspace: v || undefined })}
                runnerId={runnerId || undefined}
                listWorkspaces={listWorkspaces}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Model</Label>
              <Input
                value={claudeConfig.model ?? ''}
                onChange={(e) => updateClaudeConfig({ model: e.target.value || undefined })}
                placeholder="sonnet"
                className={FIELD_CLASSNAME}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Worktree name</Label>
              <Input
                value={claudeConfig.worktree ?? ''}
                onChange={(e) => updateClaudeConfig({ worktree: e.target.value || undefined })}
                placeholder="feature-branch"
                className={FIELD_CLASSNAME}
              />
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
              <WorkspaceField
                value={cursorConfig.workspace ?? ''}
                onChange={(v) => updateCursorConfig({ workspace: v || undefined })}
                runnerId={runnerId || undefined}
                listWorkspaces={listWorkspaces}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Model</Label>
              <Input
                value={cursorConfig.model ?? ''}
                onChange={(e) => updateCursorConfig({ model: e.target.value || undefined })}
                placeholder="gpt-5"
                className={FIELD_CLASSNAME}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Mode</Label>
              <Select
                value={cursorConfig.mode ?? DEFAULT_SELECT}
                onValueChange={(value) => updateCursorConfig({ mode: value === DEFAULT_SELECT ? undefined : value as CursorAgentHarnessConfig['mode'] })}
              >
                <SelectTrigger className={SELECT_TRIGGER_CLASSNAME}><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                  <SelectItem value={DEFAULT_SELECT} className="rounded-lg py-2 text-[11px]">Default</SelectItem>
                  <SelectItem value="plan" className="rounded-lg py-2 text-[11px]">plan</SelectItem>
                  <SelectItem value="ask" className="rounded-lg py-2 text-[11px]">ask</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Sandbox</Label>
              <Select
                value={cursorConfig.sandbox ?? DEFAULT_SELECT}
                onValueChange={(value) => updateCursorConfig({ sandbox: value === DEFAULT_SELECT ? undefined : value as CursorAgentHarnessConfig['sandbox'] })}
              >
                <SelectTrigger className={SELECT_TRIGGER_CLASSNAME}><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                  <SelectItem value={DEFAULT_SELECT} className="rounded-lg py-2 text-[11px]">Default</SelectItem>
                  <SelectItem value="enabled" className="rounded-lg py-2 text-[11px]">enabled</SelectItem>
                  <SelectItem value="disabled" className="rounded-lg py-2 text-[11px]">disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Worktree name</Label>
              <Input
                value={cursorConfig.worktree ?? ''}
                onChange={(e) => updateCursorConfig({ worktree: e.target.value || undefined })}
                placeholder="feature-branch"
                className={FIELD_CLASSNAME}
              />
            </div>
          </div>
        </AppDialogSection>
      )}

      {aiProvider === 'gemini-cli' && (
        <AppDialogSection className="space-y-4">
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">Gemini CLI settings</h3>
            <p className="mt-1 text-[12px] text-muted-foreground/80">Maps to `gemini` flags for workspace, model, sandbox, and worktree.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Workspace</Label>
              <WorkspaceField
                value={geminiConfig.workspace ?? ''}
                onChange={(v) => updateGeminiConfig({ workspace: v || undefined })}
                runnerId={runnerId || undefined}
                listWorkspaces={listWorkspaces}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Model</Label>
              <Select
                value={geminiConfig.model ?? DEFAULT_SELECT}
                onValueChange={(value) => updateGeminiConfig({ model: value === DEFAULT_SELECT ? undefined : value as GeminiHarnessConfig['model'] })}
              >
                <SelectTrigger className={SELECT_TRIGGER_CLASSNAME}><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                  <SelectItem value={DEFAULT_SELECT} className="rounded-lg py-2 text-[11px]">Default</SelectItem>
                  <SelectItem value="auto" className="rounded-lg py-2 text-[11px]">auto</SelectItem>
                  <SelectItem value="pro" className="rounded-lg py-2 text-[11px]">pro</SelectItem>
                  <SelectItem value="flash" className="rounded-lg py-2 text-[11px]">flash</SelectItem>
                  <SelectItem value="flash-lite" className="rounded-lg py-2 text-[11px]">flash-lite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Sandbox</Label>
              <Select
                value={geminiConfig.sandbox === true ? 'enabled' : geminiConfig.sandbox === false ? 'disabled' : DEFAULT_SELECT}
                onValueChange={(value) => updateGeminiConfig({ sandbox: value === DEFAULT_SELECT ? undefined : value === 'enabled' })}
              >
                <SelectTrigger className={SELECT_TRIGGER_CLASSNAME}><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                  <SelectItem value={DEFAULT_SELECT} className="rounded-lg py-2 text-[11px]">Default</SelectItem>
                  <SelectItem value="enabled" className="rounded-lg py-2 text-[11px]">enabled</SelectItem>
                  <SelectItem value="disabled" className="rounded-lg py-2 text-[11px]">disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Worktree name</Label>
              <Input
                value={geminiConfig.worktree ?? ''}
                onChange={(e) => updateGeminiConfig({ worktree: e.target.value || undefined })}
                placeholder="feature-branch"
                className={FIELD_CLASSNAME}
              />
            </div>
          </div>
        </AppDialogSection>
      )}
    </div>
  );
}
