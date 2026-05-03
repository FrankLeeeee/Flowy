import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { buildCommandWithConfig } from '../src/executor';

// Tests use a tmp dir as the workspace root so paths like `${TMP}/project`
// canonicalize cleanly (avoids surprises on systems where /tmp is a symlink).
const TMP = fs.realpathSync(os.tmpdir());
const ROOTS = [TMP];

describe('buildCommandWithConfig', () => {
  it('builds the Claude Code command with streaming enabled', () => {
    expect(buildCommandWithConfig('claude-code', 'Write a test', undefined, ROOTS)).toEqual({
      cmd: 'claude',
      args: ['-p', '--permission-mode', 'bypassPermissions', 'Write a test'],
      cwd: undefined,
      streamOutput: true,
    });
  });

  it('builds the Codex command with workspace-write sandboxing', () => {
    expect(buildCommandWithConfig('codex', 'Fix CI', undefined, ROOTS)).toEqual({
      cmd: 'codex',
      args: ['exec', '--sandbox', 'workspace-write', '--color', 'never', 'Fix CI'],
      cwd: undefined,
      streamOutput: true,
    });
  });

  it('builds the Cursor Agent command in headless mode with file writes', () => {
    expect(buildCommandWithConfig('cursor-agent', 'Refactor module', undefined, ROOTS)).toEqual({
      cmd: 'agent',
      args: ['--print', '--force', 'Refactor module'],
      cwd: undefined,
      streamOutput: true,
    });
  });

  it('maps Claude Code assignment config to command flags', () => {
    expect(buildCommandWithConfig('claude-code', 'Ship it', JSON.stringify({
      claudeCode: {
        workspace: path.join(TMP, 'project'),
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
    }), ROOTS)).toEqual({
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
      cwd: path.join(TMP, 'project'),
      streamOutput: true,
    });
  });

  it('maps Codex assignment config to command flags', () => {
    expect(buildCommandWithConfig('codex', 'Audit repo', JSON.stringify({
      codex: {
        workspace: path.join(TMP, 'repo'),
        addDirs: ['/tmp/shared', '/tmp/logs'],
        model: 'gpt-5.4',
        profile: 'ci',
        sandbox: 'danger-full-access',
        search: true,
        configOverrides: ['approval_policy="never"', 'model_reasoning_effort="high"'],
      },
    }), ROOTS)).toEqual({
      cmd: 'codex',
      args: [
        'exec',
        '--cd',
        path.join(TMP, 'repo'),
        '--model',
        'gpt-5.4',
        '--sandbox',
        'danger-full-access',
        '--color',
        'never',
        'Audit repo',
      ],
      cwd: path.join(TMP, 'repo'),
      streamOutput: true,
    });
  });

  it('maps Cursor Agent assignment config to command flags', () => {
    expect(buildCommandWithConfig('cursor-agent', 'Fix lint', JSON.stringify({
      cursorAgent: {
        workspace: path.join(TMP, 'repo'),
        model: 'gpt-5',
        mode: 'plan',
        sandbox: 'enabled',
        worktree: 'lint-fix',
        worktreeBase: 'main',
        skipWorktreeSetup: true,
        approveMcps: true,
        trust: true,
      },
    }), ROOTS)).toEqual({
      cmd: 'agent',
      args: [
        '--print',
        '--force',
        '--workspace',
        path.join(TMP, 'repo'),
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
      cwd: path.join(TMP, 'repo'),
      streamOutput: true,
    });
  });

  it('throws for unsupported providers', () => {
    expect(() => buildCommandWithConfig('unknown', 'Prompt', undefined, ROOTS)).toThrow('Unknown AI provider: unknown');
  });

  it('rejects workspace paths outside the allowed roots', () => {
    expect(() => buildCommandWithConfig('claude-code', 'pwn', JSON.stringify({
      claudeCode: { workspace: '/etc' },
    }), ROOTS)).toThrow(/outside the allowed workspace roots/);
  });
});
