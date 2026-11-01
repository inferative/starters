<script setup lang="ts">
// Side-by-side columns, each with its own sections. A nested `<ASectionList>` draws them one level deeper, and the
// visual editor marks each nested section as on the page.
import { SectionFields } from "@inferative/sdk/site";

// The section's other fields and its instance are not attributes of the root element.
defineOptions({ inheritAttrs: false });

const props = defineProps<{ columns?: unknown }>();
const columns = computed(() => SectionFields.records(props.columns));
</script>

<template>
  <section class="columns">
    <div v-for="(column, index) in columns" :key="index">
      <ASectionList nested :sections="column['sections']" />
    </div>
  </section>
</template>

<style scoped>
.columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 1.5rem;
}
</style>
