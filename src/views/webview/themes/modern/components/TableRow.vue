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
import { computed, ref, watch, nextTick, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useMenuconfigStore } from "../../../store";
import type { DisplayRow } from "../types";
import type { Menu } from "../../../../../menuconfig/Menu";
import { IconChevronRight, IconInfo, IconLock } from "@iconify-prerendered/vue-codicon";
import ToggleSwitch from "./ToggleSwitch.vue";
import SegmentedControl from "./SegmentedControl.vue";
import StepperInput from "./StepperInput.vue";
import HelpPanel from "./HelpPanel.vue";
import { t } from "../../../i18n";

const props = defineProps<{
  row: DisplayRow;
  collapsed: boolean;
  hidden: boolean;
}>();

const emit = defineEmits<{
  (event: "updateCollapse", id: string, value: boolean): void;
}>();

const store = useMenuconfigStore();
const { closeAllHelpTimestamp } = storeToRefs(store);

const isMenuRow = computed(() => props.row.type === "menu");
const isChoiceRow = computed(() => props.row.type === "choice");
const isBoolRow = computed(() => props.row.type === "bool");
const isTristateRow = computed(() => props.row.type === "tristate");
const isStringRow = computed(() => props.row.type === "string");
const isIntRow = computed(() => props.row.type === "int");
const isHexRow = computed(() => props.row.type === "hex");
const isCommentRow = computed(() => props.row.type === "comment");
const isMenuConfig = computed(() => props.row.item.isMenuconfig === true);

const canToggleMenu = computed(() => {
  if (!isMenuRow.value) {
    return false;
  }
  return props.row.hasChildren === true;
});

type TriValue = "n" | "m" | "y";

const allowedTriOptions = computed<TriValue[]>(() => {
  const allowed = props.row.item.allowedTristateValues;
  if (allowed && allowed.length > 0) {
    const normalized: TriValue[] = [];
    for (const option of allowed) {
      const normalizedValue = normalizeTriValue(option);
      if (!normalized.includes(normalizedValue)) {
        normalized.push(normalizedValue);
      }
    }
    return normalized.length > 0 ? normalized : ["n", "m", "y"];
  }
  return ["n", "m", "y"];
});

const triSelectOptions = computed(() =>
  (["n", "m", "y"] as TriValue[]).map((option) => ({
    value: option,
    label: option,
    disabled: !allowedTriOptions.value.includes(option),
  }))
);

const isTriSelectDisabled = computed(
  () => isReadonly.value || allowedTriOptions.value.length <= 1
);

const isReadonly = computed(() => props.row.item.isReadonly === true);
const readonlyReason = computed(() => props.row.item.readonlyReason || "");

const propertyLabel = computed(() => props.row.item.title || props.row.item.name || props.row.id);

const INDENT_PX = 18;
const ROW_BASE_PADDING_PX = 20;

const symbolName = computed(() => {
  const name = props.row.item.name;
  if (!name || name === propertyLabel.value) {
    return "";
  }
  return `CONFIG_${name}`;
});

const isSectionRow = computed(() => isMenuRow.value && props.row.level === 0);

const typeBadge = computed(() => {
  const labels: Partial<Record<string, string>> = {
    int: "int",
    hex: "hex",
    string: "str",
    tristate: "tri",
    choice: "choice",
  };
  return labels[props.row.type] || "";
});

const indentStyle = computed(() => ({
  paddingLeft: `${ROW_BASE_PADDING_PX + props.row.level * INDENT_PX}px`,
  "--guide-width": `${props.row.level * INDENT_PX}px`,
}));

const hasHelp = computed(() => {
  if (isMenuRow.value || isCommentRow.value) {
    return false;
  }
  const item = props.row.item;
  return Boolean(
    item.help ||
    item.prompt ||
    item.directDepExpr ||
    item.menuPath ||
    item.sourceFile ||
    (item.sourceFiles && item.sourceFiles.length > 0)
  );
});

const helpVisible = ref(false);
watch(closeAllHelpTimestamp, () => {
  helpVisible.value = false;
});

