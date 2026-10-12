<script setup lang="ts">
// The layout of the public site: the preview notice, a header with the name of the channel, the page and a
// footer. Every route under `/admin` takes the dashboard shell instead of this layout.
const site = useSiteChannel();

await site.ready();

const siteName = computed(() => site.channel.data.value?.name ?? "My Inferative site");
const currentYear = new Date().getFullYear();
</script>

<template>
  <div>
    <!-- Draws nothing for an ordinary reader. A previewed page shows a notice above everything. -->
    <ASitePreviewBanner />

    <!-- The edit chrome of the visual editor. It draws nothing and arms no listener for an ordinary reader. -->
    <ASiteEditOverlay />

    <UHeader to="/" :title="siteName" />

    <UMain>
      <slot />
    </UMain>

    <USeparator decorative />

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">{{ siteName }} · {{ currentYear }}</p>
      </template>
    </UFooter>
  </div>
</template>
