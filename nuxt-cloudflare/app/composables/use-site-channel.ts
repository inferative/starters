import { CurrentChannelApi } from "@inferative/channels/public";
import { useApiQuery } from "@inferative/base/composables/use-api-query";

/**
 * The name of the channel of this site and the type key of its pages.
 *
 * A manifest expands the local key `page` into the namespace of the channel, so the canonical key is read from
 * the channel and never written as a literal. With the render's stamped read client, the name comes from the stamp
 * that the page's reads take anyway (`useSiteStamp()`), so it costs no request and the cache of pages can keep the
 * page. A preview and an edit render read the one cached `GET /channel/current`.
 *
 * @returns The channel's name, the canonical page type key, the locales and the setup await.
 */
export function useSiteChannel() {
  const schema = useSiteSchema();
  const stamp = useSiteStamp();
  const channel =
    stamp === undefined ? useApiQuery(CurrentChannelApi, "current", { optional: true }) : undefined;

  return {
    /** The channel's name, for the header's own title; `undefined` until it is read. */
    name: computed(() => stamp?.facts.value?.name ?? channel?.data.value?.name),
    /** The addressable type behind every address of this site. */
    pageType: schema.typeKey("page"),
    /** Every locale of the channel, default first. */
    locales: schema.locales,
    defaultLocale: schema.defaultLocale,
    /** Await during setup: the type keys arm every dependent read. */
    ready: async (): Promise<void> => {
      await schema.ready();
    }
  };
}
