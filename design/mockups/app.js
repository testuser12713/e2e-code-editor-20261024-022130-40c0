(() => {
  "use strict";

  const SETTINGS_KEY = "forge.settings.v1";
  const DEFAULTS = {
    theme: "dark",
    fontSize: 14,
    tabSize: 2,
    wordWrap: false,
    renderWhitespace: false,
    treeFontSize: 13
  };

  function readSettings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
      return parsed && typeof parsed === "object" ? { ...DEFAULTS, ...parsed } : { ...DEFAULTS };
    } catch {
      return { ...DEFAULTS };
    }
  }

  let settings = readSettings();

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* A sandboxed preview may deny storage; the configured values still apply this session. */
    }
  }

  function applySettings() {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.style.setProperty("--editor-font-size", `${settings.fontSize}px`);
    root.style.setProperty("--tree-font-size", `${settings.treeFontSize}px`);
    root.style.setProperty("--editor-tab-size", String(settings.tabSize));
    document.querySelectorAll(".code").forEach((code) => {
      code.classList.toggle("is-wrap", Boolean(settings.wordWrap));
      code.classList.toggle("show-ws", Boolean(settings.renderWhitespace));
    });
    document.querySelectorAll("[data-output-for]").forEach((output) => {
      const key = output.dataset.outputFor;
      output.textContent = String(settings[key]);
    });
    document.querySelectorAll("[data-setting][type='radio']").forEach((input) => {
      input.checked = settings[input.dataset.setting] === input.value;
    });
    document.querySelectorAll("[data-setting][type='checkbox']").forEach((input) => {
      input.checked = Boolean(settings[input.dataset.setting]);
    });
    document.querySelectorAll("[data-setting][type='range']").forEach((input) => {
      input.value = String(settings[input.dataset.setting]);
    });
    document.querySelectorAll("[data-setting][data-type='number-select']").forEach((input) => {
      input.value = String(settings[input.dataset.setting]);
    });
    document.querySelectorAll("[data-theme-choice]").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.themeChoice === settings.theme);
    });
  }

  function initSettingsControls() {
    document.querySelectorAll("[data-setting]").forEach((input) => {
      const eventName = input.type === "range" ? "input" : "change";
      input.addEventListener(eventName, () => {
        const key = input.dataset.setting;
        if (!key) return;
        if (input.type === "radio") {
          if (!input.checked) return;
          settings[key] = input.value;
        } else if (input.type === "checkbox") {
          settings[key] = input.checked;
        } else if (input.type === "range" || input.dataset.type === "number-select" || key === "tabSize") {
          settings[key] = Number(input.value);
        } else {
          settings[key] = input.value;
        }
        saveSettings();
        applySettings();
        document.querySelectorAll("[data-save-state]").forEach((saveState) => {
          saveState.textContent = "Saved locally just now";
        });
      });
    });
    document.querySelectorAll("[data-theme-choice]").forEach((el) => {
      el.addEventListener("click", () => {
        settings.theme = el.dataset.themeChoice;
        saveSettings();
        applySettings();
        document.querySelectorAll("[data-save-state]").forEach((saveState) => {
          saveState.textContent = "Saved locally just now";
        });
      });
    });
  }

  function initMenus() {
    const menubar = document.querySelector("[data-menubar]");
    const titlebar = document.querySelector(".titlebar");
    if (!menubar || !titlebar) return;

    const menus = [
      {
        id: "file",
        label: "File",
        items: [
          { label: "Open Folder…", keys: "Ctrl+Shift+O", href: "workspace.html" },
          { label: "Open Recent", href: "welcome.html#recent" },
          { separator: true },
          { label: "Save", keys: "Ctrl+S", command: "save" },
          { label: "Save All", keys: "Ctrl+Alt+S", command: "save-all" },
          { label: "Close Tab", href: "unsaved-close.html" },
          { separator: true },
          { label: "Settings", keys: "Ctrl+,", href: "settings.html" },
          { label: "Exit", href: "unsaved-close.html" }
        ]
      },
      {
        id: "edit",
        label: "Edit",
        items: [
          { label: "Find", keys: "Ctrl+F", href: "find-replace.html" },
          { label: "Replace", keys: "Ctrl+H", href: "find-replace.html" },
          { separator: true },
          { label: "Undo", keys: "Ctrl+Z", disabled: true },
          { label: "Redo", keys: "Ctrl+Y", disabled: true }
        ]
      },
      {
        id: "view",
        label: "View",
        items: [
          { label: "Explorer", keys: "Ctrl+Shift+E", href: "workspace.html" },
          { label: "Search", keys: "Ctrl+Shift+F", href: "project-search.html" },
          { label: "Command Palette", keys: "Ctrl+Shift+P", href: "command-palette.html" },
          { separator: true },
          { label: "Settings", keys: "Ctrl+,", href: "settings.html" }
        ]
      },
      {
        id: "help",
        label: "Help",
        items: [
          { label: "About / Privacy", href: "about-privacy.html" },
          { label: "Reset Local Data", href: "about-privacy.html#reset" }
        ]
      }
    ];

    menubar.replaceChildren();
    const menuNodes = new Map();

    menus.forEach((definition) => {
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "menu-trigger";
      trigger.textContent = definition.label;
      trigger.setAttribute("aria-haspopup", "menu");
      trigger.setAttribute("aria-expanded", "false");
      trigger.dataset.menuTrigger = definition.id;
      trigger.setAttribute("data-od-id", `menu-trigger-${definition.id}`);

      const menu = document.createElement("div");
      menu.className = "menu";
      menu.id = `appmenu-${definition.id}`;
      menu.setAttribute("role", "menu");
      menu.setAttribute("data-od-id", `menu-${definition.id}`);
      menu.hidden = true;

      definition.items.forEach((item) => {
        if (item.separator) {
          const sep = document.createElement("div");
          sep.className = "menu-sep";
          menu.append(sep);
          return;
        }
        const entry = document.createElement(item.href ? "a" : "button");
        entry.className = "menu-item";
        if (item.href) entry.href = item.href;
        else entry.type = "button";
        if (item.command) entry.dataset.command = item.command;
        if (item.disabled) entry.setAttribute("aria-disabled", "true");
        entry.setAttribute("role", "menuitem");

        const label = document.createElement("span");
        label.textContent = item.label;
        entry.append(label);
        if (item.keys) {
          const kbd = document.createElement("span");
          kbd.className = "kbd";
          kbd.textContent = item.keys;
          entry.append(kbd);
        }
        menu.append(entry);
      });

      menubar.append(trigger);
      titlebar.append(menu);
      menuNodes.set(definition.id, { trigger, menu });
    });

    function closeMenus() {
      menuNodes.forEach(({ trigger, menu }) => {
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
      });
    }

    menuNodes.forEach(({ trigger, menu }, id) => {
      trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        const isOpen = !menu.hidden;
        closeMenus();
        if (isOpen) return;
        const titleRect = titlebar.getBoundingClientRect();
        const triggerRect = trigger.getBoundingClientRect();
        menu.hidden = false;
        const maxLeft = Math.max(4, window.innerWidth - menu.offsetWidth - 8);
        menu.style.left = `${Math.max(4, Math.min(triggerRect.left - titleRect.left, maxLeft))}px`;
        menu.style.top = `${triggerRect.bottom - titleRect.top + 4}px`;
        trigger.setAttribute("aria-expanded", "true");
        const first = menu.querySelector(".menu-item:not([aria-disabled='true'])");
        if (first) first.focus({ preventScroll: true });
      });
    });

    menuNodes.forEach(({ menu }) => {
      menu.addEventListener("click", (event) => {
        const commandEntry = event.target.closest("[data-command]");
        if (!commandEntry) {
          closeMenus();
          return;
        }
        const command = commandEntry.dataset.command;
        if (command === "save" || command === "save-all") {
          event.preventDefault();
          const dirtyTabs = document.querySelectorAll(".tab .tab-dot");
          if (command === "save") {
            const activeDirty = document.querySelector(".tab.is-active .tab-dot");
            if (activeDirty) activeDirty.remove();
            showNotice("Saved", activeDirty ? "The active editor tab was written to disk." : "No unsaved changes in the active tab.");
          } else {
            document.querySelectorAll(".tab .tab-dot").forEach((dot) => dot.remove());
            showNotice("Saved all tabs", dirtyTabs.length ? `${dirtyTabs.length} changed tabs were written to disk.` : "No unsaved changes.");
          }
          closeMenus();
        }
      });
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest("[data-menu-trigger]") && !event.target.closest(".menu")) closeMenus();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenus();
    });
    window.addEventListener("resize", closeMenus);
  }

  function showNotice(title, message, kind = "info") {
    let container = document.querySelector("[data-notices]");
    if (!container) {
      container = document.createElement("div");
      container.className = "notices";
      container.dataset.notices = "";
      container.setAttribute("aria-live", "polite");
      document.body.append(container);
    }
    const notice = document.createElement("div");
    notice.className = `notice${kind === "error" ? " is-error" : ""}`;
    const icon = document.createElement("span");
    icon.className = "notice-icon mono";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = kind === "error" ? "!" : "i";
    const text = document.createElement("span");
    const noticeTitle = document.createElement("span");
    noticeTitle.className = "notice-title";
    noticeTitle.textContent = title;
    const copy = document.createElement("span");
    copy.className = "notice-copy";
    copy.textContent = message;
    text.append(noticeTitle, copy);
    const close = document.createElement("button");
    close.type = "button";
    close.className = "icon-btn notice-close";
    close.setAttribute("aria-label", "Dismiss notification");
    const closeIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    closeIcon.setAttribute("class", "icon icon-sm");
    closeIcon.setAttribute("viewBox", "0 0 24 24");
    const closePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    closePath.setAttribute("d", "M6 6l12 12M18 6L6 18");
    closeIcon.append(closePath);
    close.append(closeIcon);
    close.addEventListener("click", () => notice.remove());
    notice.append(icon, text, close);
    container.append(notice);
    window.setTimeout(() => notice.remove(), 7000);
    return notice;
  }

  function initNotices() {
    document.querySelectorAll("[data-notice-close]").forEach((button) => {
      button.addEventListener("click", () => {
        const notice = button.closest(".notice");
        if (notice) notice.remove();
      });
    });
  }

  function initTrees() {
    document.querySelectorAll("[data-tree-toggle]").forEach((row) => {
      row.addEventListener("click", () => {
        const expanded = row.getAttribute("aria-expanded") === "true";
        row.setAttribute("aria-expanded", String(!expanded));
        const children = row.nextElementSibling;
        if (children && children.classList.contains("tree-children")) children.hidden = expanded;
      });
    });
  }

  function initTabs() {
    document.querySelectorAll("[data-tabset]").forEach((tabbar) => {
      const tabs = Array.from(tabbar.querySelectorAll(".tab[data-pane]"));
      const stage = document.getElementById(tabbar.dataset.tabset);

      const selectTab = (tab) => {
        tabs.forEach((item) => {
          const selected = item === tab;
          item.classList.toggle("is-active", selected);
          item.setAttribute("aria-selected", String(selected));
          item.tabIndex = selected ? 0 : -1;
        });
        if (stage) {
          stage.querySelectorAll("[data-pane]").forEach((pane) => {
            pane.hidden = pane.dataset.pane !== tab.dataset.pane;
          });
        }
        const language = tab.dataset.language;
        if (language) {
          const languageControl = document.querySelector("[data-status-language]");
          if (languageControl) languageControl.value = language;
          const languageLabel = document.querySelector("[data-status-language-label]");
          if (languageLabel) languageLabel.textContent = language;
        }
        const cursor = tab.dataset.cursor;
        if (cursor) {
          const position = document.querySelector("[data-status-position]");
          if (position) position.textContent = cursor;
        }
      };

      tabs.forEach((tab) => {
        tab.addEventListener("click", (event) => {
          if (event.target.closest(".tab-close")) return;
          selectTab(tab);
        });
        tab.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectTab(tab);
            return;
          }
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          const current = tabs.indexOf(tab);
          const next = event.key === "ArrowRight" ? (current + 1) % tabs.length : (current - 1 + tabs.length) % tabs.length;
          tabs[next].focus();
          selectTab(tabs[next]);
        });
        const close = tab.querySelector(".tab-close");
        if (close) {
          close.addEventListener("click", (event) => {
            event.stopPropagation();
            if (tab.querySelector(".tab-dot")) {
              window.location.href = "unsaved-close.html";
              return;
            }
            const wasActive = tab.classList.contains("is-active");
            const next = tab.nextElementSibling || tab.previousElementSibling;
            tab.remove();
            if (wasActive && next && next.classList.contains("tab")) selectTab(next);
          });
        }
      });
      const initial = tabs.find((tab) => tab.classList.contains("is-active")) || tabs[0];
      if (initial) selectTab(initial);
    });
  }

  function fuzzyScore(query, text) {
    const q = query.toLowerCase().trim();
    const value = text.toLowerCase();
    if (!q) return 0;
    let queryIndex = 0;
    let score = 0;
    let previous = -2;
    for (let index = 0; index < value.length && queryIndex < q.length; index += 1) {
      if (value[index] === q[queryIndex]) {
        score += previous === index - 1 ? 4 : 1;
        if (index === 0) score += 2;
        previous = index;
        queryIndex += 1;
      }
    }
    return queryIndex === q.length ? score : null;
  }

  function initFilterable(inputSelector, itemSelector, emptySelector) {
    const input = document.querySelector(inputSelector);
    if (!input) return;
    const container = input.closest(".palette") || document;
    const items = Array.from(container.querySelectorAll(itemSelector));
    const empty = container.querySelector(emptySelector);

    const update = () => {
      const query = input.value;
      const scored = items.map((item) => {
        const text = item.dataset.filterText || item.textContent;
        return { item, score: fuzzyScore(query, text) };
      });
      scored.sort((a, b) => {
        if (a.score === null && b.score === null) return 0;
        if (a.score === null) return 1;
        if (b.score === null) return -1;
        return b.score - a.score;
      });
      items.forEach((item) => {
        item.classList.remove("is-selected");
        item.setAttribute("aria-selected", "false");
      });
      let firstVisible = null;
      scored.forEach(({ item, score }) => {
        const show = score !== null;
        item.hidden = !show;
        if (show && !firstVisible) firstVisible = item;
      });
      if (firstVisible) {
        firstVisible.classList.add("is-selected");
        firstVisible.setAttribute("aria-selected", "true");
      }
      if (empty) empty.hidden = Boolean(firstVisible);
    };

    input.addEventListener("input", update);
    input.addEventListener("keydown", (event) => {
      const visible = items.filter((item) => !item.hidden);
      if (!visible.length) {
        if (event.key === "Escape") window.location.href = "workspace.html";
        return;
      }
      const current = visible.findIndex((item) => item.classList.contains("is-selected"));
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = (Math.max(0, current) + delta + visible.length) % visible.length;
        visible.forEach((item) => {
          item.classList.remove("is-selected");
          item.setAttribute("aria-selected", "false");
        });
        visible[nextIndex].classList.add("is-selected");
        visible[nextIndex].setAttribute("aria-selected", "true");
        const list = container.querySelector(".palette-list");
        if (list) {
          const itemRect = visible[nextIndex].getBoundingClientRect();
          const listRect = list.getBoundingClientRect();
          if (itemRect.top < listRect.top) list.scrollTop -= listRect.top - itemRect.top;
          else if (itemRect.bottom > listRect.bottom) list.scrollTop += itemRect.bottom - listRect.bottom;
        }
      } else if (event.key === "Enter") {
        event.preventDefault();
        const selected = visible.find((item) => item.classList.contains("is-selected")) || visible[0];
        if (selected && selected.dataset.href) window.location.href = selected.dataset.href;
      } else if (event.key === "Escape") {
        event.preventDefault();
        window.location.href = "workspace.html";
      }
    });
    input.addEventListener("click", (event) => {
      const item = event.target.closest(itemSelector);
      if (item && item.dataset.href) window.location.href = item.dataset.href;
    });
    update();
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !event.defaultPrevented) window.location.href = "workspace.html";
    });
    window.setTimeout(() => input.focus(), 40);
  }

  function initSearch() {
    const cancel = document.querySelector("[data-cancel-search]");
    if (cancel) {
      cancel.addEventListener("click", () => {
        const status = cancel.closest(".search-status");
        const spinner = status ? status.querySelector(".spinner") : null;
        const label = status ? status.querySelector("[data-search-state]") : null;
        if (spinner) spinner.hidden = true;
        if (label) label.textContent = "Search cancelled. 12 matches in 4 files kept.";
        cancel.hidden = true;
        showNotice("Search cancelled", "The running project search was stopped; existing matches remain.");
      });
    }
    document.querySelectorAll("[data-search-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        button.setAttribute("aria-pressed", button.getAttribute("aria-pressed") === "true" ? "false" : "true");
      });
    });
    document.querySelectorAll("[data-search-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const label = document.querySelector("[data-search-state]");
        if (label) label.textContent = "12 matches in 4 files";
        showNotice("Search refreshed", "Results updated for the current query and options.");
      });
    });

    document.querySelectorAll(".result-file-head").forEach((button) => {
      button.addEventListener("click", () => {
        const expanded = button.getAttribute("aria-expanded") === "true";
        const hits = button.nextElementSibling;
        button.setAttribute("aria-expanded", String(!expanded));
        if (hits) hits.hidden = expanded;
      });
    });

    document.querySelectorAll("[data-search-hit]").forEach((hit) => {
      hit.addEventListener("click", (event) => {
        event.preventDefault();
        document.querySelectorAll("[data-search-hit]").forEach((item) => item.removeAttribute("aria-current"));
        hit.setAttribute("aria-current", "true");
        const line = hit.dataset.line || "1";
        const group = hit.closest(".result-file");
        const relPath = group ? group.querySelector(".result-file-head span:not(.result-count)")?.textContent.trim() : "the active file";
        const filePane = hit.dataset.searchFile;
        if (filePane) {
          const matchingTab = document.querySelector(`.tab[data-pane="${filePane}"]`);
          if (matchingTab && !matchingTab.classList.contains("is-active")) matchingTab.click();
        }
        const code = document.querySelector("#search-stage .code:not([hidden])");
        if (code) {
          code.querySelectorAll(".code-line.is-active").forEach((item) => item.classList.remove("is-active"));
          const target = code.querySelector(`.code-line[data-line="${line}"]`);
          if (target) target.classList.add("is-active");
        }
        const position = document.querySelector("[data-status-position]");
        if (position) position.textContent = `${line}:1`;
        showNotice("Match selected", `${relPath}:${line} is ready in the editor.`);
      });
    });
  }

  function initFindWidget() {
    const widget = document.querySelector("[data-find-widget]");
    if (!widget) return;
    const count = widget.querySelector("[data-find-count]");
    const hits = Array.from(document.querySelectorAll(".find-hit"));
    let current = Math.max(1, hits.findIndex((hit) => hit.classList.contains("is-current")) + 1);
    let total = hits.length;

    const paint = () => {
      hits.forEach((hit) => hit.classList.remove("is-current"));
      if (hits.length && total > 0) hits[(current - 1) % hits.length].classList.add("is-current");
      if (count) count.textContent = total > 0 ? `${current} of ${total}` : "0 of 0";
    };

    widget.querySelectorAll("[data-find-step]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!total) return;
        current += Number(button.dataset.findStep || 1);
        current = ((current - 1 + total) % total) + 1;
        paint();
      });
    });

    const replaceOne = widget.querySelector("[data-find-replace]");
    if (replaceOne) {
      replaceOne.addEventListener("click", () => {
        if (!total) return;
        total -= 1;
        if (current > total) current = Math.max(1, total);
        paint();
        showNotice("Replaced", "The current match was replaced with “weight”.");
      });
    }

    const replaceAll = widget.querySelector("[data-find-replace-all]");
    if (replaceAll) {
      replaceAll.addEventListener("click", () => {
        const replaced = total;
        total = 0;
        current = 0;
        paint();
        showNotice("Replaced all", `${replaced} matches in fuzzy.ts were replaced with “weight”.`);
      });
    }

    const findInput = widget.querySelector("[data-find-input]");
    if (findInput) {
      findInput.addEventListener("input", () => {
        if (findInput.value.trim() === "score") {
          total = hits.length;
          current = Math.min(current || 1, total);
          paint();
        } else if (findInput.value.trim()) {
          total = 0;
          current = 0;
          paint();
        } else {
          total = hits.length;
          current = 1;
          paint();
        }
      });
    }
    paint();
  }

  function initDialogs() {
    document.querySelectorAll("[data-dialog-close]").forEach((button) => {
      button.addEventListener("click", () => {
        const backdrop = button.closest(".dialog-backdrop");
        if (backdrop) backdrop.hidden = true;
      });
    });

    const deleteConfirm = document.querySelector("[data-confirm-delete]");
    if (deleteConfirm) {
      deleteConfirm.addEventListener("click", () => {
        const target = document.querySelector("[data-deletable]");
        const activeTab = document.querySelector(".tab.is-active");
        const backdrop = deleteConfirm.closest(".dialog-backdrop");
        if (target) target.remove();
        if (activeTab && activeTab.querySelector(".tab-title")?.textContent === "legacy.ts") {
          const next = activeTab.nextElementSibling || activeTab.previousElementSibling;
          if (next && next.classList.contains("tab")) next.click();
          activeTab.remove();
        }
        if (backdrop) backdrop.hidden = true;
        showNotice("Deleted", "src/state/legacy.ts was removed from disk and the explorer updated.");
      });
    }

    document.querySelectorAll("[data-close-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.closeAction;
        const backdrop = button.closest(".dialog-backdrop");
        if (action === "cancel") {
          if (backdrop) backdrop.hidden = true;
          return;
        }
        if (action === "save") {
          document.querySelectorAll(".tab .tab-dot").forEach((dot) => dot.remove());
          if (backdrop) backdrop.hidden = true;
          showNotice("Saved", "src/state/documents.ts was written to disk.");
          return;
        }
        if (action === "discard") {
          const active = document.querySelector(".tab.is-active");
          if (active) {
            const next = active.nextElementSibling || active.previousElementSibling;
            if (next && next.classList.contains("tab")) next.click();
            active.remove();
          }
          if (backdrop) backdrop.hidden = true;
          showNotice("Tab closed", "Unsaved changes were discarded.");
        }
      });
    });

    document.querySelectorAll("[data-prompt-dialog]").forEach((backdrop) => {
      const input = backdrop.querySelector("[data-prompt-input]");
      const error = backdrop.querySelector("[data-prompt-error]");
      const title = backdrop.querySelector("[data-prompt-title]");
      const confirm = backdrop.querySelector("[data-prompt-confirm]");
      if (!input || !confirm) return;

      const openPrompt = (kind) => {
        const config = {
          "new-file": { title: "New File", value: "", success: "Created src/state/config.ts" },
          "new-folder": { title: "New Folder", value: "", success: "Created src/state/hooks/" },
          rename: { title: "Rename", value: "legacy.ts", success: "Renamed legacy.ts to config.ts" }
        }[kind] || { title: "New File", value: "", success: "File created." };
        title.textContent = config.title;
        input.value = config.value;
        input.placeholder = kind === "new-folder" ? "folder name" : "file name";
        if (error) error.hidden = true;
        backdrop.dataset.promptKind = kind;
        backdrop.dataset.operation = kind;
        backdrop.hidden = false;
        const contextMenu = document.querySelector("[data-context-menu]");
        if (contextMenu) contextMenu.hidden = true;
        window.setTimeout(() => input.focus(), 30);
        confirm.dataset.success = config.success;
        confirm.textContent = kind === "rename" ? "Rename" : "Create";
      };

      document.querySelectorAll("[data-tree-action]").forEach((button) => {
        button.addEventListener("click", () => {
          const action = button.dataset.treeAction;
          if (action === "delete") return;
          openPrompt(action);
        });
      });

      confirm.addEventListener("click", () => {
        const value = input.value.trim();
        if (!value) {
          if (error) {
            error.hidden = false;
            error.textContent = "A name is required. Nothing was written to disk.";
          }
          return;
        }
        if (["documents.ts", "tabsReducer.ts", "types.ts", "legacy.ts"].includes(value)) {
          if (error) {
            error.hidden = false;
            const kindLabel = backdrop.dataset.promptKind === "new-folder" ? "folder" : "file";
            error.textContent = `A ${kindLabel} named ${value} already exists in src/state. Nothing was written to disk.`;
          }
          return;
        }
        const operation = backdrop.dataset.operation;
        const suffix = operation === "new-folder" ? "/" : "";
        if (operation === "rename") {
          const treeTarget = document.querySelector("[data-context-anchor] .tree-label");
          const tabTarget = document.querySelector(".tab.is-active .tab-title");
          if (treeTarget) treeTarget.textContent = value;
          if (tabTarget && tabTarget.textContent === "legacy.ts") tabTarget.textContent = value;
        }
        if (operation === "new-file") {
          const anchor = document.querySelector("[data-context-anchor]");
          const list = anchor ? anchor.parentElement : null;
          if (anchor && list) {
            const row = anchor.cloneNode(true);
            row.classList.remove("is-active");
            row.removeAttribute("aria-current");
            row.removeAttribute("data-context-anchor");
            row.href = "workspace.html";
            const label = row.querySelector(".tree-label");
            if (label) label.textContent = value;
            list.append(row);
          }
        }
        if (operation === "new-folder") {
          const anchor = document.querySelector("[data-context-anchor]");
          const folderButton = document.querySelector(".tree-row[data-tree-toggle]");
          const list = anchor ? anchor.parentElement : null;
          if (folderButton && list) {
            const row = folderButton.cloneNode(true);
            row.setAttribute("aria-expanded", "false");
            const label = row.querySelector(".tree-label");
            if (label) label.textContent = value;
            const children = document.createElement("div");
            children.className = "tree-children";
            children.hidden = true;
            const empty = document.createElement("div");
            empty.className = "tree-empty";
            empty.textContent = "Empty folder";
            children.append(empty);
            list.append(row, children);
            row.addEventListener("click", () => {
              const expanded = row.getAttribute("aria-expanded") === "true";
              row.setAttribute("aria-expanded", String(!expanded));
              children.hidden = expanded;
            });
          }
        }
        const success = operation === "rename"
          ? `Renamed to src/state/${value}${suffix}.`
          : `Created src/state/${value}${suffix}.`;
        backdrop.hidden = true;
        showNotice("File operation complete", success);
      });

      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          confirm.click();
        }
      });
    });

    const resetButton = document.querySelector("[data-reset-local]");
    const resetBackdrop = document.querySelector("[data-reset-confirm]");
    if (resetButton && resetBackdrop) {
      resetButton.addEventListener("click", () => {
        resetBackdrop.hidden = false;
      });
    }
    document.querySelectorAll("[data-confirm-reset]").forEach((button) => {
      button.addEventListener("click", () => {
        try {
          localStorage.removeItem(SETTINGS_KEY);
        } catch {
          /* ignore blocked storage */
        }
        window.location.href = "welcome.html";
      });
    });

    if (window.location.hash === "#reset" && resetBackdrop) resetBackdrop.hidden = false;

    document.querySelectorAll(".dialog-backdrop, .about-backdrop").forEach((backdrop) => {
      backdrop.addEventListener("click", (event) => {
        if (event.target !== backdrop) return;
        if (backdrop.hasAttribute("data-stay-on-scrim")) return;
        backdrop.hidden = true;
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const visibleDialog = Array.from(document.querySelectorAll(".dialog-backdrop, .about-backdrop")).find((dialog) => !dialog.hidden);
      if (visibleDialog && !visibleDialog.hasAttribute("data-stay-on-scrim")) visibleDialog.hidden = true;
    });
  }

  function initContextMenu() {
    const menu = document.querySelector("[data-context-menu]");
    if (!menu) return;
    document.querySelectorAll("[data-context-close]").forEach((button) => {
      button.addEventListener("click", () => {
        menu.hidden = true;
      });
    });
    const sidebar = menu.closest(".sidebar");
    document.querySelectorAll(".tree-row").forEach((row) => {
      row.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        if (!sidebar) return;
        const rect = sidebar.getBoundingClientRect();
        const left = Math.min(Math.max(8, event.clientX - rect.left), Math.max(8, rect.width - 224));
        const top = Math.max(8, event.clientY - rect.top);
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.hidden = false;
      });
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest("[data-context-menu]") && !event.target.closest("[data-context-anchor]")) {
        menu.hidden = true;
      }
    });
  }

  function initShortcuts() {
    const routes = {
      "ctrl+shift+e": "workspace.html",
      "ctrl+,": "settings.html",
      "ctrl+p": "quick-open.html",
      "ctrl+shift+f": "project-search.html",
      "ctrl+shift+p": "command-palette.html",
      "ctrl+f": "find-replace.html",
      "ctrl+h": "find-replace.html",
      "ctrl+shift+o": "workspace.html"
    };

    document.addEventListener("keydown", (event) => {
      const key = event.key === "," ? "ctrl+," : [event.ctrlKey ? "ctrl" : "", event.altKey ? "alt" : "", event.shiftKey ? "shift" : "", event.key.toLowerCase()].filter(Boolean).join("+");
      if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (event.altKey) {
          document.querySelectorAll(".tab .tab-dot").forEach((dot) => dot.remove());
          showNotice("Saved all tabs", "All changed editor tabs were written to disk.");
        } else {
          document.querySelectorAll(".tab.is-active .tab-dot").forEach((dot) => dot.remove());
          showNotice("Saved", "The active editor tab was written to disk.");
        }
        return;
      }
      if (routes[key]) {
        event.preventDefault();
        window.location.href = routes[key];
      }
    });
  }

  function initCodeCursor() {
    document.querySelectorAll(".code").forEach((code) => {
      code.addEventListener("click", (event) => {
        const line = event.target.closest(".code-line");
        if (!line) return;
        code.querySelectorAll(".code-line.is-active").forEach((item) => item.classList.remove("is-active"));
        line.classList.add("is-active");
        const number = line.dataset.line || "1";
        const position = document.querySelector("[data-status-position]");
        if (position) position.textContent = `${number}:1`;
      });
    });
  }

  function initLanguageSelect() {
    document.querySelectorAll("[data-status-language]").forEach((select) => {
      select.addEventListener("change", () => {
        const label = document.querySelector("[data-status-language-label]");
        if (label) label.textContent = select.value;
        showNotice("Language changed", `The active document is now highlighted as ${select.value}.`);
      });
    });
  }

  function initIndexThemeHint() {
    const themeLive = document.querySelector("[data-theme-live]");
    if (!themeLive) return;
    themeLive.textContent = settings.theme === "dark" ? "dark" : "light";
  }


  function markWhitespace() {
    document.querySelectorAll(".code code").forEach((code) => {
      if (code.dataset.whitespaceReady) return;
      const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        if (!node.nodeValue || !node.nodeValue.includes(" ")) return;
        const fragment = document.createDocumentFragment();
        node.nodeValue.split(/( +)/).forEach((part) => {
          if (!part) return;
          if (/^ +$/.test(part)) {
            const space = document.createElement("span");
            space.className = "ws-space";
            space.textContent = part;
            fragment.append(space);
          } else {
            fragment.append(document.createTextNode(part));
          }
        });
        node.replaceWith(fragment);
      });
      code.dataset.whitespaceReady = "true";
    });
  }

  function boot() {
    markWhitespace();
    applySettings();
    initSettingsControls();
    initMenus();
    initNotices();
    initTrees();
    initTabs();
    initFilterable("[data-quickopen-input]", "[data-filter-item]", "[data-filter-empty]");
    initFilterable("[data-palette-input]", "[data-filter-item]", "[data-filter-empty]");
    initSearch();
    initFindWidget();
    initDialogs();
    initContextMenu();
    initShortcuts();
    initCodeCursor();
    initLanguageSelect();
    initIndexThemeHint();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.Forge = {
    get settings() { return { ...settings }; },
    resetLocalData() {
      try { localStorage.removeItem(SETTINGS_KEY); } catch { /* ignore */ }
      settings = { ...DEFAULTS };
      applySettings();
    },
    showNotice
  };
})();