const collapsed = ref(props.collapsed);
function updateCollapseState(
  value: boolean,
  options: { emit?: boolean } = {}
) {
  const { emit: shouldEmit = true } = options;
  collapsed.value = value;
  if (shouldEmit) {
    emit("updateCollapse", props.row.id, value);
  }
}

watch(
  () => props.collapsed,
  (value) => {
    updateCollapseState(value, { emit: false });
  }
);

const boolValue = ref(toBoolean(props.row.item.value));
watch(
  () => props.row.item.value,
  (value) => {
    boolValue.value = toBoolean(value);
    if (isMenuConfig.value && !boolValue.value) {
      updateCollapseState(true);
    }
  }
);

const triValue = ref<TriValue>(
  ensureTriValueAllowed(normalizeTriValue(props.row.item.value))
);
watch(
  () => props.row.item.value,
  (value) => {
    triValue.value = ensureTriValueAllowed(normalizeTriValue(value));
  }
);

watch(allowedTriOptions, () => {
  triValue.value = ensureTriValueAllowed(triValue.value);
});

const stringValue = ref(toStringValue(props.row.item.value));
watch(
  () => props.row.item.value,
  (value) => {
    stringValue.value = toStringValue(value);
  }
);

const numberValue = ref(toNumberValue(props.row.item.value));
watch(
  () => props.row.item.value,
  (value) => {
    numberValue.value = toNumberValue(value);
  }
);

const hexValue = ref(toHexValue(props.row.item.value));
watch(
  () => props.row.item.value,
  (value) => {
    hexValue.value = toHexValue(value);
  }
);

const choiceValue = ref(toChoiceValue(props.row.item.value));
watch(
  () => props.row.item.value,
  (value) => {
    choiceValue.value = toChoiceValue(value);
  }
);

const choiceOptions = computed<Array<{ id: string; name: string; title: string }>>(() => {
  return (props.row.item.children || []).map((child: Menu) => ({
    id: child.id,
    name: child.name,
    title: child.title || child.name
  }));
});

const choiceSelectRef = ref<HTMLSelectElement | null>(null);
const choiceSelectWidth = ref("140px");
let choiceMeasureCanvas: HTMLCanvasElement | null = null;

const choiceOptionLabels = computed(() =>
  choiceOptions.value
    .map((option: { title?: string; name?: string }) => option.title || option.name || "")
    .filter(Boolean)
);

const measureChoiceTextWidth = (text: string, font: string): number => {
  if (!choiceMeasureCanvas) {
    choiceMeasureCanvas = document.createElement("canvas");
  }
  const ctx = choiceMeasureCanvas.getContext("2d");
  if (!ctx) {
    return text.length * 8;
  }
  ctx.font = font;
  return ctx.measureText(text).width;
};

const updateChoiceSelectWidth = () => {
  const labels = choiceOptionLabels.value;
  const minWidth = 140;
  if (!isChoiceRow.value || labels.length === 0) {
    choiceSelectWidth.value = `${minWidth}px`;
    return;
  }

  const target = choiceSelectRef.value;
  let font = "13px sans-serif";
  let paddingLeft = 10;
  let paddingRight = 28;
  let borderLeft = 1;
  let borderRight = 1;

  if (target && typeof window !== "undefined") {
    const style = window.getComputedStyle(target);
    font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    paddingLeft = parseFloat(style.paddingLeft) || paddingLeft;
    paddingRight = parseFloat(style.paddingRight) || paddingRight;
    borderLeft = parseFloat(style.borderLeftWidth) || borderLeft;
    borderRight = parseFloat(style.borderRightWidth) || borderRight;
  }

  const maxLabelWidth = labels.reduce((max: number, text: string) => {
    return Math.max(max, measureChoiceTextWidth(text, font));
  }, 0);

  const arrowSize = 14;
  const arrowGap = 10;
  const totalWidth = Math.ceil(
    maxLabelWidth +
      paddingLeft +
      paddingRight +
      borderLeft +
      borderRight +
      arrowSize +
      arrowGap
  );
  choiceSelectWidth.value = `${Math.max(minWidth, totalWidth)}px`;
};

const rangeMin = computed(() => props.row.item.range?.[0]);
const rangeMax = computed(() => props.row.item.range?.[1]);

