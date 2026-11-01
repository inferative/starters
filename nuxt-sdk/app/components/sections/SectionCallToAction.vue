<script setup lang="ts">
// A heading, a line of prose and up to two links. `SectionFields.link` drops an address with an unsafe scheme
// (`javascript:`, `data:`), so a stored link never runs script.
import { RichTextHtml, SectionFields } from "@inferative/sdk/site";

// The section's other fields and its instance are not attributes of the root element.
defineOptions({ inheritAttrs: false });

const props = defineProps<{
  heading?: unknown;
  body?: unknown;
  primary?: unknown;
  secondary?: unknown;
}>();
const heading = computed(() => SectionFields.text(props.heading));
const html = computed(() => RichTextHtml.render(props.body));
const links = computed(() =>
  [SectionFields.link(props.primary), SectionFields.link(props.secondary)].filter(
    (link) => link !== undefined
  )
);
</script>

<template>
  <section class="call-to-action">
    <h2>{{ heading }}</h2>
    <div v-if="html" v-html="html" />
    <p>
      <a v-for="link in links" :key="link.href" class="button" :href="link.href">{{
        link.label
      }}</a>
    </p>
  </section>
</template>

<style scoped>
.call-to-action {
  padding: 2rem;
  border: 1px solid currentColor;
  border-radius: 0.5rem;
}
</style>
