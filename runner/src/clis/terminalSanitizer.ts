/**
 * Comprehensive terminal control-sequence sanitizer.
 *
 * When Claude Code is driven through a PTY (interactive mode) it emits the
 * full vocabulary of terminal control sequences, not just colour codes:
 *
 *   - DEC private modes:  ESC [ ? 25 h (cursor), ESC [ ? 2004 h (bracketed
 *     paste), ESC [ ? 1004 h (focus reporting), ESC [ ? 2031 h, ...
 *   - Kitty keyboard protocol:  ESC [ > 1 u, ESC [ < u, ESC [ > 4 ; 2 m
 *   - Cursor / erase / scroll CSI sequences
 *   - OSC title & hyperlink sequences (BEL- or ST-terminated)
 *   - DCS / APC / PM / SOS strings
 *   - Charset designators (ESC ( B, ...) and other two-byte escapes
 *   - Lone C0 control bytes such as ^D (EOT, 0x04)
 *
 * The previous regex only matched `ESC [ <digits;> <letter>`, so every
 * private-mode and keyboard-protocol sequence leaked through verbatim,
 * producing the "[?25h[?2004h[>4;2m..." soup seen in captured task output.
 *
 * This module strips the full ECMA-48 / xterm grammar. Because PTY data
 * arrives in arbitrarily small chunks, {@link AnsiStripper} additionally
 * holds back a trailing *incomplete* sequence so a control code split across
 * two reads is never emitted as garbage.
 */

// CSI: ESC [ , parameter bytes 0x30-0x3F (digits plus : ; < = > ?),
// intermediate bytes 0x20-0x2F, final byte 0x40-0x7E.
const CSI = '\\x1b\\[[\\x30-\\x3f]*[\\x20-\\x2f]*[\\x40-\\x7e]';

// OSC: ESC ] ... terminated by BEL or ST (ESC \).
const OSC = '\\x1b\\][\\s\\S]*?(?:\\x07|\\x1b\\\\)';

// DCS / SOS / PM / APC: ESC P|X|^|_ ... terminated by ST (ESC \).
const STRING_CMD = '\\x1b[P^_X][\\s\\S]*?\\x1b\\\\';

// nF escapes (charset designators etc.): ESC, intermediate(s) 0x20-0x2F,
// final 0x30-0x7E.
const NF_ESC = '\\x1b[\\x20-\\x2f]+[\\x30-\\x7e]';

// Other single-byte escapes: ESC followed by a final byte in 0x30-0x7E,
// e.g. ESC 7, ESC 8, ESC =, ESC >, ESC c, ESC M, ESC D. The introducers of
// multi-byte sequences are excluded so a lone "ESC [" / "ESC ]" / "ESC P" /
// "ESC X" / "ESC ^" / "ESC _" is recognised as *incomplete*, not consumed
// here as a finished escape (which would corrupt split-chunk reassembly).
const SINGLE_ESC = '\\x1b[\\x30-\\x4f\\x51-\\x57\\x59\\x5a\\x5c\\x60-\\x7e]';

// Lone C0/C1 control bytes that are never part of readable assistant text.
// Tab (0x09) and newline (0x0a) are preserved; CR (0x0d) is dropped so
// PTY carriage-return overwrites collapse instead of stacking.
const CONTROL = '[\\x00-\\x08\\x0b-\\x1f\\x7f]';

const ANSI_RE = new RegExp(
  [CSI, OSC, STRING_CMD, NF_ESC, SINGLE_ESC, CONTROL].join('|'),
  'g',
);

// Anchored single-sequence matcher used to decide whether the fragment that
// starts at the final ESC of a chunk is already complete.
const COMPLETE_SEQ_AT_START = new RegExp(
  '^(?:' + [CSI, OSC, STRING_CMD, NF_ESC, SINGLE_ESC].join('|') + ')',
);

// A lone ESC followed only by bytes that could still grow into a longer
// sequence is incomplete; cap how much we withhold so a malformed stream
// containing a bare ESC never stalls output indefinitely. Sized to comfortably
// hold real OSC hyperlink / title strings while still bounding memory.
const MAX_PENDING = 4096;

/**
 * Strip every terminal control sequence and lone control byte from `text`.
 * Pure and synchronous; use {@link AnsiStripper} when feeding streamed
 * chunks so sequences split across reads are handled correctly.
 */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, '');
}

/**
 * Collapse the obvious TUI chrome from PTY-scraped text: drop lines that,
 * once control sequences are removed, carry no word characters (pure
 * box-drawing borders, spinner glyphs, separators) and squeeze runs of
 * blank lines. Intended for human-readable fallbacks, not for parsing.
 */
export function cleanTuiText(raw: string): string {
  const stripped = stripAnsi(raw);
  const keptLines: string[] = [];
  let blankRun = 0;

  for (const rawLine of stripped.split('\n')) {
    const line = rawLine.replace(/[ \t]+$/, '');
    const hasContent = /[\p{L}\p{N}]/u.test(line);
    if (!hasContent) {
      // Treat border/spinner-only lines as blanks and collapse the run.
      blankRun += 1;
      if (blankRun <= 1) keptLines.push('');
      continue;
    }
    blankRun = 0;
    keptLines.push(line);
  }

  return keptLines.join('\n').trim();
}

/**
 * Extract the assistant's reply from a TUI scrape by slicing after the last
 * `⏺` response marker, then cleaning the remainder. Best-effort fallback for
 * when the canonical session JSONL is unavailable.
 */
export function extractAssistantFromTui(raw: string): string {
  const clean = stripAnsi(raw);
  const marker = '⏺';
  const idx = clean.lastIndexOf(marker);
  const slice = idx === -1 ? clean : clean.slice(idx + marker.length);
  return cleanTuiText(slice);
}

/**
 * Stateful stripper for streamed PTY output. Each {@link push} returns the
 * sanitized text for that chunk while withholding a trailing partial escape
 * sequence (if any) until the rest of it arrives. Call {@link flush} once at
 * end-of-stream to emit any leftover.
 */
export class AnsiStripper {
  private pending = '';

  push(chunk: string): string {
    const buf = this.pending + chunk;
    this.pending = '';

    const lastEsc = buf.lastIndexOf('\x1b');
    if (lastEsc === -1) {
      return stripAnsi(buf);
    }

    const tail = buf.slice(lastEsc);
    // If the fragment beginning at the final ESC already forms a complete
    // sequence, there is nothing to wait for — strip the whole buffer.
    // Otherwise it is an in-flight sequence: emit everything before it and
    // carry the fragment over to the next chunk.
    if (COMPLETE_SEQ_AT_START.test(tail) || tail.length > MAX_PENDING) {
      return stripAnsi(buf);
    }

    this.pending = tail;
    return stripAnsi(buf.slice(0, lastEsc));
  }

  flush(): string {
    const leftover = this.pending;
    this.pending = '';
    // `pending` is, by construction, an unterminated control-sequence
    // fragment (it always begins at an ESC we judged incomplete) — never
    // readable content. Drop it rather than emit a half-escape as garbage.
    return leftover.startsWith('\x1b') ? '' : stripAnsi(leftover);
  }
}
