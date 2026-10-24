// @vitest-environment jsdom
import { createElement, Fragment } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

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

import { COMMAND_IDS } from '../src/commands/ids';
import { runCommand } from '../src/commands/registry';
import { AboutDialog } from '../src/components/AboutDialog';
import { registerPrivacyCommands } from '../src/privacy/privacyCommands';
import { Notifications } from '../src/ui/Notify';

const USER_DATA_PATH = 'C:\\Users\\tester\\AppData\\Roaming\\Forge';

let reloadSpy: Mock<() => void>;

beforeEach(() => {
  bridge.userDataPath.mockReset();
  bridge.userDataPath.mockResolvedValue(USER_DATA_PATH);
  bridge.clearLocalData.mockReset();
  bridge.clearLocalData.mockResolvedValue({ ok: true });
  reloadSpy = vi.fn<() => void>();
  registerPrivacyCommands({ reload: reloadSpy });
});

afterEach(() => {
  cleanup();
});

function renderAbout() {
  return render(
    createElement(
      Fragment,
      null,
      createElement(AboutDialog, { open: false, onClose: () => undefined }),
      createElement(Notifications),
    ),
  );
}

async function openResetConfirmation() {
  await act(async () => {
    await runCommand(COMMAND_IDS.resetLocalData);
  });
  return screen.findByTestId('reset-local-data-dialog');
}

describe('privacy commands', () => {
  it('shows the userData path in the about text', async () => {
    renderAbout();

    await act(async () => {
      await runCommand(COMMAND_IDS.about);
    });

    const dialog = await screen.findByTestId('about-dialog');
    expect(within(dialog).getByRole('heading', { name: 'Stored on this device' })).toBeTruthy();
    expect(bridge.userDataPath).toHaveBeenCalled();

    await waitFor(() => {
      expect(within(dialog).getByTestId('about-user-data-path').textContent).toBe(USER_DATA_PATH);
    });

    expect(within(dialog).getByText(/Nothing leaves this machine/)).toBeTruthy();
    expect(within(dialog).getByText(/Vendor details/)).toBeTruthy();
  });

  it('deletes local data after the confirmation and reloads the window', async () => {
    renderAbout();
    const confirm = await openResetConfirmation();

    expect(within(confirm).getByRole('heading', { name: 'Reset local data?' })).toBeTruthy();
    expect(within(confirm).getByText('Settings · session · recent folders')).toBeTruthy();
    expect(within(confirm).getByText('File contents are not affected')).toBeTruthy();
    expect(bridge.clearLocalData).not.toHaveBeenCalled();

    fireEvent.click(within(confirm).getByRole('button', { name: 'Reset Local Data' }));

    await waitFor(() => expect(bridge.clearLocalData).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(reloadSpy).toHaveBeenCalledTimes(1));
  });

  it('keeps the app running and shows a message when clearing fails', async () => {
    bridge.clearLocalData.mockResolvedValue({ ok: false, message: 'userData is read-only' });
    renderAbout();
    const confirm = await openResetConfirmation();

    fireEvent.click(within(confirm).getByRole('button', { name: 'Reset Local Data' }));

    await waitFor(() => {
      expect(
        screen.getAllByRole('alert').some((alert) => alert.textContent?.includes('userData is read-only')),
      ).toBe(true);
    });
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('reset-local-data-dialog')).toBeTruthy();
  });

  it('does not reject when the bridge throws, and reports the failure', async () => {
    bridge.clearLocalData.mockRejectedValue(new Error('bridge unavailable'));
    renderAbout();
    const confirm = await openResetConfirmation();

    fireEvent.click(within(confirm).getByRole('button', { name: 'Reset Local Data' }));

    await waitFor(() => {
      expect(
        screen.getAllByRole('alert').some((alert) => alert.textContent?.includes('bridge unavailable')),
      ).toBe(true);
    });
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('cancels the reset without touching local data', async () => {
    renderAbout();
    const confirm = await openResetConfirmation();

    fireEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByTestId('reset-local-data-dialog')).toBeNull());
    expect(bridge.clearLocalData).not.toHaveBeenCalled();
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});
