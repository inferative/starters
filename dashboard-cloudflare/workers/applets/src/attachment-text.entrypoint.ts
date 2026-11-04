import { WorkerEntrypoint } from "cloudflare:workers";
import {
  AttachmentTextSandbox,
  type AttachmentTextSandboxEnv
} from "@inferative/assistant/infrastructure/cloudflare/attachment-text";
import type { AttachmentTextSourceValue } from "@inferative/assistant/server";

/**
 * Reads the text of attached PDF and Office files for the dashboard Worker, each in a Dynamic Worker with no network and
 * no binding.
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
