// `GET /api/latest-posts`: one route of this website's own server. It reads the five newest posts with the SDK on the
// server and answers them as JSON. Put the site's own server code (a form handler, a webhook, a read with a secret)
// beside it, in `server/`.

import { Inferative } from "@inferative/sdk/client";
import { SortDirection } from "@inferative/sdk/common";
import { TypeKey } from "@inferative/sdk/content";
import { SiteApiDispatch } from "@inferative/sdk/site";
import { HTTPError, defineEventHandler } from "nitro/h3";
import { useRuntimeConfig } from "nitro/runtime-config";
import site from "../../shared/site";

/** The size of the answer, and how long a shared cache may keep it. */
class LatestPosts {
  public static readonly size: number = 5;

  public static readonly cacheControl: string = "public, max-age=60, stale-while-revalidate=300";
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig().public.inferative;

  if (config.apiBaseUrl === "") {
    throw new HTTPError({
      status: 503,
      message: "NUXT_PUBLIC_INFERATIVE_API_BASE_URL is not set."
    });
  }

  // `baseUrl` is the origin of the API, without its `/api` mount. `site` types each entry by `shared/site.ts`.
  const inferative = Inferative.client({
    baseUrl: SiteApiDispatch.clientOrigin(config),
    ...(config.channelKey === "" ? {} : { publicKey: config.channelKey }),
    site
  });

  try {
    const channel = await inferative.channel.client.current();
    const page = await inferative.content.client.listEntries({
      pathParams: { typeKey: TypeKey.normalize("post", channel.slug) },
      query: { order: { publishedAt: SortDirection.Descending }, size: LatestPosts.size }
    });

    event.res.headers.set("cache-control", LatestPosts.cacheControl);

    return page.items.map((entry) => ({
      title: entry.title,
      // The key is not a literal, so the document may be of any type of `shared/site.ts`: a post has a slug.
      slug: "slug" in entry.document ? entry.document.slug : undefined,
      publishedAt: entry.publishedAt
    }));
  } catch (failure) {
    throw new HTTPError({
      status: 502,
      message: "The Inferative API did not answer the read of the latest posts.",
      cause: failure
    });
  }
});
