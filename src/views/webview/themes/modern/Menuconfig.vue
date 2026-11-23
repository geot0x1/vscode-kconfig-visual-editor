<!--
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 
    http://www.apache.org/licenses/LICENSE-2.0
 
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
-->

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useMenuconfigStore } from "../../store";
import { Menu, menuType } from "../../../../menuconfig/Menu";
import TableRow from "./components/TableRow.vue";
import ConfirmDialog from "./components/ConfirmDialog.vue";
import SidebarNav from "./components/SidebarNav.vue";
import { useSectionNavigation } from "./useSectionNavigation";
import { t } from "../../i18n";
import type { DisplayRow, RowType } from "./types";
import {
  IconChevronDown,
  IconChevronUp,
  IconEyeClosed,
  IconSave,
  IconTrash,
  IconRefresh,
  IconClose,
  IconSearch,
  IconSearchStop
} from "@iconify-prerendered/vue-codicon";

const store = useMenuconfigStore();
const { textDictionary, colorThemeKind } = storeToRefs(store);

const SEARCH_SHORTCUT_KEY = "/";

const searchInputRef = ref<HTMLInputElement | null>(null);
const contentScrollRef = ref<HTMLElement | null>(null);

onMounted(() => {
  store.requestInitValues();
  window.addEventListener("keydown", onGlobalKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onGlobalKeydown);
});

function onGlobalKeydown(event: KeyboardEvent) {
  if (event.key !== SEARCH_SHORTCUT_KEY || isEditableTarget(event.target)) {
    return;
  }
  event.preventDefault();
  searchInputRef.value?.focus();
  searchInputRef.value?.select();
}

function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) {
    return false;
  }
  return element.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(element.tagName);
}

const searchKeyword = computed({
  get: () => store.searchString,
  set: (value: string) => {
    store.searchString = value;
  }
});

const visibleTree = computed(() => filterItemsByVisibility(store.items));

const filteredTree = computed(() => {
  const tree = visibleTree.value;
  const search = searchKeyword.value;
  if (search !== "") {
    const searchStrMatch = /^(?:CONFIG_)?(.+)/.exec(search);
    const normalized =
      searchStrMatch && searchStrMatch.length > 1
        ? searchStrMatch[1].toLowerCase()
        : search.toLowerCase();
    return filterItems(tree, normalized);
  }
  return tree;
});

const choiceChildNames = computed(() => collectChoiceChildNames(visibleTree.value));

const displayRows = computed<DisplayRow[]>(() => {
  const acc: DisplayRow[] = [];
  buildRows(filteredTree.value, 0, [], false, acc, choiceChildNames.value);
  return acc;
});

const { activeId, navEntries, navigateTo } = useSectionNavigation({
  rows: displayRows,
  scrollContainer: contentScrollRef,
  expandMenu: (id: string) => store.setMenuCollapseById(id, false),
});

const activeSectionTitle = computed(
  () => navEntries.value.find((entry) => entry.id === activeId.value)?.title || ""
);

const optionCount = computed(
  () => displayRows.value.filter((row) => row.type !== "menu" && row.type !== "comment").length
);

const resultsLabel = computed(() => t("search.results").replace("{count}", String(optionCount.value)));

const loadProgress = computed(() => {
  const total = store.initialLoadChunkTotal;
  if (!store.initialLoadInProgress || total <= 0) {
    return null;
  }
  return Math.min(100, Math.round((store.initialLoadChunkReceived / total) * 100));
});

const hasSearch = computed(() => searchKeyword.value !== "");
const showNoResults = computed(() => hasSearch.value && displayRows.value.length === 0);

function clearSearch() {
  searchKeyword.value = "";
}

const mainTitle = computed(() => deriveTitle(store.items));

const themeClass = computed(() => (colorThemeKind.value === "light" ? "theme-light" : "theme-dark"));

function deriveTitle(items: Menu[]): string {
  for (const item of items) {
    if (isMainMenu(item)) {
      return item.title || item.name || "Kconfig Configuration";
    }
    if (item.children && item.children.length > 0) {
      const nested = deriveTitle(item.children);
      if (nested) {
        return nested;
      }
    }
  }
  return items[0]?.title || "Kconfig Configuration";
}

