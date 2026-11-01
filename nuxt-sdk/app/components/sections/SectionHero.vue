<script setup lang="ts">
// The hero: a heading, a line under it, an image and one link. `SectionFields.link` drops an address with an unsafe
// scheme (`javascript:`, `data:`), so a stored link never runs script.
import { SectionFields } from "@inferative/sdk/site";
import SectionImage from "./SectionImage.vue";

// The section's other fields and its instance are not attributes of the root element.
defineOptions({ inheritAttrs: false });

const props = defineProps<{
  heading?: unknown;
  subheading?: unknown;
  image?: unknown;
  align?: unknown;
  cta?: unknown;
}>();

const heading = computed(() => SectionFields.text(props.heading));
const subheading = computed(() => SectionFields.text(props.subheading));
const align = computed(() => SectionFields.choice(props.align, ["start", "center"], "start"));
const cta = computed(() => SectionFields.link(props.cta));
</script>

<template>
  <section class="hero" :class="{ center: align === 'center' }">
    <h2 class="hero-heading">{{ heading }}</h2>
    <p v-if="subheading">{{ subheading }}</p>
    <SectionImage v-if="image" :reference="image" eager />
    <p v-if="cta">
      <a class="button" :href="cta.href">{{ cta.label }}</a>
    </p>
  </section>
</template>

<style scoped>
.hero {
  padding: 3rem 0;
}

.hero-heading {
  font-size: 2.25rem;
  white-space: pre-line;
}

.center {
  text-align: center;
}
</style>
