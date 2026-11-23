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
import { nextTick, ref, watch } from "vue";
import { IconWarning } from "@iconify-prerendered/vue-codicon";
import { t } from "../../../i18n";

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const cancelButtonRef = ref<HTMLButtonElement | null>(null);

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      nextTick(() => cancelButtonRef.value?.focus());
    }
  }
);

function onConfirm() {
  emit("confirm");
}

function onCancel() {
  emit("cancel");
}

function onOverlayClick(event: Event) {
  if (event.target === event.currentTarget) {
    onCancel();
  }
}
</script>

<template>
  <Transition name="dialog">
    <div v-if="visible" class="dialog-overlay" @click="onOverlayClick" @keydown.esc="onCancel">
      <div class="dialog" role="alertdialog" aria-modal="true" :aria-label="title">
        <div class="dialog-icon"><IconWarning /></div>
        <div class="dialog-text">
          <h3 class="dialog-title">{{ title }}</h3>
          <p class="dialog-message">{{ message }}</p>
        </div>
        <div class="dialog-footer">
          <button ref="cancelButtonRef" class="dialog-btn secondary" type="button" @click="onCancel">
            {{ cancelText || t("common.cancel") }}
          </button>
          <button class="dialog-btn danger" type="button" @click="onConfirm">
            {{ confirmText || t("common.confirm") }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background-color: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
}

.dialog {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 16px;
  width: 100%;
  max-width: 460px;
  padding: 22px 22px 18px;
  border-radius: var(--radius-lg, 14px);
  background-color: var(--surface-raised, var(--vscode-editorWidget-background));
  box-shadow: var(--shadow-lg, 0 24px 64px rgba(0, 0, 0, 0.5));
  color: var(--text-primary, var(--vscode-foreground));
}

.dialog-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: var(--warning-soft, rgba(227, 160, 8, 0.16));
  color: var(--warning-text, #e3a008);
  font-size: 18px;
}

.dialog-title {
  margin: 6px 0 6px;
  font-size: 15px;
  font-weight: 650;
}

.dialog-message {
  margin: 0;
  color: var(--text-secondary, var(--vscode-descriptionForeground));
  font-size: 13px;
  line-height: 1.55;
}

.dialog-footer {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
}

.dialog-btn {
  height: 32px;
  padding: 0 16px;
  border: none;
  border-radius: var(--radius-sm, 6px);
  font: inherit;
  font-size: 12.5px;
  font-weight: 550;
  cursor: pointer;
  transition: background-color 140ms ease, filter 140ms ease;
}

.dialog-btn:focus-visible {
  outline: 2px solid var(--focus-ring, var(--vscode-focusBorder));
  outline-offset: 2px;
}

.dialog-btn.secondary {
  background-color: transparent;
  color: var(--text-primary, var(--vscode-foreground));
  box-shadow: inset 0 0 0 1px var(--border-strong, rgba(128, 128, 128, 0.4));
}

.dialog-btn.secondary:hover {
  background-color: var(--surface-hover, rgba(128, 128, 128, 0.12));
}

.dialog-btn.danger {
  background-color: #dc2626;
  color: #ffffff;
}

.dialog-btn.danger:hover {
  filter: brightness(1.1);
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 160ms ease;
}

.dialog-enter-active .dialog,
.dialog-leave-active .dialog {
  transition: transform 200ms cubic-bezier(0.34, 1.3, 0.64, 1);
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog,
.dialog-leave-to .dialog {
  transform: scale(0.96) translateY(6px);
}
</style>
