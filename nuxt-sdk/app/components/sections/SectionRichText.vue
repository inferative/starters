<script setup lang="ts">
// One block of authored prose. `RichTextHtml` escapes every text and attribute, so its markup is safe to insert.
import { RichTextHtml } from "@inferative/sdk/site";

// The section's other fields and its instance are not attributes of the root element.
defineOptions({ inheritAttrs: false });

const props = defineProps<{ body?: unknown }>();
const html = computed(() => RichTextHtml.render(props.body));
</script>

<template>
  <section class="prose" v-html="html" />
</template>
