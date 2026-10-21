import { heximonTesting } from "@heximon/testing/vite";
import { defineConfig } from "vitest/config";

/** `createTestApp` compiles `server/` through the Heximon testing plugin and boots the root in this process. */
export default defineConfig({
  plugins: [heximonTesting()],
  test: { testTimeout: 60_000, hookTimeout: 120_000 }
});
