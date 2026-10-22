import { Module } from "@heximon/runtime";

/**
 * The root module of the Worker of the applet supervisor. It composes no module: the Worker exports the supervisor
 * class (`heximon.config.ts`), and the dashboard Worker sends each command to it through its Durable Object binding.
 */
export class AppModule extends Module({}) {}
