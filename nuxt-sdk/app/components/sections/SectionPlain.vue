<script setup lang="ts">
// Every other section of the starter catalog: its heading, and the titles of its items. Give a section its own
// component in `app.vue` to draw it fully.
// The section's other fields and its instance are not attributes of the root element.
defineOptions({ inheritAttrs: false });

defineProps<{
  heading?: string;
  title?: string;
  items?: { title?: string; name?: string; question?: string; label?: string }[];
}>();
</script>

<template>
  <section>
    <h2 v-if="heading || title">{{ heading ?? title }}</h2>
    <ul v-if="Array.isArray(items) && items.length > 0">
      <li v-for="(item, index) in items" :key="index">
        {{ item.title ?? item.name ?? item.question ?? item.label }}
      </li>
    </ul>
  </section>
</template>
