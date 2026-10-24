// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

const bridge = vi.hoisted(() => ({
  userDataPath: vi.fn(),
  clearLocalData: vi.fn(),
}));

vi.mock('../src/platform', () => ({
  platform: {
    persist: {
      userDataPath: bridge.userDataPath,
      clearLocalData: bridge.clearLocalData,
    },
  },
}));

import { AboutDialog } from '../src/components/AboutDialog';

const THEME_CSS = readFileSync(resolve(process.cwd(), 'src/styles/theme.css'), 'utf-8');
const KIT_CSS = readFileSync(resolve(process.cwd(), 'src/ui/kit.css'), 'utf-8');

function injectStyles(): void {
  for (const css of [THEME_CSS, KIT_CSS]) {
    const style = document.createElement('style');
    style.textContent = css;
    style.dataset.test = 'about-overflow';
    document.head.appendChild(style);
  }
}

beforeEach(() => {
  bridge.userDataPath.mockReset();
  bridge.userDataPath.mockResolvedValue('C:\\Users\\tester\\AppData\\Roaming\\Forge');
  bridge.clearLocalData.mockReset();
  bridge.clearLocalData.mockResolvedValue({ ok: true });

  injectStyles();
});

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('style[data-test="about-overflow"]').forEach((node) => node.remove());
});

describe('about dialog body overflow', () => {
  it('keeps the vendor details complete inside the scrolling body', async () => {
    render(createElement(AboutDialog, { open: true, onClose: () => undefined }));

    const body = screen.getByTestId('about-body');
    const actions = screen.getByTestId('about-actions');
    const vendor = screen.getByRole('heading', { name: 'Vendor details' }).closest('section');

    expect(vendor).not.toBeNull();
    expect(body.contains(vendor as Node)).toBe(true);
    expect(
      within(vendor as HTMLElement).getByText(
        /Provider name, contact address and legal notice are still to be supplied by the vendor\./,
      ),
    ).toBeTruthy();
    expect(
      within(vendor as HTMLElement).getByText(/These fields are intentionally not invented\./),
    ).toBeTruthy();

    expect(body.contains(actions)).toBe(false);
    expect(body.nextElementSibling).toBe(actions);

    const bodyStyle = getComputedStyle(body);
    expect(bodyStyle.overflowY).toBe('auto');
    expect(bodyStyle.flexGrow).toBe('1');
    expect(bodyStyle.flexShrink).toBe('1');
    expect(bodyStyle.minHeight).toBe('0px');
  });

  it('keeps the vendor paragraph as the last content of the bounded scrolling body', async () => {
    render(createElement(AboutDialog, { open: true, onClose: () => undefined }));

    const dialog = screen.getByRole('dialog');
    const body = screen.getByTestId('about-body');
    const actions = screen.getByTestId('about-actions');
    const vendor = screen.getByRole('heading', { name: 'Vendor details' }).closest('section');

    // The card is the bounded box; the body is the one part that scrolls, so the
    // vendor section is the final reachable content and the footer never scrolls
    // over it.
    expect(getComputedStyle(dialog).overflow).toBe('hidden');
    expect(getComputedStyle(dialog).maxHeight).not.toBe('none');
    expect(getComputedStyle(actions).flexShrink).toBe('0');
    expect(body.lastElementChild).toBe(vendor);
    expect(
      within(vendor as HTMLElement).getByText(
        /Provider name, contact address and legal notice are still to be supplied by the vendor\. These fields are intentionally not invented\./,
      ),
    ).toBeTruthy();
  });

  it('makes the scrolling body reachable and operable from the keyboard', () => {
    render(createElement(AboutDialog, { open: true, onClose: () => undefined }));

    const body = screen.getByTestId('about-body');

    expect(body.getAttribute('tabindex')).toBe('0');
    expect(body.getAttribute('role')).toBe('region');
    expect(body.getAttribute('aria-label')).toBe('About / Privacy details');
    expect(document.activeElement).toBe(body);
  });

  it('stays closable with Escape while the scroll body holds focus', () => {
    const onClose = vi.fn();
    render(createElement(AboutDialog, { open: true, onClose }));

    const body = screen.getByTestId('about-body');
    expect(document.activeElement).toBe(body);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
