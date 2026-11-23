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
const props = defineProps<{
  checked: boolean;
  disabled?: boolean;
  label?: string;
}>();

const emit = defineEmits<{
  (event: "change", value: boolean): void;
}>();

function onChange(event: Event) {
  const input = event.target as HTMLInputElement;
  if (props.disabled) {
    input.checked = props.checked;
    return;
  }
  emit("change", input.checked);
}
</script>

<template>
  <label class="toggle" :class="{ on: checked, disabled }" @click.stop>
    <input
      type="checkbox"
      role="switch"
      :checked="checked"
      :disabled="disabled"
      :aria-checked="checked"
      :aria-label="label"
      @change="onChange"
    />
    <span class="track"><span class="thumb" /></span>
  </label>
</template>

<style scoped>
.toggle {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  width: 34px;
  height: 20px;
  cursor: pointer;
}

.toggle.disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.toggle input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.track {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background-color: var(--control-off);
  box-shadow: inset 0 0 0 1px var(--border-strong);
  transition: background-color var(--motion-fast), box-shadow var(--motion-fast);
}

.thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: var(--text-secondary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  transition: transform var(--motion-spring), background-color var(--motion-fast), width var(--motion-fast);
}

.toggle:not(.disabled):active .thumb {
  width: 17px;
}

.toggle.on .track {
  background-color: var(--accent);
  box-shadow: inset 0 0 0 1px var(--accent);
}

.toggle.on .thumb {
  background-color: var(--accent-contrast);
  transform: translateX(14px);
}

.toggle.on:not(.disabled):active .thumb {
  transform: translateX(11px);
}

.toggle input:focus-visible + .track {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
</style>
