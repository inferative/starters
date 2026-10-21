import { WorkerTopology } from "./worker-topology.ts";

/** One answer of the Cloudflare API. */
interface CloudflareAnswer<TResult> {
  readonly success: boolean;
  readonly errors: readonly { readonly code: number; readonly message: string }[];
  readonly result: TResult;
}

/** A zone, with the account that holds it. */
interface Zone {
  readonly id: string;
  readonly account: { readonly id: string };
}

/** A Worker route of a zone. */
interface ZoneRoute {
  readonly id: string;
  readonly pattern: string;
  readonly script?: string;
}

/**
 * Detaches the routes that a split deploy gave to the Worker of a part that `INFERATIVE_WORKERS` no longer moves out.
 * Run it after the deploy of the dashboard Worker: such a route would still send the paths of the part to its old
 * Worker, while the dashboard Worker serves them again. The old Worker stays deployed with no route; delete it with
 * `wrangler delete` when you no longer need it.
 */
class RouteDetacher {
  /** The Cloudflare API. */
  private static readonly api: string = "https://api.cloudflare.com/client/v4";

  private readonly token: string;

  private readonly accountId: string;

  private readonly hostname: string;

  /**
   * @param token - The API token of the deploy: it edits the Worker routes of the zone.
   * @param accountId - The account of the deployment: only its zones are read.
   * @param hostname - The hostname that the Workers of the split topology shared.
   */
  public constructor(token: string, accountId: string, hostname: string) {
    this.token = token;
    this.accountId = accountId;
    this.hostname = hostname;
  }

  /** @returns The Workers of the parts with routes that the setting keeps in the dashboard Worker. */
  public static retiredWorkers(): string[] {
    return WorkerTopology.separableParts
      .filter(
        (name) =>
          !WorkerTopology.isSeparate(name) && WorkerTopology.part(name).service !== undefined
      )
      .map((name) => WorkerTopology.part(name).worker);
  }

  /**
   * Detaches every route of the zone of the hostname whose Worker is, by its exact name, one of the retired Workers.
   *
   * @param retired - The Workers of the parts that the setting keeps in the dashboard Worker.
   */
  public async run(retired: readonly string[]): Promise<void> {
    const zoneId = await this.zoneOf(this.hostname);
    const routes = await this.call<ZoneRoute[]>(`/zones/${zoneId}/workers/routes`);
    const detached = routes.filter((route) => retired.some((worker) => route.script === worker));

    for (const route of detached) {
      await this.call(`/zones/${zoneId}/workers/routes/${route.id}`, "DELETE");
      console.log(`Detached ${route.pattern} from ${String(route.script)}.`);
    }

    if (detached.length === 0) {
      console.log(`No route of ${retired.join(", ")} on the zone of ${this.hostname}.`);
    }
  }

  /**
   * The zone of the deployment's account that holds the hostname: the longest zone name that the hostname ends with.
   * A zone of another account that the token can also read is never chosen.
   */
  private async zoneOf(hostname: string): Promise<string> {
    const labels = hostname.split(".");

    for (let start = 0; start < labels.length - 1; start += 1) {
      const query = new URLSearchParams({
        name: labels.slice(start).join("."),
        "account.id": this.accountId
      });
      const zones = await this.call<Zone[]>(`/zones?${query.toString()}`);
      const zone = zones.find((candidate) => candidate.account.id === this.accountId);

      if (zone !== undefined) {
        return zone.id;
      }
    }

    throw new Error(`No zone of the account ${this.accountId} holds ${hostname}.`);
  }

  private async call<TResult>(path: string, method = "GET"): Promise<TResult> {
    const response = await fetch(`${RouteDetacher.api}${path}`, {
      method,
      headers: { authorization: `Bearer ${this.token}` }
    });
    const answer = (await response.json()) as CloudflareAnswer<TResult>;

    if (!response.ok || !answer.success) {
      throw new Error(
        `${method} ${path} failed (${String(response.status)}): ` +
          answer.errors.map((error) => `${String(error.code)} ${error.message}`).join("; ")
      );
    }

    return answer.result;
  }

  /** Reads the environment and runs the detacher. */
  public static async main(): Promise<void> {
    const token = process.env["CLOUDFLARE_API_TOKEN"] ?? "";
    const accountId = (process.env["CLOUDFLARE_ACCOUNT_ID"] ?? "").trim();
    const hostname = (process.env[WorkerTopology.hostnameVariable] ?? "").trim();

    if (hostname === "") {
      console.log(
        `${WorkerTopology.hostnameVariable} is not set: no split deploy shared a hostname.`
      );

      return;
    }

    if (accountId === "") {
      throw new Error(
        `CLOUDFLARE_ACCOUNT_ID is not set: with ${WorkerTopology.hostnameVariable} set, the routes of the deployment's ` +
          "account are read, and no route of another account may be detached. Nothing was detached."
      );
    }

    const retired = RouteDetacher.retiredWorkers();

    if (retired.length === 0) {
      console.log(
        "Every separable part with routes runs in a Worker of its own: no route to detach."
      );

      return;
    }

    if (token === "") {
      throw new Error("CLOUDFLARE_API_TOKEN is not set.");
    }

    await new RouteDetacher(token, accountId, hostname).run(retired);
  }
}

await RouteDetacher.main();
