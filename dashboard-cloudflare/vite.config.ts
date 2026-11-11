// The rules of `pnpm fmt` and `pnpm lint` (Vite+). Nuxt and Vitest do not read this file. It imports nothing: Nuxt
// type-checks it with the app, and the types of `vite-plus` made that check run out of memory.
//
// `vp fmt` formats every file type it understands. Generated output and the files that a Heximon command writes
// are left as they are.
const ignore = [
  "**/*.md",
  "**/dist/**",
  "**/.nuxt/**",
  "**/.output/**",
  "**/.heximon/**",
  "**/.wrangler/**",
  "**/.data/**",
  "**/coverage/**",
  "**/node_modules/**",
  // Drizzle-generated migration artifacts: regenerated, not hand-edited.
  "**/migrations/**",
  // Written by `heximon check --startup --update`; a format pass would differ from it.
  "**/heximon.startup.json"
];

export default {
  fmt: {
    singleQuote: false,
    trailingComma: "none",
    ignorePatterns: ignore
  },
  lint: {
    ignorePatterns: ignore,
    options: {
      typeAware: true
    },
    rules: {
      "typescript/no-floating-promises": "error",
      "typescript/no-misused-promises": ["error", { checksVoidReturn: false }],
      "typescript/await-thenable": "error",
      curly: ["error", "all"],
      "no-unused-vars": ["warn", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }]
    }
  }
};
