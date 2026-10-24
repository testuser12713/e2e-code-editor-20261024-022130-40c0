// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

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

  it('gives the scrolling body a bottom affordance while content continues', async () => {
    expect(KIT_CSS).toContain('@supports (animation-timeline: scroll())');
    expect(KIT_CSS).toContain('animation-timeline: scroll(self block)');
    expect(KIT_CSS).toContain('@keyframes about-body-bottom-fade');
    expect(KIT_CSS).toContain('mask-image: linear-gradient(to bottom, black calc(100% - 16px)');
    expect(KIT_CSS).toContain('mask-image: linear-gradient(to bottom, black 100%, transparent 100%)');
  });
});
