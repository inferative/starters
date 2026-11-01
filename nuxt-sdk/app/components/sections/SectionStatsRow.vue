<script setup lang="ts">
// A row of figures with their labels.
// The section's other fields and its instance are not attributes of the root element.
defineOptions({ inheritAttrs: false });

defineProps<{ items?: { value?: string; label?: string }[] }>();
</script>

<template>
  <section>
    <dl class="row">
      <div v-for="(item, index) in items ?? []" :key="index">
        <dt class="figure">{{ item.value }}</dt>
        <dd>{{ item.label }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
}

.figure {
  font-size: 1.75rem;
  font-weight: 700;
}

dd {
  margin: 0;
}
</style>
