<script setup lang="ts">
// Questions a reader opens one at a time.
import { RichTextHtml } from "@inferative/sdk/site";

// The section's other fields and its instance are not attributes of the root element.
defineOptions({ inheritAttrs: false });

defineProps<{ items?: { question?: string; answer?: unknown }[] }>();
</script>

<template>
  <section>
    <details v-for="(item, index) in items ?? []" :key="index">
      <summary>{{ item.question }}</summary>
      <div v-html="RichTextHtml.render(item.answer)" />
    </details>
  </section>
</template>
