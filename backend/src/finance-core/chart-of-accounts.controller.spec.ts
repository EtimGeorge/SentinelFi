import { Reflector } from "@nestjs/core";
import { ChartOfAccountsController } from "./chart-of-accounts.controller";
import { ROLES_KEY } from "../auth/decorators/roles.decorator";
import { Role } from "../../../shared/types/role.enum";

/**
 * Locks the RBAC policy for the chart of accounts: seeding is an additive,
 * idempotent bootstrap and is allowed for the CEO (who can view the page),
 * while destructive CRUD stays restricted to finance/admin write roles.
 */
describe("ChartOfAccountsController — RBAC policy", () => {
  const reflector = new Reflector();
  const rolesFor = (method: keyof ChartOfAccountsController): string[] =>
    (reflector.get<string[]>(
      ROLES_KEY,
      ChartOfAccountsController.prototype[method],
    ) ?? []) as string[];

  it("allows the CEO to seed the default chart", () => {
    expect(rolesFor("seedDefaults")).toContain(Role.CEO);
  });

  it("still allows finance/admin write roles to seed", () => {
    const roles = rolesFor("seedDefaults");
    expect(roles).toEqual(
      expect.arrayContaining([
        Role.CFO,
        Role.FinanceManager,
        Role.AdminDirector,
        Role.AdminManager,
      ]),
    );
  });

  it("keeps read-only roles out of seeding", () => {
    const roles = rolesFor("seedDefaults");
    expect(roles).not.toContain(Role.FinanceOfficer);
    expect(roles).not.toContain(Role.OperationalDirector);
    expect(roles).not.toContain(Role.TechnicalDirector);
  });

  it("does not let the CEO perform destructive CRUD", () => {
    for (const method of [
      "createClass",
      "updateClass",
      "deleteClass",
      "createGroup",
      "updateGroup",
      "deleteGroup",
      "createAccount",
      "updateAccount",
      "deleteAccount",
    ] as (keyof ChartOfAccountsController)[]) {
      expect(rolesFor(method)).not.toContain(Role.CEO);
    }
  });
});
