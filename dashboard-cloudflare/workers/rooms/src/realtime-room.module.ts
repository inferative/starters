import { Module } from "@heximon/runtime";
import { RootSecret } from "@inferative/base/config";
import { HostCheckSeat } from "@inferative/base/origin";
import { AccessStateStore } from "@inferative/base/policy";
import { RealtimeEvents } from "@inferative/realtime/api";
import { RealtimeConfig } from "@inferative/realtime/config";
import { CloudflareRealtimeInfrastructure } from "@inferative/realtime/infrastructure/cloudflare";
import {
  HmacRealtimeTicketSigner,
  RealtimeChannelClosureStore,
  RealtimeDeliveryCheck,
  RealtimeStreamConnectGuard,
  RealtimeStreamConnections,
  RealtimeMessageLog,
  RealtimeStreamHandler,
  RealtimeStreamHeads,
  RealtimeStreamResume,
  RealtimeTicketSigner
} from "@inferative/realtime/server";

/**
 * The realtime stream room without `RealtimeModule`. The dashboard Worker serves the stream address, checks the host
 * and sends each connect here; this Worker lists the same stream handler, checks the ticket
 * (`RealtimeStreamConnectGuard`), holds the stream and delivers into it. It reads the `realtime` section of
 * `inferative.config.ts`, as the dashboard Worker does.
 */
export class RealtimeRoomModule extends Module({
  requires: [
    RootSecret,
    AccessStateStore,
    // The stored log over the realtime table that the dashboard Worker writes (`PgRealtimeLogReader`): a reconnect
    // resumes from it, and a heartbeat names the last change of each held topic.
    RealtimeMessageLog
  ],
  imports: [CloudflareRealtimeInfrastructure],
  config: { realtime: RealtimeConfig },
  providers: [
    { provide: RealtimeTicketSigner, useClass: HmacRealtimeTicketSigner },
    RealtimeStreamConnections,
    RealtimeChannelClosureStore,
    RealtimeDeliveryCheck,
    RealtimeStreamConnectGuard,
    RealtimeStreamResume,
    RealtimeStreamHeads,
    // The host check of a connect runs in the dashboard Worker, before the connect reaches the room.
    HostCheckSeat
  ],
  sse: { handlers: [RealtimeStreamHandler], events: [RealtimeEvents] },
  exports: [RealtimeStreamConnections, RealtimeChannelClosureStore]
}) {}
