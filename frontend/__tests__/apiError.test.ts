import { parseApiError, isWorkspaceDeactivated } from "../lib/apiError";

describe("parseApiError", () => {
  it("reads NestJS object-style bodies { code, message }", () => {
    const err = {
      response: {
        status: 403,
        data: {
          code: "TENANT_DEACTIVATED",
          message: "This workspace has been deactivated.",
          statusCode: 403,
        },
      },
    };
    expect(parseApiError(err, "fallback")).toEqual({
      code: "TENANT_DEACTIVATED",
      message: "This workspace has been deactivated.",
      status: 403,
    });
  });

  it("reads nested { message: { code, message } } bodies", () => {
    const err = {
      response: {
        status: 403,
        data: { message: { code: "TENANT_DEACTIVATED", message: "Closed." } },
      },
    };
    const parsed = parseApiError(err, "fallback");
    expect(parsed.code).toBe("TENANT_DEACTIVATED");
    expect(parsed.message).toBe("Closed.");
  });

  it("joins class-validator message arrays", () => {
    const err = {
      response: { status: 400, data: { message: ["a is bad", "b is bad"] } },
    };
    expect(parseApiError(err, "fallback").message).toBe("a is bad b is bad");
  });

  it("falls back with a connectivity message when there is no response", () => {
    const parsed = parseApiError(new Error("boom"), "fallback");
    expect(parsed.message).toContain("Cannot reach the server");
  });

  it("flags deactivated workspaces for the switch-workspace hint", () => {
    expect(
      isWorkspaceDeactivated({ code: "TENANT_DEACTIVATED", message: "x" }),
    ).toBe(true);
    expect(isWorkspaceDeactivated({ message: "plain 403", status: 403 })).toBe(
      true,
    );
    expect(isWorkspaceDeactivated({ message: "not found", status: 404 })).toBe(
      false,
    );
  });
});
