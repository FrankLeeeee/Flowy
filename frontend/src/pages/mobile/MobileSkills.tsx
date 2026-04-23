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
import ConfirmDialog from "@/components/ConfirmDialog";
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
  "gemini-cli": "Gemini CLI",
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

export default function MobileSkills() {
  const neutralTone = getToneStyles("neutral");

  const [runners, setRunners] = useState<Runner[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [viewingSkill, setViewingSkill] = useState<Skill | null>(null);
  const [deletingSkill, setDeletingSkill] = useState<Skill | null>(null);
  const [broadcastingSkill, setBroadcastingSkill] = useState<Skill | null>(null);

  const [formRunnerId, setFormRunnerId] = useState("");
  const [formCli, setFormCli] = useState<AiProvider | "">("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formContent, setFormContent] = useState("");

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
  const formRunnerProviders = useMemo(() => {
    const runner = runnerMap.get(formRunnerId);
    return runner ? runnerProviders(runner) : [];
  }, [formRunnerId, runnerMap]);

  const resetForm = () => {
    setFormRunnerId("");
    setFormCli("");
    setFormName("");
    setFormDescription("");
    setFormContent("");
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

  const handleView = async (skill: Skill) => {
    setViewingSkill(skill);
    try {
      const full = await fetchSkill(skill.id);
      setViewingSkill(full);
    } catch {
      /* ignore */
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
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-24" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-lg px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold tracking-tight text-foreground">Skills</h1>
            <span className={cn("mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", neutralTone.pill)}>
              {skills.length} skill{skills.length === 1 ? "" : "s"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            disabled={runners.length === 0}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft active:opacity-90 disabled:opacity-40"
          >
            <Plus className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-xl px-3 py-2 text-[13px] text-destructive bg-destructive/10 ring-1 ring-destructive/15">
          {error}
        </div>
      )}

      {skills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <Sparkles className="h-10 w-10 text-foreground/10 mb-4" />
          <p className="text-[14px] font-medium text-muted-foreground/80">No skills yet</p>
          <p className="mt-1 mb-5 text-[12px] text-muted-foreground/70">
            {runners.length === 0
              ? "Register a runner to install skills."
              : "Install a SKILL.md on a CLI to get started."}
          </p>
          {runners.length > 0 && (
            <Button onClick={() => setShowCreate(true)} size="sm" className="h-9 rounded-xl text-[13px]">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Skill
            </Button>
          )}
        </div>
      ) : (
        <div>
          {skills.map((skill) => {
            const runner = runnerMap.get(skill.runner_id);
            return (
              <div key={skill.id} className="border-b border-border/40 bg-card px-4 py-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-foreground">{skill.name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground/85">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-1.5 py-0.5 font-medium text-primary ring-1 ring-primary/15">
                        {CLI_LABEL[skill.cli]}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.04] px-1.5 py-0.5 font-medium text-foreground/80">
                        <Bot className="h-2.5 w-2.5" />
                        {runner?.name ?? "Unknown"}
                      </span>
                    </div>
                    {skill.description && (
                      <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground/85">{skill.description}</p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => void handleView(skill)}
                    className="flex items-center gap-1 rounded-full bg-foreground/[0.05] px-2.5 py-1 text-[11px] font-medium text-foreground/85 active:opacity-80"
                  >
                    <Eye className="h-3 w-3" /> View
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastingSkill(skill)}
                    className="flex items-center gap-1 rounded-full bg-foreground/[0.05] px-2.5 py-1 text-[11px] font-medium text-foreground/85 active:opacity-80"
                  >
                    <Radio className="h-3 w-3" /> Broadcast
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingSkill(skill)}
                    className="flex items-center gap-1 rounded-full bg-destructive/8 px-2.5 py-1 text-[11px] font-medium text-destructive active:opacity-80"
                  >
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreate(false);
            resetForm();
          }
        }}
      >
        <AppDialogContent className="flex h-[calc(100svh-env(safe-area-inset-top)-0.75rem)] max-h-[calc(100svh-env(safe-area-inset-top)-0.75rem)] flex-col gap-0 rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-[520px] sm:rounded-lg">
          <AppDialogHeader>
            <DialogTitle className="sr-only">New skill</DialogTitle>
            <DialogDescription className="sr-only">Install a skill on a runner CLI.</DialogDescription>
            <AppDialogEyebrow>
              <Sparkles className="h-3 w-3" /> New Skill
            </AppDialogEyebrow>
          </AppDialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <ScrollArea className="min-h-0 flex-1">
              <AppDialogBody>
                <AppDialogSection tone="primary">
                  <Label className={cn("mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em]", APP_DIALOG_TONE_STYLES.primary.label)}>
                    Name
                  </Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="my-skill"
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
                    onChange={(e) => { setFormRunnerId(e.target.value); setFormCli(""); }}
                    required
                    className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-[13px]"
                  >
                    <option value="">Select a runner…</option>
                    {runners.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </AppDialogSection>
                <AppDialogSection>
                  <Label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">CLI</Label>
                  <div className="flex flex-wrap gap-2">
                    {SUPPORTED_CLIS.map((cli) => {
                      const available = !formRunnerId || formRunnerProviders.includes(cli);
                      const active = formCli === cli;
                      return (
                        <button
                          key={cli}
                          type="button"
                          onClick={() => setFormCli(cli)}
                          disabled={!available}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-[12px] font-medium",
                            active
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border/60 bg-card text-muted-foreground/80",
                            !available && "opacity-45",
                          )}
                        >
                          {CLI_LABEL[cli]}
                        </button>
                      );
                    })}
                  </div>
                </AppDialogSection>
                <AppDialogSection>
                  <Label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Description</Label>
                  <Input
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="When the agent should use this skill."
                    className="h-9"
                  />
                </AppDialogSection>
                <AppDialogSection>
                  <Label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">SKILL.md content</Label>
                  <Textarea
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="# My Skill"
                    className="min-h-[180px] font-mono text-[12px]"
                  />
                </AppDialogSection>
              </AppDialogBody>
            </ScrollArea>
            <AppDialogFooter>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => { setShowCreate(false); resetForm(); }} className="rounded-full px-3.5 text-[11px]">
                  Cancel
                </Button>
                <Button type="submit" disabled={!formRunnerId || !formCli || !formName.trim()} className="rounded-full px-4 text-[11px]">
                  Install
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
        onOpenChange={(open) => { if (!open) setViewingSkill(null); }}
      >
        <AppDialogContent className="flex h-[calc(100svh-env(safe-area-inset-top)-0.75rem)] max-h-[calc(100svh-env(safe-area-inset-top)-0.75rem)] flex-col gap-0 rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-[520px] sm:rounded-lg">
          <AppDialogHeader>
            <DialogTitle className="sr-only">Skill</DialogTitle>
            <DialogDescription className="sr-only">Skill details</DialogDescription>
            <AppDialogEyebrow>
              <Eye className="h-3 w-3" /> Skill
            </AppDialogEyebrow>
          </AppDialogHeader>
          <ScrollArea className="min-h-0 flex-1">
            <AppDialogBody>
              {viewingSkill && (
                <>
                  <AppDialogSection>
                    <p className="text-[14px] font-semibold text-foreground">{viewingSkill.name}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/85">
                      {CLI_LABEL[viewingSkill.cli]} · {runnerMap.get(viewingSkill.runner_id)?.name ?? "Unknown"}
                    </p>
                    {viewingSkill.description && (
                      <p className="mt-3 text-[13px] text-foreground/85">{viewingSkill.description}</p>
                    )}
                  </AppDialogSection>
                  <AppDialogSection>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">SKILL.md</p>
                    <pre className="terminal-surface overflow-x-auto whitespace-pre-wrap rounded-[14px] px-4 py-3 font-mono text-[11px] leading-relaxed">
                      {viewingSkill.content || "(empty)"}
                    </pre>
                  </AppDialogSection>
                </>
              )}
            </AppDialogBody>
          </ScrollArea>
        </AppDialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!broadcastingSkill}
        title="Broadcast skill"
        description={`Sync “${broadcastingSkill?.name}” to all other runners that have ${broadcastingSkill ? CLI_LABEL[broadcastingSkill.cli] : ""} installed?`}
        confirmLabel="Broadcast"
        onConfirm={handleBroadcast}
        onCancel={() => setBroadcastingSkill(null)}
      />

      <ConfirmDialog
        open={!!deletingSkill}
        title="Remove skill"
        description={`Remove “${deletingSkill?.name}” from ${runnerMap.get(deletingSkill?.runner_id ?? "")?.name ?? "this runner"}? The SKILL.md folder will be deleted on the runner.`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setDeletingSkill(null)}
      />
    </div>
  );
}
