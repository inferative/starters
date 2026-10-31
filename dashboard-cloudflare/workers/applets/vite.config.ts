import heximon from "@heximon/build/vite";
import { defineConfig } from "vite";

/** `vite build` compiles `src/` and writes the Worker of the applets to `dist/`. The config is in `heximon.config.ts`. */
export default defineConfig({
  plugins: [heximon()],
  build: {
    rolldownOptions: {
      // An isolate keeps the source of the Worker in its heap, and V8 keeps a source with one character above
      // Latin-1 in two bytes per character. The Worker escapes every character above ASCII and stays minified.
      output: { minify: { compress: true, mangle: true, codegen: { asciiOnly: true } } }
    }
  }
});
