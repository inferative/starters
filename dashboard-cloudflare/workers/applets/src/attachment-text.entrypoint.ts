import { WorkerEntrypoint } from "cloudflare:workers";
import {
  AttachmentTextSandbox,
  type AttachmentTextSandboxEnv
} from "@inferative/assistant/infrastructure/cloudflare/attachment-text";
import type { AttachmentTextSourceValue } from "@inferative/assistant/server";

/**
 * The reader of the text of attached PDF and Office files. The dashboard Worker calls it over its `ATTACHMENT_TEXT`
 * service binding, and it reads each file in a Dynamic Worker of the Worker Loader, with no network and no binding.
 * `vite.config.ts` adds it to the exports of the Worker.
 */
export class AttachmentTextEntrypoint extends WorkerEntrypoint<AttachmentTextSandboxEnv> {
  /**
   * @param bytes - The whole file.
   * @param source - What the dashboard Worker found the file to be.
   * @returns What the reader read.
   */
  public read(bytes: Uint8Array, source: AttachmentTextSourceValue): Promise<unknown> {
    return new AttachmentTextSandbox(this.env.APPLET_LOADER).read(bytes, source);
  }
}
