import { describe, expect, it } from 'vitest';
import { buildCommandWithConfig, prepareCommandWithConfig } from '../src/executor';
import {
  CLAUDE_TMUX_IDLE_ENV,
  CLAUDE_TMUX_MODEL_ENV,
  CLAUDE_TMUX_PROMPT_ENV,
  CLAUDE_TMUX_WORKTREE_ENV,
  CLAUDE_TMUX_WRAPPER_SCRIPT,
} from '../src/clis/claudeTmux';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

describe('buildCommandWithConfig', () => {
  it('builds the Claude Code command with streaming enabled', () => {
    expect(buildCommandWithConfig('claude-code', 'Write a test')).toEqual({
      cmd: 'claude',
      args: ['-p', '--permission-mode', 'bypassPermissions', 'Write a test'],
      cwd: undefined,
      streamOutput: true,
      env: { IS_SANDBOX: '1' },
    });
  });

  it('builds the Codex command with workspace-write sandboxing', () => {
    expect(buildCommandWithConfig('codex', 'Fix CI')).toEqual({
      cmd: 'codex',
      args: ['exec', '--sandbox', 'workspace-write', '--color', 'never', 'Fix CI'],
      streamOutput: true,
    });
  });

  it('builds the Cursor Agent command in headless mode with file writes', () => {
    expect(buildCommandWithConfig('cursor-agent', 'Refactor module')).toEqual({
      cmd: 'agent',
      args: ['--print', '--force', 'Refactor module'],
      streamOutput: true,
    });
  });

  it('maps Claude Code assignment config to command flags', () => {
    expect(buildCommandWithConfig('claude-code', 'Ship it', JSON.stringify({
      claudeCode: {
        workspace: '/tmp/project',
        addDirs: ['/tmp/shared'],
        model: 'sonnet',
        mode: 'auto',
        worktree: 'feature-branch',
        mcpConfigs: ['.mcp.json'],
        strictMcpConfig: true,
        settings: '.claude/settings.json',
        allowedTools: ['Read', 'Edit'],
        disallowedTools: ['Bash(rm:*)'],
      },
    }))).toEqual({
      cmd: 'claude',
      args: [
        '-p',
        '--model',
        'sonnet',
        '--permission-mode',
        'bypassPermissions',
        '--worktree',
        'feature-branch',
        'Ship it',
      ],
      cwd: '/tmp/project',
      streamOutput: true,
      env: { IS_SANDBOX: '1' },
    });
  });

  it('maps Codex assignment config to command flags', () => {
    expect(buildCommandWithConfig('codex', 'Audit repo', JSON.stringify({
      codex: {
        workspace: '/tmp/repo',
        addDirs: ['/tmp/shared', '/tmp/logs'],
        model: 'gpt-5.4',
        profile: 'ci',
        sandbox: 'danger-full-access',
        search: true,
        configOverrides: ['approval_policy="never"', 'model_reasoning_effort="high"'],
      },
    }))).toEqual({
      cmd: 'codex',
      args: [
        'exec',
        '--cd',
        '/tmp/repo',
        '--model',
        'gpt-5.4',
        '--sandbox',
        'danger-full-access',
        '--color',
        'never',
        'Audit repo',
      ],
      cwd: '/tmp/repo',
      streamOutput: true,
    });
  });

  it('maps Cursor Agent assignment config to command flags', () => {
    expect(buildCommandWithConfig('cursor-agent', 'Fix lint', JSON.stringify({
      cursorAgent: {
        workspace: '/tmp/repo',
        model: 'gpt-5',
        mode: 'plan',
        sandbox: 'enabled',
        worktree: 'lint-fix',
        worktreeBase: 'main',
        skipWorktreeSetup: true,
        approveMcps: true,
        trust: true,
      },
    }))).toEqual({
      cmd: 'agent',
      args: [
        '--print',
        '--force',
        '--workspace',
        '/tmp/repo',
        '--model',
        'gpt-5',
        '--mode',
        'plan',
        '--sandbox',
        'enabled',
        '--worktree',
        'lint-fix',
        'Fix lint',
      ],
      cwd: '/tmp/repo',
      streamOutput: true,
    });
  });

  it('keeps `-p` when claudeCode.runWithPrint is explicitly true', () => {
    expect(buildCommandWithConfig('claude-code', 'Ship it', JSON.stringify({
      claudeCode: { runWithPrint: true, model: 'sonnet' },
    }))).toEqual({
      cmd: 'claude',
      args: ['-p', '--model', 'sonnet', '--permission-mode', 'bypassPermissions', 'Ship it'],
      cwd: undefined,
      streamOutput: true,
      env: { IS_SANDBOX: '1' },
    });
  });

  it('wraps claude in a tmux script when runWithPrint is false', () => {
    const result = buildCommandWithConfig('claude-code', 'Refactor the executor', JSON.stringify({
      claudeCode: {
        workspace: '/tmp/project',
        model: 'sonnet',
        worktree: 'feature-x',
        runWithPrint: false,
      },
    }));

    expect(result.cmd).toBe('bash');
    expect(result.args[0]).toBe('-c');
    expect(result.args[1]).toBe(CLAUDE_TMUX_WRAPPER_SCRIPT);
    expect(result.cwd).toBe('/tmp/project');
    expect(result.streamOutput).toBe(true);
    expect(result.env).toMatchObject({
      IS_SANDBOX: '1',
      [CLAUDE_TMUX_PROMPT_ENV]: 'Refactor the executor',
      [CLAUDE_TMUX_MODEL_ENV]: 'sonnet',
      [CLAUDE_TMUX_WORKTREE_ENV]: 'feature-x',
    });
    expect(result.args.some((a) => a === '-p')).toBe(false);
  });

  it('omits model/worktree env vars when not set in tmux mode', () => {
    const result = buildCommandWithConfig('claude-code', 'Ship it', JSON.stringify({
      claudeCode: { runWithPrint: false },
    }));
    expect(result.env).toEqual({
      IS_SANDBOX: '1',
      [CLAUDE_TMUX_PROMPT_ENV]: 'Ship it',
    });
  });

  it('threads through FLOWY_CLAUDE_IDLE_S from the runner environment in tmux mode', () => {
    const previous = process.env[CLAUDE_TMUX_IDLE_ENV];
    process.env[CLAUDE_TMUX_IDLE_ENV] = '90';
    try {
      const result = buildCommandWithConfig('claude-code', 'Ship it', JSON.stringify({
        claudeCode: { runWithPrint: false },
      }));
      expect(result.env?.[CLAUDE_TMUX_IDLE_ENV]).toBe('90');
    } finally {
      if (previous === undefined) delete process.env[CLAUDE_TMUX_IDLE_ENV];
      else process.env[CLAUDE_TMUX_IDLE_ENV] = previous;
    }
  });

  it('throws for unsupported providers', () => {
    expect(() => buildCommandWithConfig('unknown', 'Prompt')).toThrow('Unknown AI provider: unknown');
  });
});

