/**
 * Minimal system-clipboard read/write used by interactive Claude mode.
 *
 * Claude's `/copy` slash command places its last reply on the OS clipboard;
 * the runner reads it back as the task output. Rather than depend on a native
 * module, we shell out to whatever clipboard utility the platform ships:
 *
 *   - macOS:  pbcopy / pbpaste (always present)
 *   - Linux:  Wayland (wl-clipboard) first, then X11 (xclip, then xsel)
 *
 * Each platform exposes a list of candidates tried in priority order so a
 * headless Linux box with only one of the tools installed still works.
 */
import { execFileSync } from 'child_process';

export interface ClipboardTool {
  read: { cmd: string; args: string[] };
  write: { cmd: string; args: string[] };
}

/** Clipboard command candidates for `platform`, highest priority first. */
export function getClipboardTools(
  platform: NodeJS.Platform = process.platform,
): ClipboardTool[] {
  if (platform === 'darwin') {
    return [
      {
        read: { cmd: 'pbpaste', args: [] },
        write: { cmd: 'pbcopy', args: [] },
      },
    ];
  }

  // Linux and other Unix-likes: cover Wayland and X11 setups.
  return [
    {
      read: { cmd: 'wl-paste', args: ['--no-newline'] },
      write: { cmd: 'wl-copy', args: [] },
    },
    {
      read: { cmd: 'xclip', args: ['-selection', 'clipboard', '-o'] },
      write: { cmd: 'xclip', args: ['-selection', 'clipboard'] },
    },
    {
      read: { cmd: 'xsel', args: ['--clipboard', '--output'] },
      write: { cmd: 'xsel', args: ['--clipboard', '--input'] },
    },
  ];
}

/** Read the system clipboard, or `null` if no usable tool is available. */
export function readClipboard(): string | null {
  for (const tool of getClipboardTools()) {
    try {
      return execFileSync(tool.read.cmd, tool.read.args, {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch {
      // Tool missing or failed — try the next candidate.
    }
  }
  return null;
}

/** Write `text` to the system clipboard; returns whether it succeeded. */
export function writeClipboard(text: string): boolean {
  for (const tool of getClipboardTools()) {
    try {
      execFileSync(tool.write.cmd, tool.write.args, {
        input: text,
        stdio: ['pipe', 'ignore', 'ignore'],
      });
      return true;
    } catch {
      // Tool missing or failed — try the next candidate.
    }
  }
  return false;
}
