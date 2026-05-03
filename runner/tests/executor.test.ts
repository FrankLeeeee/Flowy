import { describe, expect, it } from 'vitest';
import { buildCommandWithConfig } from '../src/executor';

describe('buildCommandWithConfig', () => {
  it('builds the Claude Code command with streaming enabled', () => {
    expect(buildCommandWithConfig('claude-code', 'Write a test')).toEqual({
      cmd: 'claude',
      args: ['-p', '--permission-mode', 'bypassPermissions', 'Write a test'],
      cwd: undefined,
      streamOutput: true,
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
