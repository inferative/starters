// The statements that a release runs after its new Workers serve (`pnpm release:after`). The migrations run before
// the new code goes live, so for a while the Workers of the earlier release still serve, and they do not record a fact
// that the new release added. Each statement repairs one such fact. Each is safe to run again, and on an empty table.

export class AfterRolloutStatements {
  /**
   * Records on the access state of each client of an offered, active or paused engagement that its guests may hold an
   * engagement key, as an accept and a resume do. The Workers of the earlier release accept an engagement with no
   * record. It only sets the fact: a fact that holds with no active or paused engagement costs one read of the guests,
   * and the next end of an engagement of the client records it again.
   */
  static engagementAudienceKeys =
    'INSERT INTO "organization_access_states" ("organization_id", "generation", "purge_generation", "holds_engagement_keys") ' +
    "SELECT DISTINCT \"client_organization_id\", 0, 0, true FROM \"organization_engagements\" WHERE \"state\" IN ('offered', 'active', 'paused') " +
    'ON CONFLICT ("organization_id") DO UPDATE SET "holds_engagement_keys" = true;';

  /** Every statement, in the order that a release runs them. */
  static statements = [AfterRolloutStatements.engagementAudienceKeys];
}
