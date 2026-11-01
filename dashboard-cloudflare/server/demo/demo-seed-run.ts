import type { CommandBus, QueryBus } from "@heximon/cqrs";
import type { Database } from "@heximon/persistence";
import { uuid } from "@heximon/runtime";
import { NotFoundError } from "@heximon/runtime/errors";
import { AgentCallers, CreateAgent } from "@inferative/agents/server";
import { Agents } from "@inferative/agents/persistence/pg/schema";
import { ActingContext, type ActingContextHolder } from "@inferative/base/actors";
import { ActorKind, type ActorReference, CredentialKind, EntityField } from "@inferative/base/api";
import { ManifestReadyOutcome } from "@inferative/base/channel";
import { ChartChangeKind, type ChartChange, type OrganizationChart } from "@inferative/base/chart";
import { CanonicalJson } from "@inferative/base/core";
import type { PgDatabase } from "@inferative/base/persistence/pg";
import type { SeedTierPlans } from "@inferative/base/tiers";
import {
  AcknowledgeManifestReadiness,
  type ChannelId,
  type ChannelKeyId,
  CreateChannel,
  ReceiveManifest
} from "@inferative/channels/server";
import { ChannelManifests, Channels } from "@inferative/channels/persistence/pg/schema";
import { ContentManifest, defineContentType } from "@inferative/content/api";
import { ContentEntries } from "@inferative/content/persistence/pg/schema";
import { CreateEntry, SyncContentSchema } from "@inferative/content/server";
import { ApplyChartChange, PreviewChartChange } from "@inferative/identity/server";
import { Installations, Organizations } from "@inferative/identity/persistence/pg/schema";
import { CreateProject, CreateTask, GetProjectByKey } from "@inferative/projects/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { type DemoSeedReport, SeedDemo } from "./seed-demo.task";

/** The demo channel and the manifest version of the seed's content type. */
interface DemoManifest {
  readonly channelId: ChannelId;
  readonly version: number;

  /** The SHA-256 hex digest of the manifest's schema, without the `sha256:` prefix of the envelope. */
  readonly schemaHash: string;
}

/** The owner of the install and the organization of the first-run step. */
interface InstallOwner {
  readonly userId: string;
  readonly organizationId: string;
}

/**
 * The writes of one run of {@link SeedDemo}. The task loads this module when it runs, so the commands and tables of the
 * packages that it imports stay out of the start of the dashboard Worker.
 */
