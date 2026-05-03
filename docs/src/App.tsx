import { useState, type ReactNode } from 'react';
import latestFlowyIcon from '../../frontend/public/icon-512-maskable.png';

const painPoints = [
  {
    title: 'Too many CLIs',
    copy: 'Every provider has a different launch shape and config surface.',
  },
  {
    title: 'Too many machines',
    copy: 'Local laptops, minis, and GPU boxes are hard to coordinate by hand.',
  },
  {
    title: 'No central task history',
    copy: 'Logs and outcomes fragment across chat tabs and terminal windows.',
  },
];

const flowSteps = ['Create task', 'Choose runner', 'Select provider', 'Watch output'];
const installCommand = 'npm install -g @frankleeeee/flowy @frankleeeee/flowy-runner && flowy';

const incomingTasks = ['Fix flaky test', 'Draft changelog', 'Refactor parser'];
const runnerMachines = ['office-mac', 'mac-mini', 'gpu-linux'];
const harnesses = ['Claude Code', 'Codex', 'Cursor Agent', 'Gemini-CLI', 'Kimi-CLI', 'OpenCode'];

function Section({
  id,
  title,
  subtitle,
  showHeader = true,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  showHeader?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mx-auto w-full max-w-6xl px-6 py-14 md:px-10 md:py-20">
      {showHeader ? (
        <div className="max-w-3xl">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            {title}
          </h2>
          {subtitle ? <p className="mt-4 text-lg text-mist">{subtitle}</p> : null}
        </div>
      ) : null}
      <div className="mt-10">{children}</div>
    </section>
  );
}

