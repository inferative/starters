/**
 * A website with its own markup and its own server. It reads the content of one channel of an Inferative deployment
 * over HTTP, through `@inferative/sdk/nuxt`. It has no Inferative layer, no dashboard and no database.
 *
 * The build uses the default Nitro preset (Node). Set `NITRO_PRESET` (or `nitro.preset` here) to build for another
 * platform: README.md, "Other platforms".
 */
export default defineNuxtConfig({
  compatibilityDate: "2025-07-04",
  srcDir: "app",
  // `nuxt dev` answers on this machine only.
  devServer: { host: "localhost" },
  modules: ["@inferative/sdk/nuxt"],
  runtimeConfig: {
    // Public values only: the browser reads them. `NUXT_PUBLIC_INFERATIVE_API_BASE_URL` and
    // `NUXT_PUBLIC_INFERATIVE_CHANNEL_KEY` set them. The key that publishes the manifest is never here.
    public: {
      inferative: {
        // The API of the Inferative deployment, with its `/api` mount.
        apiBaseUrl: "",
        // The channel's public key (`pk_`). It selects the channel and grants no right.
        channelKey: ""
      }
    }
  }
});
