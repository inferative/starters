// The part of the Workers types that this Worker uses; the full types are not a dependency.
declare module "cloudflare:workers" {
  export class WorkerEntrypoint<Env = unknown> {
    protected readonly env: Env;

    public constructor(executionContext: unknown, env: Env);
  }
}
