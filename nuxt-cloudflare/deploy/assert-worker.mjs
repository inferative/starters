// Refuses to deploy a bundle that the other build wrote. `pnpm build` writes the live Worker, `pnpm build:preview`
// writes the preview Worker (`targetEnvironment` is "preview"). Run: node deploy/assert-worker.mjs live|preview
import { existsSync, readFileSync } from "node:fs";

const expected = process.argv[2];
const configPath = ".output/server/wrangler.json";
const build = expected === "preview" ? "pnpm build:preview" : "pnpm build";

if (!existsSync(configPath)) {
  console.error(`There is no ${configPath}. Run \`${build}\` first.`);
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, "utf8"));
const built = config.targetEnvironment === "preview" ? "preview" : "live";

if (built !== expected) {
  console.error(
    `The last build is the ${built} Worker (${config.name}), not the ${expected} Worker. Run \`${build}\` first.`
  );
  process.exit(1);
}