function filterItems(items: Menu[], searchString: string) {
  const filteredItems: Menu[] = [];
  items.forEach((item) => {
    if (item.isVisible) {
      if (
        item.isVisible &&
        item.name &&
        item.name.toLowerCase().indexOf(searchString) >= 0
      ) {
        filteredItems.push(item);
      } else if (
        item.isVisible &&
        item.title &&
        item.title.toLowerCase().indexOf(searchString) >= 0
      ) {
        filteredItems.push(item);
      } else {
        const filteredChildren = filterItems(item.children, searchString);
        if (filteredChildren.length > 0) {
          const newItem = Object.assign({}, item);
          newItem.children = filteredChildren;
          filteredItems.push(newItem);
        }
      }
    }
  });
  return filteredItems;
}

function filterItemsByVisibility(items: Menu[]): Menu[] {
  const visibleItems: Menu[] = [];

  items.forEach((item) => {
    const cloned = { ...item };
    const filteredChildren = item.children
      ? filterItemsByVisibility(item.children)
      : [];

    const isImplicitContainer =
      item.isImplicitContainer &&
      item.isContainerVisible === true &&
      item.isVisible === false;

    if (isImplicitContainer) {
      visibleItems.push(...filteredChildren);
      return;
    }

    const isMainMenu = item.isMainMenu === true;
    const isVisible = item.isVisible !== false;
    const isContainer = item.isContainerVisible === true;

    if (item.children && item.children.length > 0) {
      if (!isVisible && !isContainer && !isMainMenu) {
        return;
      }

      if (filteredChildren.length === 0 && !isVisible && !isMainMenu) {
        return;
      }

      cloned.children = filteredChildren;
      visibleItems.push(cloned);
      return;
    }

    if (isVisible) {
      cloned.children = [];
      visibleItems.push(cloned);
    }
  });

  return visibleItems;
}

function buildRows(
  items: Menu[],
  level: number,
  ancestors: string[],
  ancestorCollapsed: boolean,
  acc: DisplayRow[],
  choiceChildren: Set<string>
) {
  items.forEach((item, index) => {
    const isRootMainMenu = level === 0 && isMainMenu(item);
    if (isRootMainMenu) {
      if (item.children && item.children.length > 0) {
        buildRows(item.children, level, ancestors, ancestorCollapsed, acc, choiceChildren);
      }
      return;
    }

    if (item.name && choiceChildren.has(item.name) && item.type !== menuType.choice) {
      return;
    }

    const id = item.id || `${item.name || "config"}-${level}-${index}`;
    const type = getRowType(item);
    const collapsed = type === "menu" ? computeCollapsed(item) : false;
    const hidden = ancestorCollapsed;

    const row: DisplayRow = {
      id,
      item,
      level,
      type,
      ancestors: [...ancestors],
      collapsed,
      hidden,
      hasChildren: false,
    };
    acc.push(row);

    const beforeChildrenLength = acc.length;
    const childAncestors = type === "menu" ? [...ancestors, id] : ancestors;
    const nextAncestorCollapsed = ancestorCollapsed || (type === "menu" ? collapsed : false);

    if (item.children && item.children.length > 0) {
      if (type === "menu") {
        buildRows(
          item.children,
          level + 1,
          childAncestors,
          nextAncestorCollapsed,
          acc,
          choiceChildren
        );
      } else if (type !== "choice") {
        buildRows(
          item.children,
          level + 1,
          ancestors,
          ancestorCollapsed,
          acc,
          choiceChildren
        );
      }
    }

    if (type === "menu") {
      row.hasChildren = acc.length > beforeChildrenLength;
    }
  });
}

function collectChoiceChildNames(items: Menu[], set: Set<string> = new Set()): Set<string> {
  items.forEach(item => {
    if (item.type === menuType.choice && item.children) {
      item.children.forEach(child => {
        if (child.name) {
          set.add(child.name);
        }
      });
    }
    if (item.children && item.children.length > 0) {
      collectChoiceChildNames(item.children, set);
    }
  });
  return set;
}

function getRowType(item: Menu): RowType {
  if (item.type === menuType.choice) {
    return "choice";
  }

  if (item.type === menuType.menu || item.isMenuconfig) {
    return "menu";
  }

  switch (item.type) {
    case menuType.bool:
      return "bool";
    case menuType.tristate:
      return "tristate";
    case menuType.string:
      return "string";
    case menuType.int:
      return "int";
    case menuType.hex:
      return "hex";
    case menuType.comment:
      return "comment";
    default:
      return item.type === "comment" ? "comment" : "other";
  }
}

