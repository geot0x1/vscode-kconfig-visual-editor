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
import { computed, ref } from "vue";
import { IconChevronRight, IconListTree } from "@iconify-prerendered/vue-codicon";
import type { NavEntry } from "../types";
import { t } from "../../../i18n";

const props = defineProps<{
  entries: NavEntry[];
  activeId: string;
}>();

const emit = defineEmits<{
  (event: "navigate", entry: NavEntry): void;
}>();

const INDENT_PX = 14;
const expandedIds = ref<Set<string>>(new Set());

const activeAncestors = computed(() => {
  const active = props.entries.find((entry: NavEntry) => entry.id === props.activeId);
  return new Set(active ? active.ancestors : []);
});

const visibleEntries = computed(() => props.entries.filter(isEntryVisible));

function isExpanded(id: string): boolean {
  return expandedIds.value.has(id) || activeAncestors.value.has(id);
}

function isEntryVisible(entry: NavEntry): boolean {
  return entry.ancestors.every((ancestorId) => isExpanded(ancestorId));
}

function hasNavChildren(entry: NavEntry): boolean {
  return props.entries.some((candidate: NavEntry) => candidate.ancestors.includes(entry.id));
}

function toggleExpanded(entry: NavEntry) {
  const next = new Set(expandedIds.value);
  if (next.has(entry.id)) {
    next.delete(entry.id);
  } else {
    next.add(entry.id);
  }
  expandedIds.value = next;
}

function indentStyle(entry: NavEntry) {
  return { paddingLeft: `${8 + entry.level * INDENT_PX}px` };
}
</script>

<template>
  <nav class="sidebar" :aria-label="t('nav.title')">
    <div class="sidebar-heading">
      <IconListTree />
      <span>{{ t("nav.title") }}</span>
    </div>
    <ul class="nav-list">
      <li v-for="entry in visibleEntries" :key="entry.id">
        <div
          class="nav-item"
          :class="{
            active: entry.id === activeId,
            'in-path': activeAncestors.has(entry.id),
            root: entry.level === 0,
          }"
          :style="indentStyle(entry)"
        >
          <button
            v-if="hasNavChildren(entry)"
            type="button"
            class="nav-twisty"
            :class="{ open: isExpanded(entry.id) }"
            :aria-expanded="isExpanded(entry.id)"
            @click="toggleExpanded(entry)"
          >
            <IconChevronRight />
          </button>
          <span v-else class="nav-twisty-spacer" />
          <button type="button" class="nav-label" :title="entry.title" @click="emit('navigate', entry)">
            {{ entry.title }}
          </button>
        </div>
      </li>
      <li v-if="visibleEntries.length === 0" class="nav-empty">—</li>
    </ul>
  </nav>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background-color: var(--surface-sidebar);
  border-right: 1px solid var(--border-subtle);
}

.sidebar-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px 10px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nav-list {
  flex: 1;
  margin: 0;
  padding: 0 8px 16px;
  list-style: none;
  overflow-y: auto;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
  min-height: 28px;
  margin: 1px 0;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  transition: background-color var(--motion-fast), color var(--motion-fast);
}

.nav-item:hover {
  background-color: var(--surface-hover);
  color: var(--text-primary);
}

.nav-item.root {
  color: var(--text-primary);
  font-weight: 500;
}

.nav-item.in-path {
  color: var(--text-primary);
}

.nav-item.active {
  background-color: var(--accent-soft);
  color: var(--accent-text);
  font-weight: 600;
}

.nav-item.active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 2px;
  background-color: var(--accent);
}

.nav-twisty,
.nav-twisty-spacer {
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
}

.nav-twisty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12px;
  transition: transform var(--motion-fast), color var(--motion-fast);
}

.nav-twisty:hover {
  color: var(--text-primary);
}

.nav-twisty.open {
  transform: rotate(90deg);
}

.nav-label {
  flex: 1;
  min-width: 0;
  padding: 5px 8px 5px 2px;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12.5px;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.nav-label:focus-visible,
.nav-twisty:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: -2px;
}

.nav-empty {
  padding: 8px 12px;
  color: var(--text-muted);
}
</style>
