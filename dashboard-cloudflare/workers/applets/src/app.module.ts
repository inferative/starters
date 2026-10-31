import { Module } from "@heximon/runtime";

/**
 * The root module of the applets Worker. It composes no module yet: the Worker exports the applet supervisor
 * (`heximon.config.ts`), and the dashboard Worker sends each command to it through its Durable Object binding. Add a
 * module here when this Worker needs one.
 */
export class AppModule extends Module({}) {}
