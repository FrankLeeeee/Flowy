import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bold,
  Italic,
  Heading,
  List as ListIcon,
  ListOrdered,
  ListChecks,
  Code as CodeIcon,
  Link as LinkIcon,
  Quote,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from './textarea';

export const MARKDOWN_PROSE_CLASSNAME = `min-w-0 max-w-full overflow-hidden text-[13px] leading-relaxed break-words [overflow-wrap:anywhere] prose prose-sm prose-neutral dark:prose-invert max-w-none
  prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1.5
  prose-h1:text-[15px] prose-h2:text-[14px] prose-h3:text-[13px]
  prose-p:text-foreground/90 prose-p:my-1 prose-p:max-w-full
  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
  prose-strong:text-foreground prose-strong:font-semibold
  prose-code:max-w-full prose-code:break-words prose-code:text-[12px] prose-code:font-mono prose-code:bg-foreground/[0.06] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
  prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:bg-foreground/[0.06] prose-pre:rounded-md prose-pre:text-[12px] prose-pre:leading-relaxed
  prose-li:text-foreground/90 prose-li:my-0.5 prose-li:max-w-full
  prose-ul:my-1 prose-ol:my-1
  prose-table:block prose-table:max-w-full prose-table:overflow-x-auto prose-table:text-[12px] prose-th:text-foreground prose-th:font-medium prose-td:text-foreground/90
  prose-hr:border-border/40
  prose-blockquote:border-border/60 prose-blockquote:text-muted-foreground/80`;

type SelectionTransform = (selection: string) => {
  text: string;
  /** Optional explicit selection range to apply after transform. Relative to start of inserted text. */
  selectionStart?: number;
  selectionEnd?: number;
};

type ToolbarAction =
  | {
      kind: 'wrap';
      before: string;
      after: string;
      placeholder: string;
    }
  | {
      kind: 'linePrefix';
      prefix: string | ((index: number) => string);
      placeholder?: string;
    }
  | {
      kind: 'custom';
      transform: SelectionTransform;
    };

type ToolbarItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: ToolbarAction;
};

const TOOLBAR_ITEMS: ToolbarItem[] = [
  {
    id: 'bold',
    label: 'Bold',
    icon: Bold,
    action: { kind: 'wrap', before: '**', after: '**', placeholder: 'bold text' },
  },
  {
    id: 'italic',
    label: 'Italic',
    icon: Italic,
    action: { kind: 'wrap', before: '_', after: '_', placeholder: 'italic text' },
  },
  {
    id: 'heading',
    label: 'Heading',
    icon: Heading,
    action: { kind: 'linePrefix', prefix: '## ', placeholder: 'Heading' },
  },
  {
    id: 'quote',
    label: 'Quote',
    icon: Quote,
    action: { kind: 'linePrefix', prefix: '> ', placeholder: 'Quote' },
  },
  {
    id: 'bulleted',
    label: 'Bulleted list',
    icon: ListIcon,
    action: { kind: 'linePrefix', prefix: '- ', placeholder: 'List item' },
  },
  {
    id: 'numbered',
    label: 'Numbered list',
    icon: ListOrdered,
    action: { kind: 'linePrefix', prefix: (i) => `${i + 1}. `, placeholder: 'List item' },
  },
  {
    id: 'checkbox',
    label: 'Task list',
    icon: ListChecks,
    action: { kind: 'linePrefix', prefix: '- [ ] ', placeholder: 'Todo' },
  },
  {
    id: 'code',
    label: 'Inline code',
    icon: CodeIcon,
    action: { kind: 'wrap', before: '`', after: '`', placeholder: 'code' },
  },
  {
    id: 'link',
    label: 'Link',
    icon: LinkIcon,
    action: {
      kind: 'custom',
      transform: (selection) => {
        const label = selection || 'link text';
        const inserted = `[${label}](https://)`;
        const urlStart = inserted.indexOf('https://');
        return {
          text: inserted,
          selectionStart: urlStart,
          selectionEnd: urlStart + 'https://'.length,
        };
      },
    },
  },
];

