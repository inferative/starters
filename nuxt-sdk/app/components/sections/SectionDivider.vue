<script setup lang="ts">
// A rule, or bare space, between two blocks.
// The section's other fields and its instance are not attributes of the root element.
defineOptions({ inheritAttrs: false });

defineProps<{ variant?: "line" | "space"; size?: "small" | "medium" | "large" }>();
</script>

<template>
  <hr v-if="variant !== 'space'" :class="size ?? 'medium'" />
  <div v-else :class="size ?? 'medium'" />
</template>

<style scoped>
.small {
  margin: 1rem 0;
}

.medium {
  margin: 2rem 0;
}

.large {
  margin: 4rem 0;
}
</style>
