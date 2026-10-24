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

describe('application shell', () => {
  it('renders the complete frame with the welcome view', async () => {
    render(<App />);

    for (const testId of ['title-bar', 'activity-bar', 'sidebar', 'tab-bar', 'editor-pane', 'status-bar']) {
      expect(screen.getByTestId(testId)).toBeTruthy();
    }

    expect(screen.getByRole('navigation', { name: 'Primary views' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Application menu' })).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByTestId('welcome-view')).toBeTruthy();
    });
  });

  it('reaches every registered sidebar view from the activity bar', async () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('activity-search'));
    await waitFor(() => {
      expect(screen.getByTestId('view-search')).toBeTruthy();
    });
    expect(screen.queryByTestId('view-explorer')).toBeNull();

    fireEvent.click(screen.getByTestId('activity-settings'));
    await waitFor(() => {
      expect(screen.getByTestId('view-settings')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('activity-explorer'));
    await waitFor(() => {
      expect(screen.getByTestId('view-explorer')).toBeTruthy();
    });
  });
});
