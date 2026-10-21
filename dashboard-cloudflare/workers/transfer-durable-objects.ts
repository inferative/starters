import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { WorkerTopology } from "./worker-topology.ts";

/** The part of a built `wrangler.json` that a transfer changes. */
interface WranglerConfig {
  readonly name?: string;
  readonly durable_objects?: {
    readonly bindings?: readonly { name: string; class_name: string; script_name?: string }[];
  };
  readonly exports?: Readonly<Record<string, Record<string, unknown>>>;
  readonly services?: readonly { binding: string; service?: string }[];
  readonly [key: string]: unknown;
}

/** One answer of the Cloudflare API. */
interface CloudflareAnswer<TResult> {
  readonly success: boolean;
  readonly errors: readonly { readonly code: number; readonly message: string }[];
  readonly result: TResult;
  readonly result_info?: { readonly page: number; readonly total_pages?: number };
}

/** A Durable Object namespace of the account. */
interface Namespace {
  readonly class?: string;
  readonly script?: string;
}

/** One deploy of a transfer. */
interface TransferPhase {
  /** The Worker that the phase deploys. */
  readonly worker: string;
  /** The config of the phase, relative to the project root. */
  readonly config: string;
  /** The entry of the class in the `exports` map of the phase. */
  readonly entry: Record<string, unknown>;
  /** The Durable Object bindings of the class in the phase. */
  readonly bindings: readonly { name: string; class_name: string; script_name?: string }[];
  /** The Workers that the phase binds as services: each one must be deployed before it. */
  readonly services: readonly string[];
}

/** The move of one Durable Object class, with its storage, from one Worker to another. */
interface Transfer {
  readonly part: string;
  readonly className: string;
  readonly from: string;
  readonly to: string;
  readonly phases: readonly TransferPhase[];
}

/** Answers whether a Worker of the account is deployed. */
type WorkerProbe = (worker: string) => Promise<boolean>;

/**
 * Moves the Durable Object classes of a part, with their storage, to the Worker that `INFERATIVE_WORKERS` gives them:
 * the Worker of the part when the setting names it, else the dashboard Worker. Run it after the builds of a release,
 * after the deploy of each Worker that serves routes (the dashboard Worker binds them), and before the other deploys.
 * It asks Cloudflare which Worker owns the namespace of each class. When that Worker is another one, it runs the
 * transfer of the Cloudflare `exports` map in two deploys:
 *
 * 1. The target Worker declares the class `expecting-transfer` from the source. Its own binding of the class still
 *    reaches the source.
 * 2. The source Worker declares the `transferred` tombstone. This deploy moves the namespace. Its binding of the class
 *    reaches the target.
 *
 * Both deploys use the builds of the release, for the new setting: the dashboard Worker as `pnpm build` wrote it, so a
 * dashboard that is too large in one Worker is never uploaded. The source then no longer has the class in its code;
 * its tombstone declares the namespace. Only a Worker of a part that the setting no longer names is built here, for its
 * last deploy. The regular deploys of the release then give the target a live entry and its own binding. A first deploy
 * (no namespace yet) and a release with no switch move nothing. `--dry-run --deployed-owner <worker>` writes the configs
 * of the two deploys for that owner and deploys nothing.
 */
class DurableObjectTransfer {
  /** The Cloudflare API. */
  private static readonly api: string = "https://api.cloudflare.com/client/v4";

  private readonly root: string;

  private readonly deployed: WorkerProbe | undefined;

  /**
   * @param root - The project root.
   * @param deployed - Answers whether a Worker is deployed; with none, the run is dry and deploys nothing.
   */
  public constructor(root: string, deployed: WorkerProbe | undefined) {
    this.root = root;
    this.deployed = deployed;
  }

