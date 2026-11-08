import type { RawQueueHandler, RawQueueMessage } from "@heximon/queue";
import type { AsyncLazy } from "@heximon/runtime";
import { SendingQueueEvents } from "@inferative/notifications/server";

/**
 * Takes each message of the queue that Cloudflare Email Service writes its delivery events to (`email-events`, with
 * the deploy's resource prefix before it) and puts the bounces and complaints on the suppression list. A resolved call
 * acknowledges the message; a throw (the database is down) has Cloudflare deliver it again. The events service loads on
 * the first message, so the start of a Durable Object does not load the notifications package.
 */
export class EmailEventsHandler implements RawQueueHandler<"email-events"> {
  public constructor(private readonly events: AsyncLazy<SendingQueueEvents>) {}

  public async handle(message: RawQueueMessage): Promise<void> {
    await (await this.events()).record(message.body);
  }
}
