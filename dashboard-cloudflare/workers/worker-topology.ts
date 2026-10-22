/** How the dashboard Worker calls the Worker of a part, and which paths of the hostname go there. */
export interface PartService {
  /** The service binding of the dashboard Worker that reaches the Worker of the part. */
  readonly binding: string;

  /** The contracts of its Worker that the dashboard calls, by their declared identity. */
  readonly contracts: readonly string[];

  /** The mount that its Worker serves those contracts under. */
  readonly mount: string;

  /** The paths of the hostname that a route sends to its Worker. The most specific route wins. */
  readonly paths: readonly string[];
}

/** A Durable Object class that the code of a part exports. */
export interface PartDurableObject {
  /** The binding that the packages read. */
  readonly binding: string;

  /** The class. */
  readonly className: string;

  /** The module that exports the class, relative to the project root. */
  readonly module: string;
}

/** A Durable Object binding as `cloudflare.durableObjects` of a `heximon.config.ts` takes it. */
export type DurableObjectEntry =
  | { readonly binding: string; readonly className: string; readonly module: string }
  | { readonly binding: string; readonly className: string; readonly scriptName: string };

/** A part of the dashboard that can run in a Worker of its own, on the hostname of the dashboard. */
export interface SeparablePart {
  /** The name of its Worker. Keep it apart from {@link WorkerTopology.dashboardWorker}. */
  readonly worker: string;

  /** How the dashboard Worker calls its Worker. None for a part that the dashboard reaches through its Durable Objects. */
  readonly service?: PartService;

  /**
   * The Durable Object classes of the part. The Worker that runs the part exports them. When the part runs apart, the
   * dashboard Worker binds them in the Worker of the part by its name.
   */
  readonly durableObjects?: readonly PartDurableObject[];

  /** The Worker Loader bindings that the code of the part reads. The Worker that runs the part binds them. */
  readonly workerLoaders?: readonly string[];
}

/** A contract that another Worker serves, as the `inferative.remoteMounts` runtime config of the dashboard lists it. */
export interface RemoteMount {
  readonly contract: string;
  readonly mount: string;
  readonly service: string;
}

/**
 * The Worker topology of the deployment: which parts run in a Worker of their own. `INFERATIVE_WORKERS` sets it when a
 * host is built or compiled, as a comma-separated list. Unset or empty, the dashboard is one Worker. In the split
 * topology all Workers share one hostname, `INFERATIVE_HOSTNAME`: a route sends the paths of a part to its Worker, and
 * every other path goes to the dashboard Worker. A part with no paths (the applets) needs no route: the dashboard Worker
 * binds the Durable Objects of its Worker by name.
 */
export class WorkerTopology {
  /**
   * The name of the dashboard Worker. Each part has a Worker of another name. The dashboard Worker owns the migrations
   * and the `StorageRoom` that every Worker of the split topology shares.
   */
  public static readonly dashboardWorker: string = "my-inferative-dashboard";

  /** The parts that can run in a Worker of their own. Each one is a host under `workers/<name>/`. */
  public static readonly parts: Readonly<Record<string, SeparablePart>> = {
    "visual-editing": {
      worker: "my-inferative-visual-editing",
      service: {
        binding: "VISUAL_EDITING",
        contracts: ["visual-editing"],
        mount: "/api",
        paths: ["/api/visual-editing/*"]
      }
    },
    // The applet supervisor serves no path of the hostname: the dashboard Worker serves the routes of the applets and
    // sends each command to the supervisor of the applet through the APPLET_SUPERVISOR binding.
    applets: {
      worker: "my-inferative-applets",
      durableObjects: [
        {
          binding: "APPLET_SUPERVISOR",
          className: "HostAppletObject",
          module: "./server/applets/host-applet.object.ts"
        }
      ],
      workerLoaders: ["APPLET_LOADER"]
    }
  };

  /** The names of the parts that can run in a Worker of their own. */
  public static readonly separableParts: readonly string[] = Object.keys(WorkerTopology.parts);

  /** The variable that holds the setting. */
  public static readonly variable: string = "INFERATIVE_WORKERS";

  /** The variable that holds the hostname that the Workers of the split topology share. */
  public static readonly hostnameVariable: string = "INFERATIVE_HOSTNAME";

