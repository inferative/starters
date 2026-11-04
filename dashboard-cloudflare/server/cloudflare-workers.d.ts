// The part of the Workers types that this Worker uses; the full types are not a dependency.
declare module "cloudflare:workers" {
  import type { FilesDeliveryWorkerContext } from "@inferative/files/infrastructure/cloudflare";

  export class WorkerEntrypoint<Env = unknown> {
    protected readonly ctx: FilesDeliveryWorkerContext;
    protected readonly env: Env;

    public constructor(executionContext: unknown, env: Env);
  }
}
