import heximon from "@heximon/build/vite";
import { defineConfig } from "vite";

/** `vite build` compiles `src/` and writes the Worker of the applets to `dist/`. The config is in `heximon.config.ts`. */
export default defineConfig({ plugins: [heximon()] });
