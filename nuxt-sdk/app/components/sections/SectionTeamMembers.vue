<script setup lang="ts">
// The people behind the site: a photograph, a name, a role and a line about each one.
import { SectionFields } from "@inferative/sdk/site";
import SectionImage from "./SectionImage.vue";

// The section's other fields and its instance are not attributes of the root element.
defineOptions({ inheritAttrs: false });

const props = defineProps<{ members?: unknown }>();
const members = computed(() => SectionFields.records(props.members));
</script>

<template>
  <section class="team">
    <article v-for="(member, index) in members" :key="index">
      <SectionImage v-if="member['photo']" :reference="member['photo']" />
      <h3>{{ SectionFields.text(member["name"]) }}</h3>
      <p v-if="SectionFields.text(member['role'])">{{ SectionFields.text(member["role"]) }}</p>
      <p v-if="SectionFields.text(member['bio'])">{{ SectionFields.text(member["bio"]) }}</p>
    </article>
  </section>
</template>

<style scoped>
.team {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  gap: 1.5rem;
}
</style>
