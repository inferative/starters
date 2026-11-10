import { describe, it } from "vitest";

/**
 * `createTestApp` (`@heximon/testing`) boots `server/` in this process, and `createTestClient` (`@heximon/http/testing`)
 * sends it requests. A boot needs a database in `DATABASE_URL` that the test may write to.
 */
describe("the dashboard", () => {
  it.todo("answers /api/ready with 200");
});
