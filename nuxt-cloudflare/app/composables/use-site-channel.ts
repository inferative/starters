import { CurrentChannelApi } from "@inferative/channels/api";
import { useApiQuery } from "@inferative/base/composables/use-api-query";

/**
 * The channel read of this site and the type key of its pages.
 *
 * A manifest expands the local key `page` into the namespace of the channel, so the canonical key is read from
 * the channel and never written as a literal.
 *
 * @returns The channel read, the canonical page type key, the locales and the setup await.
 */
export function useSiteChannel() {
  const schema = useSiteSchema();
  const channel = useApiQuery(CurrentChannelApi, "current", { optional: true });

  return {
    /** The cached channel read, for the name in the header. */
    channel,
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
