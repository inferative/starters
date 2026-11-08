// Deploys the dashboard Worker in the order that the first deploy and an update need.
//
// The two Workers bind each other: the edge Worker binds the dashboard Worker, and the dashboard Worker binds the cache
// of the edge Worker (`PUBLIC_READ_PURGE`, in `nuxt.config.ts`). A binding to a Worker that does not exist yet fails a
// deploy. So:
//
// - `node workers/edge/deploy-dashboard.mjs live` (`pnpm deploy:live`) deploys the built dashboard Worker. When the
//   edge Worker does not exist yet, it leaves the purge binding out and records that.
// - `node workers/edge/deploy-dashboard.mjs bind` (`pnpm deploy:bind`), after `pnpm deploy:edge`, deploys the dashboard
//   Worker again with the binding, only when `live` left it out. Later deploys need no order.
//
// The storage room, the rate-limit room and the realtime stream room moved to the rooms Worker. An install from before a
// move still holds the old namespaces of those classes in this Worker, and Cloudflare refuses to delete them in an
// upload that binds the classes by the same name in the rooms Worker. So when the Worker still holds one, `live` uploads
// twice: first without those bindings, which deletes the old namespaces (the `deleted` tombstones that
// `durable.deletedClasses` of `heximon.config.ts` writes), then with them. Between the two uploads, a request that calls
// one of those rooms fails. Wrangler itself reads the bindings of the
// deployed versions (`wrangler deployments status`, `wrangler versions view`), with the account, the Worker name and
// the credentials that its deploy uses: a version that binds a moved class in this Worker holds its old namespace.
//
// Each argument after the command goes to `wrangler deploy` (`--dry-run`, for one); a `--name` goes to the read too. A
// dry run reads no account and runs both uploads.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DashboardDeployConfig } from "./dashboard-deploy-config.mjs";
import { DeployedNamespaces } from "./deployed-namespaces.mjs";

class DashboardDeploy {
  /** The folder of the built dashboard Worker. */
  static folder = join(".output", "server");

  /** The config that the build wrote. */
  static config = join(DashboardDeploy.folder, "wrangler.json");

  /** The config of the normal upload: no tombstone of a moved class, and no purge binding while `live` leaves it out. */
  static uploadConfig = join(DashboardDeploy.folder, "wrangler.deploy.json");

  /** The config of the upload that deletes the old namespaces of the moved classes. */
  static deleteConfig = join(DashboardDeploy.folder, "wrangler.delete.json");

  /** The mark that `live` left the purge binding out. */
  static unboundMark = join(DashboardDeploy.folder, ".purge-binding-left-out");

  /** The binding to the cache of the edge Worker. */
  static purgeBinding = "PUBLIC_READ_PURGE";

  /** The arguments that each `wrangler deploy` gets after the config. */
  static deployArguments = process.argv.slice(3);

  static run(command) {
    if (command === "live") {
      DashboardDeploy.live();
    } else if (command === "bind") {
      DashboardDeploy.bind();
    } else {
      throw new Error(`Unknown command "${String(command)}": use "live" or "bind".`);
    }
  }

  static live() {
    const built = JSON.parse(readFileSync(DashboardDeploy.config, "utf8"));
    const purge = (built.services ?? []).find(
      (service) => service.binding === DashboardDeploy.purgeBinding
    );
    const bound = purge === undefined || DashboardDeploy.exists(purge.service);
    const config = bound
      ? built
      : DashboardDeployConfig.withoutService(built, DashboardDeploy.purgeBinding);
    const moved = DashboardDeployConfig.movedClasses(config);
    const held = DeployedNamespaces.held(
      DashboardDeploy.config,
      config,
      DashboardDeploy.deployArguments,
      DashboardDeployConfig.tombstones(config)
    );
    const heldMoved = held.filter((className) => moved.includes(className));

    rmSync(DashboardDeploy.unboundMark, { force: true });

    if (!bound) {
      console.log(
        `The edge Worker ${purge.service} does not exist yet: this deploy leaves ${DashboardDeploy.purgeBinding} out. ` +
          "Run `pnpm deploy:edge`, then `pnpm deploy:bind`."
      );
    }

    if (heldMoved.length > 0) {
      console.log(
        `The Worker ${DashboardDeployConfig.workerName(config, DashboardDeploy.deployArguments)} still holds its own namespaces of ${heldMoved.join(", ")}, which now run in another ` +
          "Worker. A first upload leaves their bindings out and deletes those namespaces and their data; a second " +
          "upload binds the classes of the other Worker. Until it ends, a request that calls one of them fails."
      );
      writeFileSync(
        DashboardDeploy.deleteConfig,
        JSON.stringify(DashboardDeployConfig.forNamespaceDelete(config, held))
      );
      DashboardDeploy.deploy(DashboardDeploy.deleteConfig);
    }

    writeFileSync(
      DashboardDeploy.uploadConfig,
      // The delete upload removed every held namespace; else this upload deletes those that no other Worker runs.
      JSON.stringify(DashboardDeployConfig.forUpload(config, heldMoved.length > 0 ? [] : held))
    );
    DashboardDeploy.deploy(DashboardDeploy.uploadConfig);

    if (!bound) {
      writeFileSync(DashboardDeploy.unboundMark, `${purge.service}\n`);
    }
  }

  static bind() {
    if (!existsSync(DashboardDeploy.unboundMark)) {
      console.log(
        `The last deploy of the dashboard Worker has ${DashboardDeploy.purgeBinding}: nothing to do.`
      );

      return;
    }

    const built = JSON.parse(readFileSync(DashboardDeploy.config, "utf8"));

    writeFileSync(
      DashboardDeploy.uploadConfig,
      JSON.stringify(DashboardDeployConfig.forUpload(built))
    );
    DashboardDeploy.deploy(DashboardDeploy.uploadConfig);
    rmSync(DashboardDeploy.unboundMark, { force: true });
  }

  /** Whether Cloudflare has a deployment of the Worker; any refusal counts as none. */
  static exists(worker) {
    try {
      execFileSync("wrangler", ["deployments", "list", "--name", worker, "--json"], {
        stdio: ["ignore", "ignore", "ignore"]
      });

      return true;
    } catch {
      return false;
    }
  }

  static deploy(config) {
    execFileSync("wrangler", ["deploy", "--config", config, ...DashboardDeploy.deployArguments], {
      stdio: "inherit"
    });
  }
}

DashboardDeploy.run(process.argv[2]);
