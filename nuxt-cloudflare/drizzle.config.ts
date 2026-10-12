// The config `drizzle-kit` reads (`pnpm db:generate`, `pnpm db:migrate`). It names the database setup the site
// runs on: change this line together with the import in `server/app.module.ts` to switch dialect.
export { default } from "./server/persistence/pg/database.config";
