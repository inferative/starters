// The Worker secrets that the rooms Worker needs before an upload, and the text of the refusal. It reads no file and no
// network: `deploy-rooms.mjs` hands it the output of `wrangler secret list`.

/** The secrets of the rooms Worker that `deploy-rooms.mjs` checks. */
export class RoomsSecrets {
  /**
   * The secrets without which no room of the Worker boots: the stream room checks each realtime ticket that the
   * dashboard Worker signs, and every secret of the dashboard derives from the root.
   */
  static required = ["INFERATIVE_ROOT_SECRET"];

  /**
   * The required secrets that the Worker lacks.
   *
   * @param output - What `wrangler secret list --format json` printed: a JSON list of `{ name, type }`.
   * @returns The names that the list leaves out.
   * @throws {Error} when the output is no list of secrets: that is a wrangler error, never an absent secret.
   */
  static missing(output) {
    let listed;

    try {
      listed = JSON.parse(output);
    } catch {
      listed = undefined;
    }

    if (!Array.isArray(listed)) {
      throw new Error(`wrangler secret list answered no list of secrets: ${output.trim()}`);
    }

    const names = new Set(listed.map((secret) => secret?.name));

    return RoomsSecrets.required.filter((name) => !names.has(name));
  }

  /**
   * Whether `wrangler secret list` refused because the Worker does not exist. Wrangler 4 answers
   * `Worker "<name>" not found.` and a hint to run `wrangler deploy` first, with no numeric code. Any other refusal is
   * not a missing Worker.
   *
   * @param output - What the refused command wrote.
   * @param worker - The rooms Worker name.
   * @returns Whether the refusal means that the Worker does not exist.
   */
  static isMissingWorker(output, worker) {
    // oxlint-disable-next-line no-control-regex -- removes the colour codes of the terminal output
    const text = output.replace(/\u001b\[[0-9;]*m/gu, "");

    return text.includes(`Worker "${worker}" not found.`);
  }

  /**
   * @param worker - The rooms Worker name.
   * @param missing - The names from {@link RoomsSecrets.missing}.
   * @returns The message of the refusal: the names and the command that sets them.
   */
  static refusal(worker, missing) {
    return (
      `The rooms Worker ${worker} lacks ${missing.join(", ")}. Without the root secret no room of that Worker boots, ` +
      "and the dashboard fails with it. Set the root and the realtime values first (SETUP.md, phase 11, step 5):\n" +
      "  grep -E '^INFERATIVE_(ROOT_SECRET|ROOT_SECRET_PREVIOUS|REALTIME(_[A-Z0-9_]+)?)=' .env.worker | " +
      `pnpm exec wrangler secret bulk --name ${worker}`
    );
  }
}
