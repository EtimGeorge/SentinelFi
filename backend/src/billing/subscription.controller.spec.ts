import { SubscriptionController } from "./subscription.controller";
import { BillingService } from "./billing.service";
import { Role } from "@shared/types/role.enum";

/**
 * SEC-2026-004: SubscriptionController tenant-isolation suite.
 *
 * The security property under test: every authenticated endpoint derives
 * tenant_id EXCLUSIVELY from req.user (the verified JWT), never from
 * request body / query / params. A regression that reads tenant from the
 * body would let any authenticated user read/extend anyone's subscription.
 */
describe("SubscriptionController (tenant isolation)", () => {
  const makeController = () => {
    const billingService = {
      startFreeTrial: jest.fn(async (body: any) => ({ message: "ok", body })),
      startFreePlan: jest.fn(async (body: any) => ({ message: "ok", body })),
      processPublicSubscription: jest.fn(async (body: any) => ({
        message: "ok",
        body,
      })),
      getSubscriptionStatus: jest.fn(async (ref: string) => ({
        status: "pending",
        ref,
      })),
      getMySubscription: jest.fn(async (tenantId: string) => ({
        plan: "professional",
        tenantId,
      })),
      inviteUser: jest.fn(
        async (
          email: string,
          role: Role,
          tenantId: string,
          firstName?: string,
          lastName?: string,
        ) => ({ email, role, tenantId, firstName, lastName }),
      ),
      reactivateSubscription: jest.fn(async (tenantId: string) => ({
        message: "reactivated",
        tenantId,
      })),
      grantAdUnlock: jest.fn(async (tenantId: string) => ({
        message: "unlocked",
        tenantId,
      })),
    } as unknown as jest.Mocked<BillingService>;
    const controller = new SubscriptionController(billingService);
    return { controller, billingService };
  };

  describe("public endpoints delegate to service", () => {
    it("startTrial forwards body to startFreeTrial", async () => {
      const { controller, billingService } = makeController();
      const body = {
        email: "a@corp.com",
        companyName: "Acme",
        firstName: "A",
        lastName: "B",
      };
      await controller.startTrial(body);
      expect(billingService.startFreeTrial).toHaveBeenCalledWith(body);
    });

    it("subscribe forwards body to processPublicSubscription", async () => {
      const { controller, billingService } = makeController();
      const body = {
        email: "a@corp.com",
        companyName: "Acme",
        firstName: "A",
        lastName: "B",
        plan: "professional",
        billingCycle: "monthly" as any,
        gateway: "paystack" as any,
      };
      await controller.subscribe(body);
      expect(billingService.processPublicSubscription).toHaveBeenCalledWith(
        body,
      );
    });

    it("startFree forwards body to startFreePlan", async () => {
      const { controller, billingService } = makeController();
      const body = {
        email: "free@corp.com",
        companyName: "Acme",
        firstName: "F",
        lastName: "G",
      };
      await controller.startFree(body);
      expect(billingService.startFreePlan).toHaveBeenCalledWith(body);
    });

    it("getSubscriptionStatus forwards the ref query param", async () => {
      const { controller, billingService } = makeController();
      await controller.getSubscriptionStatus("sub-123");
      expect(billingService.getSubscriptionStatus).toHaveBeenCalledWith(
        "sub-123",
      );
    });
  });

  describe("authenticated endpoints use JWT tenant_id, never client input", () => {
    const reqFor = (tenant_id: string) => ({ user: { tenant_id } }) as any;

    it("getMySubscription passes req.user.tenant_id", async () => {
      const { controller, billingService } = makeController();
      await controller.getMySubscription(reqFor("tenant-A"));
      expect(billingService.getMySubscription).toHaveBeenCalledWith(
        "tenant-A",
      );
    });

    it("getMySubscription cannot be steered by a body tenant_id", async () => {
      const { controller, billingService } = makeController();
      // Even if an attacker smuggles tenant_id elsewhere on the request,
      // the controller only reads req.user.tenant_id.
      const hostileReq = {
        user: { tenant_id: "tenant-A" },
        body: { tenant_id: "tenant-VICTIM" },
        query: { tenant_id: "tenant-VICTIM" },
      } as any;
      await controller.getMySubscription(hostileReq);
      expect(billingService.getMySubscription).toHaveBeenCalledWith(
        "tenant-A",
      );
      expect(billingService.getMySubscription).not.toHaveBeenCalledWith(
        "tenant-VICTIM",
      );
    });

    it("inviteTeamMember scopes the invite to the caller's tenant", async () => {
      const { controller, billingService } = makeController();
      await controller.inviteTeamMember(
        { email: "new@corp.com", role: Role.FinanceOfficer },
        reqFor("tenant-A"),
      );
      expect(billingService.inviteUser).toHaveBeenCalledWith(
        "new@corp.com",
        Role.FinanceOfficer,
        "tenant-A",
        undefined,
        undefined,
      );
    });

    it("reactivate scopes to the caller's tenant", async () => {
      const { controller, billingService } = makeController();
      await controller.reactivate(reqFor("tenant-A"));
      expect(billingService.reactivateSubscription).toHaveBeenCalledWith(
        "tenant-A",
      );
    });

    it("adUnlock scopes to the caller's tenant", async () => {
      const { controller, billingService } = makeController();
      await controller.adUnlock(reqFor("tenant-A"));
      expect(billingService.grantAdUnlock).toHaveBeenCalledWith("tenant-A");
    });
  });
});
