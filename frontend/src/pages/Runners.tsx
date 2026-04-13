import { useState, useEffect, useCallback } from "react";
import { Runner, Task } from "../types";
import {
  fetchRunners,
  fetchTasks,
  deleteRunner,
  refreshRunnerProviders,
  fetchRunnerSecret,
  updateSettings,
} from "../api/client";
import RunnerCard from "../components/runners/RunnerCard";
import PageTitle from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Bot,
  Plus,
  Terminal,
  Shield,
  CheckCircle2,
  Copy,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getToneStyles } from "@/lib/semanticColors";

export default function Runners() {
  const neutralTone = getToneStyles("neutral");
  const successTone = getToneStyles("success");
  const warningTone = getToneStyles("warning");
  const dangerTone = getToneStyles("danger");

  const [runners, setRunners] = useState<Runner[]>([]);
  const [busyTasks, setBusyTasks] = useState<Map<string, Task>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [refreshingRunnerId, setRefreshingRunnerId] = useState<string | null>(
    null,
  );
  const [registrationSecret, setRegistrationSecret] = useState("");
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [savedSecurity, setSavedSecurity] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedInstallCommand, setCopiedInstallCommand] = useState(false);
  const [copiedRegisterCommand, setCopiedRegisterCommand] = useState(false);
  const [tab, setTab] = useState<"runners" | "security">("runners");

  const loadData = useCallback(async () => {
    try {
      const [r, t, runnerSecurity] = await Promise.all([
        fetchRunners(),
        fetchTasks({ status: "in_progress" }),
        fetchRunnerSecret(),
      ]);
      setRunners(r);
      const taskMap = new Map<string, Task>();
      for (const task of t) {
        if (task.runner_id) taskMap.set(task.runner_id, task);
      }
      setBusyTasks(taskMap);
      setRegistrationSecret(runnerSecurity.registrationSecret);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load runners");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);
  useEffect(() => {
    const iv = setInterval(loadData, 10_000);
    return () => clearInterval(iv);
  }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this runner?")) return;
    try {
      await deleteRunner(id);
      loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove runner");
    }
  };

  const handleRefresh = async (id: string) => {
    try {
      setRefreshingRunnerId(id);
      await refreshRunnerProviders(id);
      await loadData();
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to refresh runner CLIs",
      );
    } finally {
      setRefreshingRunnerId(null);
    }
  };

  const handleSaveSecurity = async () => {
    const nextSecret = registrationSecret.trim();
    if (!nextSecret) {
      setError("Registration secret cannot be empty.");
      return;
    }
    setSavingSecurity(true);
    try {
      await updateSettings({ runner: { registrationSecret: nextSecret } });
      setRegistrationSecret(nextSecret);
      setSavedSecurity(true);
      setTimeout(() => setSavedSecurity(false), 3000);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to save runner security",
      );
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
      setError(
        e instanceof Error ? e.message : "Failed to copy registration secret",
      );
    }
  };

  const handleCopyRunnerCommand = async (
    value: string,
    kind: "install" | "register",
  ) => {
    try {
      await navigator.clipboard.writeText(value);
      if (kind === "install") {
        setCopiedInstallCommand(true);
        setTimeout(() => setCopiedInstallCommand(false), 2000);
      } else {
        setCopiedRegisterCommand(true);
        setTimeout(() => setCopiedRegisterCommand(false), 2000);
      }
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to copy runner command",
      );
    }
  };

  const onlineCount = runners.filter(
    (r) => r.status === "online" || r.status === "busy",
  ).length;
  const offlineCount = runners.filter((r) => r.status === "offline").length;
  const installCommand = "npm install -g @frankleeeee/flowy-runner";
  const commandSecret = registrationSecret.trim() || "<registration-secret>";
  const runnerCommand = `flowy-runner \\
  --name "my-device" \\
  --url http://YOUR_HOST:PORT \\
  --secret ${commandSecret}`;

  if (loading) {
    return (
      <div
        className="p-6 space-y-5 motion-section"
        style={{ "--motion-delay": "80ms" } as React.CSSProperties}
      >
        <Skeleton className="h-6 w-24" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div
        className="motion-section mb-6 flex flex-wrap items-center justify-between gap-3"
        style={{ "--motion-delay": "80ms" } as React.CSSProperties}
      >
        <div>
          <PageTitle icon={Bot} title="Runners" />
          <p className="mt-1.5 text-[12px] text-muted-foreground/85">
            {tab === "runners"
              ? "Monitor runner availability and active work across your fleet"
              : "Manage runner registration security"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1",
                successTone.pill,
              )}
            >
              {onlineCount} online
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1",
                neutralTone.pill,
              )}
            >
              {offlineCount} offline
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1",
                warningTone.pill,
              )}
            >
              {busyTasks.size} executing now
            </span>
          </div>
        </div>
        {tab === "runners" && (
          <Button
            size="sm"
            onClick={() => setShowSetup(true)}
            className="h-8 text-[13px] shadow-soft"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Runner
          </Button>
        )}
      </div>

      {error && (
        <div
          className={cn(
            "mb-4 rounded-md px-3 py-2 text-[13px] ring-1",
            dangerTone.panel,
            dangerTone.text,
          )}
        >
          {error}
        </div>
      )}

      <div
        className="motion-section inline-flex items-center gap-1 mb-6 rounded-full border border-border/60 bg-card p-1 shadow-soft"
        style={{ "--motion-delay": "140ms" } as React.CSSProperties}
      >
        <button
          type="button"
          onClick={() => setTab("runners")}
          aria-pressed={tab === "runners"}
          className={cn(
            "interactive-lift flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors duration-150",
            tab === "runners"
              ? "bg-primary/10 text-primary shadow-soft"
              : "text-muted-foreground/75 hover:text-foreground",
          )}
        >
          <Bot className="h-3.5 w-3.5" />
          Runners
        </button>
        <button
          type="button"
          onClick={() => setTab("security")}
          aria-pressed={tab === "security"}
          className={cn(
            "interactive-lift flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors duration-150",
            tab === "security"
              ? "bg-primary/10 text-primary shadow-soft"
              : "text-muted-foreground/75 hover:text-foreground",
          )}
        >
          <Shield className="h-3.5 w-3.5" />
          Security
        </button>
      </div>

      <div
        key={tab}
        className="motion-section motion-switch"
        style={{ "--motion-delay": "200ms" } as React.CSSProperties}
      >
        {tab === "security" ? (
          <div className="max-w-2xl">
            <div className="mb-6">
              <h1 className="text-[15px] font-semibold text-foreground">
                Security
              </h1>
              <p className="mt-0.5 text-[12px] text-muted-foreground/85">
                Manage runner registration access and shared secrets
              </p>
            </div>

            <div
              className="motion-card rounded-lg border border-border/80 bg-card shadow-soft overflow-hidden"
              style={{ "--motion-delay": "80ms" } as React.CSSProperties}
            >
              <div className="h-0.5 bg-foreground/10" />
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-4 w-4 text-muted-foreground/65" />
                  <h2 className="font-semibold text-[13px] text-foreground">
                    Runner Security
                  </h2>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">
                    Registration Secret
                  </Label>
                  <div className="flex flex-wrap items-center gap-2 max-w-xl">
                    <Input
                      type="password"
                      value={registrationSecret}
                      onChange={(e) => setRegistrationSecret(e.target.value)}
                      placeholder="Enter a secret..."
                      className="h-9 max-w-md flex-1 min-w-[220px]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleCopySecret()}
                      disabled={!registrationSecret}
                      className="h-9 text-[12px]"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      {copiedSecret ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground/75">
                    Generated automatically on first start. Every new runner
                    must provide this secret when it registers.
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <Button
                    onClick={() => void handleSaveSecurity()}
                    disabled={savingSecurity || !registrationSecret.trim()}
                    className="h-8 text-[13px]"
                  >
                    {savingSecurity ? "Saving..." : "Save configurations"}
                  </Button>
                  {savedSecurity && (
                    <span
                      className={cn(
                        "flex items-center gap-1 text-[11px] font-medium",
                        successTone.emphasis,
                      )}
                    >
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
                <p className="text-[14px] font-medium text-muted-foreground/80">
                  No runners registered
                </p>
                <p className="mt-1 mb-5 text-[12px] text-muted-foreground/70">
                  Add a runner to start executing tasks
                </p>
                <Button
                  onClick={() => setShowSetup(true)}
                  size="sm"
                  className="h-8 text-[13px]"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Runner
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {runners.map((runner, index) => (
                  <div
                    key={runner.id}
                    style={
                      {
                        "--motion-delay": `${index * 45 + 80}ms`,
                      } as React.CSSProperties
                    }
                  >
                    <RunnerCard
                      runner={runner}
                      currentTask={busyTasks.get(runner.id)}
                      onDelete={handleDelete}
                      onRefresh={handleRefresh}
                      refreshing={refreshingRunnerId === runner.id}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Dialog
        open={showSetup}
        onOpenChange={(open) => {
          if (!open) setShowSetup(false);
        }}
      >
        <AppDialogContent className="sm:max-w-2xl">
          <AppDialogHeader>
            <DialogTitle className="sr-only">Add a runner</DialogTitle>
            <DialogDescription className="sr-only">
              Get the command needed to register a runner on another machine.
            </DialogDescription>
            <AppDialogEyebrow>
              <Sparkles className="h-3 w-3" />
              New Runner
            </AppDialogEyebrow>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[18px] font-semibold tracking-[-0.025em] text-foreground">
                  Connect another machine
                </h2>
              </div>
            </div>
          </AppDialogHeader>
          <div className="flex flex-col">
            <AppDialogBody>
              <AppDialogSection tone="primary">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-[0.14em]",
                      APP_DIALOG_TONE_STYLES.primary.label,
                    )}
                  >
                    Step 1
                  </p>
                  <span
                    className={cn(
                      "text-[10px]",
                      APP_DIALOG_TONE_STYLES.primary.label,
                    )}
                  >
                    Install package
                  </span>
                </div>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <p className="text-[12px] leading-5 text-muted-foreground/85">
                    Install the runner globally on the target machine.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void handleCopyRunnerCommand(installCommand, "install")
                    }
                    className="h-7 rounded-full px-3 text-[11px] shadow-none"
                  >
                    <Copy className="mr-1.5 h-3 w-3" />
                    {copiedInstallCommand ? "Copied" : "Copy"}
                  </Button>
                </div>
                <pre className="terminal-surface overflow-x-auto rounded-[14px] px-4 py-3 font-mono text-[12px] leading-relaxed">
                  {installCommand}
                </pre>
              </AppDialogSection>

              <AppDialogSection tone="primary">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-[0.14em]",
                      APP_DIALOG_TONE_STYLES.primary.label,
                    )}
                  >
                    Step 2
                  </p>
                  <span
                    className={cn(
                      "text-[10px]",
                      APP_DIALOG_TONE_STYLES.primary.label,
                    )}
                  >
                    Register runner
                  </span>
                </div>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <p className="text-[12px] leading-5 text-muted-foreground/85">
                    Run this after{" "}
                    <code className="rounded bg-card px-1 py-0.5 font-mono text-foreground/90">
                      flowy-runner
                    </code>{" "}
                    is installed.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void handleCopyRunnerCommand(runnerCommand, "register")
                    }
                    className="h-7 rounded-full px-3 text-[11px] shadow-none"
                  >
                    <Copy className="mr-1.5 h-3 w-3" />
                    {copiedRegisterCommand ? "Copied" : "Copy"}
                  </Button>
                </div>
                <pre className="terminal-surface overflow-x-auto rounded-[14px] px-4 py-3 font-mono text-[12px] leading-relaxed">
                  {runnerCommand}
                </pre>
              </AppDialogSection>

              <AppDialogSection>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">
                    Runner Notes
                  </p>
                  <Terminal className="h-3.5 w-3.5 text-muted-foreground/65" />
                </div>
                <div className="grid gap-3 text-[11px] leading-5 text-muted-foreground/85">
                  <p>
                    <code className="rounded bg-foreground/[0.04] px-1 py-0.5 font-mono text-foreground/80">
                      --name
                    </code>{" "}
                    Unique name for this machine, like{" "}
                    <span className="font-mono text-foreground/85">
                      office-mac
                    </span>
                  </p>
                  <p>
                    <code className="rounded bg-foreground/[0.04] px-1 py-0.5 font-mono text-foreground/80">
                      --url
                    </code>{" "}
                    URL the runner can use to reach this hub backend
                  </p>
                  <p>
                    <code className="rounded bg-foreground/[0.04] px-1 py-0.5 font-mono text-foreground/80">
                      --secret
                    </code>{" "}
                    Required when registering a new runner and included from
                    this hub&apos;s current security settings
                  </p>
                  <p>
                    The runner auto-detects installed CLIs on launch:{" "}
                    <span className="font-mono text-foreground/85">
                      claude, codex, cursor-agent
                    </span>
                  </p>
                </div>
              </AppDialogSection>

              <AppDialogSection className="bg-foreground/[0.02] text-[11px] text-muted-foreground/80">
                <p>
                  The runner saves its token to{" "}
                  <code className="bg-foreground/[0.04] rounded px-1 py-0.5 text-foreground/80 font-mono">
                    ~/.config/flowy/runner-&lt;name&gt;.json
                  </code>{" "}
                  and reuses it on the next launch.
                </p>
              </AppDialogSection>
            </AppDialogBody>
            <AppDialogFooter className="sm:justify-end">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowSetup(false)}
                  className="rounded-full px-3.5 text-[11px] text-muted-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground"
                >
                  Close
                </Button>
              </div>
            </AppDialogFooter>
          </div>
        </AppDialogContent>
      </Dialog>
    </div>
  );
}