watch(choiceOptionLabels, () => {
  nextTick(updateChoiceSelectWidth);
}, { immediate: true });

watch(() => props.row.id, () => {
  nextTick(updateChoiceSelectWidth);
});

onMounted(() => {
  nextTick(updateChoiceSelectWidth);
});

function toggleHelp() {
  helpVisible.value = !helpVisible.value;
}

function toggleMenu() {
  if (!canToggleMenu.value) {
    return;
  }
  if (isMenuConfig.value && !boolValue.value) {
    return;
  }
  const next = !collapsed.value;
  updateCollapseState(next);
}

function onPropertyContentClick(event: MouseEvent) {
  if (!isMenuRow.value) {
    return;
  }

  if (!canToggleMenu.value) {
    return;
  }

  const target = event.target as HTMLElement | null;
  if (target?.closest("button, input, select, label")) {
    return;
  }

  event.stopPropagation();
  toggleMenu();
}

function onMenuConfigToggle(value: boolean) {
  if (isReadonly.value) {
    return;
  }
  boolValue.value = value;
  updateValue(value);
  updateCollapseState(!value);
}

function onBooleanToggle(value: boolean) {
  if (isReadonly.value) {
    return;
  }
  boolValue.value = value;
  updateValue(value);
}

function onTriValueSelect(selected: string) {
  if (isTriSelectDisabled.value) {
    triValue.value = ensureTriValueAllowed(normalizeTriValue(props.row.item.value));
    return;
  }
  const next = ensureTriValueAllowed(normalizeTriValue(selected));
  const current = ensureTriValueAllowed(normalizeTriValue(props.row.item.value));
  if (next !== triValue.value) {
    triValue.value = next;
  }
  if (next !== current) {
    updateValue(next);
  }
}

function onStringInput(event: Event) {
  const target = event.target as HTMLInputElement | null;
  if (!target) {
    return;
  }
  stringValue.value = target.value;
}

function onStringCommit(event?: Event) {
  if (isReadonly.value) {
    stringValue.value = toStringValue(props.row.item.value);
    return;
  }
  const inputValue = (() => {
    const target = event?.target as HTMLInputElement | null;
    return target ? target.value : stringValue.value;
  })();
  stringValue.value = inputValue;
  updateValue(inputValue);
}

function onNumberCommit(event?: Event) {
  if (isReadonly.value) {
    numberValue.value = toNumberValue(props.row.item.value);
    return;
  }
  const target = event?.target as HTMLInputElement | undefined;
  const eventValue = target ? target.value : String(numberValue.value);
  const trimmed = eventValue.trim();
  if (!trimmed) {
    const fallback = toNumberValue(props.row.item.value);
    numberValue.value = fallback;
    if (target) {
      target.value = String(fallback);
    }
    if (toNumberValue(props.row.item.value) !== fallback) {
      updateValue(fallback);
    }
    return;
  }
  let value = Number.parseInt(trimmed, 10);
  if (Number.isNaN(value)) {
    value = toNumberValue(props.row.item.value);
  }
  if (rangeMin.value !== undefined) {
    value = Math.max(value, rangeMin.value);
  }
  if (rangeMax.value !== undefined) {
    value = Math.min(value, rangeMax.value);
  }
  numberValue.value = value;
  if (toNumberValue(props.row.item.value) !== value) {
    updateValue(value);
  }
}

function onNumberStep(delta: number) {
  if (isReadonly.value) {
    return;
  }
  let value = Number(numberValue.value) + delta;
  if (rangeMin.value !== undefined) {
    value = Math.max(value, rangeMin.value);
  }
  if (rangeMax.value !== undefined) {
    value = Math.min(value, rangeMax.value);
  }
  numberValue.value = value;
  updateValue(value);
}

function onHexCommit(event?: Event) {
  if (isReadonly.value) {
    hexValue.value = toHexValue(props.row.item.value);
    return;
  }
  const target = event?.target as HTMLInputElement | undefined;
  const eventValue = target ? target.value : hexValue.value;
  const formatted = formatHexString(eventValue);
  hexValue.value = formatted;
  if (target && target.value !== formatted) {
    target.value = formatted;
  }
  if (toHexValue(props.row.item.value) !== formatted) {
    updateValue(formatted);
  }
}

