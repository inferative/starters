<script setup lang="ts">
// Every public address of the site, the root included. The page tree of the channel decides which entry an address
// names. This file reads the entry, draws its sections, sets the status, the cache headers and the head, and answers
// a moved page with a redirect. Every composable comes from `@inferative/sdk/nuxt`, with no import.
import { SiteCacheProfile, SiteRouteResolution } from "@inferative/sdk/site";

// The page tree resolves the address without its language segment (`/hu/…`) when the site's addresses carry one.
// Every read below takes the language of the page's address.
const page = useSitePage();

// The read of the entry waits until the resolve names a type and an id.
const body = useContent().get(
  computed(() => page.entryType.value ?? ""),
  page.entryId
);

// A moved page redirects to its current address, before the dependent reads start. The root of a site whose API
// does not answer shows the setup hint below with a 200; every other unreadable page answers 503, so a crawler
// keeps it in its index.
const redirected = await page.settle({
  unreadableStatus: page.path.value === "/" ? 200 : undefined
});

// The read rejects when the API does not answer. The page then shows its error state, not an error page.
await body.suspense().catch(() => undefined);

// A placed page whose entry read answered nothing: a 404 of the entry is a miss, any other answer (or none) an outage.
const isPlaced = computed(() => page.status.value === "exact" || page.status.value === "relocated");
const isEntryMissing = computed(
  () => isPlaced.value && body.data.value === undefined && body.status.value === 404
);
const isEntryUnreadable = computed(
  () => isPlaced.value && body.data.value === undefined && !isEntryMissing.value
);
const isFound = computed(() => isPlaced.value && body.data.value !== undefined);
const isUnreadable = computed(() => page.status.value === undefined || isEntryUnreadable.value);
const event = useRequestEvent();

// The resolve set the status; an entry read that failed after it changes it, so no cache keeps a blank page.
if (!redirected && event !== undefined && (isEntryMissing.value || isEntryUnreadable.value)) {
  setResponseStatus(event, isEntryMissing.value ? 404 : 503);
}
const title = computed(() =>
  SiteRouteResolution.titleOf(body.data.value?.document, page.node.value?.title ?? "")
);
const sections = computed(() => body.data.value?.document["sections"]);

// One owner stamps `Cache-Control`, `Cache-Tag` and `Vary` of the response, after the entry read settled. A page
// that is unreadable is stored nowhere. The language may come from the visitor's language cookie, so the answer
// varies on it.
useSiteCache({
  profile: isEntryUnreadable.value ? SiteCacheProfile.Unavailable : page.cacheProfile.value,
  varyOnLanguage: true,
  varyOnCookie: true,
  entries:
    page.entryType.value === undefined || page.entryId.value === ""
      ? []
      : [[page.entryType.value, page.entryId.value]]
});

// The title, the description, the canonical, the JSON-LD and the hreflang links, from the entry's SEO descriptor.
const head = useSiteHead({
  reference: page.reference,
  title: () => title.value || (isUnreadable.value ? "Website unavailable" : "Page not found")
});

if (!redirected) {
  await head.ready();
}
</script>

<template>
  <div>
    <!-- Draws a notice while the visual editor connects. It draws nothing for an ordinary reader. -->
    <ASiteEditConnecting />

    <main v-if="isFound">
      <h1 v-if="title !== ''">{{ title }}</h1>
      <ASectionList
        :sections="sections"
        :entry-type="page.entryType.value"
        :entry-id="page.entryId.value"
        :locale="page.locale.value"
      />
    </main>

    <main v-else-if="isUnreadable">
      <h1>Website unavailable</h1>
      <p>
        The website cannot read its content. Check NUXT_PUBLIC_INFERATIVE_API_BASE_URL and
        NUXT_PUBLIC_INFERATIVE_CHANNEL_KEY in .env, and that the API answers.
      </p>
    </main>

    <main v-else>
      <h1>Page not found</h1>
      <p>No page answers this address.</p>
      <p><NuxtLink :to="page.address.hrefOf('/')">Back to the home page</NuxtLink></p>
    </main>
  </div>
</template>
