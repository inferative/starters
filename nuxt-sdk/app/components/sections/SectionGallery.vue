<script setup lang="ts">
// Several images in one block, as a grid.
import { SectionFields } from "@inferative/sdk/site";
import SectionImage from "./SectionImage.vue";

// The section's other fields and its instance are not attributes of the root element.
defineOptions({ inheritAttrs: false });

const props = defineProps<{ images?: unknown }>();
const images = computed(() => SectionFields.list(props.images));
</script>

<template>
  <section class="gallery">
    <SectionImage v-for="(image, index) in images" :key="index" :reference="image" />
  </section>
</template>

<style scoped>
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: 1rem;
}
</style>
