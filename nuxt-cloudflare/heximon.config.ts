import { defineHeximonConfig } from "@heximon/build";
import { inferativeServerPlugins } from "@inferative/base/compiler";

/**
 * The compiler config. `inferativeServerPlugins` is the plugin set that every Inferative package declares its
 * concepts under. `schedule` puts the whole schedule tier on one platform cron trigger, the minute tick. The
 * deploy platform comes from the Nitro preset in `nuxt.config.ts`, not from this file. Both database setups sit
 * in `server/`, so the compiler would find the unused `PersistenceModule` as a second root. `root` pins the app
 * root.
 */
export default defineHeximonConfig({
  root: "AppModule",
  plugins: inferativeServerPlugins(),
  schedule: { trigger: "single", tick: "* * * * *" },
  runtimeConfig: { file: "./inferative.config.ts", env: { prefix: "INFERATIVE_" } }
});
