<script setup lang="ts">
// A heading over a grid of short items.
// The section's other fields and its instance are not attributes of the root element.
defineOptions({ inheritAttrs: false });

defineProps<{ heading?: string; items?: { title?: string; text?: string }[] }>();
</script>

<template>
  <section>
    <h2 v-if="heading">{{ heading }}</h2>
    <ul class="grid">
      <li v-for="(item, index) in items ?? []" :key="index">
        <h3>{{ item.title }}</h3>
        <p v-if="item.text">{{ item.text }}</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 1rem;
  padding: 0;
  list-style: none;
}
</style>
