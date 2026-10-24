// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import App from '../src/App';
import { COMMAND_IDS, COMMAND_KEYBINDINGS } from '../src/commands/ids';
import { getCommands, registerCommands } from '../src/commands/registry';
import { TitleBar } from '../src/shell/TitleBar';
import type { MenuState } from '../src/state/types';

type MenuTemplateItem = {
  id?: string;
  label?: string;
  role?: string;
  accelerator?: string;
  enabled?: boolean;
  type?: string;
  click?: () => void;
  submenu?: MenuTemplateItem[];
};

type MenuModule = {
  buildMenuTemplate: (state: MenuState) => MenuTemplateItem[];
};

const require = createRequire(import.meta.url);
const { buildMenuTemplate } = require('../electron/menu.cjs') as MenuModule;

const NO_STATE: MenuState = {
  hasWorkspace: false,
  hasDocument: false,
  canSave: false,
  hasDirtyTabs: false,
};

const FULL_STATE: MenuState = {
  hasWorkspace: true,
  hasDocument: true,
  canSave: true,
  hasDirtyTabs: true,
};

const CONTRACT_IDS = Object.values(COMMAND_IDS);
const CONTRACT_ACCELERATORS = Object.values(COMMAND_KEYBINDINGS);

const alreadyRegistered = new Set(getCommands().map((command) => command.id));
registerCommands(
  CONTRACT_IDS.filter((id) => !alreadyRegistered.has(id)).map((id) => ({
    id,
    title: id,
    run: () => true,
  })),
);

function leafItems(template: MenuTemplateItem[]): MenuTemplateItem[] {
  return template.flatMap((menu) => (menu.submenu ? leafItems(menu.submenu) : [menu]));
}

function commandItems(template: MenuTemplateItem[]): MenuTemplateItem[] {
  return leafItems(template).filter((item) => typeof item.id === 'string');
}

function menuLabel(template: MenuTemplateItem[], label: string): MenuTemplateItem {
  const menu = template.find((entry) => entry.label === label);
  if (!menu) throw new Error(`Menu ${label} is missing`);
  return menu;
}

function itemWithId(template: MenuTemplateItem[], id: string): MenuTemplateItem {
  const item = commandItems(template).find((entry) => entry.id === id);
  if (!item) throw new Error(`Menu item ${id} is missing`);
  return item;
}

afterEach(() => {
  cleanup();
});