function AnimatedFlowFigure({ iconSrc }: { iconSrc: string }) {
  const viewBoxWidth = 1000;
  const viewBoxHeight = 420;
  const hubCenterX = 500;
  const hubCenterY = 210;
  const hubWidth = 190;
  const hubLeftX = hubCenterX - hubWidth / 2;
  const hubRightX = hubCenterX + hubWidth / 2;
  const hubTopPercent = `${(hubCenterY / viewBoxHeight) * 100}%`;
  const hubLeftPercent = `${(hubLeftX / viewBoxWidth) * 100}%`;
  const hubWidthPercent = `${(hubWidth / viewBoxWidth) * 100}%`;

  const taskNodes = [
    { label: 'Fix flaky test', x: '6%', y: '14%' },
    { label: 'Draft changelog', x: '4%', y: '43%' },
    { label: 'Refactor parser', x: '9%', y: '72%' },
  ];
  const runnerNodes = [
    { label: 'office-mac', x: '78%', y: '18%' },
    { label: 'mac-mini', x: '82%', y: '46%' },
    { label: 'gpu-linux', x: '75%', y: '74%' },
  ];
  const harnessNodes = [
    { label: 'Claude Code', x: '64%', y: '7%' },
    { label: 'Codex', x: '91%', y: '32%' },
    { label: 'Cursor Agent', x: '63%', y: '86%' },
    { label: 'Gemini-CLI', x: '72%', y: '3%' },
    { label: 'Kimi-CLI', x: '93%', y: '54%' },
    { label: 'OpenCode', x: '72%', y: '92%' },
  ];

  return (
    <div className="relative min-h-[390px] overflow-hidden p-2">
      <div className="space-y-4 md:hidden">
        <div className="flex flex-wrap gap-2">
          {incomingTasks.map((task) => (
            <div key={task} className="rounded-full border border-blue-100 bg-blue-50/80 px-3 py-1.5 text-sm text-blue-900">
              {task}
            </div>
          ))}
        </div>
        <p className="text-center text-blue-500">↓ each task links to hub ↓</p>
        <div className="rounded-2xl border border-blue-200/90 bg-white px-4 py-4 text-center text-blue-900">
          <img src={iconSrc} alt="Flowy icon" className="mx-auto h-12 w-12" />
          <p className="mt-2 text-base font-bold">Flowy</p>
        </div>
        <p className="text-center text-blue-500">↓ hub links to each runner ↓</p>
        <div className="flex flex-wrap gap-2">
          {runnerMachines.map((runner) => (
            <div key={runner} className="rounded-full border border-blue-100 bg-blue-100/70 px-3 py-1.5 text-sm text-blue-900">
              {runner}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {harnesses.map((harness) => (
            <div key={harness} className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs text-blue-700">
              {harness}
            </div>
          ))}
        </div>
      </div>

      <div className="relative hidden h-[420px] md:block">
        <svg
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="rgba(11, 123, 255, 0.7)" />
            </marker>
          </defs>
          <path
            d={`M170 75 C 290 90, 350 165, ${hubLeftX} ${hubCenterY}`}
            className="flow-link-task"
            markerEnd="url(#flow-arrow)"
          />
          <path
            d={`M150 200 C 285 205, 345 ${hubCenterY}, ${hubLeftX} ${hubCenterY}`}
            className="flow-link-task"
            markerEnd="url(#flow-arrow)"
          />
          <path
            d={`M180 325 C 300 305, 350 245, ${hubLeftX} ${hubCenterY}`}
            className="flow-link-task"
            markerEnd="url(#flow-arrow)"
          />

          <path
            d={`M${hubRightX} ${hubCenterY} C 658 170, 704 136, 770 108`}
            className="flow-link-runner"
            markerEnd="url(#flow-arrow)"
          />
          <path
            d={`M${hubRightX} ${hubCenterY} C 690 ${hubCenterY}, 750 ${hubCenterY}, 810 ${hubCenterY}`}
            className="flow-link-runner"
            markerEnd="url(#flow-arrow)"
          />
          <path
            d={`M${hubRightX} ${hubCenterY} C 648 246, 690 278, 752 304`}
            className="flow-link-runner"
            markerEnd="url(#flow-arrow)"
          />

          <circle cx={hubLeftX} cy={hubCenterY} r="5.5" className="flow-port" />
          <circle cx={hubRightX} cy={hubCenterY} r="5.5" className="flow-port" />
        </svg>

        <div className="relative z-10 h-full">
          {taskNodes.map((task) => (
            <div
              key={task.label}
              className="flow-node absolute rounded-xl border border-blue-100 bg-blue-50/85 px-3 py-2 text-sm font-medium text-blue-900"
              style={{ left: task.x, top: task.y }}
            >
              {task.label}
            </div>
          ))}

          <div
            className="flow-stage-hub absolute rounded-2xl border border-blue-200/90 bg-white p-4 text-center text-blue-900 shadow-[0_14px_40px_-26px_rgba(10,120,255,0.65)]"
            style={{ left: hubLeftPercent, top: hubTopPercent, width: hubWidthPercent }}
          >
            <p className="text-lg font-bold text-blue-800">Flowy</p>
            <img src={iconSrc} alt="Flowy icon" className="mx-auto mt-3 h-16 w-16" />
            <p className="mt-3 text-sm font-semibold">Route and orchestrate</p>
          </div>

          {runnerNodes.map((runner) => (
            <div
              key={runner.label}
              className="flow-node absolute rounded-xl border border-blue-100 bg-blue-100/75 px-3 py-2 text-sm font-medium text-blue-900"
              style={{ left: runner.x, top: runner.y }}
            >
              {runner.label}
            </div>
          ))}

          {harnessNodes.map((harness) => (
            <div
              key={harness.label}
              className="flow-harness-node absolute rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs text-blue-700"
              style={{ left: harness.x, top: harness.y }}
            >
              {harness.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [copied, setCopied] = useState(false);
  const iconSrc = latestFlowyIcon;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-ink text-slate-900">
      <div className="pointer-events-none absolute inset-0 opacity-75">
        <div className="flow-lines h-full w-[120%] animate-drift" />
      </div>
      <div className="pointer-events-none absolute -top-36 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />

      <Section
        id="top"
        title="Let your tasks flow to AI harnesses"
        subtitle="Self-hosted routing for AI tasks across your runners, servers, and harnesses."
        showHeader={false}
      >
        <div className="space-y-10">
          <h1 className="max-w-5xl text-balance text-5xl font-black tracking-tight text-slate-950 md:text-7xl md:leading-[0.98]">
            Let your tasks flow to AI harnesses
          </h1>
          <div className="max-w-2xl">
            <p className="max-w-2xl text-lg text-mist">
              Self-hosted routing for AI tasks across your runners, servers, and harnesses.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="#get-started"
                className="rounded-xl border border-accent/60 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-glow"
              >
                Try It Out
              </a>
              <a
                href="https://github.com/FrankLeeeee/Flowy"
                className="rounded-xl border border-blue-200 bg-white px-5 py-2.5 text-sm font-semibold text-blue-900 transition hover:border-blue-300 hover:bg-blue-50"
              >
                View GitHub
              </a>
            </div>
          </div>
          <AnimatedFlowFigure iconSrc={iconSrc} />
        </div>
      </Section>

      <Section id="get-started" title="Get started in one command">
        <div className="rounded-2xl border border-blue-100 bg-white/95 p-6 md:p-8">
          <p className="text-mist">Install the hub and runner packages, then boot Flowy:</p>
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/80 p-4 md:flex-row md:items-center md:justify-between">
            <code className="block overflow-x-auto whitespace-nowrap pr-1 font-mono text-sm text-blue-900">
              {installCommand}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg border border-accent/45 bg-white px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent hover:text-white"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </Section>

      <Section
        title="AI work is scattered."
        subtitle="Tasks live in chats. Execution happens on different machines. Each CLI has its own settings. Output disappears into terminal windows. Flowy brings the whole loop into one place."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {painPoints.map((point) => (
            <article
              key={point.title}
              className="rounded-2xl border border-blue-100 bg-white/95 p-5 transition duration-300 hover:-translate-y-1 hover:border-accent/45"
            >
              <h3 className="text-lg font-semibold text-slate-900">{point.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-mist">{point.copy}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        title="One hub. Many runners. Any supported AI CLI."
        subtitle="Flowy lets users start a hub, connect runner machines, assign each task to the right environment, and monitor execution output as it streams back."
      >
        <div className="rounded-2xl border border-blue-100 bg-white/95 p-6">
          <div className="grid gap-3 md:grid-cols-4">
            {flowSteps.map((step, index) => (
              <div key={step} className="relative rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-accent/80">Step {index + 1}</p>
                <p className="mt-2 text-sm font-medium text-slate-800">{step}</p>
                {index < flowSteps.length - 1 ? (
                  <span className="absolute -right-2 top-1/2 hidden h-px w-4 -translate-y-1/2 bg-accent/70 md:block" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </Section>
    </main>
  );
}
