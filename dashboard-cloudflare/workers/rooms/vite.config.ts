import heximon from "@heximon/build/vite";
import { defineConfig } from "vite";

/** `vite build` compiles `src/` and writes the rooms Worker to `dist/`. The config is in `heximon.config.ts`. */
export default defineConfig({
  plugins: [heximon()],
  build: {
    rolldownOptions: {
      // ASCII output halves the heap that V8 needs for a source with a non-Latin-1 character.
      output: { minify: { compress: true, mangle: true, codegen: { asciiOnly: true } } }
    }
  }
});
