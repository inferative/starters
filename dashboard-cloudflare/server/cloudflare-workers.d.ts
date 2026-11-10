// The part of the Workers types that this Worker uses; the full types are not a dependency.
declare module "cloudflare:workers" {
  import type {
    PublicReadCacheContext,
    PublicReadFetcher,
    PublicReadFillContext
  } from "@inferative/channels/edge";
  import type { FilesDeliveryWorkerContext } from "@inferative/files/infrastructure/cloudflare";

  export class WorkerEntrypoint<Env = unknown> {
    protected readonly ctx: FilesDeliveryWorkerContext &
      PublicReadFillContext &
      PublicReadCacheContext;
    protected readonly env: Env;

    public constructor(executionContext: unknown, env: Env);
  }

  /** The entrypoints of this Worker, over a loopback. */
  export const exports: Readonly<Record<string, PublicReadFetcher | undefined>>;
}
