import { useState, useEffect, useCallback, useMemo } from "react";
import { AiProvider, Runner, Skill } from "../../types";
import {
  fetchRunners,
  fetchSkills,
  fetchSkill,
  createOrUpdateSkill,
  deleteSkill,
  broadcastSkill,
} from "../../api/client";
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
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  Sparkles,
  Plus,
  Trash2,
  Eye,
  Radio,
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

export default function MobileSkills() {
  const [runners, setRunners] = useState<Runner[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [viewingSkill, setViewingSkill] = useState<Skill | null>(null);
  const [viewingLoading, setViewingLoading] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<SkillGroup | null>(null);
  const [broadcastingSkill, setBroadcastingSkill] = useState<Skill | null>(null);

  const [formRunnerId, setFormRunnerId] = useState("");
  const [formName, setFormName] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([fetchRunners(), fetchSkills()]);
      setRunners(r);
      setSkills(s);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load skills");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const runnerMap = useMemo(() => new Map(runners.map((r) => [r.id, r])), [runners]);
  const skillGroups = useMemo(() => groupSkills(skills), [skills]);
  const canSubmitSkill = Boolean(formRunnerId && SKILL_NAME_RE.test(formName.trim()));

  const resetForm = () => {
    setFormRunnerId("");
    setFormName("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formName.trim();
    if (!formRunnerId || !SKILL_NAME_RE.test(name)) return;
    try {
      await createOrUpdateSkill({ runnerId: formRunnerId, name });
      setShowCreate(false);
      resetForm();
      loadData();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? (e instanceof Error ? e.message : "Failed to install skill"));
    }
  };

  const handleView = async (skill: Skill) => {
    setViewingLoading(true);
    setViewingSkill(skill);
    try {
      setViewingSkill(await fetchSkill(skill.id));
    } catch {
      /* ignore */
    } finally {
      setViewingLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingGroup) return;
    try {
      await Promise.all(deletingGroup.skills.map((s) => deleteSkill(s.id)));
      setDeletingGroup(null);
      loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete skill");
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastingSkill) return;
    try {
      await broadcastSkill(broadcastingSkill.id);
      setBroadcastingSkill(null);
      loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to broadcast skill");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-6 w-24" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)] backdrop-blur-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold tracking-tight text-foreground">Skills</h1>
            <p className="text-[11px] text-muted-foreground/70">
              {skillGroups.length} skill{skillGroups.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button size="sm" disabled={runners.length === 0} onClick={() => setShowCreate(true)} className="h-8 rounded-full px-3 text-[11px]">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-[12px] text-destructive">
          {error}
        </div>
      )}

      {skillGroups.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <Sparkles className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-[14px] font-medium text-muted-foreground/80">No skills yet</p>
          <p className="mt-1 text-[12px] text-muted-foreground/65">
            {runners.length === 0
              ? "Register a runner to install skills."
              : "Enter a skills.sh skill name to install it for every supported agent."}
          </p>
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {skillGroups.map((group) => (
              <div key={`${group.runner_id}::${group.name}`} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-semibold text-foreground">{group.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {ALL_CLIS.map((cli) => {
                        const meta = CLI_META[cli];
                        const present = group.presentClis.has(cli);
                        return (
                          <span
                            key={cli}
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
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => void handleView(group.primarySkill)} className="h-8 flex-1 rounded-full text-[11px]">
                    <Eye className="mr-1 h-3 w-3" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setBroadcastingSkill(group.primarySkill)} className="h-8 flex-1 rounded-full text-[11px]">
                    <Radio className="mr-1 h-3 w-3" />
                    Broadcast
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeletingGroup(group)} className="h-8 rounded-full px-3 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); resetForm(); } }}>
        <AppDialogContent className="flex h-[calc(100svh-env(safe-area-inset-top)-0.75rem)] max-h-[calc(100svh-env(safe-area-inset-top)-0.75rem)] flex-col gap-0 rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-[520px] sm:rounded-lg">
          <AppDialogHeader>
            <DialogTitle className="sr-only">Add skill</DialogTitle>
            <DialogDescription className="sr-only">Install a skill from skills.sh on a runner.</DialogDescription>
            <AppDialogEyebrow>
              <Sparkles className="h-3 w-3" /> New Skill
            </AppDialogEyebrow>
          </AppDialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
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
                  className="h-auto border-0 bg-transparent px-0 py-0 text-[18px] font-semibold tracking-[-0.02em] text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </AppDialogSection>
              <AppDialogSection>
                <Label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Runner</Label>
                <select
                  value={formRunnerId}
                  onChange={(e) => setFormRunnerId(e.target.value)}
                  required
                  className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-[13px]"
                >
                  <option value="">Select a runner...</option>
                  {runners.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
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
        <AppDialogContent className="sm:max-w-[520px]">
          <AppDialogHeader>
            <DialogTitle className="sr-only">Skill</DialogTitle>
            <DialogDescription className="sr-only">Skill details</DialogDescription>
            <AppDialogEyebrow>
              <Eye className="h-3 w-3" /> Skill
            </AppDialogEyebrow>
          </AppDialogHeader>
          <AppDialogBody>
            {viewingSkill && (
              <AppDialogSection>
                <p className="text-[14px] font-semibold text-foreground">{viewingSkill.name}</p>
                <p className="mt-1 text-[12px] text-muted-foreground/70">
                  {runnerMap.get(viewingSkill.runner_id)?.name ?? "Unknown"} · {CLI_META[viewingSkill.cli]?.label ?? viewingSkill.cli} · {CLI_META[viewingSkill.cli]?.path}
                </p>
                {viewingLoading ? (
                  <div className="mt-4 space-y-2 rounded-lg bg-foreground/[0.04] p-3">
                    {[100, 85, 92, 60, 78].map((w, i) => (
                      <Skeleton key={i} className="h-3 rounded" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                ) : (
                  <pre className="mt-4 max-h-[260px] overflow-auto whitespace-pre-wrap rounded-lg bg-foreground/[0.04] p-3 font-mono text-[11px] text-foreground/85">
                    {viewingSkill.content || "(pending)"}
                  </pre>
                )}
              </AppDialogSection>
            )}
          </AppDialogBody>
        </AppDialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!broadcastingSkill}
        title="Broadcast skill"
        description={`Install "${broadcastingSkill?.name}" on all other runners?`}
        confirmLabel="Install"
        onConfirm={handleBroadcast}
        onCancel={() => setBroadcastingSkill(null)}
      />

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
