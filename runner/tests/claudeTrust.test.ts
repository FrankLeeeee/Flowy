import { describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  defaultClaudeConfigPath,
  markWorkspaceTrusted,
  resolveWorkspaceDir,
  trustClaudeWorkspace,
} from '../src/clis/claudeTrust';

describe('defaultClaudeConfigPath', () => {
  it('uses ~/.claude.json when CLAUDE_CONFIG_DIR is unset', () => {
    const prev = process.env.CLAUDE_CONFIG_DIR;
    delete process.env.CLAUDE_CONFIG_DIR;
    try {
      expect(defaultClaudeConfigPath()).toBe(path.join(os.homedir(), '.claude.json'));
    } finally {
      if (prev !== undefined) process.env.CLAUDE_CONFIG_DIR = prev;
    }
  });

  it('honors CLAUDE_CONFIG_DIR, matching Claude Code config resolution', () => {
    const prev = process.env.CLAUDE_CONFIG_DIR;
    process.env.CLAUDE_CONFIG_DIR = '/custom/cfg';
    try {
      expect(defaultClaudeConfigPath()).toBe('/custom/cfg/.claude.json');
    } finally {
      if (prev === undefined) delete process.env.CLAUDE_CONFIG_DIR;
      else process.env.CLAUDE_CONFIG_DIR = prev;
    }
  });
});

describe('markWorkspaceTrusted', () => {
  it('adds a trusted project entry to an empty config', () => {
    const next = markWorkspaceTrusted({}, '/tmp/project');
    expect(next).toEqual({
      projects: { '/tmp/project': { hasTrustDialogAccepted: true } },
    });
  });

  it('preserves unrelated top-level keys and other projects', () => {
    const config = {
      theme: 'dark',
      projects: {
        '/other': { hasTrustDialogAccepted: false, allowedTools: ['Read'] },
      },
    };
    const next = markWorkspaceTrusted(config, '/tmp/project') as Record<string, unknown>;

    expect(next.theme).toBe('dark');
    expect(next.projects).toEqual({
      '/other': { hasTrustDialogAccepted: false, allowedTools: ['Read'] },
      '/tmp/project': { hasTrustDialogAccepted: true },
    });
    // Input is not mutated.
    expect(config.projects).not.toHaveProperty('/tmp/project');
  });

  it('keeps existing settings for the target project and only flips trust', () => {
    const config = {
      projects: {
        '/tmp/project': { hasTrustDialogAccepted: false, allowedTools: ['Bash'] },
      },
    };
    const next = markWorkspaceTrusted(config, '/tmp/project') as {
      projects: Record<string, Record<string, unknown>>;
    };
    expect(next.projects['/tmp/project']).toEqual({
      hasTrustDialogAccepted: true,
      allowedTools: ['Bash'],
    });
  });
});

describe('resolveWorkspaceDir', () => {
  it('falls back to process.cwd() when no dir is given', () => {
    expect(resolveWorkspaceDir()).toBe(fs.realpathSync(process.cwd()));
  });

  it('resolves relative paths against the canonical absolute path', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-trust-'));
    try {
      expect(resolveWorkspaceDir(dir)).toBe(fs.realpathSync(dir));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('trustClaudeWorkspace', () => {
  function tmpConfig(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-trust-cfg-'));
    return path.join(dir, '.claude.json');
  }

  it('creates the config file when none exists', () => {
    const configPath = tmpConfig();
    try {
      const ok = trustClaudeWorkspace('/tmp/ws', configPath);
      expect(ok).toBe(true);
      const written = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(written.projects['/tmp/ws'].hasTrustDialogAccepted).toBe(true);
    } finally {
      fs.rmSync(path.dirname(configPath), { recursive: true, force: true });
    }
  });

  it('preserves existing config content', () => {
    const configPath = tmpConfig();
    try {
      fs.writeFileSync(
        configPath,
        JSON.stringify({ theme: 'light', projects: { '/keep': { foo: 1 } } }),
      );
      trustClaudeWorkspace('/tmp/ws', configPath);
      const written = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(written.theme).toBe('light');
      expect(written.projects['/keep']).toEqual({ foo: 1 });
      expect(written.projects['/tmp/ws'].hasTrustDialogAccepted).toBe(true);
    } finally {
      fs.rmSync(path.dirname(configPath), { recursive: true, force: true });
    }
  });

  it('is idempotent and reports success when already trusted', () => {
    const configPath = tmpConfig();
    try {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-trust-ws-'));
      try {
        const key = fs.realpathSync(dir);
        fs.writeFileSync(
          configPath,
          JSON.stringify({ projects: { [key]: { hasTrustDialogAccepted: true } } }),
        );
        const before = fs.readFileSync(configPath, 'utf-8');
        const ok = trustClaudeWorkspace(dir, configPath);
        expect(ok).toBe(true);
        // No rewrite needed when the workspace is already trusted.
        expect(fs.readFileSync(configPath, 'utf-8')).toBe(before);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } finally {
      fs.rmSync(path.dirname(configPath), { recursive: true, force: true });
    }
  });

  it('does not clobber a corrupt config file', () => {
    const configPath = tmpConfig();
    try {
      fs.writeFileSync(configPath, '{ not valid json');
      const ok = trustClaudeWorkspace('/tmp/ws', configPath);
      expect(ok).toBe(false);
      expect(fs.readFileSync(configPath, 'utf-8')).toBe('{ not valid json');
    } finally {
      fs.rmSync(path.dirname(configPath), { recursive: true, force: true });
    }
  });

  it('does not clobber a config file with an unexpected shape', () => {
    const configPath = tmpConfig();
    try {
      fs.writeFileSync(configPath, '["unexpected"]');
      const ok = trustClaudeWorkspace('/tmp/ws', configPath);
      expect(ok).toBe(false);
      expect(fs.readFileSync(configPath, 'utf-8')).toBe('["unexpected"]');
    } finally {
      fs.rmSync(path.dirname(configPath), { recursive: true, force: true });
    }
  });
});
