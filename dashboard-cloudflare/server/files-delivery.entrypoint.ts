import { WorkerEntrypoint } from "cloudflare:workers";
import {
  FilesDeliveryCache,
  type FilesDeliveryPurgeAnswer
} from "@inferative/files/infrastructure/cloudflare";

/**
 * The one entrypoint of this Worker that the Workers Cache stands in front of (`exports` in `nuxt.config.ts`). The file
 * route of the default entrypoint hands it a public read after it decided the read on the file's current row; a cache
 * hit answers without running the Worker again. The purge runs here, because a purge drops only what its own entrypoint
 * stored.
 */
export class FilesDeliveryEntrypoint extends WorkerEntrypoint {
  /**
   * @param request - A public read that the file route decided, with no credentials.
   * @returns The app's answer; only a public file's answer may stay in the cache.
   */
  public fetch(request: Request): Promise<Response> {
    return FilesDeliveryCache.serve(request, this.ctx);
  }

  /**
   * @param tags - The cache tags of the files whose bytes must go.
   * @returns What the purge did.
   */
  public purge(tags: readonly string[]): Promise<FilesDeliveryPurgeAnswer> {
    return FilesDeliveryCache.purge(tags, this.ctx);
  }
}