function computeCollapsed(item: Menu): boolean {
  if (isMainMenu(item)) {
    return false;
  }
  if (item.isMenuconfig && item.value === true) {
    return false;
  }
  if (typeof item.isCollapsed === "boolean") {
    return item.isCollapsed;
  }
  return item.type === menuType.menu || item.isMenuconfig ? true : false;
}

function isMainMenu(item: Menu): boolean {
  if (item.isMainMenu === true) {
    return true;
  }
  const id = item.id || "";
  if (typeof id === "string" && id.startsWith("mainmenu-")) {
    return true;
  }
  return item.name === "__MAINMENU__";
}

function handleCollapseUpdate(id: string, value: boolean) {
  store.setMenuCollapseById(id, value);
}
</script>

<template>
  <div class="modern-app" :class="themeClass">
    <header class="app-header">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
        <div class="brand-text">
          <h1 class="brand-title" :title="mainTitle">{{ mainTitle }}</h1>
          <span class="brand-subtitle">Kconfig</span>
        </div>
      </div>

      <div class="search-field">
        <IconSearch class="search-icon" />
        <input
          ref="searchInputRef"
          v-model="searchKeyword"
          type="text"
          class="search-input"
          spellcheck="false"
          :placeholder="t('search.placeholder')"
          :aria-label="t('search.placeholder')"
          @keydown.esc="clearSearch"
        />
        <span v-if="hasSearch" class="search-count">{{ resultsLabel }}</span>
        <button
          v-if="hasSearch"
          class="search-clear"
          type="button"
          :title="t('search.clear')"
          :aria-label="t('search.clear')"
          @click="clearSearch"
        >
          <IconClose />
        </button>
        <kbd v-else class="search-kbd" :title="t('search.shortcut')">/</kbd>
      </div>

      <div class="header-actions">
        <button class="btn btn-ghost" type="button" :title="textDictionary.reset" @click="store.setDefaultConfig">
          <IconRefresh />
          <span class="btn-label">{{ textDictionary.reset }}</span>
        </button>
        <button class="btn btn-secondary" type="button" :title="textDictionary.discard" @click="store.resetGuiConfig">
          <IconTrash />
          <span class="btn-label">{{ textDictionary.discard }}</span>
        </button>
        <button class="btn btn-primary" type="button" :title="textDictionary.save" @click="store.saveGuiConfig">
          <IconSave />
          <span class="btn-label">{{ textDictionary.save }}</span>
        </button>
      </div>

      <div v-if="loadProgress !== null" class="load-bar" role="progressbar" :aria-valuenow="loadProgress">
        <span :style="{ width: `${loadProgress}%` }" />
      </div>
    </header>

    <div class="app-body">
      <SidebarNav class="app-sidebar" :entries="navEntries" :active-id="activeId" @navigate="navigateTo" />

      <main class="content">
        <div class="content-toolbar">
          <div class="breadcrumb">
            <span class="breadcrumb-root">{{ t("nav.title") }}</span>
            <template v-if="activeSectionTitle">
              <span class="breadcrumb-sep">/</span>
              <span class="breadcrumb-current">{{ activeSectionTitle }}</span>
            </template>
          </div>
          <div class="icon-group">
            <button class="icon-btn" type="button" :title="t('toolbar.expandAll')" @click="store.expandAllMenus">
              <IconChevronDown />
            </button>
            <button class="icon-btn" type="button" :title="t('toolbar.collapseAll')" @click="store.collapseAllMenus">
              <IconChevronUp />
            </button>
            <button class="icon-btn" type="button" :title="t('toolbar.closeAllHelp')" @click="store.closeAllHelp">
              <IconEyeClosed />
            </button>
          </div>
        </div>

        <div ref="contentScrollRef" class="content-scroll">
          <div class="content-column">
            <div v-if="showNoResults" class="empty-state">
              <div class="empty-icon"><IconSearchStop /></div>
              <div class="empty-title">{{ t("search.noResults") }}</div>
              <div class="empty-hint">{{ t("search.noResultsHint") }}</div>
            </div>
            <TableRow
              v-for="row in displayRows"
              :key="row.id"
              :row="row"
              :collapsed="row.collapsed"
              :hidden="row.hidden"
              @update-collapse="handleCollapseUpdate"
            />
          </div>
        </div>
      </main>
    </div>

    <ConfirmDialog
      :visible="store.showDiscardConfirm"
      :title="t('discard.confirmTitle')"
      :message="t('discard.confirmMessage')"
      :confirm-text="t('common.confirm')"
      :cancel-text="t('common.cancel')"
      @confirm="store.confirmDiscard"
      @cancel="store.cancelDiscard"
    />

    <ConfirmDialog
      :visible="store.showResetConfirm"
      :title="t('reset.confirmTitle')"
      :message="t('reset.confirmMessage')"
      :confirm-text="t('common.confirm')"
      :cancel-text="t('common.cancel')"
      @confirm="store.confirmReset"
      @cancel="store.cancelReset"
    />
  </div>
