/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { computed, nextTick, onBeforeUnmount, ref, watch, type Ref } from "vue";
import type { DisplayRow, NavEntry } from "./types";

const MAX_NAV_DEPTH = 2;
const SPY_OFFSET_PX = 48;
const ROW_ID_ATTRIBUTE = "data-row-id";

export interface SectionNavigationDeps {
  rows: Ref<DisplayRow[]>;
  scrollContainer: Ref<HTMLElement | null>;
  expandMenu: (id: string) => void; // eslint-disable-line no-unused-vars
}

export function useSectionNavigation(deps: SectionNavigationDeps) {
  const activeId = ref<string>("");

  const navEntries = computed<NavEntry[]>(() => buildNavEntries(deps.rows.value));

  function navigateTo(entry: NavEntry) {
    [...entry.ancestors, entry.id].forEach((id) => deps.expandMenu(id));
    activeId.value = entry.id;
    nextTick(() => scrollRowIntoView(entry.id));
  }

  function scrollRowIntoView(id: string) {
    const container = deps.scrollContainer.value;
    const target = findRowElement(container, id);
    if (!container || !target) {
      return;
    }
    container.scrollTo({ top: target.offsetTop, behavior: "smooth" });
  }

  let frameHandle = 0;
  function onScroll() {
    if (frameHandle !== 0) {
      return;
    }
    frameHandle = requestAnimationFrame(() => {
      frameHandle = 0;
      activeId.value = findActiveSectionId(deps.scrollContainer.value, navEntries.value);
    });
  }

  watch(deps.scrollContainer, (element, previous) => {
    previous?.removeEventListener("scroll", onScroll);
    element?.addEventListener("scroll", onScroll, { passive: true });
  });

  onBeforeUnmount(() => {
    deps.scrollContainer.value?.removeEventListener("scroll", onScroll);
    cancelAnimationFrame(frameHandle);
  });

  return { activeId, navEntries, navigateTo };
}

export function buildNavEntries(rows: DisplayRow[]): NavEntry[] {
  return rows
    .filter((row) => row.type === "menu" && row.level <= MAX_NAV_DEPTH)
    .map((row) => ({
      id: row.id,
      title: row.item.title || row.item.name || row.id,
      level: row.level,
      ancestors: row.ancestors,
      hasChildren: row.hasChildren,
    }));
}

function findRowElement(container: HTMLElement | null, id: string): HTMLElement | null {
  if (!container) {
    return null;
  }
  return container.querySelector<HTMLElement>(`[${ROW_ID_ATTRIBUTE}="${CSS.escape(id)}"]`);
}

function findActiveSectionId(container: HTMLElement | null, entries: NavEntry[]): string {
  if (!container) {
    return "";
  }
  const threshold = container.scrollTop + SPY_OFFSET_PX;
  let active = "";
  for (const entry of entries) {
    const element = findRowElement(container, entry.id);
    if (!element || element.offsetParent === null) {
      continue;
    }
    if (element.offsetTop > threshold) {
      break;
    }
    active = entry.id;
  }
  return active;
}
