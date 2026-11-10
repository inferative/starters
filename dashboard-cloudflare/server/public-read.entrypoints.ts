import { WorkerEntrypoint } from "cloudflare:workers";
import {
  PublicReadCache,
  PublicReadFill,
  type PublicReadPurgeAnswer
} from "@inferative/channels/edge";

/**
 * The cached entrypoint of the public reads and the public file bytes (`exports` in `nuxt.config.ts` turns its Workers
 * Cache on). A hit runs no code. A miss of the stamp read goes to the stamp fill route, which loads no app; any other
 * miss hands the read to the app, which loads on its first use.
 */
export class PublicReadEntrypoint extends WorkerEntrypoint {
  /**
   * @param request - A public read that the gateway handed over, with no header.
   * @returns The fill's answer, as our cache may keep it.
   */
  public fetch(request: Request): Promise<Response> {
    return PublicReadCache.serve(request, PublicReadFill.withStampFill(this.ctx));
  }

  /**
   * The files package calls it over a loopback with the purge props, when a file stops being public.
   *
   * @param tags - The cache tags of the files whose bytes must go.
   * @returns What the purge did.
   */
  public purge(tags: readonly string[]): Promise<PublicReadPurgeAnswer> {
    return PublicReadCache.purge(tags, this.ctx);
  }
}

/**
 * The fill of the edge Worker: it reaches this Worker through a service binding whose config sets the fill props. A
 * call with no fill props gets `403`. A stamp read goes to the stamp fill route, any other read to the app.
 */
export class PublicReadFillEntrypoint extends WorkerEntrypoint {
  /**
   * @param request - A public read that the edge Worker's cache missed.
   * @returns The fill's answer.
   */
  public fetch(request: Request): Promise<Response> {
    return PublicReadFill.serve(request, this.ctx, PublicReadFill.withStampFill);
  }
}
