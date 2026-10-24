// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { FoundationsSection } from '../src/ui/gallery/FoundationsSection';
import { Notifications, notify } from '../src/ui/Notify';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const SPECIMENS = [
  'kit-buttons',
  'kit-icon-buttons',
  'kit-text-field',
  'kit-toggle',
  'kit-listbox',
  'kit-empty-state',
  'kit-icons',
  'kit-tooltip',
  'kit-tree-row',
  'kit-tab-chip',
  'kit-status-item',
  'kit-notice',
];

describe('kit foundations gallery', () => {
  it('renders the foundations section with a specimen for every component', () => {
    render(<FoundationsSection />);

    expect(screen.getByTestId('gallery-foundations')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Foundations' })).toBeTruthy();

    for (const id of SPECIMENS) {
      expect(screen.getByTestId(id)).toBeTruthy();
    }
  });

  it('shows every button variant, size and interaction state', () => {
    render(<FoundationsSection />);

    const ids = [
      'button-default-idle',
      'button-default-hover',
      'button-default-focus',
      'button-default-active',
      'button-default-disabled',
      'button-primary-idle',
      'button-primary-hover',
      'button-primary-disabled',
      'button-ghost-idle',
      'button-ghost-hover',
      'button-danger-idle',
      'button-danger-hover',
      'button-size-sm',
      'button-size-md',
      'button-size-lg',
    ];

    for (const id of ids) {
      expect(screen.getByTestId(id)).toBeTruthy();
    }

    expect((screen.getByTestId('button-default-disabled') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('button-primary-disabled') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('button-default-hover').className).toContain('is-preview-hover');
    expect(screen.getByTestId('button-default-focus').className).toContain('is-preview-focus');
    expect(screen.getByTestId('button-default-active').className).toContain('is-preview-active');
    expect(screen.getByTestId('button-primary-idle').className).toContain('btn-primary');
    expect(screen.getByTestId('button-ghost-idle').className).toContain('btn-ghost');
    expect(screen.getByTestId('button-danger-idle').className).toContain('btn-danger');
    expect(screen.getByTestId('button-size-sm').className).toContain('btn-sm');
    expect(screen.getByTestId('button-size-lg').className).toContain('btn-lg');
  });

  it('shows icon buttons in idle, hover, focus and disabled states', () => {
    render(<FoundationsSection />);

    const specimen = screen.getByTestId('kit-icon-buttons');
    expect(screen.getByTestId('icon-button-idle').className).toContain('icon-btn');
    expect(screen.getByTestId('icon-button-hover').className).toContain('is-preview-hover');
    expect(screen.getByTestId('icon-button-focus').className).toContain('is-preview-focus');
    expect((screen.getByTestId('icon-button-disabled') as HTMLButtonElement).disabled).toBe(true);
    expect(within(specimen).getAllByRole('button')).toHaveLength(4);
  });

  it('shows text fields with hint, focus, error and disabled states', () => {
    render(<FoundationsSection />);

    const idle = screen.getByTestId('text-field-idle');
    expect(idle.getAttribute('placeholder')).toBe('file.ts');
    expect(screen.getByText('The operation is checked against the workspace root.')).toBeTruthy();

    expect(screen.getByTestId('text-field-hover').className).toContain('is-preview-hover');
    expect(screen.getByTestId('text-field-focus').className).toContain('is-preview-focus');

    const invalid = screen.getByTestId('text-field-error');
    expect(invalid.getAttribute('aria-invalid')).toBe('true');
    expect(
      within(screen.getByTestId('kit-text-field')).getByRole('alert').textContent,
    ).toContain('already exists in src/state');
    expect(invalid.getAttribute('aria-describedby')).toBeTruthy();

    expect((screen.getByTestId('text-field-disabled') as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByTestId('text-field-lg').className).toContain('input-lg');
  });

  it('shows the toggle in off, on, focused and disabled states', () => {
    render(<FoundationsSection />);

    const off = within(screen.getByTestId('toggle-off')).getByRole('checkbox') as HTMLInputElement;
    const on = within(screen.getByTestId('toggle-on')).getByRole('checkbox') as HTMLInputElement;
    const hovered = within(screen.getByTestId('toggle-hover')).getByRole('checkbox') as HTMLInputElement;
    const focused = within(screen.getByTestId('toggle-focus')).getByRole('checkbox') as HTMLInputElement;
    const disabledOff = within(screen.getByTestId('toggle-disabled-off'))
      .getByRole('checkbox') as HTMLInputElement;
    const disabledOn = within(screen.getByTestId('toggle-disabled-on'))
      .getByRole('checkbox') as HTMLInputElement;

    expect(off.checked).toBe(false);
    expect(on.checked).toBe(true);
    expect(hovered.checked).toBe(true);
    expect(screen.getByTestId('toggle-hover').className).toContain('is-preview-hover');
    expect(focused.checked).toBe(true);
    expect(screen.getByTestId('toggle-focus').className).toContain('is-preview-focus');
    expect(disabledOff.disabled).toBe(true);
    expect(disabledOn.disabled).toBe(true);
    expect(disabledOn.checked).toBe(true);

    fireEvent.click(off);
    expect((within(screen.getByTestId('toggle-off')).getByRole('checkbox') as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it('shows list rows selected, disabled, recent and empty', () => {
    render(<FoundationsSection />);

    const palette = screen.getByTestId('listbox-palette');
    const options = within(palette).getAllByRole('option');
    expect(options).toHaveLength(4);

    const selected = within(palette).getByRole('option', { name: /Open Folder/ });
    expect(selected.getAttribute('aria-selected')).toBe('true');

    const disabled = within(palette).getByRole('option', { name: /Split Editor/ }) as HTMLButtonElement;
    expect(disabled.disabled).toBe(true);

    const recent = screen.getByTestId('listbox-recent');
    expect(within(recent).getAllByRole('option')).toHaveLength(3);
    expect(within(recent).getByText('C:\\Users\\Patrick\\Projects\\forge')).toBeTruthy();

    expect(screen.getByTestId('listbox-empty').textContent).toBe('No matching entries.');
  });

  it('shows the editor empty state and the sidebar empty state', () => {
    render(<FoundationsSection />);

    expect(within(screen.getByTestId('empty-state-page')).getByRole('heading', { name: 'No file open' })).toBeTruthy();
    expect(
      within(screen.getByTestId('empty-state-page')).getByText(
        'Select a file from the explorer to open it in the editor.',
      ),
    ).toBeTruthy();
    expect(within(screen.getByTestId('empty-state-inline')).getByText(
      'Open a folder to build the workspace tree.',
    )).toBeTruthy();
  });

  it('shows the icon sizes and every bundled symbol', () => {
    render(<FoundationsSection />);

    expect(screen.getByTestId('icon-sm').getAttribute('class')).toContain('icon-sm');
    expect(screen.getByTestId('icon-md').getAttribute('class')).toContain('icon');
    expect(screen.getByTestId('icon-lg').getAttribute('class')).toContain('icon-lg');
    expect(screen.getByRole('img', { name: 'chevron-down' })).toBeTruthy();
  });

  it('shows a tooltip label for an icon button', () => {
    render(<FoundationsSection />);

    expect(within(screen.getByTestId('tooltip-refresh')).getByRole('tooltip').textContent).toBe(
      'Refresh explorer',
    );
    expect(within(screen.getByTestId('tooltip-close')).getByRole('tooltip').textContent).toBe(
      'Close documents.ts',
    );
    expect(within(screen.getByTestId('tooltip-open')).getByRole('tooltip').textContent).toBe(
      'Open the command palette',
    );
  });

  it('shows tree rows expanded, active and with badges', () => {
    render(<FoundationsSection />);

    expect(screen.getByTestId('tree-row-folder').getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByTestId('tree-row-folder-expanded').getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('tree-row-file-active').className).toContain('is-active');
    expect(screen.getByTestId('tree-row-file-active').getAttribute('aria-current')).toBe('page');
    expect(screen.getByTestId('tree-row-file-hover').className).toContain('is-preview-hover');
    expect(within(screen.getByTestId('tree-row-badge-bin')).getByText('BIN')).toBeTruthy();
    expect(within(screen.getByTestId('tree-row-badge-size')).getByText('4.8 MB')).toBeTruthy();
  });

  it('shows active, inactive, hover and dirty tab chips', () => {
    render(<FoundationsSection />);

    const active = screen.getByTestId('tab-chip-tab-documents');
    const inactive = screen.getByTestId('tab-chip-tab-tabs-reducer');

    expect(active.getAttribute('aria-selected')).toBe('true');
    expect(inactive.getAttribute('aria-selected')).toBe('false');
    expect(within(active).getByRole('img', { name: 'Unsaved changes' })).toBeTruthy();
    expect(screen.getByTestId('tab-chip-hover').className).toContain('is-preview-hover');
    expect(screen.getByTestId('tab-chip-focus').className).toContain('is-preview-focus');

    fireEvent.click(inactive);
    expect(screen.getByTestId('tab-chip-tab-tabs-reducer').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('tab-chip-tab-documents').getAttribute('aria-selected')).toBe('false');

    fireEvent.click(within(screen.getByTestId('tab-chip-tab-documents')).getByRole('button', {
      name: 'Close documents.ts',
    }));
    expect(within(screen.getByTestId('tab-chip-tab-documents')).queryByRole('img', {
      name: 'Unsaved changes',
    })).toBeNull();
  });

  it('shows status items with a strong marker and a title', () => {
    render(<FoundationsSection />);

    expect(within(screen.getByTestId('status-item-welcome')).getByText('Welcome')).toBeTruthy();
    expect(screen.getByTestId('status-item-muted').textContent).toBe('No active document');
    expect(screen.getByTestId('status-item-titled').getAttribute('title')).toBe('Encoding');
  });

  it('shows the info notice and the error variant, both dismissable', () => {
    render(<FoundationsSection />);

    const info = screen.getByTestId('notice-info');
    const error = screen.getByTestId('notice-error');

    expect(info.getAttribute('role')).toBe('status');
    expect(within(info).getByText('Workspace opened')).toBeTruthy();
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.className).toContain('is-error');
    expect(within(error).getByText('hero.png can’t be opened')).toBeTruthy();
    expect(
      within(error).getByText('Binary files are not supported in the text editor. No tab was created.'),
    ).toBeTruthy();

    fireEvent.click(within(error).getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByTestId('notice-error')).toBeNull();
    expect(screen.getByTestId('notice-error-restore')).toBeTruthy();
  });

  it('shows messages through the notifications host', () => {
    vi.useFakeTimers();

    notify('Your settings are stored locally.', 'info', { title: 'Preferences saved.' });
    notify('Could not write session.json.', 'error');

    render(<Notifications />);

    expect(screen.getByTestId('notifications')).toBeTruthy();
    expect(screen.getByText('Preferences saved.')).toBeTruthy();
    expect(screen.getByText('Your settings are stored locally.')).toBeTruthy();
    expect(screen.getByText('Could not write session.json.')).toBeTruthy();

    for (const button of screen.getAllByRole('button', { name: 'Dismiss notification' })) {
      fireEvent.click(button);
    }
    expect(screen.queryByTestId('notifications')).toBeNull();
  });
});
