import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  textareaClassName?: string;
  className?: string;
  defaultPreviewVisible?: boolean;
  ariaLabel?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 5,
  className,
  ariaLabel,
}: MarkdownEditorProps) {
  const suppressUpdate = React.useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: placeholder ?? 'Add description...' }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        'aria-label': ariaLabel ?? 'Description',
        role: 'textbox',
        class: cn(
          MARKDOWN_PROSE_CLASSNAME,
          'outline-none min-h-[var(--editor-min-h)] cursor-text',
        ),
      },
    },
    onUpdate: ({ editor: e }) => {
      suppressUpdate.current = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = (e.storage as any).markdown.getMarkdown() as string;
      onChange(md);
    },
  });

  React.useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (suppressUpdate.current) {
      suppressUpdate.current = false;
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const md = (editor.storage as any).markdown.getMarkdown() as string;
    if (md !== value) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  const minH = `${Math.max(rows * 1.625, 3)}rem`;

  return (
    <div
      className={cn('flex min-w-0 flex-col gap-2', className)}
      style={{ '--editor-min-h': minH } as React.CSSProperties}
    >
      {editor && (
        <div className="flex flex-wrap items-center gap-0.5">
          <ToolbarButton
            icon={Bold}
            label="Bold"
            active={editor.isActive('bold')}
            onAction={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            icon={Italic}
            label="Italic"
            active={editor.isActive('italic')}
            onAction={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            icon={Heading}
            label="Heading"
            active={editor.isActive('heading')}
            onAction={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <ToolbarButton
            icon={Quote}
            label="Quote"
            active={editor.isActive('blockquote')}
            onAction={() => editor.chain().focus().toggleBlockquote().run()}
          />
          <ToolbarButton
            icon={ListIcon}
            label="Bulleted list"
            active={editor.isActive('bulletList')}
            onAction={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            icon={ListOrdered}
            label="Numbered list"
            active={editor.isActive('orderedList')}
            onAction={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarButton
            icon={ListChecks}
            label="Task list"
            active={editor.isActive('taskList')}
            onAction={() => editor.chain().focus().toggleTaskList().run()}
          />
          <ToolbarButton
            icon={CodeIcon}
            label="Inline code"
            active={editor.isActive('code')}
            onAction={() => editor.chain().focus().toggleCode().run()}
          />
          <ToolbarButton
            icon={LinkIcon}
            label="Link"
            active={editor.isActive('link')}
            onAction={() => {
              if (editor.isActive('link')) {
                editor.chain().focus().unsetLink().run();
              } else {
                const url = window.prompt('URL');
                if (url) editor.chain().focus().setLink({ href: url }).run();
              }
            }}
          />
        </div>
      )}

      <EditorContent
        editor={editor}
        className={cn(
          '[&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground/45 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:text-[13px]',
          '[&_.tiptap_ul[data-type=taskList]]:list-none [&_.tiptap_ul[data-type=taskList]]:pl-0',
          '[&_.tiptap_ul[data-type=taskList]_li]:flex [&_.tiptap_ul[data-type=taskList]_li]:items-start [&_.tiptap_ul[data-type=taskList]_li]:gap-2',
          '[&_.tiptap_ul[data-type=taskList]_li_label_input]:mt-1',
        )}
      />
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  active,
  onAction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onAction: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onAction}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        active
          ? 'bg-foreground/[0.08] text-foreground'
          : 'text-muted-foreground/85',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