describe('claudeTmux wrapper script', () => {
  it('expands env-var references to the bash-visible names', () => {
    // Sanity-check that TS template interpolation produced literal bash
    // parameter expansions for each input — protects against accidentally
    // baking the env value into the script at compile time.
    expect(CLAUDE_TMUX_WRAPPER_SCRIPT).toContain('${FLOWY_CLAUDE_PROMPT');
    expect(CLAUDE_TMUX_WRAPPER_SCRIPT).toContain('${FLOWY_CLAUDE_MODEL');
    expect(CLAUDE_TMUX_WRAPPER_SCRIPT).toContain('${FLOWY_CLAUDE_WORKTREE');
    expect(CLAUDE_TMUX_WRAPPER_SCRIPT).toContain('${FLOWY_CLAUDE_IDLE_S');
  });

  it('runs the claude command (no -p) inside tmux new-session', () => {
    expect(CLAUDE_TMUX_WRAPPER_SCRIPT).toContain('tmux new-session');
    expect(CLAUDE_TMUX_WRAPPER_SCRIPT).toContain('claude --permission-mode bypassPermissions');
    expect(CLAUDE_TMUX_WRAPPER_SCRIPT).not.toContain('claude -p');
  });

  it('sets up cleanup on EXIT/INT/TERM so kill propagates to tmux', () => {
    expect(CLAUDE_TMUX_WRAPPER_SCRIPT).toContain('trap cleanup EXIT INT TERM');
    expect(CLAUDE_TMUX_WRAPPER_SCRIPT).toContain('tmux kill-session');
  });

  it('parses as valid bash syntax', () => {
    const result = execFileSync('bash', ['-n', '-c', CLAUDE_TMUX_WRAPPER_SCRIPT], { stdio: ['ignore', 'pipe', 'pipe'] });
    expect(result.toString()).toBe('');
  });

  // Runs the real wrapper end-to-end against a fake `claude` binary so we can
  // assert that the orchestration actually captures and forwards the prompt's
  // output. Skipped automatically when tmux is unavailable.
  it('captures fake-claude output through the tmux pipeline', () => {
    try {
      execFileSync('tmux', ['-V'], { stdio: 'ignore' });
    } catch {
      return;
    }

    const shimDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-claude-shim-'));
    try {
      const shim = path.join(shimDir, 'claude');
      // Fake claude: print a marker, read one line of "user input", echo it,
      // then exit. The wrapper's send-keys will deliver the prompt.
      fs.writeFileSync(shim,
        '#!/bin/bash\n' +
        'echo "FAKE_CLAUDE_READY"\n' +
        'read -r line\n' +
        'echo "FAKE_CLAUDE_GOT:$line"\n' +
        'sleep 0.2\n' +
        'echo "FAKE_CLAUDE_DONE"\n',
        { mode: 0o755 },
      );

      const env = {
        ...process.env,
        PATH: `${shimDir}:${process.env.PATH ?? ''}`,
        [CLAUDE_TMUX_PROMPT_ENV]: 'hello-tmux',
        // Use a tight idle window so the test finishes fast (3s poll × 2 windows + slack).
        [CLAUDE_TMUX_IDLE_ENV]: '4',
      };

      const out = execFileSync('bash', ['-c', CLAUDE_TMUX_WRAPPER_SCRIPT], {
        env,
        encoding: 'utf8',
        timeout: 20_000,
      });

      expect(out).toContain('FAKE_CLAUDE_READY');
      expect(out).toContain('FAKE_CLAUDE_GOT:hello-tmux');
      expect(out).toContain('FAKE_CLAUDE_DONE');
    } finally {
      fs.rmSync(shimDir, { recursive: true, force: true });
    }
  }, 25_000);
});

