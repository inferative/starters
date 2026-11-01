import { CommandBus, QueryBus } from "@heximon/cqrs";
import { Database } from "@heximon/persistence";
import { Task, type TaskResult } from "@heximon/runtime";
import { ActingContextHolder } from "@inferative/base/actors";
import { OrganizationChart } from "@inferative/base/chart";
import { PgDatabase } from "@inferative/base/persistence/pg";
import { SeedTierPlans } from "@inferative/base/tiers";

/** What one run of {@link SeedDemo} did. */
export interface DemoSeedReport {
  /** Whether the organization holds every part of the demo data after the run, from this run or an earlier one. */
  readonly complete: boolean;

  /** What this run wrote, in order. Empty when the demo data was there already. */
  readonly created: readonly string[];

  /** Why the run wrote nothing, or what the organization holds now. */
  readonly reason: string;

  /** The organization that holds the demo data. */
  readonly organizationId?: string;
}

/**
 * Loads demo data into the first organization of the install, so each screen has data to show: a department, a project
 * with tasks, an agent, and a website channel with a content type and entries. Run it after a deploy:
 * `heximon task run DemoSeedModule SeedDemo`.
 *
 * It acts as the owner, the person who took the first-run step, so it writes nothing before that step: the owner's
 * password and the setup token stay with the person. Each part is written only when the organization lacks it, so a
 * run that stopped half way resumes with the parts it did not write, and a second run writes nothing. It never changes
 * or deletes a row that exists: a top person, a department of the owner, a project `DEMO`, an agent of the demo name or
 * a channel `demo-site` that is there already stays as it is. The report is `complete` once every part is there.
 * The outbox keeps the events of the writes (search, activity, realtime) until the deployed Worker drains them.
 */
export class SeedDemo extends Task<DemoSeedReport> {
  /** The key of the demo project. */
  public static readonly projectKey: string = "DEMO";

  /** The name of the demo agent. */
  public static readonly agentName: string = "Demo assistant";

  /** The credential that the seed's acts carry: the owner, acting through this task. */
  public static readonly credentialId: string = "starter.demo-seed";

  /** The slug of the demo website channel, and the namespace of its content types. */
  public static readonly channelSlug: string = "demo-site";

  /** The department of the owner, made only in an organization with no department. */
  public static readonly department: string = "Operations";

  /** The tasks of the demo project. */
  public static readonly tasks: readonly { readonly title: string; readonly doneWhen: string }[] = [
    {
      title: "Write the launch plan",
      doneWhen: "The plan names the date and the owner of each step"
    },
    {
      title: "Review the home page text",
      doneWhen: "Every section of the home page is read once"
    },
    { title: "Invite the team", doneWhen: "Each person of the team has an account" }
  ];

  /** The entries of the demo content type. */
  public static readonly entries: readonly string[] = [
    "Welcome to the demo site",
    "Our first product",
    "Opening hours"
  ];

  public constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
    private readonly database: Database,
    private readonly rows: PgDatabase,
    private readonly holder: ActingContextHolder,
    private readonly chart: OrganizationChart,
    private readonly tierPlans: SeedTierPlans
  ) {
    super();
  }

  /**
   * Loads the writes of the run ({@link DemoSeedRun}) only now: the dashboard Worker builds this task at its start, and
   * the run imports the commands and tables of five packages.
   *
   * @returns What the run did.
   */
  public override async run(): Promise<TaskResult<DemoSeedReport>> {
    const { DemoSeedRun } = await import("./demo-seed-run");
    const run = new DemoSeedRun(
      this.commands,
      this.queries,
      this.database,
      this.rows,
      this.holder,
      this.chart,
      this.tierPlans
    );

    return { result: await run.run() };
  }
}
