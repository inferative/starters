import { Database } from "@heximon/persistence";
import { Module } from "@heximon/runtime";
import { ActingContextHolder } from "@inferative/base/actors";
import { OrganizationChart } from "@inferative/base/chart";
import { PgDatabase } from "@inferative/base/persistence/pg";
import { TenantContext } from "@inferative/base/tenant";
import { SeedTierPlans } from "@inferative/base/tiers";
import { SeedDemo } from "./seed-demo.task";

/**
 * The demo data of a test install: {@link SeedDemo}, which an operator runs once after the first-run step with
 * `heximon task run DemoSeedModule SeedDemo`. The task is in `providers` because no route and no boot hook runs it.
 * Delete this module and its line in `server/app.module.ts` to leave it out.
 */
export class DemoSeedModule extends Module({
  requires: [Database, PgDatabase, OrganizationChart, SeedTierPlans],
  providers: [TenantContext, ActingContextHolder, SeedDemo]
}) {}
