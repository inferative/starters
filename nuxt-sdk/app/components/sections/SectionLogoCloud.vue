<script setup lang="ts">
// A row of logos. A logo with a safe link is a link (`LinkAddress.of` drops `javascript:` and `data:`); the logos of
// the older field, which have no link, come after them.
import { LinkAddress, SectionFields } from "@inferative/sdk/site";
import SectionImage from "./SectionImage.vue";

// The section's other fields and its instance are not attributes of the root element.
defineOptions({ inheritAttrs: false });

const props = defineProps<{ title?: unknown; items?: unknown; logos?: unknown }>();
const title = computed(() => SectionFields.text(props.title));
const logos = computed(() => [
  ...SectionFields.records(props.items).map((item) => ({
    logo: item["logo"],
    href: LinkAddress.of(item["href"])
  })),
  ...SectionFields.list(props.logos).map((logo) => ({ logo, href: undefined }))
]);
</script>

<template>
  <section>
    <h2 v-if="title">{{ title }}</h2>
    <div class="logos">
      <template v-for="(entry, index) in logos" :key="index">
        <a v-if="entry.href" :href="entry.href"><SectionImage :reference="entry.logo" /></a>
        <SectionImage v-else :reference="entry.logo" />
      </template>
    </div>
  </section>
</template>

<style scoped>
.logos {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2rem;
}
</style>
