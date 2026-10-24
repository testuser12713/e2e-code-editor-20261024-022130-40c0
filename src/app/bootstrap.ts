import { installKeymap } from '../commands/keymap';
import { initCloseFlow } from '../state/closeFlow';
import { initSessionSync } from '../state/sessionSync';
import { initSettingsSync } from '../state/settingsSync';
import { appStore } from '../state/store';
import { initMenuSync } from '../shell/menuSync';

let booted = false;

export function bootstrap(): void {
  if (booted) return;
  booted = true;

  initSettingsSync(appStore);
  initSessionSync(appStore);
  initMenuSync(appStore);
  initCloseFlow(appStore);
  installKeymap();
}
