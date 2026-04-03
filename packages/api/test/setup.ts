import { env, applyD1Migrations } from "cloudflare:test";
import { beforeAll } from "vitest";

beforeAll(async () => {
  const migrations = (env as any).TEST_MIGRATIONS;
  await applyD1Migrations(env.DB, migrations);
});
