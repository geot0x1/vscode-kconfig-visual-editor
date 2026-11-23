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
export interface SegmentOption {
  value: string;
  label: string;
  disabled?: boolean;
}

const props = defineProps<{
  value: string;
  options: SegmentOption[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (event: "select", value: string): void;
}>();

function isOptionDisabled(option: SegmentOption): boolean {
  return props.disabled === true || option.disabled === true;
}

function onSelect(option: SegmentOption) {
  if (isOptionDisabled(option) || option.value === props.value) {
    return;
  }
  emit("select", option.value);
}
</script>

<template>
  <div class="segmented" :class="{ disabled }" role="radiogroup">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      class="segment"
      :class="[`segment-${option.value}`, { active: option.value === value }]"
      :aria-checked="option.value === value"
      :disabled="isOptionDisabled(option)"
      @click.stop="onSelect(option)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.segmented {
  display: inline-flex;
  padding: 2px;
  gap: 2px;
  border-radius: var(--radius-sm);
  background-color: var(--control-off);
  box-shadow: inset 0 0 0 1px var(--border-subtle);
}

.segmented.disabled {
  opacity: 0.5;
}

.segment {
  min-width: 30px;
  height: 22px;
  padding: 0 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
  transition: background-color var(--motion-fast), color var(--motion-fast), box-shadow var(--motion-fast);
}

.segment:hover:not(:disabled):not(.active) {
  background-color: var(--surface-hover);
  color: var(--text-primary);
}

.segment:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.segment.active {
  background-color: var(--surface-raised);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.segment.active.segment-y {
  background-color: var(--accent);
  color: var(--accent-contrast);
}

.segment.active.segment-m {
  background-color: var(--warning);
  color: #1a1a1a;
}

.segment:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 1px;
}
</style>