  /**
   * @param owner - Reads the Worker that owns the namespace of a class now, or `undefined` when none does.
   * @returns The transfers that ran, or that a dry run planned.
   */
  public async run(
    owner: (className: string, workers: readonly string[]) => Promise<string | undefined>
  ): Promise<Transfer[]> {
    const transfers: Transfer[] = [];

    for (const part of WorkerTopology.separableParts) {
      const separable = WorkerTopology.part(part);
      const target = WorkerTopology.isSeparate(part)
        ? separable.worker
        : WorkerTopology.dashboardWorker;
      const source =
        target === separable.worker ? WorkerTopology.dashboardWorker : separable.worker;

      for (const durable of separable.durableObjects ?? []) {
        const current = await owner(durable.className, [
          WorkerTopology.dashboardWorker,
          separable.worker
        ]);

        if (current === undefined || current === target) {
          DurableObjectTransfer.log(
            `${durable.className}: ${current === undefined ? "no namespace yet" : `owned by ${current}`}, no transfer.`
          );
          continue;
        }

        DurableObjectTransfer.log(`${durable.className}: moves from ${source} to ${target}.`);
        transfers.push({
          part,
          className: durable.className,
          from: source,
          to: target,
          phases: [
            await this.phase(part, target, "transfer-target", durable.className, source, {
              type: "durable-object",
              state: "expecting-transfer",
              storage: "sqlite",
              transfer_from: source
            }),
            await this.phase(part, source, "transfer-source", durable.className, target, {
              type: "durable-object",
              state: "transferred",
              transferred_to: target
            })
          ]
        });
      }
    }

    return transfers;
  }

  /**
   * Writes the config of one deploy: the build of the Worker with the entry of the class and its bindings of the class
   * pointed at another Worker. A real run deploys it after it finds each Worker that it binds as a service.
   */
  private async phase(
    part: string,
    worker: string,
    label: string,
    className: string,
    bindingWorker: string,
    entry: Record<string, unknown>
  ): Promise<TransferPhase> {
    const built = this.built(part, worker, className);
    const config = JSON.parse(readFileSync(built, "utf8")) as WranglerConfig;
    const bindings = (config.durable_objects?.bindings ?? []).map((binding) =>
      binding.class_name === className &&
      (binding.script_name === undefined || binding.script_name === worker)
        ? { name: binding.name, class_name: binding.class_name, script_name: bindingWorker }
        : binding
    );
    const services = (config.services ?? []).flatMap((service) =>
      service.service === undefined || service.service === worker ? [] : [service.service]
    );
    const written = join(dirname(built), `wrangler.${label}.json`);

    writeFileSync(
      written,
      `${JSON.stringify(
        {
          ...config,
          durable_objects: { ...config.durable_objects, bindings },
          exports: { ...config.exports, [className]: entry }
        },
        null,
        2
      )}\n`
    );

    if (this.deployed === undefined) {
      DurableObjectTransfer.log(`  ${worker}: wrote ${written}.`);
    } else {
      for (const service of services) {
        if (!(await this.deployed(service))) {
          throw new Error(
            `${worker} binds the Worker ${service}, which is not deployed. Deploy ${service} before the transfer.`
          );
        }
      }

      this.command(join("node_modules", ".bin", "wrangler"), ["deploy", "--config", written], {});
      DurableObjectTransfer.log(`  ${worker}: deployed ${label}.`);
    }

    return {
      worker,
      config: written.slice(this.root.length + 1),
      entry,
      bindings: bindings.filter((binding) => binding.class_name === className),
      services
    };
  }

  /**
   * @returns The built `wrangler.json` of a Worker for the new setting: the build of the release. A part that the setting
   *   no longer names has no build in the release, so it is built here.
   * @throws {Error} When the build of the release is missing, or is for another setting.
   */
  private built(part: string, worker: string, className: string): string {
    const apart = WorkerTopology.isSeparate(part);

    if (worker === WorkerTopology.dashboardWorker) {
      const built = join(this.root, ".output", "server", "wrangler.json");
      const exported = existsSync(built)
        ? (JSON.parse(readFileSync(built, "utf8")) as WranglerConfig).exports?.[className] !==
          undefined
        : undefined;

      if (exported === undefined || exported === apart) {
        throw new Error(
          `.output/ holds no build of the dashboard Worker for ${WorkerTopology.variable}=` +
            `${WorkerTopology.separateParts().join(",")}. Run pnpm build with the same setting first.`
        );
      }

      return built;
    }

    const built = join(this.root, "workers", part, ".output", "server", "wrangler.json");

    if (!apart) {
      this.command(join("node_modules", ".bin", "nitro"), ["build", join("workers", part)], {
        [WorkerTopology.variable]: [...WorkerTopology.separateParts(), part].join(",")
      });
    } else if (!existsSync(built)) {
      throw new Error(`workers/${part}/.output/ holds no build. Run pnpm build:${part} first.`);
    }

    return built;
  }

  /** Writes a line of progress to stderr, so that stdout holds the `--json` document only. */
  private static log(line: string): void {
    process.stderr.write(`${line}\n`);
  }

