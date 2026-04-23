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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Sparkles,
  Plus,
  Trash2,
  Eye,
  Radio,
  Bot,
  ArrowRight,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getToneStyles } from "@/lib/semanticColors";

const SUPPORTED_CLIS: AiProvider[] = [
  "claude-code",
  "codex",
  "cursor-agent",
];

const CLI_LABEL: Record<AiProvider, string> = {
  "claude-code": "Claude Code",
  "codex": "Codex",
  "cursor-agent": "Cursor Agent",
};

const CLI_DIR: Record<AiProvider, string> = {
  "claude-code": "~/.claude/skills/<name>/SKILL.md",
  "codex": "~/.codex/skills/<name>/SKILL.md",
  "cursor-agent": "~/.cursor/skills-cursor/<name>/SKILL.md",
};

function runnerProviders(runner: Runner): AiProvider[] {
  try {
    const parsed = JSON.parse(runner.ai_providers || "[]") as string[];
    return parsed.filter((p): p is AiProvider =>
      (SUPPORTED_CLIS as string[]).includes(p),
    );
  } catch {
    return [];
  }
}

export default function Skills() {
  const neutralTone = getToneStyles("neutral");
  const dangerTone = getToneStyles("danger");

  const [runners, setRunners] = useState<Runner[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [runnerFilter, setRunnerFilter] = useState<string>("all");
  const [cliFilter, setCliFilter] = useState<"all" | AiProvider>("all");

  const [showCreate, setShowCreate] = useState(false);
  const [viewingSkill, setViewingSkill] = useState<Skill | null>(null);
  const [viewingLoading, setViewingLoading] = useState(false);
  const [deletingSkill, setDeletingSkill] = useState<Skill | null>(null);
  const [broadcastingSkill, setBroadcastingSkill] = useState<Skill | null>(null);
  const [broadcastSelected, setBroadcastSelected] = useState<Set<string>>(new Set());
  const [broadcastStatus, setBroadcastStatus] = useState("");

  // Create form state
  const [formRunnerId, setFormRunnerId] = useState<string>("");
  const [formCli, setFormCli] = useState<AiProvider | "">("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formContent, setFormContent] = useState("");
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);

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

  useEffect(() => {
    const iv = setInterval(loadData, 15_000);
    return () => clearInterval(iv);
  }, [loadData]);

  const runnerMap = useMemo(() => new Map(runners.map((r) => [r.id, r])), [runners]);

  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      if (runnerFilter !== "all" && s.runner_id !== runnerFilter) return false;
      if (cliFilter !== "all" && s.cli !== cliFilter) return false;
      return true;
    });
  }, [skills, runnerFilter, cliFilter]);

  const resetForm = () => {
    setFormRunnerId("");
    setFormCli("");
    setFormName("");
    setFormDescription("");
    setFormContent("");
    setEditingSkillId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const openEdit = async (skill: Skill) => {
    try {
      const full = await fetchSkill(skill.id);
      setFormRunnerId(full.runner_id);
      setFormCli(full.cli);
      setFormName(full.name);
      setFormDescription(full.description);
      setFormContent(full.content);
      setEditingSkillId(full.id);
      setShowCreate(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load skill");
    }
  };

  const handleView = async (skill: Skill) => {
    setViewingLoading(true);
    setViewingSkill(skill);
    try {
      const full = await fetchSkill(skill.id);
      setViewingSkill(full);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load skill");
    } finally {
      setViewingLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRunnerId || !formCli || !formName.trim()) return;
    try {
      await createOrUpdateSkill({
        runnerId: formRunnerId,
        cli: formCli,
        name: formName.trim(),
        description: formDescription.trim(),
        content: formContent,
      });
      setShowCreate(false);
      resetForm();
      loadData();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? (e instanceof Error ? e.message : "Failed to save skill"));
    }
  };

  const handleDelete = async () => {
    if (!deletingSkill) return;
    try {
      await deleteSkill(deletingSkill.id);
      setDeletingSkill(null);
      loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete skill");
    }
  };

  const broadcastCandidates = useMemo(() => {
    if (!broadcastingSkill) return [] as Runner[];
    return runners.filter(
      (r) =>
        r.id !== broadcastingSkill.runner_id &&
        runnerProviders(r).includes(broadcastingSkill.cli),
    );
  }, [broadcastingSkill, runners]);

  const openBroadcast = (skill: Skill) => {
    setBroadcastingSkill(skill);
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
      loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to broadcast skill");
    }
  };

  const formRunnerProviders = useMemo(() => {
    const runner = runnerMap.get(formRunnerId);
    return runner ? runnerProviders(runner) : [];
  }, [formRunnerId, runnerMap]);

  if (loading) {
    return (
      <div className="p-6 space-y-5 motion-section" style={{ "--motion-delay": "80ms" } as React.CSSProperties}>
        <Skeleton className="h-6 w-24" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div
        className="motion-section mb-6 flex flex-wrap items-center justify-between gap-3"
        style={{ "--motion-delay": "80ms" } as React.CSSProperties}
      >
        <div>
          <PageTitle icon={Sparkles} title="Skills" />
          <p className="mt-1.5 text-[12px] text-muted-foreground/85">
            Manage SKILL.md bundles installed for each CLI on each runner and broadcast them across your fleet.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className={cn("inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1", neutralTone.pill)}>
              {skills.length} skill{skills.length === 1 ? "" : "s"}
            </span>
            <span className={cn("inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1", neutralTone.pill)}>
              {runners.length} runner{runners.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          onClick={openCreate}
          disabled={runners.length === 0}
          className="h-8 text-[13px] shadow-soft"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Skill
        </Button>
      </div>

      {error && (
        <div className={cn("mb-4 rounded-md px-3 py-2 text-[13px] ring-1", dangerTone.panel, dangerTone.text)}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div
        className="motion-section mb-5 flex flex-wrap items-center gap-2"
        style={{ "--motion-delay": "140ms" } as React.CSSProperties}
      >
        <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card p-1 shadow-soft">
          <button
            type="button"
            onClick={() => setCliFilter("all")}
            className={cn(
              "interactive-lift rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
              cliFilter === "all"
                ? "bg-primary/10 text-primary shadow-soft"
                : "text-muted-foreground/75 hover:text-foreground",
            )}
          >
            All CLIs
          </button>
          {SUPPORTED_CLIS.map((cli) => (
            <button
              key={cli}
              type="button"
              onClick={() => setCliFilter(cli)}
              className={cn(
                "interactive-lift rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                cliFilter === cli
                  ? "bg-primary/10 text-primary shadow-soft"
                  : "text-muted-foreground/75 hover:text-foreground",
              )}
            >
              {CLI_LABEL[cli]}
            </button>
          ))}
        </div>

        <select
          value={runnerFilter}
          onChange={(e) => setRunnerFilter(e.target.value)}
          className="h-8 rounded-full border border-border/60 bg-card px-3 text-[12px] font-medium shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All runners</option>
          {runners.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Skill list */}
      <div
        className="motion-section"
        style={{ "--motion-delay": "200ms" } as React.CSSProperties}
      >
        {filteredSkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Sparkles className="h-10 w-10 text-foreground/10 mb-4" />
            <p className="text-[14px] font-medium text-muted-foreground/80">No skills yet</p>
            <p className="mt-1 mb-5 text-[12px] text-muted-foreground/70">
              {runners.length === 0
                ? "Register a runner first to install skills on its CLIs."
                : "Add a SKILL.md to any CLI on any runner to get started."}
            </p>
            {runners.length > 0 && (
              <Button onClick={openCreate} size="sm" className="h-8 text-[13px]">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Skill
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSkills.map((skill, index) => {
              const runner = runnerMap.get(skill.runner_id);
              return (
                <div
                  key={skill.id}
                  className="motion-card flex flex-col rounded-lg border border-border/80 bg-card p-4 shadow-soft"
                  style={{ "--motion-delay": `${index * 35 + 80}ms` } as React.CSSProperties}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-[14px] font-semibold text-foreground">{skill.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground/85">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 py-0.5 font-medium text-primary ring-1 ring-primary/15">
                          {CLI_LABEL[skill.cli]}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.04] px-2 py-0.5 font-medium text-foreground/80">
                          <Bot className="h-3 w-3" />
                          {runner?.name ?? "Unknown runner"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="mb-3 line-clamp-2 text-[12px] text-muted-foreground/85">
                    {skill.description || <span className="italic text-muted-foreground/60">No description</span>}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleView(skill)}
                      className="h-7 rounded-full px-2.5 text-[11px]"
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void openEdit(skill)}
                      className="h-7 rounded-full px-2.5 text-[11px]"
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openBroadcast(skill)}
                      className="h-7 rounded-full px-2.5 text-[11px]"
                    >
                      <Radio className="mr-1 h-3 w-3" />
                      Broadcast
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingSkill(skill)}
                      className="h-7 rounded-full px-2.5 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreate(false);
            resetForm();
          }
        }}
      >
        <AppDialogContent className="flex h-[calc(100svh-env(safe-area-inset-top)-0.75rem)] max-h-[calc(100svh-env(safe-area-inset-top)-0.75rem)] flex-col gap-0 rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-[640px] sm:rounded-lg">
          <AppDialogHeader>
            <DialogTitle className="sr-only">{editingSkillId ? "Edit skill" : "Create a skill"}</DialogTitle>
            <DialogDescription className="sr-only">
              Install a SKILL.md on a specific CLI of a specific runner.
            </DialogDescription>
            <AppDialogEyebrow>
              <Sparkles className="h-3 w-3" />
              {editingSkillId ? "Edit Skill" : "New Skill"}
            </AppDialogEyebrow>
            <h2 className="hidden text-[18px] font-semibold tracking-[-0.025em] text-foreground sm:block">
              {editingSkillId ? "Edit skill" : "Install a skill"}
            </h2>
          </AppDialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <ScrollArea className="min-h-0 flex-1">
              <AppDialogBody>
                <AppDialogSection tone="primary">
                  <Label className={cn("mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em]", APP_DIALOG_TONE_STYLES.primary.label)}>
                    Skill name
                  </Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="my-skill"
                    autoFocus
                    required
                    disabled={!!editingSkillId}
                    pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,63}"
                    className="h-auto border-0 bg-transparent px-0 py-0 text-[18px] font-semibold tracking-[-0.02em] text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground/70">
                    Used as the folder name. Letters, digits, hyphen or underscore.
                  </p>
                </AppDialogSection>

                <AppDialogSection>
                  <Label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">
                    Runner
                  </Label>
                  <select
                    value={formRunnerId}
                    onChange={(e) => {
                      setFormRunnerId(e.target.value);
                      setFormCli("");
                    }}
                    required
                    disabled={!!editingSkillId}
                    className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                  >
                    <option value="">Select a runner…</option>
                    {runners.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.status === "offline" ? " (offline)" : ""}
                      </option>
                    ))}
                  </select>
                </AppDialogSection>

                <AppDialogSection>
                  <Label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">
                    CLI
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {SUPPORTED_CLIS.map((cli) => {
                      const available = !formRunnerId || formRunnerProviders.includes(cli);
                      const active = formCli === cli;
                      return (
                        <button
                          key={cli}
                          type="button"
                          onClick={() => setFormCli(cli)}
                          disabled={!!editingSkillId || !available}
                          className={cn(
                            "interactive-lift rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                            active
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border/60 bg-card text-muted-foreground/80 hover:text-foreground",
                            (!available || editingSkillId) && "opacity-45 cursor-not-allowed",
                          )}
                        >
                          {CLI_LABEL[cli]}
                        </button>
                      );
                    })}
                  </div>
                  {formCli && (
                    <p className="mt-2 text-[11px] text-muted-foreground/70">
                      Written to <code className="rounded bg-foreground/[0.04] px-1 py-0.5 font-mono text-foreground/85">{CLI_DIR[formCli]}</code>
                    </p>
                  )}
                </AppDialogSection>

                <AppDialogSection>
                  <Label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">
                    Description
                  </Label>
                  <Input
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="When the agent should use this skill."
                    className="h-9"
                  />
                </AppDialogSection>

                <AppDialogSection>
                  <Label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">
                    SKILL.md content
                  </Label>
                  <Textarea
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="# My Skill&#10;&#10;Instructions, examples, references…"
                    className="min-h-[220px] font-mono text-[12px]"
                  />
                </AppDialogSection>
              </AppDialogBody>
            </ScrollArea>
            <AppDialogFooter>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowCreate(false);
                    resetForm();
                  }}
                  className="rounded-full px-3.5 text-[11px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!formRunnerId || !formCli || !formName.trim()}
                  className="rounded-full px-4 text-[11px]"
                >
                  {editingSkillId ? "Save changes" : "Install skill"}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </AppDialogFooter>
          </form>
        </AppDialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog
        open={!!viewingSkill}
        onOpenChange={(open) => {
          if (!open) setViewingSkill(null);
        }}
      >
        <AppDialogContent className="flex h-[calc(100svh-env(safe-area-inset-top)-0.75rem)] max-h-[calc(100svh-env(safe-area-inset-top)-0.75rem)] flex-col gap-0 rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-[720px] sm:rounded-lg">
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
                <p className="mt-1 text-[12px] text-muted-foreground/80">
                  {CLI_LABEL[viewingSkill.cli]} · {runnerMap.get(viewingSkill.runner_id)?.name ?? "Unknown runner"}
                </p>
              </div>
            )}
          </AppDialogHeader>
          <ScrollArea className="min-h-0 flex-1">
            <AppDialogBody>
              {viewingLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : viewingSkill ? (
                <>
                  <AppDialogSection>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Description</p>
                    <p className="text-[13px] text-foreground/90">
                      {viewingSkill.description || <span className="italic text-muted-foreground/60">No description</span>}
                    </p>
                  </AppDialogSection>
                  <AppDialogSection>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">SKILL.md</p>
                    <pre className="terminal-surface overflow-x-auto whitespace-pre-wrap rounded-[14px] px-4 py-3 font-mono text-[12px] leading-relaxed">
                      {viewingSkill.content || <span className="italic text-muted-foreground/60">(empty)</span>}
                    </pre>
                  </AppDialogSection>
                </>
              ) : null}
            </AppDialogBody>
          </ScrollArea>
        </AppDialogContent>
      </Dialog>

      {/* Broadcast dialog */}
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
            <DialogDescription className="sr-only">
              Sync this skill to other runners that have the same CLI installed.
            </DialogDescription>
            <AppDialogEyebrow>
              <Radio className="h-3 w-3" />
              Broadcast
            </AppDialogEyebrow>
            {broadcastingSkill && (
              <h2 className="hidden text-[18px] font-semibold tracking-[-0.025em] text-foreground sm:block">
                Sync “{broadcastingSkill.name}”
              </h2>
            )}
          </AppDialogHeader>
          <AppDialogBody>
            <AppDialogSection>
              <p className="mb-3 text-[12px] text-muted-foreground/85">
                Select runners that should receive this skill. Only runners with{" "}
                <span className="font-medium text-foreground/90">
                  {broadcastingSkill ? CLI_LABEL[broadcastingSkill.cli] : ""}
                </span>{" "}
                installed are listed. Leave empty to broadcast to all of them.
              </p>
              {broadcastCandidates.length === 0 ? (
                <p className="rounded-md bg-foreground/[0.04] px-3 py-2 text-[12px] text-muted-foreground/85">
                  No other runners have this CLI installed.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {broadcastCandidates.map((r) => {
                    const selected = broadcastSelected.has(r.id);
                    return (
                      <label
                        key={r.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-[13px] transition-colors",
                          selected
                            ? "border-primary/40 bg-primary/5 text-foreground"
                            : "border-border/60 bg-card text-foreground/85 hover:border-border",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleBroadcastRunner(r.id)}
                          className="h-3.5 w-3.5"
                        />
                        <Bot className="h-3.5 w-3.5 text-muted-foreground/70" />
                        <span className="flex-1 truncate">{r.name}</span>
                        <span className="text-[11px] text-muted-foreground/70">{r.status}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              {broadcastStatus && (
                <p className="mt-3 text-[12px] font-medium text-primary">{broadcastStatus}</p>
              )}
            </AppDialogSection>
          </AppDialogBody>
          <AppDialogFooter>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setBroadcastingSkill(null);
                  setBroadcastSelected(new Set());
                  setBroadcastStatus("");
                }}
                className="rounded-full px-3.5 text-[11px]"
              >
                Close
              </Button>
              <Button
                type="button"
                disabled={broadcastCandidates.length === 0}
                onClick={() => void handleBroadcast()}
                className="rounded-full px-4 text-[11px]"
              >
                <Radio className="mr-1.5 h-3 w-3" />
                {broadcastSelected.size > 0
                  ? `Broadcast to ${broadcastSelected.size}`
                  : "Broadcast to all"}
              </Button>
            </div>
          </AppDialogFooter>
        </AppDialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingSkill}
        title="Remove skill"
        description={`Remove “${deletingSkill?.name}” from ${runnerMap.get(deletingSkill?.runner_id ?? "")?.name ?? "this runner"}? The SKILL.md folder will be deleted on the runner.`}
        confirmLabel="Remove skill"
        onConfirm={handleDelete}
        onCancel={() => setDeletingSkill(null)}
      />
    </div>
  );
}
