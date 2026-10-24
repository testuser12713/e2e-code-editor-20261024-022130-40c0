import { COMMAND_IDS } from '../commands/ids';
import { registerCommands } from '../commands/registry';
import { platform } from '../platform';
import { notify } from '../ui/Notify';

export type PrivacyDialogRequest = 'about' | 'reset';

type PrivacyDialogHandler = (request: PrivacyDialogRequest) => void;

export type RegisterPrivacyCommandsOptions = {
  reload?: () => void;
};

let dialogHandler: PrivacyDialogHandler | null = null;
let reloadHandler: () => void = reloadApplication;

function reloadApplication(): void {
  if (typeof window === 'undefined') return;
  try {
    window.location.reload();
  } catch {
    notify('Local data was reset, but Forge could not restart automatically. Restart Forge.', 'error');
  }
}

export function setPrivacyDialogHandler(handler: PrivacyDialogHandler | null): void {
  dialogHandler = handler;
}

function requestDialog(request: PrivacyDialogRequest): void {
  dialogHandler?.(request);
}

export async function resetLocalData(): Promise<boolean> {
  try {
    const result = await platform.persist.clearLocalData();
    if (!result.ok) {
      notify(`Local data could not be reset: ${result.message}`, 'error');
      return false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    notify(`Local data could not be reset: ${message}`, 'error');
    return false;
  }

  reloadHandler();
  return true;
}

export function registerPrivacyCommands(options: RegisterPrivacyCommandsOptions = {}): void {
  if (options.reload) reloadHandler = options.reload;

  registerCommands([
    {
      id: COMMAND_IDS.about,
      title: 'Help: About / Privacy',
      run: () => {
        requestDialog('about');
        return true;
      },
    },
    {
      id: COMMAND_IDS.resetLocalData,
      title: 'Help: Reset Local Data',
      run: () => {
        requestDialog('reset');
        return true;
      },
    },
  ]);
}
