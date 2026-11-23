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
import { computed } from "vue";
import type { Menu } from "../../../../../menuconfig/Menu";
import { t } from "../../../i18n";

const props = defineProps<{
  item: Menu;
}>();

interface DetailEntry {
  label: string;
  value: string;
  mono: boolean;
}

const location = computed(() => {
  const { sourceFile, linenr } = props.item;
  if (!sourceFile || !linenr) {
    return "";
  }
  return `${sourceFile}:${linenr}`;
});

const details = computed<DetailEntry[]>(() => {
  const item = props.item;
  const candidates: DetailEntry[] = [
    { label: t("help.name"), value: item.name ? `CONFIG_${item.name}` : "", mono: true },
    { label: t("help.type"), value: item.type ? String(item.type) : "", mono: true },
    { label: t("help.prompt"), value: item.prompt || "", mono: false },
    { label: t("help.dependsOn"), value: item.directDepExpr || "", mono: true },
    { label: t("help.menuPath"), value: item.menuPath || "", mono: false },
    { label: t("help.location"), value: location.value, mono: true },
  ];
  return candidates.filter((entry) => entry.value !== "");
});

const includes = computed(() => props.item.sourceFiles || []);
</script>

<template>
  <div class="help-panel">
    <div v-if="item.help" class="help-text" v-html="item.help"></div>
    <dl class="details">
      <template v-for="entry in details" :key="entry.label">
        <dt>{{ entry.label }}</dt>
        <dd :class="{ mono: entry.mono }">{{ entry.value }}</dd>
      </template>
      <template v-if="includes.length">
        <dt>{{ t("help.includes") }}</dt>
        <dd class="mono">
          <div v-for="(file, index) in includes" :key="index">{{ file }}</div>
        </dd>
      </template>
    </dl>
  </div>
</template>

<style scoped>
.help-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  background-color: var(--surface-sunken);
  box-shadow: inset 0 0 0 1px var(--border-subtle);
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-primary);
}

.help-text {
  color: var(--text-primary);
  white-space: pre-wrap;
}

.help-text :deep(p) {
  margin: 0 0 6px;
}

.details {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 16px;
  margin: 0;
}

dt {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding-top: 1px;
}

dd {
  margin: 0;
  color: var(--text-secondary);
  word-break: break-word;
}

dd.mono {
  font-family: var(--font-mono);
  font-size: 11.5px;
}
</style>
