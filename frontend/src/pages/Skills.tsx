import { useState, useEffect, useCallback, useMemo } from "react";
import { AiProvider, Runner, Skill } from "../types";
import {
  fetchRunners,
  fetchSkills,
  fetchSkill,
  createOrUpdateSkill,
  deleteSkill,
  broadcastSkill,
} from "../api/client";
import PageTitle from "@/components/PageTitle";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AppDialogBody,
  AppDialogContent,
  AppDialogEyebrow,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogSection,
  APP_DIALOG_TONE_STYLES,
} from "@/components/ui/app-dialog";
import { getAiProviderStyles, getToneStyles } from "@/lib/semanticColors";
import {
  Sparkles,
  Plus,
  Trash2,
  Eye,
  Radio,
  Bot,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SKILL_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

const ALL_CLIS: AiProvider[] = ['claude-code', 'codex', 'cursor-agent', 'gemini-cli'];

const CLI_META: Record<AiProvider, { label: string; path: string }> = {
  'claude-code':  { label: 'Claude Code', path: '~/.claude/skills' },
  'codex':        { label: 'Codex',       path: '~/.agents/skills' },
  'cursor-agent': { label: 'Cursor',      path: '~/.agents/skills' },
  'gemini-cli':   { label: 'Gemini CLI',  path: '~/.agents/skills' },
};

type SkillGroup = {
  runner_id: string;
  name: string;
  description: string;
  skills: Skill[];
  primarySkill: Skill;
  presentClis: Set<AiProvider>;
};

function groupSkills(skills: Skill[]): SkillGroup[] {
  const map = new Map<string, SkillGroup>();
  for (const skill of skills) {
    const key = `${skill.runner_id}::${skill.name}`;
    if (!map.has(key)) {
      map.set(key, {
        runner_id: skill.runner_id,
        name: skill.name,
        description: skill.description,
        skills: [],
        primarySkill: skill,
        presentClis: new Set(),
      });
    }
    const group = map.get(key)!;
    group.skills.push(skill);
    group.presentClis.add(skill.cli);
  }
  return Array.from(map.values());
}

export default function Skills() {
  const [runners, setRunners] = useState<Runner[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [error, setError] = useState("");
  const [runnerFilter, setRunnerFilter] = useState<string>("");

  const [showCreate, setShowCreate] = useState(false);
  const [viewingSkill, setViewingSkill] = useState<Skill | null>(null);
  const [viewingLoading, setViewingLoading] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<SkillGroup | null>(null);
  const [broadcastingSkill, setBroadcastingSkill] = useState<Skill | null>(null);
  const [broadcastSelected, setBroadcastSelected] = useState<Set<string>>(new Set());
  const [broadcastStatus, setBroadcastStatus] = useState("");

  const [formRunnerId, setFormRunnerId] = useState("");
  const [formName, setFormName] = useState("");

  const loadRunners = useCallback(async () => {
    try {
      setRunners(await fetchRunners());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load runners");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSkills = useCallback(async (runnerId: string) => {
    setSkillsLoading(true);
    try {
      setSkills(await fetchSkills({ runner: runnerId }));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load skills");
    } finally {
      setSkillsLoading(false);
    }
  }, []);

  // Load runners once on mount
  useEffect(() => {
    void loadRunners();
  }, [loadRunners]);

  // Load skills when the selected runner changes
  useEffect(() => {
    if (!runnerFilter) { setSkills([]); return; }
    void loadSkills(runnerFilter);
  }, [runnerFilter, loadSkills]);

  const runnerMap = useMemo(() => new Map(runners.map((r) => [r.id, r])), [runners]);

  const filteredGroups = useMemo(() => groupSkills(skills), [skills]);

  const resetForm = () => {
    setFormRunnerId("");
    setFormName("");
  };

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const handleView = async (skill: Skill) => {
    setViewingLoading(true);
    setViewingSkill(skill);
    try {
      setViewingSkill(await fetchSkill(skill.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load skill");
    } finally {
      setViewingLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formName.trim();
    if (!formRunnerId || !SKILL_NAME_RE.test(name)) return;
    try {
      await createOrUpdateSkill({ runnerId: formRunnerId, name });
      setShowCreate(false);
      resetForm();
      if (runnerFilter) void loadSkills(runnerFilter);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? (e instanceof Error ? e.message : "Failed to install skill"));
    }
  };

  const handleDelete = async () => {
    if (!deletingGroup) return;
    try {
      await Promise.all(deletingGroup.skills.map((s) => deleteSkill(s.id)));
      setDeletingGroup(null);
      if (runnerFilter) void loadSkills(runnerFilter);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete skill");
    }
  };

  const broadcastCandidates = useMemo(() => {
    if (!broadcastingSkill) return [] as Runner[];
    return runners.filter((r) => r.id !== broadcastingSkill.runner_id);
  }, [broadcastingSkill, runners]);

  const openBroadcast = (group: SkillGroup) => {
    setBroadcastingSkill(group.primarySkill);
    setBroadcastSelected(new Set());
    setBroadcastStatus("");
  };

  const toggleBroadcastRunner = (runnerId: string) => {
    setBroadcastSelected((prev) => {
      const next = new Set(prev);
      if (next.has(runnerId)) next.delete(runnerId);
      else next.add(runnerId);
      return next;
    });
  };

  const handleBroadcast = async () => {
    if (!broadcastingSkill) return;
    try {
      const ids = Array.from(broadcastSelected);
      const result = await broadcastSkill(
        broadcastingSkill.id,
        ids.length > 0 ? ids : undefined,
      );
      setBroadcastStatus(
        result.broadcast === 0
          ? "No matching runners to sync to."
          : `Broadcasted to ${result.broadcast} runner${result.broadcast === 1 ? "" : "s"}.`,
      );
      if (runnerFilter) void loadSkills(runnerFilter);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to broadcast skill");
    }
  };

  const canSubmitSkill = Boolean(formRunnerId && SKILL_NAME_RE.test(formName.trim()));

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton className="mb-4 h-8 w-48" />
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="border-b border-border/60 bg-background/95 px-6 py-5 backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <PageTitle icon={Sparkles} title="Skills" />
            <p className="mt-1 text-[13px] text-muted-foreground/80">
              Install skills from skills.sh on a runner for Claude Code, Codex, Cursor, and Gemini CLI.
            </p>
          </div>
          <Button onClick={openCreate} disabled={runners.length === 0} className="rounded-full px-4 text-[12px]">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Skill
          </Button>
        </div>
      </div>

      <div className="border-b border-border/60 bg-card/35 px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {runnerFilter && (
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
              {filteredGroups.length} skill{filteredGroups.length === 1 ? "" : "s"}
            </span>
          )}
          <select
            value={runnerFilter}
            onChange={(e) => setRunnerFilter(e.target.value)}
            className="h-8 rounded-full border border-border/60 bg-background px-3 text-[12px]"
          >
            <option value="" disabled>Select a runner…</option>
            {runners.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-destructive/25 bg-destructive/8 px-4 py-3 text-[13px] text-destructive">
          {error}
        </div>
      )}

      <div className="flex-1 p-6">
        {!runnerFilter ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-card/30 text-center">
            <Bot className="mb-3 h-7 w-7 text-muted-foreground/45" />
            <p className="text-[14px] font-medium text-muted-foreground/80">Select a runner</p>
            <p className="mt-1 max-w-sm text-[12px] text-muted-foreground/65">
              {runners.length === 0
                ? "Register a runner first to install skills."
                : "Choose a runner above to see its installed skills."}
            </p>
          </div>
        ) : skillsLoading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-card/30 text-center">
            <Sparkles className="mb-3 h-7 w-7 text-muted-foreground/45" />
            <p className="text-[14px] font-medium text-muted-foreground/80">No skills yet</p>
            <p className="mt-1 max-w-sm text-[12px] text-muted-foreground/65">
              Enter a skill name from skills.sh to install it on every supported agent.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredGroups.map((group, index) => (
              <div
                key={`${group.runner_id}::${group.name}`}
                className="motion-card rounded-lg border border-border/60 bg-card p-4 shadow-soft"
                style={{ "--motion-delay": `${Math.min(index * 35, 220)}ms` } as React.CSSProperties}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-semibold text-foreground">{group.name}</h3>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {ALL_CLIS.map((cli) => {
                        const meta = CLI_META[cli];
                        const present = group.presentClis.has(cli);
                        return (
                          <span
                            key={cli}
                            title={present ? `Installed · ${meta.path}` : `Not installed · ${meta.path}`}
                            className={cn(
                              "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold ring-1",
                              present
                                ? getAiProviderStyles(cli).pill
                                : `${getToneStyles('neutral').pill} opacity-60`,
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full bg-current", present ? "opacity-70" : "opacity-35")} />
                            {meta.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => void handleView(group.primarySkill)} className="h-8 rounded-full px-3 text-[11px]">
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openBroadcast(group)} className="h-8 rounded-full px-3 text-[11px]">
                      <Radio className="mr-1 h-3 w-3" />
                      Broadcast
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeletingGroup(group)} className="h-8 rounded-full px-3 text-[11px] text-muted-foreground hover:text-destructive">
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); resetForm(); } }}>
        <AppDialogContent className="sm:max-w-[520px]">
          <AppDialogHeader>
            <DialogTitle className="sr-only">Add skill</DialogTitle>
            <DialogDescription className="sr-only">Install a skill from skills.sh on a runner.</DialogDescription>
            <AppDialogEyebrow>
              <Sparkles className="h-3 w-3" />
              New Skill
            </AppDialogEyebrow>
            <h2 className="hidden text-[18px] font-semibold tracking-[-0.025em] text-foreground sm:block">
              Install from skills.sh
            </h2>
          </AppDialogHeader>
          <form onSubmit={handleSubmit}>
            <AppDialogBody>
              <AppDialogSection tone="primary">
                <Label className={cn("mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em]", APP_DIALOG_TONE_STYLES.primary.label)}>
                  Skill name
                </Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="find-skills"
                  autoFocus
                  required
                  pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,63}"
                  className="h-auto border-0 bg-transparent px-0 py-0 text-[18px] font-semibold tracking-[-0.02em] text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <p className="mt-2 text-[11px] text-muted-foreground/70">
                  Use the skill slug shown on skills.sh.
                </p>
              </AppDialogSection>
              <AppDialogSection>
                <Label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">
                  Runner
                </Label>
                <select
                  value={formRunnerId}
                  onChange={(e) => setFormRunnerId(e.target.value)}
                  required
                  className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select a runner...</option>
                  {runners.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.status === "offline" ? " (offline)" : ""}
                    </option>
                  ))}
                </select>
              </AppDialogSection>
            </AppDialogBody>
            <AppDialogFooter>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => { setShowCreate(false); resetForm(); }} className="rounded-full px-3.5 text-[11px]">
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmitSkill} className="rounded-full px-4 text-[11px]">
                  Install
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </AppDialogFooter>
          </form>
        </AppDialogContent>
      </Dialog>

      <Dialog open={!!viewingSkill} onOpenChange={(open) => { if (!open) setViewingSkill(null); }}>
        <AppDialogContent className="sm:max-w-[720px]">
          <AppDialogHeader>
            <DialogTitle className="sr-only">View skill</DialogTitle>
            <DialogDescription className="sr-only">Skill details</DialogDescription>
            <AppDialogEyebrow>
              <Eye className="h-3 w-3" />
              Skill Details
            </AppDialogEyebrow>
            {viewingSkill && (
              <div className="hidden sm:block">
                <h2 className="text-[18px] font-semibold tracking-[-0.025em] text-foreground">{viewingSkill.name}</h2>
                <p className="mt-1 text-[12px] text-muted-foreground/75">
                  {runnerMap.get(viewingSkill.runner_id)?.name ?? "Unknown runner"} · {CLI_META[viewingSkill.cli]?.label ?? viewingSkill.cli} · {CLI_META[viewingSkill.cli]?.path}
                </p>
              </div>
            )}
          </AppDialogHeader>
          <AppDialogBody>
            {viewingLoading ? (
              <AppDialogSection>
                <div className="space-y-2 rounded-lg bg-foreground/[0.04] p-3">
                  {[100, 85, 92, 60, 78].map((w, i) => (
                    <Skeleton key={i} className="h-3 rounded" style={{ width: `${w}%` }} />
                  ))}
                </div>
              </AppDialogSection>
            ) : viewingSkill ? (
              <AppDialogSection>
                <pre className="max-h-[280px] overflow-auto whitespace-pre-wrap rounded-lg bg-foreground/[0.04] p-3 font-mono text-[12px] text-foreground/85">
                  {viewingSkill.content || "(pending)"}
                </pre>
              </AppDialogSection>
            ) : null}
          </AppDialogBody>
        </AppDialogContent>
      </Dialog>

      <Dialog
        open={!!broadcastingSkill}
        onOpenChange={(open) => {
          if (!open) {
            setBroadcastingSkill(null);
            setBroadcastSelected(new Set());
            setBroadcastStatus("");
          }
        }}
      >
        <AppDialogContent className="sm:max-w-[520px]">
          <AppDialogHeader>
            <DialogTitle className="sr-only">Broadcast skill</DialogTitle>
            <DialogDescription className="sr-only">Install this skill on other runners.</DialogDescription>
            <AppDialogEyebrow>
              <Radio className="h-3 w-3" />
              Broadcast
            </AppDialogEyebrow>
            {broadcastingSkill && (
              <h2 className="hidden text-[18px] font-semibold tracking-[-0.025em] text-foreground sm:block">
                Install "{broadcastingSkill.name}" elsewhere
              </h2>
            )}
          </AppDialogHeader>
          <AppDialogBody>
            <AppDialogSection>
              {broadcastCandidates.length === 0 ? (
                <p className="text-[13px] text-muted-foreground/75">No other runners are registered.</p>
              ) : (
                <div className="space-y-2">
                  {broadcastCandidates.map((runner) => (
                    <label key={runner.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2 text-[13px]">
                      <input
                        type="checkbox"
                        checked={broadcastSelected.has(runner.id)}
                        onChange={() => toggleBroadcastRunner(runner.id)}
                        className="h-4 w-4"
                      />
                      <span className="flex-1">{runner.name}</span>
                      <span className="text-[11px] text-muted-foreground/65">{runner.status}</span>
                    </label>
                  ))}
                </div>
              )}
              {broadcastStatus && <p className="mt-3 text-[12px] text-primary">{broadcastStatus}</p>}
            </AppDialogSection>
          </AppDialogBody>
          <AppDialogFooter>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => setBroadcastingSkill(null)} className="rounded-full px-3.5 text-[11px]">
                Close
              </Button>
              <Button type="button" onClick={() => void handleBroadcast()} disabled={!broadcastingSkill || broadcastCandidates.length === 0} className="rounded-full px-4 text-[11px]">
                Install
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </AppDialogFooter>
        </AppDialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingGroup}
        title="Remove skill"
        description={`Remove "${deletingGroup?.name}" from ${runnerMap.get(deletingGroup?.runner_id ?? "")?.name ?? "this runner"}? This will uninstall it from all ${deletingGroup?.skills.length ?? 0} CLI runner${(deletingGroup?.skills.length ?? 0) === 1 ? "" : "s"} where it is installed.`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setDeletingGroup(null)}
      />
    </div>
  );
}
