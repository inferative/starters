// The part of the Workers types that this Worker uses; the full types are not a dependency.
declare module "cloudflare:workers" {
  import type { PublicReadCacheContext, PublicReadFetcher } from "@inferative/channels/edge";

  export class WorkerEntrypoint<Env = unknown> {
    protected readonly ctx: PublicReadCacheContext;
    protected readonly env: Env;

    public constructor(executionContext: unknown, env: Env);
  }

  /** The entrypoints of this Worker, over a loopback. */
  export const exports: Readonly<Record<string, PublicReadFetcher | undefined>>;
}