</template>

<style scoped lang="scss">
@import "../../../commons/commons.scss";

/* ---------- Design tokens (inherit from the active VS Code theme) ---------- */
.modern-app {
  --surface-base: var(--vscode-editor-background, #1e1e1e);
  --surface-sidebar: var(--vscode-sideBar-background, var(--surface-base));
  --surface-raised: var(--vscode-editorWidget-background, #252526);
  --text-primary: var(--vscode-foreground, #e2e2e2);
  --text-secondary: var(--vscode-descriptionForeground, #a8a8a8);
  --accent: var(--vscode-button-background, #3b82f6);
  --accent-contrast: var(--vscode-button-foreground, #ffffff);
  --accent-hover: var(--vscode-button-hoverBackground, #2563eb);
  --accent-text: var(--vscode-textLink-foreground, #60a5fa);
  --focus-ring: var(--vscode-focusBorder, #3b82f6);
  --input-bg: var(--vscode-input-background, #2a2a2a);
  --font-ui: var(--vscode-font-family, system-ui, -apple-system, "Segoe UI", sans-serif);
  --font-mono: var(--vscode-editor-font-family, ui-monospace, Consolas, monospace);
  --warning: #e3a008;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --motion-fast: 140ms ease;
  --motion-spring: 220ms cubic-bezier(0.34, 1.4, 0.64, 1);
  --control-column: 200px;
  --sidebar-width: 264px;
}

.modern-app.theme-dark {
  --text-muted: rgba(255, 255, 255, 0.42);
  --surface-hover: rgba(255, 255, 255, 0.045);
  --surface-sunken: rgba(0, 0, 0, 0.22);
  --border-subtle: rgba(255, 255, 255, 0.07);
  --border-strong: rgba(255, 255, 255, 0.15);
  --input-border: rgba(255, 255, 255, 0.14);
  --indent-guide: rgba(255, 255, 255, 0.07);
  --control-off: rgba(255, 255, 255, 0.09);
  --accent-soft: rgba(59, 130, 246, 0.18);
  --warning-soft: rgba(227, 160, 8, 0.16);
  --warning-text: #f0c14b;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.45);
  --shadow-lg: 0 24px 64px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.06);
  --header-glass: rgba(20, 20, 22, 0.72);
}

.modern-app.theme-light {
  --text-muted: rgba(0, 0, 0, 0.45);
  --surface-hover: rgba(0, 0, 0, 0.035);
  --surface-sunken: rgba(0, 0, 0, 0.03);
  --border-subtle: rgba(0, 0, 0, 0.07);
  --border-strong: rgba(0, 0, 0, 0.15);
  --input-border: rgba(0, 0, 0, 0.16);
  --indent-guide: rgba(0, 0, 0, 0.07);
  --control-off: rgba(0, 0, 0, 0.08);
  --accent-soft: rgba(37, 99, 235, 0.12);
  --warning-soft: rgba(227, 160, 8, 0.16);
  --warning-text: #8a5a00;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 24px 64px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.06);
  --header-glass: rgba(255, 255, 255, 0.78);
}

@supports (color: color-mix(in srgb, red, blue)) {
  .modern-app.theme-dark,
  .modern-app.theme-light {
    --accent-soft: color-mix(in srgb, var(--accent) 18%, transparent);
    --header-glass: color-mix(in srgb, var(--surface-base) 78%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .modern-app {
    --motion-fast: 0ms linear;
    --motion-spring: 0ms linear;
  }
}

/* ---------- Shell ---------- */
.modern-app {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  min-height: 0;
  background-color: var(--surface-base);
  color: var(--text-primary);
  font-family: var(--font-ui);
  font-size: 13px;
  -webkit-font-smoothing: antialiased;
}

.app-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 20px;
  background-color: var(--header-glass);
  backdrop-filter: saturate(180%) blur(14px);
  border-bottom: 1px solid var(--border-subtle);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 0 1 auto;
  max-width: calc(var(--sidebar-width) + 40px);
}

.brand-mark {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 3px;
  width: 32px;
  height: 32px;
  padding: 7px;
  box-sizing: border-box;
  border-radius: 9px;
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  box-shadow: 0 4px 14px var(--accent-soft), inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.brand-mark span {
  border-radius: 2px;
  background-color: var(--accent-contrast);
  opacity: 0.9;
}

.brand-mark span:nth-child(2),
.brand-mark span:nth-child(3) {
  opacity: 0.45;
}

.brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.brand-title {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand-subtitle {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* ---------- Search ---------- */
.search-field {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  max-width: 520px;
  margin: 0 auto;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 34px;
  padding: 0 110px 0 36px;
  box-sizing: border-box;
  border: none;
  border-radius: 999px;
  background-color: var(--input-bg);
  box-shadow: inset 0 0 0 1px var(--input-border);
  color: var(--text-primary);
  font: inherit;
  outline: none;
  transition: box-shadow var(--motion-fast);
}

.search-input:hover {
  box-shadow: inset 0 0 0 1px var(--border-strong);
}

.search-input:focus {
  box-shadow: inset 0 0 0 1px var(--accent), 0 0 0 4px var(--accent-soft);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-count {
  position: absolute;
  right: 38px;
  color: var(--text-muted);
  font-size: 11px;
  white-space: nowrap;
  pointer-events: none;
}

.search-kbd {
  position: absolute;
  right: 10px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  box-shadow: inset 0 0 0 1px var(--border-strong);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 11px;
  pointer-events: none;
}

.search-clear {
  position: absolute;
  right: 6px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.search-clear:hover,
.search-clear:focus-visible {
  background-color: var(--surface-hover);
  color: var(--text-primary);
}

/* ---------- Buttons ---------- */
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: 12.5px;
  font-weight: 550;
  cursor: pointer;
  transition: background-color var(--motion-fast), box-shadow var(--motion-fast), transform var(--motion-fast);
}

.btn:active {
  transform: translateY(1px);
}

.btn:focus-visible,
.icon-btn:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.btn-primary {
  background-color: var(--accent);
  color: var(--accent-contrast);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.btn-primary:hover {
  background-color: var(--accent-hover);
}

.btn-secondary {
  background-color: var(--surface-raised);
  color: var(--text-primary);
  box-shadow: inset 0 0 0 1px var(--border-strong);
}

.btn-secondary:hover {
  background-color: var(--surface-hover);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}

.btn-ghost:hover {
  background-color: var(--surface-hover);
  color: var(--text-primary);
}

.load-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  overflow: hidden;
}

.load-bar span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-text));
  transition: width 200ms ease;
}

/* ---------- Body ---------- */
.app-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
}

.content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.content-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 20px;
  border-bottom: 1px solid var(--border-subtle);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 12px;
}

.breadcrumb-root {
  color: var(--text-muted);
}

.breadcrumb-sep {
  color: var(--border-strong);
}

.breadcrumb-current {
  color: var(--text-primary);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.icon-group {
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: var(--radius-sm);
  box-shadow: inset 0 0 0 1px var(--border-subtle);
}

.icon-btn {
  width: 28px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color var(--motion-fast), color var(--motion-fast);
}

.icon-btn:hover {
  background-color: var(--surface-hover);
  color: var(--text-primary);
}

.content-scroll {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.content-column {
  max-width: 1080px;
  margin: 0 auto;
  padding: 4px 8px 64px;
}

/* ---------- Empty state ---------- */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 72px 16px;
  text-align: center;
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: var(--surface-sunken);
  color: var(--text-muted);
  font-size: 22px;
}

.empty-title {
  font-size: 14px;
  font-weight: 600;
}

.empty-hint {
  color: var(--text-muted);
  font-size: 12px;
}

/* ---------- Responsive ---------- */
@media (max-width: 900px) {
  .modern-app {
    --sidebar-width: 220px;
    --control-column: 160px;
  }

  .btn-label {
    display: none;
  }

  .btn {
    padding: 0 9px;
  }
}

@media (max-width: 720px) {
  .app-body {
    grid-template-columns: 1fr;
  }

  .app-sidebar,
  .brand-subtitle,
  .search-count {
    display: none;
  }

  .app-header {
    flex-wrap: wrap;
    gap: 10px;
    padding: 10px 12px;
  }

  .search-field {
    order: 3;
    flex-basis: 100%;
    max-width: none;
  }
}
</style>
