import { WorkerEntrypoint, exports } from "cloudflare:workers";
import {
  PublicFileReads,
  PublicReadCache,
  PublicReadGateway,
  type PublicReadFetcher,
  type PublicReadPurgeAnswer
} from "@inferative/channels/edge";

/** The bindings of the edge Worker (`wrangler.jsonc`). */
interface EdgeBindings {
  /** The dashboard Worker's default entry. */
  readonly DASHBOARD: PublicReadFetcher;

  /** The dashboard Worker's fill entrypoint, with the fill props. */
  readonly PUBLIC_READ_FILL: PublicReadFetcher;
}

/** The cached entrypoint: a hit runs no code, and a miss asks the dashboard Worker's fill entrypoint. */
export class PublicReadEntrypoint extends WorkerEntrypoint<EdgeBindings> {
  /**
   * @param request - A public read that the gateway handed over, with no header.
   * @returns The fill's answer, as our cache may keep it.
   */
  public fetch(request: Request): Promise<Response> {
    return PublicReadCache.serve(request, this.env.PUBLIC_READ_FILL);
  }

  /**
   * The dashboard Worker calls it through its `PUBLIC_READ_PURGE` binding, whose config sets the purge props.
   *
   * @param tags - The cache tags of the files whose bytes must go.
   * @returns What the purge did.
   */
  public purge(tags: readonly string[]): Promise<PublicReadPurgeAnswer> {
    return PublicReadCache.purge(tags, this.ctx);
  }
}

/**
 * The front of the host: the public reads and the public file bytes go to the gateway, every other request to the
 * dashboard Worker.
 */
class EdgeFront {
  /** The gateway of this isolate: it keeps the epoch check of each channel between requests. */
  private static gateway: PublicReadGateway | undefined;

  /** The file gateway of this isolate: it keeps the revocation read between requests. */
  private static files: PublicFileReads | undefined;

  /**
   * @param request - Any request to the host.
   * @param bindings - The bindings of the edge Worker.
   * @returns The answer.
   */
  public static fetch(request: Request, bindings: EdgeBindings): Promise<Response> {
    const url = new URL(request.url);

    if (PublicFileReads.isFileRead(url)) {
      EdgeFront.files ??= new PublicFileReads(EdgeFront.cached(), bindings.DASHBOARD);

      return EdgeFront.files.serve(request);
    }

    if (!PublicReadGateway.isPublicRead(url)) {
      return bindings.DASHBOARD.fetch(request);
    }

    EdgeFront.gateway ??= new PublicReadGateway(EdgeFront.cached());

    return EdgeFront.gateway.serve(request);
  }

  private static cached(): PublicReadFetcher {
    const entrypoint = exports[PublicReadCache.entrypointName];

    if (entrypoint === undefined) {
      throw new Error(`The edge Worker exports no ${PublicReadCache.entrypointName}.`);
    }

    return entrypoint;
  }
}

export default {
  fetch: (request: Request, bindings: EdgeBindings): Promise<Response> =>
    EdgeFront.fetch(request, bindings)
};
