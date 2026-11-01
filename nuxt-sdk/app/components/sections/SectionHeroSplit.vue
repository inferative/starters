<script setup lang="ts">
// A heading, prose and one link beside an image. `SectionFields.link` drops an address with an unsafe scheme.
import { RichTextHtml, SectionFields } from "@inferative/sdk/site";
import SectionImage from "./SectionImage.vue";

// The section's other fields and its instance are not attributes of the root element.
defineOptions({ inheritAttrs: false });

const props = defineProps<{
  heading?: unknown;
  body?: unknown;
  image?: unknown;
  imageSide?: unknown;
  cta?: unknown;
}>();
const heading = computed(() => SectionFields.text(props.heading));
const html = computed(() => RichTextHtml.render(props.body));
const side = computed(() => SectionFields.choice(props.imageSide, ["left", "right"], "right"));
const cta = computed(() => SectionFields.link(props.cta));
</script>

<template>
  <section class="hero-split" :class="side">
    <div>
      <h2>{{ heading }}</h2>
      <div v-html="html" />
      <p v-if="cta">
        <a class="button" :href="cta.href">{{ cta.label }}</a>
      </p>
    </div>
    <SectionImage v-if="image" :reference="image" eager />
  </section>
</template>

<style scoped>
.hero-split {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1.5rem;
  align-items: center;
  padding: 2rem 0;
}

.left > :first-child {
  order: 2;
}
</style>
