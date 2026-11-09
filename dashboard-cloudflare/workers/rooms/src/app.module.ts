import { Module } from "@heximon/runtime";
import { RootSecretModule } from "@inferative/base/config";
import { PgPolicyPersistence } from "@inferative/base/persistence/pg";
import { PgRealtimeLogReader } from "@inferative/realtime/persistence/pg";
import { DatabaseModule } from "./database.module";
import { RealtimeRoomModule } from "./realtime-room.module";

/**
 * The root module of the rooms Worker: the room of the realtime streams, which the dashboard Worker calls. The first
 * call of a room boots these modules only, not the whole dashboard.
 */
export class AppModule extends Module({
  imports: [
    // The realtime streams: one room for each organization. It checks each ticket against the root secret, and it
    // reads the access of a member stream again from the database, and the realtime log that the dashboard Worker writes.
    RootSecretModule,
    DatabaseModule,
    PgPolicyPersistence,
    PgRealtimeLogReader,
    RealtimeRoomModule
  ]
}) {}
