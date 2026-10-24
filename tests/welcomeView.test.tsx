// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { COMMAND_IDS } from '../src/commands/ids';
import { registerCommands } from '../src/commands/registry';
import { platform } from '../src/platform';
import { Notifications } from '../src/ui/Notify';
import { WelcomeView } from '../src/views/WelcomeView';

const openFolder = vi.fn(() => true);
const openPath = vi.fn(() => true);

function registerTestCommands() {
  registerCommands([
    {
      id: COMMAND_IDS.openFolder,
      title: 'Workspace: Open Folder',
      keybinding: 'Ctrl+Shift+O',
      run: openFolder,
    },
    { id: COMMAND_IDS.openPath, title: 'Workspace: Open Recent', run: openPath },
    {
      id: COMMAND_IDS.commandPalette,
      title: 'View: Command Palette',
      keybinding: 'Ctrl+Shift+P',
      run: () => true,
    },
    { id: COMMAND_IDS.quickOpen, title: 'File: Quick Open', keybinding: 'Ctrl+P', run: () => true },
    {
      id: COMMAND_IDS.projectSearch,
      title: 'Search: Project',
      keybinding: 'Ctrl+Shift+F',
      run: () => true,
    },
    { id: COMMAND_IDS.save, title: 'File: Save', keybinding: 'Ctrl+S', run: () => true },
    { id: COMMAND_IDS.find, title: 'Editor: Find', keybinding: 'Ctrl+F', run: () => true },
    { id: COMMAND_IDS.showSettings, title: 'View: Settings', keybinding: 'Ctrl+,', run: () => true },
  ]);
}

beforeEach(() => {
  openFolder.mockClear();
  openPath.mockClear();
  registerTestCommands();
});

afterEach(() => {
  cleanup();
});

describe('welcome view', () => {
  it('renders recent folders and opens one through the command registry', async () => {
    vi.spyOn(platform.persist, 'loadRecentFolders').mockResolvedValue([
      'C:\\Users\\Patrick\\Projects\\forge',
      '/home/patrick/projects/atlas-api',
    ]);

    render(<WelcomeView />);

    expect(await screen.findByText('forge')).toBeTruthy();
    expect(screen.getByText('atlas-api')).toBeTruthy();
    expect(screen.getByText('C:\\Users\\Patrick\\Projects\\forge')).toBeTruthy();
    expect(screen.getByText('/home/patrick/projects/atlas-api')).toBeTruthy();

    fireEvent.click(screen.getByRole('option', { name: /atlas-api/ }));

    await waitFor(() => {
      expect(openPath).toHaveBeenCalledWith({ path: '/home/patrick/projects/atlas-api' });
    });
  });

  it('runs the open-folder command from the primary action', async () => {
    vi.spyOn(platform.persist, 'loadRecentFolders').mockResolvedValue([]);

    render(<WelcomeView />);

    fireEvent.click(screen.getByRole('button', { name: /Open Folder/i }));

    await waitFor(() => {
      expect(openFolder).toHaveBeenCalledTimes(1);
    });
  });

  it('lists the shortcuts with the title and keybinding from the command registry', async () => {
    vi.spyOn(platform.persist, 'loadRecentFolders').mockResolvedValue([]);

    render(<WelcomeView />);

    await waitFor(() => {
      expect(screen.getByText('View: Command Palette')).toBeTruthy();
    });
    expect(screen.getByText('Ctrl+Shift+P')).toBeTruthy();
    expect(screen.getByText('File: Quick Open')).toBeTruthy();
    expect(screen.getByText('Ctrl+P')).toBeTruthy();
    expect(screen.getByText('Search: Project')).toBeTruthy();
    expect(screen.getByText('Ctrl+Shift+F')).toBeTruthy();
    expect(screen.getByText('File: Save')).toBeTruthy();
    expect(screen.getByText('Ctrl+S')).toBeTruthy();
    expect(screen.getByText('Editor: Find')).toBeTruthy();
    expect(screen.getByText('Ctrl+F')).toBeTruthy();
    expect(screen.getByText('View: Settings')).toBeTruthy();
    expect(screen.getByText('Ctrl+,')).toBeTruthy();
  });

  it('hides the recent folders panel when the list is empty', async () => {
    vi.spyOn(platform.persist, 'loadRecentFolders').mockResolvedValue([]);

    render(<WelcomeView />);

    await waitFor(() => {
      expect(platform.persist.loadRecentFolders).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('recent-folders')).toBeNull();
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.queryByText('No recent folders yet.')).toBeNull();

    const openRecent = screen.getByRole('button', { name: 'Open Recent' }) as HTMLButtonElement;
    expect(openRecent.disabled).toBe(true);
  });

  it('reloads the recent folders whenever it mounts again', async () => {
    const loadRecentFolders = vi
      .spyOn(platform.persist, 'loadRecentFolders')
      .mockResolvedValueOnce(['/projects/first'])
      .mockResolvedValueOnce(['/projects/second']);

    const view = render(<WelcomeView />);
    expect(await screen.findByText('first')).toBeTruthy();

    view.unmount();
    render(<WelcomeView />);
    expect(await screen.findByText('second')).toBeTruthy();
    expect(loadRecentFolders).toHaveBeenCalledTimes(2);
  });

  it('reports a failed recent-folder load as an error notification', async () => {
    vi.spyOn(platform.persist, 'loadRecentFolders').mockRejectedValue(new Error('Storage unavailable'));

    render(
      <>
        <WelcomeView />
        <Notifications />
      </>,
    );

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('Storage unavailable')).toBeTruthy();
    expect(screen.queryByTestId('recent-folders')).toBeNull();
  });
});
