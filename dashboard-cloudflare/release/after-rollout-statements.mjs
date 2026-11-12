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

  /**
   * Copies the access facts of each task that an inbox item is about into the inbox's copy, so the item reaches only
   * a reader of the task. The Workers of the earlier release raise a task item with no facts. A stored copy of the same
   * or a newer access version stays as it is.
   */
  static inboxTaskAccessFacts =
    'INSERT INTO "inbox_access_facts" ("organization_id", "entity_type", "entity_id", "access_scope", "access_audience", "access_label_id", "access_public", "access_version", "provenance_untrusted") ' +
    'SELECT "t"."organization_id", \'projects.task\', "t"."id", "t"."access_scope", "t"."access_audience", "t"."access_label_id", "t"."access_public", "t"."access_version", "t"."provenance_untrusted" ' +
    'FROM "project_tasks" AS "t" WHERE EXISTS (SELECT 1 FROM "inbox_items" AS "i" WHERE "i"."organization_id" = "t"."organization_id" AND "i"."subject_type" = \'projects.task\' AND "i"."subject_id" = "t"."id") ' +
    'ON CONFLICT ("organization_id", "entity_type", "entity_id") DO UPDATE SET "access_scope" = "excluded"."access_scope", "access_audience" = "excluded"."access_audience", "access_label_id" = "excluded"."access_label_id", "access_public" = "excluded"."access_public", "provenance_untrusted" = "excluded"."provenance_untrusted", "access_version" = "excluded"."access_version" ' +
    'WHERE "excluded"."access_version" > "inbox_access_facts"."access_version";';

  /** Every statement, in the order that a release runs them. */
  static statements = [
    AfterRolloutStatements.engagementAudienceKeys,
    AfterRolloutStatements.inboxTaskAccessFacts
  ];
}
