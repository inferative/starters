<script setup lang="ts">
// One media reference as an image: the SDK's resolver reads the asset's address, size and alt text in one batched
// call, and the server render carries the answer. An asset that nothing answers draws nothing. The placement's own
// alt text (an empty one marks a decorative image) wins over the asset's.
import type { MediaImageInfoValue } from "@inferative/sdk/files";
import { EntityCardValues, ResolutionBatch } from "@inferative/sdk/site";

const props = defineProps<{ reference?: unknown; eager?: boolean }>();
const resolution = useEntityResolution();
const address = useSiteAddress();
const reference = computed(() => ResolutionBatch.referenceOf(props.reference));
const assetId = computed(() => reference.value?.id ?? "");
const image = shallowRef<MediaImageInfoValue | undefined>();
const alt = computed(
  () => EntityCardValues.overridesOf(reference.value).alt ?? image.value?.alt ?? ""
);

// The visual editor changes the reference without a new mount, so the image follows it. Only the latest read lands.
let latestRead = 0;

async function read(id: string): Promise<void> {
  const readNumber = ++latestRead;
  const answer = id === "" ? undefined : (await resolution.image(id)).get(id);

  if (readNumber === latestRead) {
    image.value = answer;
  }
}

await read(assetId.value);

watch([assetId, address.locale], () => {
  void read(assetId.value);
});
</script>

<template>
  <img
    v-if="image"
    class="section-image"
    :src="image.url"
    :alt="alt"
    :width="image.width"
    :height="image.height"
    :loading="eager ? 'eager' : 'lazy'"
  />
</template>

<style scoped>
.section-image {
  max-width: 100%;
  height: auto;
}
</style>
