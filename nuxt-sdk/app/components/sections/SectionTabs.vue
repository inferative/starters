<script setup lang="ts">
// Tabs, each with its own sections. The open tab's sections are drawn one level deeper.
import { SectionFields } from "@inferative/sdk/site";

// The section's other fields and its instance are not attributes of the root element.
defineOptions({ inheritAttrs: false });

const props = defineProps<{ tabs?: unknown }>();
const tabs = computed(() => SectionFields.records(props.tabs));
const open = ref(0);

// The visual editor can remove the open tab; the open index then stays inside the list.
watch(
  () => tabs.value.length,
  (count) => {
    open.value = Math.min(open.value, Math.max(count - 1, 0));
  }
);
</script>

<template>
  <section>
    <div role="tablist">
      <button
        v-for="(tab, index) in tabs"
        :key="index"
        type="button"
        role="tab"
        class="button"
        :aria-selected="open === index"
        @click="open = index"
      >
        {{ SectionFields.text(tab["label"]) }}
      </button>
    </div>
    <div role="tabpanel">
      <ASectionList nested :sections="tabs[open]?.['sections']" />
    </div>
  </section>
</template>
