// Deploys the rooms Worker (`pnpm deploy:rooms`) after it checks that the Worker holds its secrets. The new version
// of a Worker that lacks `INFERATIVE_ROOT_SECRET` does not boot, and then no room of it answers: the dashboard fails.
// So the check runs before the upload. A Worker that does not exist yet holds nothing to break, so the first deploy
// goes on. Any other wrangler error stops the deploy with that error.
//
// The upload deletes the namespaces of the rooms that ran here before (the `deleted` tombstones that
// `durable.deletedClasses` of `heximon.config.ts` writes), and Cloudflare refuses that while the deployed dashboard Worker
// still binds those classes. So a release runs this script twice: `before` (`pnpm deploy:rooms`), ahead of the
// dashboard Worker, which binds the rooms of this Worker, and `after` (`pnpm deploy:rooms:after`). Only one of them
// uploads: `after` when this Worker still holds an old namespace, `before` otherwise (a new install, or no old namespace).
// An upload sends a tombstone only for a namespace that the Worker holds.
//
// Each argument after the phase goes to `wrangler deploy` (`--dry-run`, for one); a `--name` goes to the read too. A
// dry run reads no account and skips the check; it counts every old namespace as held, so `after` checks the upload
// that deletes them, and `before` the upload without them.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DashboardDeployConfig } from "../edge/dashboard-deploy-config.mjs";
import { DeployedNamespaces } from "../edge/deployed-namespaces.mjs";
import { RoomsSecrets } from "./rooms-secrets.mjs";

class RoomsDeploy {
  /** The config that the build wrote. */
  static config = join("workers", "rooms", "dist", "wrangler.json");

  /** The config of the upload, with a tombstone only for a held namespace. */
  static uploadConfig = join("workers", "rooms", "dist", "wrangler.deploy.json");

  /** The arguments that `wrangler deploy` gets after the config. */
  static deployArguments = process.argv.slice(3);

  static run(phase) {
    if (phase !== "before" && phase !== "after") {
      throw new Error(`Unknown phase "${String(phase)}": use "before" or "after".`);
    }

    const built = JSON.parse(readFileSync(RoomsDeploy.config, "utf8"));
    const worker = DashboardDeployConfig.workerName(built, RoomsDeploy.deployArguments);
    const dryRun = RoomsDeploy.deployArguments.includes("--dry-run");
    const tombstones = DashboardDeployConfig.tombstones(built);
    const held =
      dryRun && phase === "before"
        ? []
        : DeployedNamespaces.held(
            RoomsDeploy.config,
            built,
            RoomsDeploy.deployArguments,
            tombstones
          );

    if (!DashboardDeployConfig.isRoomsPhase(phase, held)) {
      console.log(
        phase === "before"
          ? `The Worker ${worker} still holds the namespaces of ${held.join(", ")}, which the deployed dashboard Worker ` +
              "binds: it deploys after the dashboard Worker (`pnpm deploy:rooms:after`), nothing to do now."
          : `The Worker ${worker} deployed before the dashboard Worker: nothing to do now.`
      );

      return;
    }

    if (RoomsDeploy.deployArguments.includes("--dry-run")) {
      console.log("A dry run reads no secret: the secrets of the rooms Worker are not checked.");
    } else {
      RoomsDeploy.requireSecrets(worker);
    }

    writeFileSync(
      RoomsDeploy.uploadConfig,
      JSON.stringify(DashboardDeployConfig.forUpload(built, held))
    );
    execFileSync(
      "wrangler",
      ["deploy", "--config", RoomsDeploy.uploadConfig, ...RoomsDeploy.deployArguments],
      {
        stdio: "inherit"
      }
    );
  }

  /** Stops the deploy when the Worker lacks a required secret. */
  static requireSecrets(worker) {
    let output;

    try {
      output = execFileSync("wrangler", ["secret", "list", "--name", worker, "--format", "json"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      });
    } catch (error) {
      const text = `${error.stderr ?? ""}${error.stdout ?? ""}`;

      if (RoomsSecrets.isMissingWorker(text, worker)) {
        console.log(`The Worker ${worker} does not exist yet: it holds no secret to check.`);

        return;
      }

      process.stderr.write(text);

      throw error;
    }

    const missing = RoomsSecrets.missing(output);

    if (missing.length > 0) {
      console.error(RoomsSecrets.refusal(worker, missing));
      process.exit(1);
    }
  }
}

RoomsDeploy.run(process.argv[2]);
