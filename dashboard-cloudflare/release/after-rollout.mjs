// Runs the statements of a release after its new Workers serve (`pnpm release:after`, the last step of the Release
// workflow) against `DATABASE_URL`, each in a transaction of its own. See `after-rollout-statements.mjs`.
import { PgConnectionString } from "@inferative/base/persistence/pg/migrations";
import pg from "pg";
import { AfterRolloutStatements } from "./after-rollout-statements.mjs";

class AfterRollout {
  static async run(address) {
    if (address === undefined || address === "") {
      throw new Error(
        "DATABASE_URL is not set: the statements after the rollout need the database."
      );
    }

    const client = new pg.Client({ connectionString: PgConnectionString.normalize(address) });

    await client.connect();

    try {
      for (const statement of AfterRolloutStatements.statements) {
        await client.query(statement);
      }
    } finally {
      await client.end();
    }

    console.log(
      `ran ${String(AfterRolloutStatements.statements.length)} statements after the rollout`
    );
  }
}

await AfterRollout.run(process.env["DATABASE_URL"]);