export class DemoSeedRun {
  public constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
    private readonly database: Database,
    private readonly rows: PgDatabase,
    private readonly holder: ActingContextHolder,
    private readonly chart: OrganizationChart,
    private readonly tierPlans: SeedTierPlans
  ) {}

  /** @returns What the run did. */
  public async run(): Promise<DemoSeedReport> {
    const owner = await this.installOwner();

    if (owner === undefined) {
      return {
        complete: false,
        created: [],
        reason:
          "The install has no owner yet. Take the first-run step on the sign-in page, then run the seed again."
      };
    }

    const actor: ActorReference = { kind: ActorKind.Member, id: owner.userId };
    const acting = ActingContext.of({
      organizationId: owner.organizationId,
      actor,
      credential: { kind: CredentialKind.Session, id: SeedDemo.credentialId }
    });
    const created: string[] = [];

    await this.tierPlans.seedWhenEmpty();
    await this.holder.runAs(acting, async () => {
      await this.organizeChart(acting, actor, created);
      await this.createProject(actor, created);
      await this.createAgent(acting, owner, created);

      const manifest = await this.demoManifest(owner, created);

      await this.serveManifest(owner, manifest);
      await this.createEntries(owner, manifest, created);
    });

    return {
      complete: true,
      created,
      reason:
        created.length === 0
          ? "The organization holds the demo data already: the run wrote nothing."
          : `The run wrote: ${created.join(", ")}.`,
      organizationId: owner.organizationId
    };
  }

  /** @returns The person who took the first-run step and the organization it made, or `undefined` before it. */
  private async installOwner(): Promise<InstallOwner | undefined> {
    const orm = this.rows.getOrm();
    const [installation] = await orm
      .select({ userId: Installations.completedByUserId })
      .from(Installations)
      .limit(1);
    const userId = installation?.userId;

    if (userId === undefined || userId === null) {
      return undefined;
    }

    const [organization] = await orm
      .select({ id: Organizations.id })
      .from(Organizations)
      .where(eq(Organizations.createdByUserId, userId))
      .orderBy(asc(Organizations.createdAt))
      .limit(1);

    return organization === undefined ? undefined : { userId, organizationId: organization.id };
  }

  /**
   * The owner becomes the top person of a chart with none, and heads a new department in an organization with no
   * department. A chart that has a top person or departments keeps them.
   *
   * @throws {Error} When the organization has departments and the owner is in none: a project needs the department
   *   of its lead, and the seed moves nobody.
   */
  private async organizeChart(
    acting: ActingContext,
    owner: ActorReference,
    created: string[]
  ): Promise<void> {
    const chart = await this.chart.readCurrent(acting.organizationId);

    if (chart.top() === undefined) {
      await this.applyChartChange(acting, { kind: ChartChangeKind.SetTopPerson, newTop: owner });
      created.push("top person");
    }

    if (chart.departments().length === 0) {
      await this.applyChartChange(acting, {
        kind: ChartChangeKind.CreateDepartment,
        name: SeedDemo.department,
        icon: "i-lucide-building",
        head: owner
      });
      created.push(`department ${SeedDemo.department}`);
    } else if (chart.departmentOf(owner) === undefined) {
      throw new Error(
        "The owner is in no department of the chart. Put the owner in a department, then run the seed again."
      );
    }
  }

  private async applyChartChange(acting: ActingContext, change: ChartChange): Promise<void> {
    const preview = await this.queries.execute(new PreviewChartChange(acting, change));

    await this.commands.execute(new ApplyChartChange(acting, change, preview.previewVersion));
  }

  /** The demo project and its tasks, in one transaction, unless the organization holds a project `DEMO`. */
  private async createProject(owner: ActorReference, created: string[]): Promise<void> {
    if (await this.hasProject(SeedDemo.projectKey)) {
      return;
    }

    await this.database.runInTransaction(async () => {
      const project = await this.commands.execute(
        new CreateProject({
          key: SeedDemo.projectKey,
          name: "Demo launch",
          goal: "Launch the demo site with the team.",
          settings: { directCompletion: true }
        })
      );

      for (const task of SeedDemo.tasks) {
        await this.commands.execute(
          new CreateTask({
            projectId: project.project.id,
            title: task.title,
            doneWhen: [{ text: task.doneWhen }],
            assignee: owner
          })
        );
      }
    });
    created.push(`project ${SeedDemo.projectKey} with ${String(SeedDemo.tasks.length)} tasks`);
  }

  private async hasProject(key: string): Promise<boolean> {
    try {
      await this.queries.execute(new GetProjectByKey(key));

      return true;
    } catch (error) {
      if (error instanceof NotFoundError) {
        return false;
      }

      throw error;
    }
  }

  /** An agent on the organization's default model, unless one has the demo name. It needs no model key until it runs. */
  private async createAgent(
    acting: ActingContext,
    owner: InstallOwner,
    created: string[]
  ): Promise<void> {
    const [existing] = await this.rows
      .getOrm()
      .select({ id: Agents.id })
      .from(Agents)
      .where(
        and(eq(Agents.organizationId, owner.organizationId), eq(Agents.name, SeedDemo.agentName))
      )
      .limit(1);

    if (existing !== undefined) {
      return;
    }

    await this.commands.execute(
      new CreateAgent(AgentCallers.ofContext(acting), {
        name: SeedDemo.agentName,
        roleInstructions: "Help the team with the tasks of the demo launch."
      })
    );
    created.push(`agent ${SeedDemo.agentName}`);
  }

  /**
   * The demo channel and its manifest of one content type: made in one transaction when the organization has no
   * channel `demo-site`, else read back.
   *
   * @throws {Error} When a channel `demo-site` exists and holds no manifest of the seed's content type: it is not
   *   the seed's channel, and the seed does not change it.
   */
  private async demoManifest(owner: InstallOwner, created: string[]): Promise<DemoManifest> {
    const payload = DemoSeedRun.manifestPayload();
    const schemaHash = await CanonicalJson.sha256Hex(payload);
    const orm = this.rows.getOrm();
    const [channel] = await orm
      .select({ id: Channels.id })
      .from(Channels)
      .where(
        and(
          eq(Channels.organizationId, owner.organizationId),
          eq(Channels.slug, SeedDemo.channelSlug)
        )
      )
      .limit(1);

    if (channel !== undefined) {
      const [stored] = await orm
        .select({ version: ChannelManifests.manifestVersion })
        .from(ChannelManifests)
        .where(
          and(
            eq(ChannelManifests.channelId, channel.id),
            inArray(ChannelManifests.schemaHash, [schemaHash, `sha256:${schemaHash}`])
          )
        )
        .orderBy(desc(ChannelManifests.manifestVersion))
        .limit(1);

      if (stored === undefined) {
        throw new Error(
          `The channel ${SeedDemo.channelSlug} exists and holds no manifest of the seed: it is not the seed's channel. ` +
            "Rename its slug, or leave the seed as it is."
        );
      }

      return { channelId: channel.id as ChannelId, version: stored.version, schemaHash };
    }

    const channelId = uuid.v7() as ChannelId;
    const actor = { label: `user:${owner.userId}`, userId: owner.userId };
    const version = await this.database.runInTransaction(async () => {
      await this.commands.execute(
        new CreateChannel({
          id: channelId,
          organizationId: owner.organizationId,
          slug: SeedDemo.channelSlug,
          name: "Demo site",
          kind: "website",
          defaultLocale: "en",
          locales: ["en"],
          origins: [],
          firstKeyId: uuid.v7() as ChannelKeyId,
          firstKeyLabel: "Demo site",
          actor
        })
      );

      const received = await this.commands.execute(
        new ReceiveManifest(
          channelId,
          {
            envelope: 1,
            channel: SeedDemo.channelSlug,
            generatedAt: new Date().toISOString(),
            site: { name: "Demo site", version: "1" },
            locales: { default: "en", supported: ["en"] },
            schema: { hash: `sha256:${schemaHash}`, payload }
          },
          actor
        )
      );

      if (received.kind !== "activated" && received.kind !== "unchanged") {
        throw new Error(`The demo manifest was not activated (${received.kind}).`);
      }

      return received.version;
    });

    created.push(`channel ${SeedDemo.channelSlug}`);

    return { channelId, version, schemaHash };
  }

  /** The manifest payload of the seed: one content type `note` with a title. */
  private static manifestPayload(): ReturnType<typeof ContentManifest.build> {
    return ContentManifest.build(
      [
        defineContentType({
          key: "note",
          title: "Note",
          titlePath: "title",
          fields: { title: EntityField.text({ minLength: 3 }).declaration }
        })
      ],
      [],
      { namespace: SeedDemo.channelSlug }
    );
  }

  /**
   * The content package reads the manifest, and the channel serves it. The deployed Worker takes both steps through the
   * outbox; a task run drains no outbox, so the seed takes them itself. Both answer with the stored state when they ran
   * before, so a resumed run and the Worker's later delivery of the same events change nothing. The content package
   * reads a manifest in transactions of its own, so these steps run outside a transaction.
   */
  private async serveManifest(owner: InstallOwner, manifest: DemoManifest): Promise<void> {
    const { channelId, version, schemaHash } = manifest;

    await this.commands.execute(new SyncContentSchema(owner.organizationId, channelId, version));
    await this.commands.execute(
      new AcknowledgeManifestReadiness({
        organizationId: owner.organizationId,
        channelId,
        version,
        schemaHash,
        consumer: "content",
        outcome: ManifestReadyOutcome.Ready,
        signalledAt: new Date().toISOString()
      })
    );
  }

  /** Each demo entry that the channel does not hold, by its title. */
  private async createEntries(
    owner: InstallOwner,
    manifest: DemoManifest,
    created: string[]
  ): Promise<void> {
    const typeKey = `${SeedDemo.channelSlug}.note`;
    const stored = await this.rows
      .getOrm()
      .select({ title: ContentEntries.title })
      .from(ContentEntries)
      .where(
        and(
          eq(ContentEntries.organizationId, owner.organizationId),
          eq(ContentEntries.channelId, manifest.channelId),
          eq(ContentEntries.typeKey, typeKey)
        )
      );
    const titles = new Set(stored.map((row) => row.title));

    for (const title of SeedDemo.entries.filter((entry) => !titles.has(entry))) {
      await this.commands.execute(
        new CreateEntry(
          owner.organizationId,
          uuid.v7() as ConstructorParameters<typeof CreateEntry>[1],
          typeKey,
          { title },
          { channelId: manifest.channelId, schemaChannelId: manifest.channelId }
        )
      );
      created.push(`entry ${title}`);
    }
  }
}