  /**
   * @returns The parts that the setting moves to a Worker of their own. Empty for one Worker.
   * @throws {Error} When the setting names a part that cannot run in a Worker of its own.
   */
  public static separateParts(): readonly string[] {
    const parts = (process.env[WorkerTopology.variable] ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part !== "");
    const unknown = parts.filter((part) => !WorkerTopology.separableParts.includes(part));

    if (unknown.length > 0) {
      throw new Error(
        `${WorkerTopology.variable} names ${unknown.join(", ")}. The parts that can run in a Worker of their own are: ` +
          `${WorkerTopology.separableParts.join(", ")}.`
      );
    }

    return parts;
  }

  /**
   * @param part - A part of {@link separableParts}.
   * @returns Whether the setting moves the part to a Worker of its own.
   */
  public static isSeparate(part: string): boolean {
    return WorkerTopology.separateParts().includes(part);
  }

  /**
   * @param part - A part of {@link separableParts}.
   * @returns The part.
   */
  public static part(part: string): SeparablePart {
    const separable = WorkerTopology.parts[part];

    if (separable === undefined) {
      throw new Error(`${part} is not a part that can run in a Worker of its own.`);
    }

    return separable;
  }

  /** @returns The service bindings of the dashboard Worker: one to the Worker of each separate part that serves routes. */
  public static services(): { binding: string; service: string }[] {
    return WorkerTopology.separateParts().flatMap((name) => {
      const part = WorkerTopology.part(name);

      return part.service === undefined
        ? []
        : [{ binding: part.service.binding, service: part.worker }];
    });
  }

  /**
   * @returns The Durable Object bindings of the dashboard Worker for the classes of the parts: the class of a part that
   *   runs in the dashboard Worker is exported there, and the class of a separate part is bound in the Worker of the part.
   */
  public static dashboardDurableObjects(): DurableObjectEntry[] {
    return WorkerTopology.separableParts.flatMap((name) => {
      const part = WorkerTopology.part(name);
      const separate = WorkerTopology.isSeparate(name);

      return (part.durableObjects ?? []).map((entry) =>
        separate
          ? { binding: entry.binding, className: entry.className, scriptName: part.worker }
          : { binding: entry.binding, className: entry.className, module: entry.module }
      );
    });
  }

  /** @returns The Worker Loader bindings of the dashboard Worker: those of the parts that run in it. */
  public static dashboardWorkerLoaders(): { binding: string }[] {
    return WorkerTopology.separableParts
      .filter((name) => !WorkerTopology.isSeparate(name))
      .flatMap((name) =>
        (WorkerTopology.part(name).workerLoaders ?? []).map((binding) => ({ binding }))
      );
  }

  /**
   * @param part - A part of {@link separableParts}.
   * @returns The Durable Object classes that the Worker of the part exports, with each module relative to its host
   *   (`workers/<part>/`).
   */
  public static partDurableObjects(part: string): DurableObjectEntry[] {
    return (WorkerTopology.part(part).durableObjects ?? []).map((entry) => ({
      binding: entry.binding,
      className: entry.className,
      module: `../../${entry.module.replace(/^\.\//u, "")}`
    }));
  }

  /**
   * @param part - A part of {@link separableParts}.
   * @returns The Worker Loader bindings of the Worker of the part.
   */
  public static partWorkerLoaders(part: string): { binding: string }[] {
    return (WorkerTopology.part(part).workerLoaders ?? []).map((binding) => ({ binding }));
  }

  /** @returns The contracts that the Workers of the separate parts serve, for the dashboard Worker. Empty for one Worker. */
  public static remoteMounts(): RemoteMount[] {
    return WorkerTopology.separateParts().flatMap((name) => {
      const service = WorkerTopology.part(name).service;

      if (service === undefined) {
        return [];
      }

      return service.contracts.map((contract) => ({
        contract,
        mount: service.mount,
        service: service.binding
      }));
    });
  }

  /**
   * @param part - A part of {@link separableParts}.
   * @returns The route patterns of the Worker of the part, on the shared hostname. None for a part that serves no path.
   * @throws {Error} When `INFERATIVE_HOSTNAME` is not set: without a route, the browser cannot reach the Worker.
   */
  public static routes(part: string): string[] {
    const paths = WorkerTopology.part(part).service?.paths ?? [];

    if (paths.length === 0) {
      return [];
    }

    const hostname = (process.env[WorkerTopology.hostnameVariable] ?? "").trim();

    if (hostname === "") {
      throw new Error(
        `The Worker of ${part} needs ${WorkerTopology.hostnameVariable}: the hostname of the dashboard, which its routes ` +
          `share (dashboard.example.com).`
      );
    }

    return paths.map((path) => `${hostname}${path}`);
  }
}
