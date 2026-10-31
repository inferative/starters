// The class of the platform's module that `attachment-text.entrypoint.ts` extends. The full Workers types are not a
// dependency of this project, so this file declares what the Worker uses.
declare module "cloudflare:workers" {
  export class WorkerEntrypoint<Env = unknown> {
    protected readonly env: Env;

    public constructor(executionContext: unknown, env: Env);
  }
}
