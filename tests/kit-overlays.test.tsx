// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { OverlaysSection } from '../src/ui/gallery/OverlaysSection';

afterEach(() => {
  cleanup();
});

describe('kit overlays gallery', () => {
  it('renders the overlays section with a specimen for every overlay', () => {
    render(<OverlaysSection />);

    expect(screen.getByTestId('gallery-overlays')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Overlays' })).toBeTruthy();

    for (const id of [
      'kit-menu',
      'kit-context-menu',
      'kit-dialog',
      'kit-confirm-dialog',
      'kit-prompt-dialog',
    ]) {
      expect(screen.getByTestId(id)).toBeTruthy();
    }
  });

  it('shows the menu closed and open, with hovered, focused, disabled and danger items', () => {
    render(<OverlaysSection />);

    const closedTrigger = screen.getByTestId('menu-closed-trigger');
    expect(closedTrigger.getAttribute('aria-expanded')).toBe('false');
    expect((screen.getByTestId('menu-closed') as HTMLElement).hidden).toBe(true);

    fireEvent.click(closedTrigger);
    expect(closedTrigger.getAttribute('aria-expanded')).toBe('true');
    expect((screen.getByTestId('menu-closed') as HTMLElement).hidden).toBe(false);

    fireEvent.mouseDown(document.body);
    expect(closedTrigger.getAttribute('aria-expanded')).toBe('false');
    expect((screen.getByTestId('menu-closed') as HTMLElement).hidden).toBe(true);

    fireEvent.click(closedTrigger);
    expect(closedTrigger.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(screen.getByTestId('menu-open-trigger'));

    const open = screen.getByTestId('menu-open') as HTMLElement;
    expect(open.hidden).toBe(false);
    expect(open.getAttribute('role')).toBe('menu');
    expect(within(open).getAllByRole('menuitem')).toHaveLength(7);
    expect(open.querySelectorAll('.menu-sep')).toHaveLength(2);

    const hovered = screen.getByTestId('menu-item-hover');
    expect(hovered.className).toContain('menu-item');
    expect(hovered.className).toContain('is-preview-hover');
    expect(within(hovered).getByText('Ctrl+S')).toBeTruthy();

    const focused = screen.getByTestId('menu-item-focus');
    expect(focused.className).toContain('is-preview-focus');

    const disabled = screen.getByTestId('menu-item-disabled') as HTMLButtonElement;
    expect(disabled.disabled).toBe(true);
    expect(disabled.getAttribute('aria-disabled')).toBe('true');

    const danger = screen.getByTestId('menu-item-danger');
    expect(danger.className).toContain('is-danger');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closedTrigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('shows the context menu and closes it when an action is chosen', () => {
    render(<OverlaysSection />);

    const menu = screen.getByTestId('context-menu');
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.getAttribute('aria-label')).toBe('File actions for legacy.ts');
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(4);
    expect(within(menu).getByRole('menuitem', { name: /New File/ })).toBeTruthy();
    expect(within(menu).getByRole('menuitem', { name: /New Folder/ })).toBeTruthy();
    expect(within(menu).getByRole('menuitem', { name: /Rename/ })).toBeTruthy();

    const rename = screen.getByTestId('context-menu-item-rename');
    expect(rename.className).toContain('is-preview-hover');

    const remove = screen.getByTestId('context-menu-item-delete');
    expect(remove.className).toContain('is-danger');

    fireEvent.click(screen.getByTestId('context-menu-item-new-file'));
    expect(screen.queryByTestId('context-menu')).toBeNull();
    expect(screen.getByTestId('context-menu-restore')).toBeTruthy();
  });

  it('opens and escapes the base dialog over the application', () => {
    render(<OverlaysSection />);

    expect(screen.getByTestId('dialog-contained')).toBeTruthy();
    expect(screen.getByText('Ctrl+S saves without closing')).toBeTruthy();
    expect(screen.queryByTestId('dialog-modal')).toBeNull();

    fireEvent.click(screen.getByTestId('dialog-open-button'));
    const modal = screen.getByTestId('dialog-modal');
    expect(modal.getAttribute('role')).toBe('alertdialog');
    expect(modal.getAttribute('aria-modal')).toBe('true');
    expect(within(modal).getByText('documents.ts · unsaved')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('dialog-modal')).toBeNull();
    expect(screen.getByTestId('dialog-open-button')).toBeTruthy();
  });

  it('shows the default and danger confirm dialogs', () => {
    render(<OverlaysSection />);

    const standard = screen.getByTestId('confirm-dialog-default');
    expect(standard.getAttribute('role')).toBe('alertdialog');
    expect(within(standard).getByRole('heading', { name: 'Discard unsaved changes?' })).toBeTruthy();
    expect(within(standard).getByText('3 tabs')).toBeTruthy();
    expect(within(standard).getByText('Checked against the workspace root')).toBeTruthy();
    expect(within(standard).getByRole('button', { name: 'Discard' }).className).toContain('btn-primary');
    expect(within(standard).getByRole('button', { name: 'Cancel' })).toBeTruthy();

    const danger = screen.getByTestId('confirm-dialog-danger');
    expect(within(danger).getByRole('heading', { name: 'Delete legacy.ts?' })).toBeTruthy();
    expect(within(danger).getByText('src/state/legacy.ts')).toBeTruthy();
    expect(within(danger).getByText('Path checked inside forge-editor')).toBeTruthy();
    expect(within(danger).getByRole('button', { name: 'Delete' }).className).toContain('btn-danger');
    expect(danger.querySelector('.dialog-icon')?.className).toContain('is-danger');
  });

  it('cancels the danger confirmation when the backdrop is clicked', () => {
    render(<OverlaysSection />);

    const danger = screen.getByTestId('confirm-dialog-danger');
    fireEvent.mouseDown(danger.parentElement as HTMLElement);
    expect(screen.queryByTestId('confirm-dialog-danger')).toBeNull();
    expect(screen.getByTestId('confirm-dialog-danger-restore')).toBeTruthy();
  });

  it('shows the prompt dialog idle, focused and with a validation message', () => {
    render(<OverlaysSection />);

    const idle = screen.getByTestId('prompt-dialog-idle');
    const idleInput = screen.getByTestId('prompt-dialog-idle-input') as HTMLInputElement;
    expect(idleInput.placeholder).toBe('file.ts');
    expect(idleInput.value).toBe('');
    expect(within(idle).getByText('The operation is checked against the workspace root.')).toBeTruthy();

    const focused = screen.getByTestId('prompt-dialog-focused');
    const focusedInput = screen.getByTestId('prompt-dialog-focused-input') as HTMLInputElement;
    expect(focusedInput.value).toBe('legacy.ts');
    expect(focusedInput.className).toContain('is-preview-focus');
    expect(within(focused).getByRole('button', { name: 'Create' })).toBeTruthy();

    const withError = screen.getByTestId('prompt-dialog-error');
    const errorInput = screen.getByTestId('prompt-dialog-error-input') as HTMLInputElement;
    expect(errorInput.getAttribute('aria-invalid')).toBe('true');
    expect(errorInput.getAttribute('aria-describedby')).toBeTruthy();
    const alert = within(withError).getByRole('alert');
    expect(alert.textContent).toContain('A file named documents.ts already exists in src/state.');
  });

  it('closes a prompt on cancel and restores it from the gallery', () => {
    render(<OverlaysSection />);

    const idle = screen.getByTestId('prompt-dialog-idle');
    fireEvent.click(within(idle).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByTestId('prompt-dialog-idle')).toBeNull();

    fireEvent.click(screen.getByTestId('prompt-dialog-idle-restore'));
    expect(screen.getByTestId('prompt-dialog-idle')).toBeTruthy();
  });

  it('closes an open prompt on Escape', () => {
    render(<OverlaysSection />);

    expect(screen.getByTestId('prompt-dialog-error')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('prompt-dialog-error')).toBeNull();
    expect(screen.getByTestId('prompt-dialog-error-restore')).toBeTruthy();
  });
});

describe('kit palette gallery', () => {
  it('renders quick open, the command palette and an empty result', () => {
    render(<OverlaysSection />);

    expect(screen.getByTestId('kit-palette')).toBeTruthy();

    const quickOpen = screen.getByTestId('palette-quick-open');
    const quickInput = within(quickOpen).getByRole('textbox') as HTMLInputElement;
    expect(quickInput.value).toBe('docu');
    expect(within(quickOpen).getByRole('listbox', { name: /Quick open results/ })).toBeTruthy();
    expect(within(quickOpen).getAllByRole('option').length).toBeGreaterThan(0);
    expect(
      within(quickOpen)
        .getAllByRole('option')
        .some((option) => option.getAttribute('aria-selected') === 'true'),
    ).toBe(true);
    expect(within(quickOpen).getByText('Workspace files')).toBeTruthy();
    expect(within(quickOpen).getByText('Navigate')).toBeTruthy();
    expect(within(quickOpen).getByText('Open')).toBeTruthy();
    expect(within(quickOpen).getByText('Close')).toBeTruthy();

    const commands = screen.getByTestId('palette-command');
    expect(within(commands).getByText('View')).toBeTruthy();
    expect(within(commands).getByText('Ctrl+Shift+P')).toBeTruthy();
    expect(within(commands).getByText('Run')).toBeTruthy();

    const empty = screen.getByTestId('palette-empty');
    expect(within(empty).getByText('No workspace file matches that query.')).toBeTruthy();
  });

  it('filters quick open as the query changes', () => {
    render(<OverlaysSection />);

    const quickOpen = screen.getByTestId('palette-quick-open');
    const input = within(quickOpen).getByRole('textbox');

    fireEvent.change(input, { target: { value: 'types' } });
    const labels = within(quickOpen)
      .getAllByRole('option')
      .map((option) => option.textContent ?? '');
    expect(labels).toHaveLength(1);
    expect(labels[0]).toContain('types.ts');
  });
});
