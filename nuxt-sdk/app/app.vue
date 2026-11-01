<script setup lang="ts">
// The site's own component for each section type of `shared/site.ts`, keyed by the local key. A key with no
// component of its own draws `SectionPlain`. Replace a component here to give a section your own look.
const plain = () => import("~/components/sections/SectionPlain.vue");

useSectionRenderers().registerMany({
  hero: () => import("~/components/sections/SectionHero.vue"),
  richText: () => import("~/components/sections/SectionRichText.vue"),
  imageWithText: () => import("~/components/sections/SectionImageWithText.vue"),
  featureGrid: () => import("~/components/sections/SectionFeatureGrid.vue"),
  statsRow: () => import("~/components/sections/SectionStatsRow.vue"),
  callToAction: () => import("~/components/sections/SectionCallToAction.vue"),
  faq: () => import("~/components/sections/SectionFaq.vue"),
  divider: () => import("~/components/sections/SectionDivider.vue"),
  gallery: () => import("~/components/sections/SectionGallery.vue"),
  columns: () => import("~/components/sections/SectionColumns.vue"),
  sharedSection: () => import("~/components/sections/SectionSharedSection.vue"),
  heroSplit: () => import("~/components/sections/SectionHeroSplit.vue"),
  accordion: () => import("~/components/sections/SectionAccordion.vue"),
  tabs: () => import("~/components/sections/SectionTabs.vue"),
  logoCloud: () => import("~/components/sections/SectionLogoCloud.vue"),
  teamMembers: () => import("~/components/sections/SectionTeamMembers.vue"),
  timeline: plain,
  testimonials: plain,
  pricingTable: plain,
  mapEmbed: plain,
  htmlEmbed: plain,
  announcementBar: plain,
  entryList: plain,
  cardGrid: plain,
  navigationMenu: plain,
  simpleContactForm: plain
});
</script>

<template>
  <div>
    <!-- The edit chrome of the visual editor. It draws nothing and arms no listener for an ordinary reader. -->
    <ASiteEditOverlay />
    <NuxtPage />
  </div>
</template>

<style>
body {
  max-width: 48rem;
  margin: 2rem auto;
  padding: 0 1rem;
  font-family: system-ui, sans-serif;
  line-height: 1.5;
}

.button {
  display: inline-block;
  margin-right: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid currentColor;
  border-radius: 0.375rem;
  text-decoration: none;
}
</style>
