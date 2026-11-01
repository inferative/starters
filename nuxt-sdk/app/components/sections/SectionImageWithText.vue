<script setup lang="ts">
// An image beside a block of prose.
import { RichTextHtml, SectionFields } from "@inferative/sdk/site";
import SectionImage from "./SectionImage.vue";

// The section's other fields and its instance are not attributes of the root element.
defineOptions({ inheritAttrs: false });

const props = defineProps<{ image?: unknown; body?: unknown; imageSide?: unknown }>();
const html = computed(() => RichTextHtml.render(props.body));
const side = computed(() => SectionFields.choice(props.imageSide, ["left", "right"], "left"));
</script>

<template>
  <section class="image-with-text" :class="side">
    <SectionImage v-if="image" :reference="image" />
    <div v-html="html" />
  </section>
</template>

<style scoped>
.image-with-text {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1.5rem;
  align-items: center;
}

.right > :first-child {
  order: 2;
}
</style>
