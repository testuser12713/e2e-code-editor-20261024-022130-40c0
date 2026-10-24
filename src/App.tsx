import { COMMAND_IDS } from './commands/ids';
import { registerCommands } from './commands/registry';
import { AboutDialog } from './components/AboutDialog';
import { CommandPalette } from './components/CommandPalette';
import { QuickOpen } from './components/QuickOpen';
import { ActivityBar } from './shell/ActivityBar';
import { CloseGuard } from './shell/CloseGuard';
import { EditorPane } from './shell/EditorPane';
import { Sidebar } from './shell/Sidebar';
import { StatusBar } from './shell/StatusBar';
import { TabBar } from './shell/TabBar';
import { TitleBar } from './shell/TitleBar';
import { appStore } from './state/store';
import { IconSprite } from './ui/Icon';
import { Notifications } from './ui/Notify';
import { GalleryView } from './views/GalleryView';

registerCommands([
  {
    id: COMMAND_IDS.showExplorer,
    title: 'View: Explorer',
    keybinding: 'Ctrl+Shift+E',
    run: () => {
      appStore.dispatch({ type: 'view/showExplorer' });
      return true;
    },
  },
  {
    id: COMMAND_IDS.showSearch,
    title: 'View: Search',
    run: () => {
      appStore.dispatch({ type: 'view/showSearch' });
      return true;
    },
  },
  {
    id: COMMAND_IDS.showSettings,
    title: 'View: Settings',
    keybinding: 'Ctrl+,',
    run: () => {
      appStore.dispatch({ type: 'view/showSettings' });
      return true;
    },
  },
]);

export default function App() {
  const showGallery =
    import.meta.env.DEV && typeof window !== 'undefined' && window.location.hash === '#gallery';

  if (showGallery) {
    return (
      <>
        <IconSprite />
        <GalleryView />
      </>
    );
  }

  return (
    <>
      <IconSprite />
      <div className="app" data-od-id="app-shell" data-testid="app-shell">
        <TitleBar />
        <div className="app-body">
          <ActivityBar />
          <Sidebar />
          <main className="editor-region" data-od-id="editor-region" data-testid="editor-pane">
            <TabBar />
            <EditorPane />
          </main>
        </div>
        <StatusBar />
      </div>

      <CloseGuard />
      <QuickOpen open={false} onClose={() => undefined} />
      <CommandPalette open={false} onClose={() => undefined} />
      <AboutDialog open={false} onClose={() => undefined} />
      <Notifications />
    </>
  );
}
