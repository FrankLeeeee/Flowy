import { describe, expect, it } from 'vitest';
import { getClipboardTools } from '../src/clis/clipboard';

describe('getClipboardTools', () => {
  it('uses pbcopy/pbpaste on macOS', () => {
    const tools = getClipboardTools('darwin');
    expect(tools).toHaveLength(1);
    expect(tools[0].read.cmd).toBe('pbpaste');
    expect(tools[0].write.cmd).toBe('pbcopy');
  });

  it('prefers Wayland then falls back to X11 utilities on Linux', () => {
    const tools = getClipboardTools('linux');
    expect(tools.map((t) => t.write.cmd)).toEqual(['wl-copy', 'xclip', 'xsel']);
    expect(tools.map((t) => t.read.cmd)).toEqual(['wl-paste', 'xclip', 'xsel']);
  });

  it('xclip targets the clipboard selection (not the X primary selection)', () => {
    const xclip = getClipboardTools('linux').find((t) => t.write.cmd === 'xclip')!;
    expect(xclip.write.args).toEqual(['-selection', 'clipboard']);
    expect(xclip.read.args).toEqual(['-selection', 'clipboard', '-o']);
  });

  it('returns a usable list for non-macOS platforms', () => {
    // Anything that is not darwin should still yield candidates rather than
    // an empty list so the runner degrades gracefully.
    expect(getClipboardTools('freebsd' as NodeJS.Platform).length).toBeGreaterThan(0);
  });
});
