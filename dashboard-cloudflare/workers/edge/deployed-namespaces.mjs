// Reads which Durable Object namespaces a deployed Worker still holds. Wrangler itself reads the bindings of the
// versions of the current deployment (`wrangler deployments status`, `wrangler versions view`), with the account, the
// Worker name and the credentials that its deploy uses: a version that binds a class in the Worker itself holds its
// namespace.
import { execFileSync } from "node:child_process";
import { DashboardDeployConfig } from "./dashboard-deploy-config.mjs";

/** The namespaces that the current deployment of a Worker holds. */
export class DeployedNamespaces {
  /**
   * A Worker with no deployment holds none. A dry run reads nothing and counts every class, so that it checks the
   * upload that deletes them too.
   *
   * @param configPath - The built config of the Worker.
   * @param config - Its content.
   * @param deployArguments - The arguments of `wrangler deploy`; a `--name` names the Worker.
   * @param classes - The classes to look for.
   * @returns The classes whose namespace the Worker holds, in the order of `classes`.
   */
  static held(configPath, config, deployArguments, classes) {
    if (classes.length === 0) {
      return [];
    }

    if (deployArguments.includes("--dry-run")) {
      console.log(
        "A dry run reads no deployment: it checks the upload that deletes the old namespaces too."
      );

      return classes;
    }

    const worker = DashboardDeployConfig.workerName(config, deployArguments);
    const target = ["--config", configPath, "--name", worker, "--json"];
    let deployment;

    // A new install has no Worker yet: wrangler then answers that it is missing, and that answer is not shown. Any
    // other refusal stops the deploy with wrangler's error.
    try {
      deployment = JSON.parse(
        DeployedNamespaces.wrangler(["deployments", "status", ...target], "pipe")
      );
    } catch (error) {
      const output = `${error.stderr ?? ""}${error.stdout ?? ""}`;

      if (!DashboardDeployConfig.isMissingWorker(output, worker)) {
        process.stderr.write(output);

        throw error;
      }

      console.log(`The Worker ${worker} has no deployment yet: it holds no old namespace.`);

      return [];
    }

    const versions = (deployment.versions ?? []).map((version) =>
      JSON.parse(DeployedNamespaces.wrangler(["versions", "view", version.version_id, ...target]))
    );

    return DashboardDeployConfig.heldClasses(versions, worker, classes);
  }

  /** @returns The standard output of a wrangler command; its errors go to `errors` (this deploy's, by default). */
  static wrangler(args, errors = "inherit") {
    return execFileSync("wrangler", args, { encoding: "utf8", stdio: ["ignore", "pipe", errors] });
  }
}
