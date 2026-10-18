import * as fs from "fs";
import * as path from "path";
import { EmailService } from "./email.service";
import { EmailLogEntity } from "./email-log.entity";

type Cfg = Record<string, unknown>;

const BASE_CFG: Cfg = {
  NODE_ENV: "development",
  EMAIL_PREVIEW_ONLY: true,
  EMAIL_PROVIDER: "resend",
  EMAIL_FROM: "no-reply@sentinelfi.com",
  RESEND_API_KEY: "test_key",
  FRONTEND_URL: "https://app.sentinelfi.com",
};

function makeConfig(values: Cfg) {
  return {
    get: (key: string, defaultValue?: unknown) =>
      key in values ? values[key] : defaultValue,
  } as any;
}

function makeRepo() {
  return {
    create: jest.fn((x: Partial<EmailLogEntity>) => x),
    save: jest.fn(async (x: Partial<EmailLogEntity>) => x),
    findOne: jest.fn(async () => null),
    query: jest.fn(async () => []),
  };
}

describe("EmailService", () => {
  let repo: ReturnType<typeof makeRepo>;

  beforeEach(() => {
    repo = makeRepo();
    jest.clearAllMocks();
  });

  function build(overrides: Cfg = {}): EmailService {
    const svc = new EmailService(makeConfig({ ...BASE_CFG, ...overrides }), repo as any);
    svc.onModuleInit();
    return svc;
  }

  it("resolves the templates directory on disk and renders a templated email", async () => {
    const svc = build();

    await svc.sendTemplatedEmail(
      "admin@acme.test",
      "You're invited",
      "invitation",
      {
        tenantName: "Acme",
        inviteUrl: "https://app.sentinelfi.com/auth/accept-invitation?token=abc",
        expiryHours: 48,
      },
    );

    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = repo.save.mock.calls[0][0];
    expect(saved.status).toBe("preview");
    expect(saved.template).toBe("invitation");
    expect(saved.to).toBe("admin@acme.test");
  });

  it("resolves to a directory that actually contains layout.hbs", () => {
    const svc = build();
    const dir = (svc as any).templatesDir as string;
    expect(fs.existsSync(path.join(dir, "layout.hbs"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "invitation.hbs"))).toBe(true);
  });

  it("throws a clear error for an unknown template", async () => {
    const svc = build();
    await expect(
      svc.sendTemplatedEmail("a@b.test", "x", "no-such-template", {}),
    ).rejects.toThrow(/template not found/i);
  });

  it("selects the SMTP provider when EMAIL_PROVIDER=smtp", () => {
    const svc = build({ EMAIL_PROVIDER: "smtp", SMTP_HOST: "smtp.test" });
    expect((svc as any).provider.getName()).toBe("SMTP");
  });

  it("selects the Resend provider by default", () => {
    const svc = build();
    expect((svc as any).provider.getName()).toBe("Resend");
  });

  it("persists a failed log row and rethrows when the provider errors", async () => {
    const svc = build({ NODE_ENV: "production", EMAIL_PREVIEW_ONLY: "false" });
    (svc as any).provider = {
      getName: () => "Mock",
      sendEmail: jest.fn().mockRejectedValue(new Error("smtp down")),
    };

    await expect(svc.sendEmail("a@b.test", "Subj", "<p>hi</p>")).rejects.toThrow(
      "smtp down",
    );

    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = repo.save.mock.calls[0][0];
    expect(saved.status).toBe("failed");
    expect(saved.errorMessage).toBe("smtp down");
  });

  it("clamps the email-stats window to 1..365 days", async () => {
    const svc = build();
    expect((await svc.getEmailStats(1000)).days).toBe(365);
    expect((await svc.getEmailStats(0)).days).toBe(1);
    expect((await svc.getEmailStats(undefined as unknown as number)).days).toBe(30);
  });
});
