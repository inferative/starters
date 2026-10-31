<script setup lang="ts">
// One published post, read by its slug. An unknown slug answers 404, and a read that fails answers 503.
const route = useRoute();
const slug = computed(() => String(route.params["slug"] ?? ""));
const schema = useSiteSchema();

await schema.ready();

if (schema.namespace.value === "") {
  throw createError({ statusCode: 503, statusMessage: "The website cannot read its content." });
}

const found = useContent().lookup(schema.typeKey("post"), "slug", slug);

// A lookup settles with no body when the API refuses it or does not answer, so the page decides from its status.
await found.suspense();

const post = computed(() => found.data.value?.entry);

if (post.value === undefined) {
  // Only a 404 of the API says that no post has this slug. Any other answer, or none, is an outage.
  throw found.status.value === 404
    ? createError({ statusCode: 404, statusMessage: "Post not found" })
    : createError({ statusCode: 503, statusMessage: "The website cannot read its content." });
}

const body = computed(() => {
  const value = post.value?.document["body"];

  return typeof value === "string" ? value : "";
});

useHead({ title: () => post.value?.title ?? "" });
</script>

<template>
  <main v-if="post">
    <p><NuxtLink to="/">All posts</NuxtLink></p>
    <h1>{{ post.title }}</h1>
    <p class="body">{{ body }}</p>
  </main>
</template>

<style scoped>
.body {
  white-space: pre-line;
}
</style>
