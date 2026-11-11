import heximon from "@heximon/build/vite";
import { defineConfig } from "vite";

/** `vite build` compiles `src/` and writes the rooms Worker to `dist/`. The config is in `heximon.config.ts`. */
export default defineConfig({
  plugins: [heximon()],
  build: {
    rolldownOptions: {
      // ASCII output halves the heap that V8 needs for a source with a non-Latin-1 character.
      output: { minify: { compress: true, mangle: true, codegen: { asciiOnly: true } } },
      // Rolldown's redundant chunk-load pass can make a chunk import the entry chunk that imports it, and the Worker then
      // stops at start ("Class extends value undefined"). With the pass off, the chunks hold no cycle and the start
      // loads the same code. A stopgap until Heximon sets it on Worker builds (#5525).
      experimental: { chunkOptimization: { avoidRedundantChunkLoads: false } }
    }
  }
});
