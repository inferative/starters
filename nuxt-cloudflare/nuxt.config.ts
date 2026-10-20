/**
 * One Nuxt app that serves the public site at `/` and the dashboard under `/admin`, on one origin, as one
 * Cloudflare Worker. `@heximon/nuxt` compiles `server/` and serves its routes inside the Nitro of Nuxt.
 */
export default defineNuxtConfig({
  compatibilityDate: "2025-07-04",
  srcDir: "app",
  // `nuxt dev` answers on this machine only. Without a host it listens on all interfaces, and the dev server has no sign-in.
  devServer: { host: "localhost" },
  // One layer for each package of `server/app.module.ts` that brings screens or site components. The
  // dashboard comes first: Nuxt runs the plugins of a layer after those of the layers listed behind it, and
  // the plugins of the dashboard shell read what the base layer provides.
  extends: [
    "@inferative/dashboard",
    "@inferative/site",
    "@inferative/content",
    "@inferative/publishing",
    "@inferative/files",
    "@inferative/pages",
    "@inferative/seo",
    "@inferative/visual-editing"
  ],
  nitro: {
    preset: "cloudflare-module",
    cloudflare: {
      wrangler: {
        // The Worker name, the bindings and the preview environment are in `heximon.config.ts`; Heximon copies every
        // binding into the preview Worker, named `<name>-preview`.
        compatibility_date: "2026-04-01",
        // The one binding of the preview Worker that is not a copy: the response cache of the live Worker. Both
        // Workers serve one database, so an edit through either one must clear the one cache. `script_name` is the
        // live Worker's name. Deploy the live Worker first: the preview deploy fails while that Worker does not
        // exist. Heximon cannot yet bind a Durable Object of the app to another Worker in an environment (#2729),
        // so the entry stays here.
        env: {
          preview: {
            durable_objects: {
              bindings: [
                {
                  name: "RESPONSE_CACHE_ROOM",
                  class_name: "ResponseCacheRoomDO",
                  script_name: "my-inferative-site"
                }
              ]
            }
          }
        }
      }
    }
  }
});
