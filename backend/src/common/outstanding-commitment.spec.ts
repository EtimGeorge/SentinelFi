import {
  OUTSTANDING_COMMITMENT_SQL,
  queryOutstandingCommitment,
} from "./outstanding-commitment";

describe("outstanding-commitment (BE-5)", () => {
  it("counts live commitments but excludes dead LPO states", () => {
    expect(OUTSTANDING_COMMITMENT_SQL).toContain(
      "approval_status IN ('APPROVED', 'PENDING_APPROVAL')",
    );
    expect(OUTSTANDING_COMMITMENT_SQL).toContain(
      "status NOT IN ('CANCELLED', 'CLOSED')",
    );
    expect(OUTSTANDING_COMMITMENT_SQL).toContain(
      "approval_status = 'PENDING_APPROVAL'",
    );
  });

  it("passes wbs then tenant as query params, in order", async () => {
    const query = jest.fn(async () => [{ total: "123.5" }]);
    const total = await queryOutstandingCommitment({ query } as any, "w1", "t1");
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0] as unknown as [string, string[]];
    expect(sql).toBe(OUTSTANDING_COMMITMENT_SQL);
    expect(params).toEqual(["w1", "t1"]);
    expect(total).toBe(123.5);
  });

  it("treats missing totals as zero instead of NaN", async () => {
    const query = jest.fn(async () => [{}]);
    await expect(
      queryOutstandingCommitment({ query } as any, "w1", "t1"),
    ).resolves.toBe(0);
  });
});