function onHexStep(delta: number) {
  if (isReadonly.value) {
    return;
  }
  const current = toNumericHex(hexValue.value);
  if (!Number.isFinite(current)) {
    return;
  }
  let next = current + delta;
  if (rangeMin.value !== undefined) {
    next = Math.max(next, rangeMin.value);
  }
  if (rangeMax.value !== undefined) {
    next = Math.min(next, rangeMax.value);
  }
  if (next < 0) {
    next = 0;
  }
  const formatted = formatHexString(next.toString(16));
  hexValue.value = formatted;
  updateValue(formatted);
}

function onChoiceChange(event: Event) {
  if (isReadonly.value) {
    event.preventDefault();
    choiceValue.value = toChoiceValue(props.row.item.value);
    return;
  }
  const value = (event.target as HTMLSelectElement).value;
  choiceValue.value = value;
  updateValue(value);
}

function updateValue(value: any) {
  const updated = {
    ...props.row.item,
    value,
    lastModified: Date.now(),
  } as Menu;
  props.row.item.value = value;
  store.sendNewValue(updated);
}

function toBoolean(value: any): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "y" || value === "Y" || value === 1 || value === "1") {
    return true;
  }
  return false;
}

function normalizeTriValue(value: any): TriValue {
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "y" || lower === "true" || lower === "2") {
      return "y";
    }
    if (lower === "m" || lower === "1") {
      return "m";
    }
    return "n";
  }
  if (typeof value === "number") {
    if (value >= 2) {
      return "y";
    }
    if (value === 1) {
      return "m";
    }
    return "n";
  }
  if (typeof value === "boolean") {
    return value ? "y" : "n";
  }
  return "n";
}

function ensureTriValueAllowed(value: TriValue): TriValue {
  const options = allowedTriOptions.value;
  if (options.includes(value)) {
    return value;
  }
  return options[0] ?? "n";
}

