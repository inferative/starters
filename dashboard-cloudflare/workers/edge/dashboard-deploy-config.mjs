// The edits that `deploy-dashboard.mjs` makes to the built config of the dashboard Worker before an upload. Each one
// returns a new config and reads no file and no network.

/** Edits of the dashboard Worker's built Wrangler config (`.output/server/wrangler.json`). */
export class DashboardDeployConfig {
  /**
   * The classes that moved to another Worker: the Worker binds each one there (`script_name`) and keeps a `deleted`
   * tombstone of its own old class under `exports`.
   *
   * @param config - The built config.
   * @returns The class names, each once.
   */
  static movedClasses(config) {
    const remote = (config.durable_objects?.bindings ?? [])
      .filter((binding) => binding.script_name !== undefined && binding.script_name !== config.name)
      .map((binding) => binding.class_name);

    return [...new Set(remote)].filter((className) =>
      DashboardDeployConfig.isTombstone(config.exports?.[className])
    );
  }

  /**
   * The config with no binding to the Worker of another service.
   *
   * @param config - The config.
   * @param binding - The name of the service binding.
   * @returns The config without that binding.
   */
  static withoutService(config, binding) {
    return {
      ...config,
      services: (config.services ?? []).filter((service) => service.binding !== binding)
    };
  }

  /**
   * The config of the upload that deletes the old namespaces of moved classes. Cloudflare refuses to delete a
   * namespace while the same upload binds a class of that name, also in another Worker, so this upload leaves those
   * bindings out and keeps their tombstones. A tombstone of a class whose namespace is gone is left out: a moved class
   * then keeps its binding.
   *
   * @param config - The config.
   * @param held - The tombstoned classes whose namespace the Worker still holds.
   * @returns The config of the delete upload.
   */
  static forNamespaceDelete(config, held) {
    const bindings = (config.durable_objects?.bindings ?? []).filter(
      (binding) =>
        !(
          held.includes(binding.class_name) &&
          binding.script_name !== undefined &&
          binding.script_name !== config.name
        )
    );

    return {
      ...DashboardDeployConfig.withoutExports(
        config,
        DashboardDeployConfig.tombstones(config).filter((className) => !held.includes(className))
      ),
      durable_objects: { ...config.durable_objects, bindings }
    };
  }

  /**
   * The config of the normal upload: the bindings to the other Workers, and a tombstone only for a class that is not
   * moved and whose namespace the Worker still holds. A tombstone of a namespace that is gone, or that a fresh install
   * never had, is left out.
   *
   * @param config - The config.
   * @param held - The tombstoned classes whose namespace the Worker still holds; none by default.
   * @returns The config of the normal upload.
   */
  static forUpload(config, held = []) {
    const moved = DashboardDeployConfig.movedClasses(config);

    return DashboardDeployConfig.withoutExports(
      config,
      DashboardDeployConfig.tombstones(config).filter(
        (className) => moved.includes(className) || !held.includes(className)
      )
    );
  }

  /**
   * Whether the rooms Worker uploads in this phase of a release. Its upload deletes the namespaces of its old classes,
   * and Cloudflare refuses that while the deployed dashboard Worker still binds them. So while the rooms Worker holds
   * one, it uploads after the dashboard Worker; else before it, because the dashboard Worker binds its rooms.
   *
   * @param phase - `before` or `after` the dashboard Worker.
   * @param held - The tombstoned classes whose namespace the rooms Worker still holds.
   * @returns Whether to upload now.
   */
  static isRoomsPhase(phase, held) {
    return phase === "after" ? held.length > 0 : held.length === 0;
  }

  /**
   * @param config - The config.
   * @returns The classes that the config deletes: each `exports` entry with `state: "deleted"`.
   */
  static tombstones(config) {
    return Object.entries(config.exports ?? {})
      .filter(([, entry]) => DashboardDeployConfig.isTombstone(entry))
      .map(([className]) => className);
  }

  /**
   * The name that `wrangler deploy` uploads to: the last `--name` of its arguments, else the name of the config.
   *
   * @param config - The config.
   * @param args - The arguments that `wrangler deploy` gets.
   * @returns The Worker name.
   */
  static workerName(config, args) {
    let name = config.name;

    for (const [index, arg] of args.entries()) {
      if (arg === "--name" && args[index + 1] !== undefined) {
        name = args[index + 1];
      } else if (arg.startsWith("--name=")) {
        name = arg.slice("--name=".length);
      }
    }

    return name;
  }

  /**
   * The moved classes whose old namespace the Worker still holds: a deployed version binds the class in the Worker
   * itself (no `script_name`, or its own name), as wrangler finds the namespace of a Worker's own class.
   *
   * @param versions - The versions of the current deployment, as `wrangler versions view --json` prints them.
   * @param worker - The Worker name.
   * @param moved - The moved classes.
   * @returns The held classes, in the order of `moved`.
   */
  static heldClasses(versions, worker, moved) {
    const held = new Set(
      versions
        .flatMap((version) => version.resources?.bindings ?? [])
        .filter(
          (binding) =>
            binding.type === "durable_object_namespace" &&
            (binding.script_name ?? worker) === worker
        )
        .map((binding) => binding.class_name)
    );

    return moved.filter((className) => held.has(className));
  }

  /**
   * Whether `wrangler deployments status` refused because the Worker does not exist or has no deployment. Wrangler
   * writes an API error as `<message> [code: <code>]`; it calls 10007 and 10090 "Worker not found"
   * (`WORKER_NOT_FOUND_ERR_CODE`, `WORKER_LEGACY_ENVIRONMENT_NOT_FOUND_ERR_CODE`), and it answers a Worker with no
   * deployment with "The Worker <name> has no deployments.".
   *
   * @param output - What the refused command wrote.
   * @param worker - The Worker name.
   * @returns Whether the refusal means that no deployment exists.
   */
  static isMissingWorker(output, worker) {
    // oxlint-disable-next-line no-control-regex -- removes the colour codes of the terminal output
    const text = output.replace(/\u001b\[[0-9;]*m/gu, "");

    return (
      /\[code: 100(?:07|90)\]/u.test(text) ||
      text.includes(`The Worker ${worker} has no deployments.`)
    );
  }

  /** @returns Whether an `exports` entry deletes its Durable Object class. */
  static isTombstone(entry) {
    return entry?.type === "durable-object" && entry.state === "deleted";
  }

  /** @returns The config without the named `exports` entries, and without an empty `exports`. */
  static withoutExports(config, names) {
    if (config.exports === undefined || names.length === 0) {
      return config;
    }

    const exports = Object.fromEntries(
      Object.entries(config.exports).filter(([name]) => !names.includes(name))
    );
    const { exports: _removed, ...rest } = config;

    return Object.keys(exports).length > 0 ? { ...rest, exports } : rest;
  }
}
