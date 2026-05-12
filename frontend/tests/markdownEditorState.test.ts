import { describe, expect, it } from 'vitest';
import { getMarkdownEditorViewState } from '../src/lib/markdownEditorState';

describe('getMarkdownEditorViewState', () => {
  describe('desktop', () => {
    it('shows the toggle and Markdown label by default', () => {
      expect(getMarkdownEditorViewState(true, false, false)).toEqual({
        showToggle: true,
        showRawText: false,
        toggleLabel: 'Markdown',
      });
    });

    it('shows the toggle and Raw text label when raw mode is on', () => {
      expect(getMarkdownEditorViewState(true, true, false)).toEqual({
        showToggle: true,
        showRawText: true,
        toggleLabel: 'Raw text',
      });
    });

    it('hides the toggle when the feature is disabled', () => {
      expect(getMarkdownEditorViewState(false, false, false)).toEqual({
        showToggle: false,
        showRawText: false,
        toggleLabel: 'Markdown',
      });
    });
  });

  describe('mobile', () => {
    it('hides the toggle and forces markdown view even when raw mode is on', () => {
      expect(getMarkdownEditorViewState(true, true, true)).toEqual({
        showToggle: false,
        showRawText: false,
        toggleLabel: 'Markdown',
      });
    });

    it('hides the toggle when the feature is enabled but viewport is mobile', () => {
      expect(getMarkdownEditorViewState(true, false, true)).toEqual({
        showToggle: false,
        showRawText: false,
        toggleLabel: 'Markdown',
      });
    });

    it('hides the toggle when the feature is disabled', () => {
      expect(getMarkdownEditorViewState(false, false, true)).toEqual({
        showToggle: false,
        showRawText: false,
        toggleLabel: 'Markdown',
      });
    });
  });
});
