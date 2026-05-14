import { describe, expect, it } from 'vitest';
import { buildCommandWithConfig, prepareCommandWithConfig } from '../src/executor';
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

  it('throws for unsupported providers', () => {
    expect(() => buildCommandWithConfig('unknown', 'Prompt')).toThrow('Unknown AI provider: unknown');
  });
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
