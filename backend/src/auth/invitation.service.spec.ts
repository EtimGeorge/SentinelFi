import { BadRequestException, NotFoundException } from "@nestjs/common";
import { InvitationService } from "./invitation.service";
import { Role } from "@shared/types/role.enum";

describe("InvitationService", () => {
  let service: InvitationService;

  const invitations = {
    create: jest.fn((x: any) => x),
    save: jest.fn(async (x: any) => x),
    findOne: jest.fn(),
    update: jest.fn(async () => undefined),
  };
  const emailService = {
    sendTemplatedEmail: jest.fn<Promise<void>, any[]>(async () => undefined),
  };
  const configService = {
    get: (key: string) =>
      key === "FRONTEND_URL" ? "https://app.sentinelfi.com" : undefined,
  };

  const tenant = { tenant_id: "t1", name: "Acme Corp" } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    invitations.create.mockImplementation((x: any) => x);
    invitations.save.mockImplementation(async (x: any) => x);
    emailService.sendTemplatedEmail.mockResolvedValue(undefined);

    service = new InvitationService(
      invitations as any,
      emailService as any,
      configService as any,
      {} as any,
    );
  });

  it("creates a 256-bit single-use invitation and emails a magic link", async () => {
    const before = Date.now();

    const saved = await service.createInvitation(
      "admin@acme.test",
      Role.CEO,
      tenant,
      "Ada",
      "Lovelace",
    );

    const created = invitations.create.mock.calls[0][0];
    expect(created.token).toMatch(/^[0-9a-f]{64}$/);
    expect(created.token).toHaveLength(64);

    const ttl = created.expires_at.getTime() - before;
    expect(ttl).toBeGreaterThan(47 * 60 * 60 * 1000);
    expect(ttl).toBeLessThan(49 * 60 * 60 * 1000);

    expect(created.email).toBe("admin@acme.test");
    expect(created.role).toBe(Role.CEO);
    expect(created.first_name).toBe("Ada");
    expect(saved).toBe(created);

    expect(emailService.sendTemplatedEmail).toHaveBeenCalledTimes(1);
    const [to, , template, ctx] = emailService.sendTemplatedEmail.mock.calls[0];
    expect(to).toBe("admin@acme.test");
    expect(template).toBe("invitation");
    expect(ctx.tenantName).toBe("Acme Corp");
    expect(ctx.expiryHours).toBe(48);
    expect(ctx.inviteUrl).toContain(created.token);
    expect(
      ctx.inviteUrl.startsWith(
        "https://app.sentinelfi.com/auth/accept-invitation?token=",
      ),
    ).toBe(true);
  });

  it("still returns the saved invitation when the email send fails", async () => {
    emailService.sendTemplatedEmail.mockRejectedValueOnce(new Error("mail down"));

    const saved = await service.createInvitation("x@y.test", Role.CEO, tenant);

    expect(saved.token).toMatch(/^[0-9a-f]{64}$/);
    expect(invitations.save).toHaveBeenCalledTimes(1);
  });

  it("rejects an unknown token", async () => {
    invitations.findOne.mockResolvedValueOnce(null);
    await expect(service.validateToken("nope")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("rejects an expired token", async () => {
    invitations.findOne.mockResolvedValueOnce({
      token: "t",
      expires_at: new Date(Date.now() - 1000),
    });
    await expect(service.validateToken("t")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("returns a valid, unexpired invitation", async () => {
    const inv = { token: "t", expires_at: new Date(Date.now() + 100_000) };
    invitations.findOne.mockResolvedValueOnce(inv);
    await expect(service.validateToken("t")).resolves.toBe(inv);
    expect(invitations.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { token: "t", is_consumed: false } }),
    );
  });

  it("marks a token consumed (single-use)", async () => {
    await service.markAsConsumed("t");
    expect(invitations.update).toHaveBeenCalledWith(
      { token: "t" },
      { is_consumed: true },
    );
  });
});
