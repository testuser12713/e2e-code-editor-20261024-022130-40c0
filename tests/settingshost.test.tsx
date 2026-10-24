// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import App from '../src/App';
import { appStore } from '../src/state/store';

function appBody(): Element {
  const body = screen.getByTestId('app-shell').querySelector('.app-body');
  if (!body) throw new Error('The application body is missing');
  return body;
}

beforeEach(() => {
  appStore.dispatch({ type: 'view/showExplorer' });
});

afterEach(() => {
  cleanup();
});

describe('settings page host', () => {
  it('hosts the settings page in the editor region and hides the sidebar', async () => {
    render(<App />);

    expect(screen.getByTestId('sidebar')).toBeTruthy();
    expect(appBody().className).not.toContain('is-wide');

    fireEvent.click(screen.getByTestId('activity-settings'));

    await waitFor(() => {
      expect(screen.getByTestId('view-settings')).toBeTruthy();
    });

    expect(screen.queryByTestId('sidebar')).toBeNull();
    expect(screen.getByTestId('editor-pane').contains(screen.getByTestId('view-settings'))).toBe(
      true,
    );
    expect(appBody().className).toContain('is-wide');
  });

  it('restores the sidebar when switching back to the explorer or search view', async () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('activity-settings'));
    await waitFor(() => {
      expect(screen.getByTestId('view-settings')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('activity-explorer'));
    await waitFor(() => {
      expect(screen.getByTestId('view-explorer')).toBeTruthy();
    });
    expect(screen.getByTestId('sidebar')).toBeTruthy();
    expect(screen.queryByTestId('view-settings')).toBeNull();
    expect(appBody().className).not.toContain('is-wide');

    fireEvent.click(screen.getByTestId('activity-settings'));
    await waitFor(() => {
      expect(screen.getByTestId('view-settings')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('activity-search'));
    await waitFor(() => {
      expect(screen.getByTestId('view-search')).toBeTruthy();
    });
    expect(screen.getByTestId('sidebar')).toBeTruthy();
    expect(screen.queryByTestId('view-settings')).toBeNull();
  });
});
