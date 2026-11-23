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
import { IconAdd, IconRemove } from "@iconify-prerendered/vue-codicon";

defineProps<{
  value: string | number;
  inputType: "number" | "text";
  disabled?: boolean;
  min?: number;
  max?: number;
}>();

const emit = defineEmits<{
  (event: "commit", domEvent: Event): void;
  (event: "step", delta: number): void;
}>();

const STEP_UP = 1;
const STEP_DOWN = -1;
</script>

<template>
  <div class="stepper" :class="{ disabled }">
    <button
      type="button"
      class="step-btn"
      tabindex="-1"
      :disabled="disabled"
      aria-label="-1"
      @click.stop="emit('step', STEP_DOWN)"
    >
      <IconRemove />
    </button>
    <input
      class="step-input"
      :type="inputType"
      :min="min"
      :max="max"
      :value="value"
      :disabled="disabled"
      spellcheck="false"
      @change="emit('commit', $event)"
      @blur="emit('commit', $event)"
      @keydown.enter.prevent="emit('commit', $event)"
    />
    <button
      type="button"
      class="step-btn"
      tabindex="-1"
      :disabled="disabled"
      aria-label="+1"
      @click.stop="emit('step', STEP_UP)"
    >
      <IconAdd />
    </button>
  </div>
</template>

<style scoped>
.stepper {
  display: inline-flex;
  align-items: stretch;
  width: 168px;
  height: 28px;
  border-radius: var(--radius-sm);
  background-color: var(--input-bg);
  box-shadow: inset 0 0 0 1px var(--input-border);
  transition: box-shadow var(--motion-fast);
  overflow: hidden;
}

.stepper:focus-within {
  box-shadow: inset 0 0 0 1px var(--accent), 0 0 0 3px var(--accent-soft);
}

.stepper.disabled {
  opacity: 0.5;
}

.step-input {
  flex: 1;
  min-width: 0;
  padding: 0 6px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  text-align: center;
  outline: none;
  appearance: textfield;
  -moz-appearance: textfield;
}

.step-input::-webkit-outer-spin-button,
.step-input::-webkit-inner-spin-button {
  margin: 0;
  -webkit-appearance: none;
}

.step-input:disabled {
  cursor: not-allowed;
}

.step-btn {
  width: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12px;
  transition: background-color var(--motion-fast), color var(--motion-fast);
}

.step-btn:hover:not(:disabled) {
  background-color: var(--surface-hover);
  color: var(--text-primary);
}

.step-btn:disabled {
  cursor: not-allowed;
}
</style>
