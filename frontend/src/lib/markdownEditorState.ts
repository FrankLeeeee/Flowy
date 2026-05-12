export interface MarkdownEditorViewState {
  showToggle: boolean;
  showRawText: boolean;
  toggleLabel: 'Markdown' | 'Raw text';
}

export function getMarkdownEditorViewState(
  enableRawToggle: boolean,
  rawMarkdown: boolean,
  isMobile: boolean,
): MarkdownEditorViewState {
  const showToggle = enableRawToggle && !isMobile;
  const showRawText = rawMarkdown && !isMobile;
  return {
    showToggle,
    showRawText,
    toggleLabel: showRawText ? 'Raw text' : 'Markdown',
  };
}