function toStringValue(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function toNumberValue(value: any): number {
  if (typeof value === "number") {
    return value;
  }
  const parsed = parseInt(String(value), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toHexValue(value: any): string {
  if (typeof value === "string" && /^0x[0-9a-fA-F]+$/.test(value)) {
    return value.toLowerCase();
  }
  if (typeof value === "number") {
    return `0x${value.toString(16)}`;
  }
  const parsed = parseInt(String(value), 16);
  if (!Number.isNaN(parsed)) {
    return `0x${parsed.toString(16)}`;
  }
  return "0x0";
}

function formatHexString(raw: string): string {
  let text = raw.trim();
  if (!text) {
    return toHexValue(props.row.item.value);
  }
  if (!text.startsWith("0x") && !text.startsWith("0X")) {
    text = `0x${text}`;
  }
  if (!/^0x[0-9a-fA-F]+$/.test(text)) {
    return toHexValue(props.row.item.value);
  }
  return text.toLowerCase();
}

function toChoiceValue(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object" && value !== null && "name" in value) {
    return String((value as { name: string }).name);
  }
  return String(value);
}

function toNumericHex(value: string): number {
  const text = value.trim();
  if (!text) {
    return 0;
  }
  const normalized = text.startsWith("0x") || text.startsWith("0X") ? text : `0x${text}`;
  const parsed = parseInt(normalized, 16);
  return Number.isNaN(parsed) ? NaN : parsed;
}
</script>

<template>
  <div
    class="row"
    :data-row-id="props.row.id"
    :class="{
      'menu-row': isMenuRow,
      'section-row': isSectionRow,
      'comment-row': isCommentRow,
      readonly: isReadonly,
      collapsed,
      'help-open': helpVisible && hasHelp,
    }"
    v-show="!hidden"
  >
    <div v-if="isCommentRow" class="row-inner" :style="indentStyle">
      <div class="comment-content">
        <span class="comment-rule" />
        <span class="comment-text">{{ props.row.item.title || props.row.item.prompt }}</span>
        <span class="comment-rule" />
      </div>
    </div>

    <div
      v-else
      class="row-inner"
      :class="{ clickable: canToggleMenu }"
      :style="indentStyle"
      @click="onPropertyContentClick"
    >
      <div class="row-main">
        <div class="row-title-line">
          <button
            v-if="isMenuRow"
            class="chevron"
            :class="{ open: canToggleMenu && !collapsed }"
            type="button"
            :aria-expanded="canToggleMenu ? !collapsed : undefined"
            :aria-label="collapsed ? t('menu.expand') : t('menu.collapse')"
            :disabled="!canToggleMenu"
            @click.stop="toggleMenu"
          >
            <IconChevronRight />
          </button>
          <span class="row-title" :title="propertyLabel">{{ propertyLabel }}</span>
          <span v-if="isReadonly" class="chip chip-lock" :title="readonlyReason || t('config.readonlyDefault')">
            <IconLock />
            <span>{{ t("config.readonly") }}</span>
          </span>
          <span v-if="typeBadge" class="chip chip-type">{{ typeBadge }}</span>
        </div>
        <div v-if="symbolName" class="row-symbol">{{ symbolName }}</div>
      </div>

      <div class="row-actions">
        <button
          v-if="hasHelp"
          class="info-btn"
          :class="{ active: helpVisible }"
          type="button"
          :title="t('config.showHelp')"
          :aria-label="t('config.showHelp')"
          :aria-expanded="helpVisible"
          @click.stop="toggleHelp"
        >
          <IconInfo />
        </button>

        <div class="control">
          <ToggleSwitch
            v-if="isMenuRow && isMenuConfig"
            :checked="boolValue"
            :disabled="isReadonly"
            :label="propertyLabel"
            @change="onMenuConfigToggle"
          />
          <ToggleSwitch
            v-else-if="isBoolRow"
            :checked="boolValue"
            :disabled="isReadonly"
            :label="propertyLabel"
            @change="onBooleanToggle"
          />
          <SegmentedControl
            v-else-if="isTristateRow"
            :value="triValue"
            :options="triSelectOptions"
            :disabled="isTriSelectDisabled"
            @select="onTriValueSelect"
          />
          <StepperInput
            v-else-if="isIntRow"
            input-type="number"
            :value="numberValue"
            :min="rangeMin"
            :max="rangeMax"
            :disabled="isReadonly"
            @commit="onNumberCommit"
            @step="onNumberStep"
          />
          <StepperInput
            v-else-if="isHexRow"
            input-type="text"
            :value="hexValue"
            :disabled="isReadonly"
            @commit="onHexCommit"
            @step="onHexStep"
          />
          <input
            v-else-if="isStringRow"
            class="text-input"
            type="text"
            spellcheck="false"
            :value="stringValue"
            :disabled="isReadonly"
            @input="onStringInput"
            @change="onStringCommit"
            @blur="onStringCommit"
          />
          <select
            v-else-if="isChoiceRow"
            ref="choiceSelectRef"
            class="select-input"
            :value="choiceValue"
            :disabled="isReadonly"
            :style="{ width: choiceSelectWidth, maxWidth: '100%' }"
            @change="onChoiceChange"
          >
            <option v-for="option in choiceOptions" :key="option.id || option.name" :value="option.name">
              {{ option.title }}
            </option>
          </select>
          <span v-else-if="!isMenuRow" class="plain-value">{{ props.row.item.value }}</span>
        </div>
      </div>
    </div>

    <Transition name="reveal">
      <div v-if="helpVisible && hasHelp" class="row-help" :style="indentStyle">
        <HelpPanel :item="props.row.item" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.row {
  position: relative;
  border-bottom: 1px solid var(--border-subtle);
}

.row-inner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 48px;
  padding: 8px 20px;
  transition: background-color var(--motion-fast);
}

.row-inner::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 26px;
  width: var(--guide-width, 0);
  background-image: repeating-linear-gradient(
    to right,
    var(--indent-guide) 0,
    var(--indent-guide) 1px,
    transparent 1px,
    transparent 18px
  );
  pointer-events: none;
}