describe('native application menu template', () => {
  it('holds the File, Edit, View and Help menus', () => {
    const template = buildMenuTemplate(NO_STATE);

    expect(template.map((menu) => menu.label)).toEqual(['File', 'Edit', 'View', 'Help']);
    for (const menu of template) {
      expect(Array.isArray(menu.submenu)).toBe(true);
      expect(menu.submenu?.length).toBeGreaterThan(0);
    }
  });

  it('only contains entries with a real command or a window role', () => {
    const known = new Set(getCommands().map((command) => command.id));
    const contract = new Set<string>(CONTRACT_IDS);

    for (const item of leafItems(buildMenuTemplate(NO_STATE))) {
      if (item.type === 'separator') continue;

      if (typeof item.id === 'string') {
        expect(contract.has(item.id)).toBe(true);
        expect(known.has(item.id)).toBe(true);
        expect(typeof item.click).toBe('function');
      } else {
        expect(typeof item.role).toBe('string');
        expect(item.label).toBeTruthy();
      }
    }
  });

  it('advertises only accelerators from the command contract', () => {
    const template = buildMenuTemplate(FULL_STATE);

    for (const item of leafItems(template)) {
      if (typeof item.id === 'string' && COMMAND_KEYBINDINGS[item.id]) {
        expect(item.accelerator).toBe(COMMAND_KEYBINDINGS[item.id]);
      }
      if (item.accelerator) {
        expect(CONTRACT_ACCELERATORS).toContain(item.accelerator);
      }
    }

    expect(itemWithId(template, COMMAND_IDS.openFolder).accelerator).toBe('Ctrl+Shift+O');
    expect(itemWithId(template, COMMAND_IDS.save).accelerator).toBe('Ctrl+S');
    expect(itemWithId(template, COMMAND_IDS.saveAll).accelerator).toBe('Ctrl+Alt+S');
    expect(itemWithId(template, COMMAND_IDS.showExplorer).accelerator).toBe('Ctrl+Shift+E');
    expect(itemWithId(template, COMMAND_IDS.projectSearch).accelerator).toBe('Ctrl+Shift+F');
    expect(itemWithId(template, COMMAND_IDS.commandPalette).accelerator).toBe('Ctrl+Shift+P');
    expect(itemWithId(template, COMMAND_IDS.find).accelerator).toBe('Ctrl+F');
    expect(itemWithId(template, COMMAND_IDS.replace).accelerator).toBe('Ctrl+H');
    expect(itemWithId(template, COMMAND_IDS.showSettings).accelerator).toBe('Ctrl+,');
  });

  it('keeps a real Quit entry and the Help privacy commands', () => {
    const template = buildMenuTemplate(NO_STATE);
    const fileMenu = menuLabel(template, 'File');
    const quit = fileMenu.submenu?.find((item) => item.role === 'quit');

    expect(quit).toBeTruthy();
    expect(quit?.id).toBeUndefined();

    const helpMenu = menuLabel(template, 'Help');
    expect(commandItems([helpMenu]).map((item) => item.id)).toEqual([
      COMMAND_IDS.about,
      COMMAND_IDS.resetLocalData,
    ]);
  });

  it('uses the window roles for undo, redo, cut, copy and paste', () => {
    const editMenu = menuLabel(buildMenuTemplate(NO_STATE), 'Edit');
    const roles = (editMenu.submenu ?? []).filter((item) => item.role).map((item) => item.role);

    expect(roles).toEqual(['undo', 'redo', 'cut', 'copy', 'paste']);
    expect(itemWithId([editMenu], COMMAND_IDS.find)).toBeTruthy();
    expect(itemWithId([editMenu], COMMAND_IDS.replace)).toBeTruthy();
  });

  it('recomputes enabled from the pushed MenuState', () => {
    const empty = buildMenuTemplate(NO_STATE);
    const disabled = commandItems(empty)
      .filter((item) => item.enabled === false)
      .map((item) => item.id)
      .sort();

    expect(disabled).toEqual([
      COMMAND_IDS.closeTab,
      COMMAND_IDS.find,
      COMMAND_IDS.projectSearch,
      COMMAND_IDS.replace,
      COMMAND_IDS.save,
      COMMAND_IDS.saveAll,
    ].sort());

    const full = buildMenuTemplate(FULL_STATE);
    expect(commandItems(full).every((item) => item.enabled === true)).toBe(true);

    const documentOpen = buildMenuTemplate({
      hasWorkspace: true,
      hasDocument: true,
      canSave: false,
      hasDirtyTabs: false,
    });
    expect(itemWithId(documentOpen, COMMAND_IDS.save).enabled).toBe(false);
    expect(itemWithId(documentOpen, COMMAND_IDS.saveAll).enabled).toBe(false);
    expect(itemWithId(documentOpen, COMMAND_IDS.closeTab).enabled).toBe(true);
    expect(itemWithId(documentOpen, COMMAND_IDS.find).enabled).toBe(true);
    expect(itemWithId(documentOpen, COMMAND_IDS.projectSearch).enabled).toBe(true);
  });
});

describe('title bar menu state', () => {
  it('greys out Save while no file is open', () => {
    render(createElement(TitleBar));

    fireEvent.click(screen.getByTestId('menu-file'));
    const fileMenu = screen.getByRole('menu', { name: 'File' });
    const save = within(fileMenu).getByText('Save').closest('button') as HTMLButtonElement | null;

    expect(save).toBeTruthy();
    expect(save?.disabled).toBe(true);
    expect(save?.getAttribute('aria-disabled')).toBe('true');
  });

  it('switches the sidebar to Explorer from the View menu', async () => {
    render(createElement(App));

    fireEvent.click(screen.getByTestId('activity-search'));
    await waitFor(() => {
      expect(screen.getByTestId('view-search')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('menu-view'));
    const viewMenu = screen.getByRole('menu', { name: 'View' });
    const explorer = within(viewMenu).getByText('Explorer').closest('button') as HTMLButtonElement | null;
    expect(explorer).toBeTruthy();
    fireEvent.click(explorer as HTMLButtonElement);

    await waitFor(() => {
      expect(screen.getByTestId('view-explorer')).toBeTruthy();
    });
  });
});
