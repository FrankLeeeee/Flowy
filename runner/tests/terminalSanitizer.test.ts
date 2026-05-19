import { describe, expect, it } from 'vitest';
import {
  AnsiStripper,
  cleanTuiText,
  extractAssistantFromTui,
  stripAnsi,
} from '../src/clis/terminalSanitizer';

const ESC = '\x1b';

describe('stripAnsi', () => {
  it('strips SGR colour codes', () => {
    expect(stripAnsi(`${ESC}[31mred${ESC}[0m`)).toBe('red');
    expect(stripAnsi(`${ESC}[1;32mbold green${ESC}[0m`)).toBe('bold green');
  });

  it('strips DEC private mode sequences the old regex missed', () => {
    // These are exactly the sequences that leaked in the bug report.
    const noisy =
      `${ESC}[?25h${ESC}[?25l${ESC}[?2004h${ESC}[?1004h${ESC}[?2031h` +
      `hello${ESC}[?2004l`;
    expect(stripAnsi(noisy)).toBe('hello');
  });

  it('strips Kitty keyboard-protocol sequences (CSI > / < u)', () => {
    const noisy = `${ESC}[<u${ESC}[>1u${ESC}[>4;2m${ESC}[>0qworld`;
    expect(stripAnsi(noisy)).toBe('world');
  });

  it('strips cursor movement and erase sequences', () => {
    expect(stripAnsi(`a${ESC}[2Jb${ESC}[1;1Hc${ESC}[Kd`)).toBe('abcd');
  });

  it('strips OSC sequences terminated by BEL or ST', () => {
    expect(stripAnsi(`${ESC}]0;window title\x07ok`)).toBe('ok');
    expect(stripAnsi(`${ESC}]8;;https://x.com${ESC}\\link${ESC}]8;;${ESC}\\`)).toBe(
      'link',
    );
  });

  it('strips DCS / APC string commands', () => {
    expect(stripAnsi(`${ESC}P1$r0m${ESC}\\visible`)).toBe('visible');
    expect(stripAnsi(`${ESC}_Gq=2${ESC}\\done`)).toBe('done');
  });

  it('strips charset designators and two-byte escapes', () => {
    expect(stripAnsi(`${ESC}(B${ESC})0text${ESC}=`)).toBe('text');
    expect(stripAnsi(`${ESC}7saved${ESC}8`)).toBe('saved');
  });

  it('strips lone control bytes such as ^D (EOT) and CR', () => {
    expect(stripAnsi('before\x04after')).toBe('beforeafter');
    expect(stripAnsi('line\rrewrite')).toBe('linerewrite');
    expect(stripAnsi('a\x00\x07\x08b')).toBe('ab');
  });

  it('preserves newlines and tabs', () => {
    expect(stripAnsi('a\nb\tc')).toBe('a\nb\tc');
  });

  it('reduces the reported messy banner to readable text', () => {
    const sample =
      '\x04' +
      `${ESC}[?25h${ESC}[?25l${ESC}[?2004h${ESC}[?1004h${ESC}[?2031h` +
      `${ESC}[<u${ESC}[>1u${ESC}[>4;2m` +
      'Claude Code v2.1.143' +
      `${ESC}[>0q`;
    expect(stripAnsi(sample)).toBe('Claude Code v2.1.143');
  });
});

describe('AnsiStripper (streamed, chunk-boundary aware)', () => {
  it('reassembles a sequence split across two chunks', () => {
    const s = new AnsiStripper();
    // `ESC [ ? 2 0 0 4 h` arrives split right in the middle.
    const a = s.push(`visible${ESC}[?20`);
    const b = s.push('04hmore');
    expect(a + b + s.flush()).toBe('visiblemore');
  });

  it('does not withhold text that follows a complete sequence', () => {
    const s = new AnsiStripper();
    const out = s.push(`done${ESC}[0m tail`);
    expect(out).toBe('done tail');
    expect(s.flush()).toBe('');
  });

  it('handles a bare trailing ESC then its continuation', () => {
    const s = new AnsiStripper();
    const a = s.push(`text${ESC}`);
    const b = s.push('[1mbold');
    expect(a + b).toBe('textbold');
  });

  it('flushes a never-completed dangling ESC at end of stream', () => {
    const s = new AnsiStripper();
    const a = s.push(`hello${ESC}[`);
    const flushed = s.flush();
    expect(a + flushed).toBe('hello');
  });

  it('matches one-shot stripAnsi when fed the whole stream in pieces', () => {
    const full =
      `${ESC}[?25l${ESC}[2J${ESC}[1;1HLine one\n${ESC}[32mLine two${ESC}[0m\n` +
      `${ESC}]0;title\x07Line three${ESC}[?25h`;
    const expected = stripAnsi(full);

    const s = new AnsiStripper();
    let acc = '';
    for (let i = 0; i < full.length; i += 3) {
      acc += s.push(full.slice(i, i + 3));
    }
    acc += s.flush();
    expect(acc).toBe(expected);
  });
});

describe('cleanTuiText', () => {
  it('drops pure box-drawing / spinner lines and collapses blanks', () => {
    const tui = [
      '╭───────────────────────────╮',
      '│ Welcome back Frank!       │',
      '',
      '',
      '▐▛███▜▌',
      '✻ Osmosing…',
      '────────────────────────────',
    ].join('\n');

    expect(cleanTuiText(tui)).toBe(
      ['│ Welcome back Frank!       │', '', '✻ Osmosing…'].join('\n'),
    );
  });

  it('returns clean text untouched aside from trimming', () => {
    expect(cleanTuiText('  Hello world  \n')).toBe('Hello world');
  });
});

describe('extractAssistantFromTui', () => {
  it('returns text after the last ⏺ response marker', () => {
    const raw = `${ESC}[2J⏺ first thought\n⏺ The weather in Singapore is sunny.`;
    expect(extractAssistantFromTui(raw)).toBe(
      'The weather in Singapore is sunny.',
    );
  });

  it('falls back to the full cleaned text when no marker is present', () => {
    const raw = `${ESC}[?25lJust some output${ESC}[?25h`;
    expect(extractAssistantFromTui(raw)).toBe('Just some output');
  });
});
