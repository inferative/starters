<script setup lang="ts">
// A section authored once in a shared entry: the entry is read whole, and its one section is drawn through a nested
// `<ASectionList>`, so a shared section that names itself stops at the list's depth bound. The page's cache tags
// name the shared entry, so a publish of it purges the page. A read that fails for any reason but a 404 makes the
// page a 503 that no cache keeps, so a shared cache does not keep the page without the section.
import { SharedSectionExpansion, SiteCacheProfile } from "@inferative/sdk/site";

// The section's other fields and its instance are not attributes of the root element.
defineOptions({ inheritAttrs: false });

const props = defineProps<{ entry?: unknown }>();
const reference = computed(() => SharedSectionExpansion.referenceOf(props.entry));
const read = useContent().get(
  () => reference.value?.type ?? "",
  () => reference.value?.id ?? ""
);
const cache = useSiteCacheTags();

await read.suspense().catch(() => undefined);

const shared = computed(() => read.data.value);
const instance = computed(() => SharedSectionExpansion.instanceOf(shared.value?.document));
const event = useRequestEvent();

if (reference.value !== undefined) {
  cache.contribute({ entries: [[reference.value.type, reference.value.id]] });

  if (shared.value === undefined && read.status.value !== 404) {
    cache.contribute({ profile: SiteCacheProfile.Unavailable });

    if (event !== undefined) {
      setResponseStatus(event, 503);
    }
  }
}
</script>

<template>
  <ASectionList
    v-if="instance"
    :sections="[instance]"
    :entry-type="shared?.typeKey"
    :entry-id="shared?.id"
  />
</template>