  private command(
    command: string,
    commandArguments: readonly string[],
    environment: Readonly<Record<string, string>>
  ): void {
    const result = spawnSync(command, commandArguments, {
      cwd: this.root,
      env: { ...process.env, ...environment },
      // stdout stays free for the `--json` document.
      stdio: ["ignore", 2, 2]
    });

    if (result.status !== 0) {
      throw new Error(
        `${command} ${commandArguments.join(" ")} failed with status ${String(result.status)}.`
      );
    }
  }

  /**
   * @param token - The API token of the deploy.
   * @param accountId - The account of the deployment.
   * @returns Reads the Worker of `workers` that owns the namespace of a class in the account.
   */
  private static namespaceOwner(
    token: string,
    accountId: string
  ): (className: string, workers: readonly string[]) => Promise<string | undefined> {
    let namespaces: Namespace[] | undefined;

    return async (className, workers) => {
      namespaces ??= await DurableObjectTransfer.namespaces(token, accountId);

      return namespaces.find(
        (namespace) =>
          namespace.class === className &&
          namespace.script !== undefined &&
          workers.includes(namespace.script)
      )?.script;
    };
  }

  /**
   * @param token - The API token of the deploy.
   * @param accountId - The account of the deployment.
   * @returns Answers whether a Worker of that name is deployed in the account.
   */
  private static workerProbe(token: string, accountId: string): WorkerProbe {
    return async (worker) => {
      const path = `/accounts/${accountId}/workers/scripts/${encodeURIComponent(worker)}/settings`;
      const response = await fetch(`${DurableObjectTransfer.api}${path}`, {
        headers: { authorization: `Bearer ${token}` }
      });

      await response.body?.cancel();

      if (response.status === 404) {
        return false;
      }

      if (!response.ok) {
        throw new Error(`GET ${path} failed (${String(response.status)}).`);
      }

      return true;
    };
  }

  /** @returns Every Durable Object namespace of the account. */
  private static async namespaces(token: string, accountId: string): Promise<Namespace[]> {
    const all: Namespace[] = [];

    for (let page = 1; ; page += 1) {
      const path = `/accounts/${accountId}/workers/durable_objects/namespaces?per_page=1000&page=${String(page)}`;
      const response = await fetch(`${DurableObjectTransfer.api}${path}`, {
        headers: { authorization: `Bearer ${token}` }
      });
      const answer = (await response.json()) as CloudflareAnswer<Namespace[]>;

      if (!response.ok || !answer.success) {
        throw new Error(
          `GET ${path} failed (${String(response.status)}): ` +
            answer.errors.map((error) => `${String(error.code)} ${error.message}`).join("; ")
        );
      }

      all.push(...answer.result);

      if (answer.result.length === 0 || page >= (answer.result_info?.total_pages ?? page)) {
        return all;
      }
    }
  }

  /** Reads the arguments and the environment, and runs the transfers. */
  public static async main(): Promise<void> {
    const { values } = parseArgs({
      options: {
        "dry-run": { type: "boolean" },
        "deployed-owner": { type: "string" },
        json: { type: "boolean" }
      },
      strict: true
    });
    const root = dirname(dirname(fileURLToPath(import.meta.url)));
    const dryRun = values["dry-run"] === true;
    const token = process.env["CLOUDFLARE_API_TOKEN"] ?? "";
    const accountId = (process.env["CLOUDFLARE_ACCOUNT_ID"] ?? "").trim();
    let owner: (className: string, workers: readonly string[]) => Promise<string | undefined>;

    if (values["deployed-owner"] !== undefined) {
      if (!dryRun) {
        throw new Error("--deployed-owner stands in for Cloudflare, so it needs --dry-run.");
      }

      const deployed = values["deployed-owner"];

      owner = async (_className, workers) => (workers.includes(deployed) ? deployed : undefined);
    } else {
      if (token === "" || accountId === "") {
        throw new Error(
          "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set: the transfer reads which Worker owns each " +
            "Durable Object namespace of the account. Nothing was moved."
        );
      }

      owner = DurableObjectTransfer.namespaceOwner(token, accountId);
    }

    const transfer = new DurableObjectTransfer(
      root,
      dryRun ? undefined : DurableObjectTransfer.workerProbe(token, accountId)
    );
    const transfers = await transfer.run(owner);

    if (values.json === true) {
      console.log(JSON.stringify({ transfers }));
    }
  }
}

await DurableObjectTransfer.main();
