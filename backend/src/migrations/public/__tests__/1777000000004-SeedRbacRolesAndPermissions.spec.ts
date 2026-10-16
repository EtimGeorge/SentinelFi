import type { QueryRunner } from "typeorm";
import {
  PERMISSIONS,
  ROLES,
  ensureRbacSeeded,
} from "../../../database/seeds/rbac.seed-data";
import { SeedRbacRolesAndPermissions1777000000004 } from "../1777000000004-SeedRbacRolesAndPermissions";

describe("rbac.seed-data", () => {
  it("exposes the full permission catalog", () => {
    expect(PERMISSIONS).toHaveLength(33);
    expect(new Set(PERMISSIONS.map((p) => p.name)).size).toBe(33);
  });

  it("declares every canonical role exactly once", () => {
    expect(ROLES).toHaveLength(15);
    expect(new Set(ROLES.map((r) => r.name)).size).toBe(15);
    expect(ROLES.map((r) => r.name)).toEqual(
      expect.arrayContaining([
        "SuperAdmin",
        "CEO",
        "CFO",
        "Admin Director",
        "Operational Director",
        "Technical Director",
        "Finance Manager",
        "Admin Manager",
        "Project Manager",
        "Finance Officer",
        "Admin Officer",
        "Assigned Project User",
      ]),
    );
  });

  it("grants SuperAdmin every permission", () => {
    const superAdmin = ROLES.find((r) => r.name === "SuperAdmin")!;
    expect(superAdmin.grant(PERMISSIONS)).toHaveLength(33);
  });

  it("applies each role's documented grant predicate", () => {
    const byName = (name: string) => ROLES.find((r) => r.name === name)!;
    expect(byName("Admin").grant(PERMISSIONS)).toHaveLength(26);
    expect(byName("CFO").grant(PERMISSIONS)).toHaveLength(29);
    expect(byName("Admin Director").grant(PERMISSIONS)).toHaveLength(29);
    expect(byName("Operational Director").grant(PERMISSIONS)).toHaveLength(25);
    expect(byName("Technical Director").grant(PERMISSIONS)).toHaveLength(6);
    expect(byName("Finance Manager").grant(PERMISSIONS)).toHaveLength(15);
    expect(byName("Project Manager").grant(PERMISSIONS)).toHaveLength(10);
    expect(byName("Finance Officer").grant(PERMISSIONS)).toHaveLength(3);
    expect(byName("Admin Officer").grant(PERMISSIONS)).toHaveLength(1);
    // Legacy roles retained for backward compatibility.
    expect(byName("Finance").grant(PERMISSIONS)).toHaveLength(7);
    expect(byName("IT Head").grant(PERMISSIONS)).toHaveLength(7);
  });
});

describe("SeedRbacRolesAndPermissions1777000000004", () => {
  function migratingRunner() {
    const writes: string[] = [];
    const manager = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('FROM "public"."permissions"')) {
          return PERMISSIONS.map((p, i) => ({ id: `perm-${i}`, name: p.name }));
        }
        if (sql.includes('FROM "public"."roles"')) {
          return ROLES.map((r, i) => ({ id: `role-${i}`, name: r.name }));
        }
        writes.push(sql);
        return [];
      }),
    };
    const runner = { manager } as unknown as QueryRunner;
    return { runner, writes, manager };
  }

  it("inserts permissions, roles and grants idempotently", async () => {
    const { runner, writes } = migratingRunner();
    await new SeedRbacRolesAndPermissions1777000000004().up(runner);

    expect(
      writes.filter((s) => s.includes('INSERT INTO "public"."permissions"')),
    ).toHaveLength(33);
    expect(
      writes.filter((s) => s.includes('INSERT INTO "public"."roles"')),
    ).toHaveLength(15);
    expect(
      writes.filter((s) => s.includes('INSERT INTO "public"."role_permissions"')),
    ).toHaveLength(33 + 26 + 7 + 29 + 29 + 25 + 6 + 6 + 7 + 15 + 6 + 10 + 3 + 1 + 5);
    expect(writes.every((s) => s.includes("ON CONFLICT"))).toBe(true);
  });

  it("is a safe no-op on rollback (never deletes RBAC rows)", async () => {
    const { runner, writes } = migratingRunner();
    await new SeedRbacRolesAndPermissions1777000000004().down(runner);
    expect(writes).toHaveLength(0);
  });

  it("reports ensured counts from ensureRbacSeeded", async () => {
    const { runner } = migratingRunner();
    const counts = await ensureRbacSeeded(runner.manager);
    expect(counts.permissions).toBe(33);
    expect(counts.roles).toBe(15);
    expect(counts.grants).toBeGreaterThan(0);
  });
});