function applyAction(
  textarea: HTMLTextAreaElement,
  value: string,
  action: ToolbarAction,
): { next: string; selectionStart: number; selectionEnd: number } {
  const start = textarea.selectionStart ?? value.length;
  const end = textarea.selectionEnd ?? value.length;
  const selected = value.slice(start, end);

  if (action.kind === 'wrap') {
    const inner = selected || action.placeholder;
    const inserted = `${action.before}${inner}${action.after}`;
    const next = `${value.slice(0, start)}${inserted}${value.slice(end)}`;
    const innerStart = start + action.before.length;
    return { next, selectionStart: innerStart, selectionEnd: innerStart + inner.length };
  }

  if (action.kind === 'linePrefix') {
    // Expand selection to whole lines.
    const lineStart = value.lastIndexOf('\n', Math.max(start - 1, 0)) + 1;
    let lineEnd = value.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = value.length;

    const block = value.slice(lineStart, lineEnd);
    const lines = block.length === 0 ? [''] : block.split('\n');
    const newLines = lines.map((line, idx) => {
      const prefix = typeof action.prefix === 'function' ? action.prefix(idx) : action.prefix;
      if (line.length === 0 && action.placeholder && lines.length === 1) {
        return `${prefix}${action.placeholder}`;
      }
      return `${prefix}${line}`;
    });
    const replacement = newLines.join('\n');

    // Insert a leading newline if we're not at the very start of the document
    // and the previous character isn't already a newline. This avoids merging
    // the new block with the preceding paragraph.
    const needsLeadingNewline = lineStart > 0 && value[lineStart - 1] !== '\n' && lineStart === start;
    const finalReplacement = needsLeadingNewline ? `\n${replacement}` : replacement;
    const next = `${value.slice(0, lineStart)}${finalReplacement}${value.slice(lineEnd)}`;
    const cursor = lineStart + finalReplacement.length;
    return { next, selectionStart: cursor, selectionEnd: cursor };
  }

  // custom
  const result = action.transform(selected);
  const next = `${value.slice(0, start)}${result.text}${value.slice(end)}`;
  const selStart = start + (result.selectionStart ?? result.text.length);
  const selEnd = start + (result.selectionEnd ?? result.text.length);
  return { next, selectionStart: selStart, selectionEnd: selEnd };
}

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  textareaClassName?: string;
  className?: string;
  /** Whether the live preview pane is shown by default. Defaults to true. */
  defaultPreviewVisible?: boolean;
  ariaLabel?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 5,
  textareaClassName,
  className,
  defaultPreviewVisible = true,
  ariaLabel,
}: MarkdownEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [previewVisible, setPreviewVisible] = React.useState(defaultPreviewVisible);

  const runAction = (action: ToolbarAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { next, selectionStart, selectionEnd } = applyAction(textarea, value, action);
    onChange(next);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const trimmed = value.trim();

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-0.5">
        {TOOLBAR_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAction(item.action)}
              title={item.label}
              aria-label={item.label}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/85 transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          );
        })}
        <span className="ml-auto" />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setPreviewVisible((v) => !v)}
          title={previewVisible ? 'Hide preview' : 'Show preview'}
          aria-label={previewVisible ? 'Hide preview' : 'Show preview'}
          aria-pressed={previewVisible}
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/85 transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {previewVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          Preview
        </button>
      </div>

      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(
          'resize-y border-0 bg-transparent px-0 py-0 text-[13px] leading-6 shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0',
          textareaClassName,
        )}
      />

      {previewVisible && (
        <div className="rounded-lg border border-border/50 bg-foreground/[0.02] px-3 py-2.5">
          <div className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
            <Eye className="h-3 w-3" />
            Preview
          </div>
          {trimmed.length > 0 ? (
            <div className={MARKDOWN_PROSE_CLASSNAME}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-[12px] italic text-muted-foreground/55">
              Nothing to preview yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