.row:not(.section-row) .row-inner:hover {
  background-color: var(--surface-hover);
}

.row-inner.clickable {
  cursor: pointer;
}

.row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.row-title {
  min-width: 0;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-symbol {
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: text;
}

.row.readonly .row-title {
  color: var(--text-secondary);
}

.row.menu-row .row-inner {
  min-height: 42px;
}

.row.menu-row .row-title {
  font-weight: 600;
}

.row.section-row {
  margin-top: 20px;
  border-bottom: 1px solid var(--border-strong);
}

.row.section-row:first-child {
  margin-top: 4px;
}

.row.section-row .row-inner {
  min-height: 52px;
  padding-top: 14px;
}

.row.section-row .row-title {
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.chevron {
  flex: 0 0 22px;
  width: 22px;
  height: 22px;
  margin-left: -4px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  transition: transform var(--motion-fast), background-color var(--motion-fast), color var(--motion-fast);
}

.chevron.open {
  transform: rotate(90deg);
}

.chevron:hover:not(:disabled) {
  background-color: var(--surface-hover);
  color: var(--text-primary);
}

.chevron:disabled {
  opacity: 0.35;
  cursor: default;
}

.chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.chip-type {
  background-color: var(--surface-sunken);
  color: var(--text-muted);
  font-family: var(--font-mono);
  text-transform: uppercase;
  box-shadow: inset 0 0 0 1px var(--border-subtle);
}

.chip-lock {
  background-color: var(--warning-soft);
  color: var(--warning-text);
}

.row-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: var(--control-column);
}

.control {
  display: flex;
  justify-content: flex-end;
  min-width: 0;
}

.info-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--motion-fast), background-color var(--motion-fast), color var(--motion-fast);
}

.row-inner:hover .info-btn,
.info-btn:focus-visible,
.info-btn.active {
  opacity: 1;
}

.info-btn:hover,
.info-btn.active {
  background-color: var(--accent-soft);
  color: var(--accent-text);
}

.text-input,
.select-input {
  height: 28px;
  box-sizing: border-box;
  border: none;
  border-radius: var(--radius-sm);
  background-color: var(--input-bg);
  box-shadow: inset 0 0 0 1px var(--input-border);
  color: var(--text-primary);
  font-size: 12.5px;
  outline: none;
  transition: box-shadow var(--motion-fast);
}

.text-input {
  width: 240px;
  padding: 0 10px;
  font-family: var(--font-mono);
}

.select-input {
  padding: 0 30px 0 10px;
  appearance: none;
  cursor: pointer;
  background-image:
    linear-gradient(45deg, transparent 50%, var(--text-muted) 50%),
    linear-gradient(135deg, var(--text-muted) 50%, transparent 50%);
  background-position: calc(100% - 15px) 50%, calc(100% - 10px) 50%;
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
}

.text-input:hover:not(:disabled),
.select-input:hover:not(:disabled) {
  box-shadow: inset 0 0 0 1px var(--border-strong);
}

.text-input:focus,
.select-input:focus {
  box-shadow: inset 0 0 0 1px var(--accent), 0 0 0 3px var(--accent-soft);
}

.text-input:disabled,
.select-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.select-input option {
  background-color: var(--surface-raised);
  color: var(--text-primary);
}

.plain-value {
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 12px;
}

.comment-content {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.comment-rule {
  flex: 1;
  height: 1px;
  background-color: var(--border-subtle);
}

.comment-rule:first-child {
  flex: 0 0 12px;
}

.comment-text {
  color: var(--text-muted);
  font-size: 11.5px;
  font-style: italic;
  white-space: pre-wrap;
}

.row.comment-row .row-inner {
  min-height: 34px;
}

.row-help {
  padding-right: 20px;
  padding-bottom: 14px;
}

.reveal-enter-active,
.reveal-leave-active {
  transition: opacity var(--motion-fast), transform var(--motion-fast);
}

.reveal-enter-from,
.reveal-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 640px) {
  .row-inner {
    flex-wrap: wrap;
    gap: 8px;
  }

  .row-actions {
    min-width: 0;
    width: 100%;
  }

  .text-input {
    width: 100%;
  }
}
</style>
