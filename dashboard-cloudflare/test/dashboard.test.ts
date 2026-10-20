import { describe, it } from "vitest";

/**
 * The tests of this dashboard. `createTestApp` from `@heximon/testing` compiles `server/` and boots it in this
 * process, and `createTestClient` from `@heximon/http/testing` sends it requests. A boot needs a database that the
 * test may write to, set through `DATABASE_URL`.
 */
describe("the dashboard", () => {
  it.todo("answers /api/ready with 200");
});
