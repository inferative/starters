<script setup lang="ts">
// Every public address of the site, the root included. The page tree of the channel decides which entry an
// address names. This file reads the entry, draws its sections, sets the cache headers and the head, and
// answers 404 for an address that nothing serves.
import { SiteRouteResolution } from "@inferative/sdk/site";

// An address names its language when `localization.pathPrefix` is set: the middleware renders it in that language.
definePageMeta({ middleware: ["site-address-language"] });

const site = useSiteChannel();
const locale = useAppLocale();

// The address without its language segment (`/hu/…`) when the host's `localization.pathPrefix` adds one: the
// pages tier stores every address with no segment.
const address = useSiteLocaleAddress();
const segments = address.segments;

const page = usePage(segments, { locale });

// The read of the entry waits until the resolve names a type and an id.
const body = useContentEntry(
  computed(() => page.entryType.value ?? ""),
  computed(() => page.entryId.value),
  { locale }
);

await Promise.all([site.ready(), page.ready()]);

// A relocated page answers a redirect to its current address, before the dependent reads start.
await useCanonicalRedirect(page.relocated, page.canonicalPath, {
  to: () =>
    page.canonicalPath.value === undefined ? undefined : address.hrefOf(page.canonicalPath.value)
});

// The status is the resolve's. A page that is unknown, unpublished or withdrawn draws the panel below as a
// 404, so a crawler drops it from its index.
if (import.meta.server) {
  const event = useRequestEvent();

  if (event !== undefined) {
    setResponseStatus(
      event,
      SiteRouteResolution.responseStatusOf(page.status.value, page.resolved.value.error.value)
    );
  }
}

await nextTick();
await Promise.all([page.readyTree(), body.suspense()]);

const title = computed(() =>
  SiteRouteResolution.titleOf(body.data.value?.document, page.node.value?.title ?? "")
);
const sections = computed(() => body.data.value?.document?.["sections"]);

// One owner stamps `Cache-Control`, `Cache-Tag` and `Vary` of the response, after the entry read settled.
useSiteCache({
  // A failed read (a refused channel key, an outage) is stored nowhere and names `Retry-After`.
  profile: SiteRouteResolution.cacheProfileOf(page.status.value, page.resolved.value.error.value),
  varyOnLanguage: true,
  varyOnCookie: true,
  entries:
    page.entryType.value === undefined || page.entryId.value === ""
      ? []
      : [[page.entryType.value, page.entryId.value]]
});

// The view of the page that the assistant and the visual editor read.
useSitePageBridge({ sections, title, locale });

// The head comes from the SEO package. Awaited here so the server render carries it.
const seo = useSeoDescriptor({
  reference: computed(() =>
    page.entryType.value === undefined || page.entryId.value === ""
      ? undefined
      : { type: page.entryType.value, id: page.entryId.value }
  ),
  locale
});

await seo.ready();

useSeoHead({
  descriptor: seo,
  title: () => title.value || "Page unavailable"
});
useJsonLd({ descriptor: seo });
useHreflang({ descriptor: seo });
</script>

<template>
  <div>
    <!-- Draws a notice while the visual editor connects. It draws nothing for an ordinary reader. -->
    <ASiteEditConnecting />

    <template v-if="page.status.value === 'exact' || page.status.value === 'relocated'">
      <UContainer>
        <UPageHeader :title="title" />
      </UContainer>

      <ASectionList
        :sections="sections"
        :entry-type="page.entryType.value"
        :entry-id="page.entryId.value"
        :locale="locale"
      />
    </template>

    <UPageSection v-else title="Page unavailable">
      <template #body>
        <UAlert
          color="neutral"
          variant="subtle"
          icon="i-lucide-file-question"
          title="No page answers this address."
        />
      </template>

      <template #links>
        <UButton :to="address.hrefOf('/')" icon="i-lucide-home" label="Back to the home page" />
      </template>
    </UPageSection>
  </div>
</template>
