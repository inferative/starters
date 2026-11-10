import { exports } from "cloudflare:workers";
import {
  PublicFileReads,
  PublicReadCache,
  PublicReadFill,
  PublicReadGateway,
  type PublicReadFetcher
} from "@inferative/channels/edge";

/**
 * The early route of `/api/site/v1/` and `/api/files/delivery/` (`cloudflare.earlyRoutes` in `heximon.config.ts`): the
 * Worker answers it before it loads the app. The gateway checks the stamp and the epoch, or keys a public file by the
 * revocation read, and asks the cached `PublicReadEntrypoint`; only a miss of that cache, or a file read with a
 * credential, loads the app.
 */
class PublicReadRoute {
  /** The gateway of this isolate: it keeps the epoch check of each channel between requests. */
  private static gateway: PublicReadGateway | undefined;

  /** The file gateway of this isolate: it keeps the revocation read between requests. */
  private static files: PublicFileReads | undefined;

  /**
   * @param request - A request under `/api/site/v1/` or `/api/files/delivery/`.
   * @returns The answer of the gateway.
   */
  public static fetch(request: Request): Promise<Response> {
    if (PublicFileReads.isFileRead(new URL(request.url))) {
      PublicReadRoute.files ??= new PublicFileReads(
        PublicReadRoute.cached(),
        PublicReadFill.app({ exports })
      );

      return PublicReadRoute.files.serve(request);
    }

    PublicReadRoute.gateway ??= new PublicReadGateway(PublicReadRoute.cached());

    return PublicReadRoute.gateway.serve(request);
  }

  private static cached(): PublicReadFetcher {
    const entrypoint = exports[PublicReadCache.entrypointName];

    if (entrypoint === undefined) {
      throw new Error(`The Worker exports no ${PublicReadCache.entrypointName}.`);
    }

    return entrypoint;
  }
}

export default { fetch: (request: Request): Promise<Response> => PublicReadRoute.fetch(request) };
