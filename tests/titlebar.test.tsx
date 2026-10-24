// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import App from '../src/App';
import { appStore } from '../src/state/store';

beforeEach(() => {
  appStore.dispatch({ type: 'view/showExplorer' });
});

afterEach(() => {
  cleanup();
});

describe('title bar Forge home control', () => {
  it('is visibly unavailable on the start screen while the explorer view is active', () => {
    render(<App />);

    const brand = screen.getByTestId('brand-home') as HTMLButtonElement;

    expect(brand.disabled).toBe(true);
    expect(brand.getAttribute('aria-disabled')).toBe('true');
    expect(brand.getAttribute('title')).toBeTruthy();
    expect(brand.getAttribute('aria-label')).toBe('Forge home');
    expect(screen.getByTestId('view-explorer')).toBeTruthy();
  });

  it('returns to the explorer view from another view', async () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('activity-settings'));
    await waitFor(() => {
      expect(screen.getByTestId('view-settings')).toBeTruthy();
    });

    const brand = screen.getByTestId('brand-home') as HTMLButtonElement;
    expect(brand.disabled).toBe(false);
    expect(brand.getAttribute('aria-disabled')).toBeNull();

    fireEvent.click(brand);

    await waitFor(() => {
      expect(screen.getByTestId('view-explorer')).toBeTruthy();
    });
    expect(screen.queryByTestId('view-settings')).toBeNull();
  });
});