describe('prepareCommandWithConfig (codex worktree)', () => {
  function makeRepo(): string {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-codex-wt-'));
    execFileSync('git', ['init', '-q', '-b', 'main', repo]);
    execFileSync('git', ['-C', repo, 'config', 'user.email', 'test@flowy.local']);
    execFileSync('git', ['-C', repo, 'config', 'user.name', 'Flowy Test']);
    fs.writeFileSync(path.join(repo, 'README.md'), '# test\n');
    execFileSync('git', ['-C', repo, 'add', '.']);
    execFileSync('git', ['-C', repo, 'commit', '-q', '-m', 'init']);
    return repo;
  }

  it('falls back to buildCommand when worktree is blank', async () => {
    const command = await prepareCommandWithConfig('codex', 'No worktree', JSON.stringify({
      codex: { workspace: '/tmp/repo', sandbox: 'workspace-write' },
    }));
    expect(command.cwd).toBe('/tmp/repo');
    expect(command.args).toContain('/tmp/repo');
  });

  it('creates a git worktree and points codex at it', async () => {
    const repo = makeRepo();
    try {
      const command = await prepareCommandWithConfig('codex', 'Edit safely', JSON.stringify({
        codex: { workspace: repo, worktree: 'feature-x' },
      }));

      const expectedPath = path.join(repo, '.flowy', 'worktrees', 'feature-x');
      expect(fs.existsSync(expectedPath)).toBe(true);
      expect(command.cwd).toBe(expectedPath);
      expect(command.args).toContain('--cd');
      expect(command.args).toContain(expectedPath);

      const branches = execFileSync('git', ['-C', repo, 'branch', '--list', 'feature-x']).toString();
      expect(branches).toContain('feature-x');
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  });

  it('reuses an existing worktree path on a second invocation', async () => {
    const repo = makeRepo();
    try {
      await prepareCommandWithConfig('codex', 'first', JSON.stringify({
        codex: { workspace: repo, worktree: 'feature-y' },
      }));
      // Should not throw or reset the existing worktree.
      const command = await prepareCommandWithConfig('codex', 'second', JSON.stringify({
        codex: { workspace: repo, worktree: 'feature-y' },
      }));
      const expectedPath = path.join(repo, '.flowy', 'worktrees', 'feature-y');
      expect(command.cwd).toBe(expectedPath);
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  });

  it('rejects with a clear error when workspace is missing', async () => {
    await expect(
      prepareCommandWithConfig('codex', 'Need workspace', JSON.stringify({
        codex: { worktree: 'feature-z' },
      })),
    ).rejects.toThrow(/workspace/i);
  });

  it('rejects with a clear error when workspace is not a git repository', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-not-a-repo-'));
    try {
      await expect(
        prepareCommandWithConfig('codex', 'Need git', JSON.stringify({
          codex: { workspace: dir, worktree: 'feature-w' },
        })),
      ).rejects.toThrow(/git repository/i);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
