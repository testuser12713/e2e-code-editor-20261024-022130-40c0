// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

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
import { Dialog } from '../src/ui/Dialog';

const THEME_CSS = readFileSync(resolve(process.cwd(), 'src/styles/theme.css'), 'utf-8');
const KIT_CSS = readFileSync(resolve(process.cwd(), 'src/ui/kit.css'), 'utf-8');
const USER_DATA_PATH = 'C:\\Users\\tester\\AppData\\Roaming\\Forge';

function injectStyles(): void {
  for (const css of [THEME_CSS, KIT_CSS]) {
    const style = document.createElement('style');
    style.textContent = css;
    style.dataset.test = 'dialog-layout';
    document.head.appendChild(style);
  }
}

beforeEach(() => {
  bridge.userDataPath.mockReset();
  bridge.userDataPath.mockResolvedValue(USER_DATA_PATH);
  bridge.clearLocalData.mockReset();
  bridge.clearLocalData.mockResolvedValue({ ok: true });

  injectStyles();
});

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('style[data-test="dialog-layout"]').forEach((node) => node.remove());
});

describe('about dialog layout', () => {
  it('keeps the footer outside the scrolling body', async () => {
    render(createElement(AboutDialog, { open: true, onClose: () => undefined }));

    const card = screen.getByRole('dialog');
    const body = screen.getByTestId('about-body');
    const actions = screen.getByTestId('about-actions');

    expect(card.classList.contains('about-dialog')).toBe(true);
    expect(card.contains(body)).toBe(true);
    expect(card.contains(actions)).toBe(true);
    expect(body.contains(actions)).toBe(false);
    expect(body.nextElementSibling).toBe(actions);

    expect(body.contains(screen.getByRole('heading', { name: 'Vendor details' }))).toBe(true);

    const cardStyle = getComputedStyle(card);
    expect(cardStyle.display).toBe('flex');
    expect(cardStyle.flexDirection).toBe('column');
    expect(cardStyle.overflow).toBe('hidden');
    expect(cardStyle.maxHeight).not.toBe('none');

    const bodyStyle = getComputedStyle(body);
    expect(bodyStyle.overflowY).toBe('auto');
    expect(bodyStyle.flexShrink).toBe('1');
    expect(bodyStyle.minHeight).toBe('0px');

    const actionsStyle = getComputedStyle(actions);
    expect(actionsStyle.flexShrink).toBe('0');

    expect(bridge.userDataPath).toHaveBeenCalled();
  });
});

describe('shared dialog chrome', () => {
  it('scrolls the content region while the footer stays in place', () => {
    render(
      createElement(Dialog, {
        open: true,
        title: 'Save changes before closing?',
        description: 'The file has unsaved changes.',
        footer: createElement('button', { type: 'button' }, 'Cancel'),
        onClose: () => undefined,
        testId: 'layout-dialog',
      }),
    );

    const card = screen.getByTestId('layout-dialog');
    const content = card.querySelector('.dialog-content');
    const footer = card.querySelector('.dialog-actions');

    expect(content).not.toBeNull();
    expect(footer).not.toBeNull();
    expect(content?.contains(footer as Node)).toBe(false);
    expect(content?.nextElementSibling).toBe(footer);

    const cardStyle = getComputedStyle(card);
    expect(cardStyle.display).toBe('flex');
    expect(cardStyle.flexDirection).toBe('column');
    expect(cardStyle.overflow).toBe('hidden');

    const contentStyle = getComputedStyle(content as Element);
    expect(contentStyle.overflowY).toBe('auto');
    expect(contentStyle.flexShrink).toBe('1');
    expect(contentStyle.minHeight).toBe('0px');

    const footerStyle = getComputedStyle(footer as Element);
    expect(footerStyle.flexShrink).toBe('0');
  });
});
