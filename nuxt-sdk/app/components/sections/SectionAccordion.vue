<script setup lang="ts">
// Items a reader opens one at a time, each with its own sections, drawn one level deeper.
import { SectionFields } from "@inferative/sdk/site";

// The section's other fields and its instance are not attributes of the root element.
defineOptions({ inheritAttrs: false });

const props = defineProps<{ items?: unknown }>();
const items = computed(() => SectionFields.records(props.items));
</script>

<template>
  <section>
    <details v-for="(item, index) in items" :key="index">
      <summary>{{ SectionFields.text(item["title"]) }}</summary>
      <ASectionList nested :sections="item['sections']" />
    </details>
  </section>
</template>
