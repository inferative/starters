<script setup lang="ts">
// The published posts of the channel, newest first. The server render reads them, and the browser takes the answer
// from the page payload. `useSiteSchema` and `useContent` come from `@inferative/sdk/nuxt`, with no import.
import { SortDirection } from "@inferative/sdk/common";

const schema = useSiteSchema();

await schema.ready();

// A local key (`post`) reads in the channel's namespace: the channel answers it as `<channel>.post`.
const posts = useContent().list(schema.typeKey("post"), {
  order: [{ path: "publishedAt", direction: SortDirection.Descending }],
  size: 20
});

// The read rejects when the API does not answer. The page then shows its error state, not an error page.
await posts.suspense().catch(() => undefined);

const isUnreachable = computed(() => schema.namespace.value === "" || posts.error.value != null);
const items = computed(() => posts.data.value?.items ?? []);

/** The route of a post. The router encodes the slug, so a `#`, a `?` or a `/` in it stays part of the slug. */
function addressOf(document: Readonly<Record<string, unknown>>) {
  const slug = document["slug"];

  return typeof slug === "string" && slug !== ""
    ? { name: "slug" as const, params: { slug } }
    : { path: "/" };
}

useHead({ title: "Posts" });
</script>

<template>
  <main>
    <h1>Posts</h1>
    <p v-if="isUnreachable">
      The website cannot read its content. Check NUXT_PUBLIC_INFERATIVE_API_BASE_URL and
      NUXT_PUBLIC_INFERATIVE_CHANNEL_KEY in .env, and that the API answers.
    </p>
    <p v-else-if="items.length === 0">There is no published post yet.</p>
    <ul v-else>
      <li v-for="post in items" :key="post.id">
        <NuxtLink :to="addressOf(post.document)">{{ post.title }}</NuxtLink>
      </li>
    </ul>
  </main>
</template>
