import { DataSource } from "typeorm";
import { DatabaseConfig } from "./database.config";

/**
 * Regression cover for the pool-cascade outage.
 *
 * A single slow report query saturated the pool. The old health check treated
 * "no idle connections" as a dead connection, tripped reconnection, and
 * `destroy()`ed the pool — which aborted the in-flight queries that were about
 * to succeed and left every later caller failing with
 * "Cannot use a pool after calling end on the pool".
 *
 * The fix: a busy pool is reported healthy and is never torn down.
 */
type Mutable = Record<string, unknown>;

/** Resets the static circuit breaker so each test starts closed. */
function closedBreaker() {
  const breaker = {
    canAttemptConnection: jest.fn(() => true),
    recordSuccess: jest.fn(),
    recordFailure: jest.fn(),
    reset: jest.fn(),
    state: "CLOSED",
  };
  (DatabaseConfig as unknown as Mutable).circuitBreaker = breaker;
  return breaker;
}

function fakeDataSource(
  pool: { totalCount: number; idleCount: number; waitingCount: number } | null,
  overrides: Partial<DataSource> = {},
) {
  return {
    isInitialized: true,
    driver: { master: pool },
    query: jest.fn(async () => [{ ping: 1 }]),
    initialize: jest.fn(async () => undefined),
    destroy: jest.fn(async () => undefined),
    ...overrides,
  } as unknown as DataSource & { query: jest.Mock; destroy: jest.Mock };
}

const healthy = { totalCount: 5, idleCount: 3, waitingCount: 0 };
const busy = { totalCount: 5, idleCount: 0, waitingCount: 0 };
const queued = { totalCount: 5, idleCount: 0, waitingCount: 4 };

describe("DatabaseConfig pool saturation handling", () => {
  beforeEach(() => {
    closedBreaker();
    (DatabaseConfig as unknown as Mutable).isReconnecting = false;
    (DatabaseConfig as unknown as Mutable).connectionAttempts = 0;
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("isPoolSaturated", () => {
    const isPoolSaturated = (ds: DataSource) =>
      (
        DatabaseConfig as unknown as Mutable & {
          isPoolSaturated(d: DataSource): boolean;
        }
      ).isPoolSaturated(ds);

    it("is false for a healthy pool with idle connections", () => {
      expect(isPoolSaturated(fakeDataSource(healthy))).toBe(false);
    });

    it("is true when every connection is checked out", () => {
      expect(isPoolSaturated(fakeDataSource(busy))).toBe(true);
    });

    it("is true when callers are queued waiting for a connection", () => {
      expect(isPoolSaturated(fakeDataSource(queued))).toBe(true);
    });

    it("is false for an empty pool (nothing is saturated yet)", () => {
      expect(
        isPoolSaturated(
          fakeDataSource({ totalCount: 0, idleCount: 0, waitingCount: 0 }),
        ),
      ).toBe(false);
    });

    it("is false when no pool exists yet", () => {
      expect(isPoolSaturated(fakeDataSource(null))).toBe(false);
    });

    it("is false, not throwing, when the driver shape is unexpected", () => {
      const ds = { driver: {} } as unknown as DataSource;
      expect(isPoolSaturated(ds)).toBe(false);
    });
  });

  describe("validateConnection", () => {
    it("reports a saturated pool as healthy WITHOUT issuing a ping", async () => {
      const ds = fakeDataSource(busy, {
        query: jest.fn(async (): Promise<any> => {
          throw new Error("must not be called");
        }),
      });

      await expect(DatabaseConfig.validateConnection(ds)).resolves.toBe(true);
      expect(ds.query).not.toHaveBeenCalled();
    });

    it("reports a queued pool as healthy WITHOUT issuing a ping", async () => {
      const ds = fakeDataSource(queued, {
        query: jest.fn(async (): Promise<any> => {
          throw new Error("must not be called");
        }),
      });

      await expect(DatabaseConfig.validateConnection(ds)).resolves.toBe(true);
      expect(ds.query).not.toHaveBeenCalled();
    });

    it("does not record a breaker failure for a saturated pool", async () => {
      const breaker = closedBreaker();
      const ds = fakeDataSource(busy, {
        query: jest.fn(async (): Promise<any> => {
          throw new Error("must not be called");
        }),
      });

      await DatabaseConfig.validateConnection(ds);

      expect(breaker.recordFailure).not.toHaveBeenCalled();
    });

    it("still pings and succeeds for a healthy pool", async () => {
      const ds = fakeDataSource(healthy);
      await expect(DatabaseConfig.validateConnection(ds)).resolves.toBe(true);
      expect(ds.query).toHaveBeenCalledWith("SELECT 1 as ping");
    });

    it("records success against the breaker on a good ping", async () => {
      const breaker = closedBreaker();
      await DatabaseConfig.validateConnection(fakeDataSource(healthy));
      expect(breaker.recordSuccess).toHaveBeenCalled();
    });

    it("records failure when the ping throws", async () => {
      const breaker = closedBreaker();
      const ds = fakeDataSource(healthy, {
        query: jest.fn(async () => {
          throw new Error("connection terminated");
        }),
      });

      await expect(DatabaseConfig.validateConnection(ds)).resolves.toBe(false);
      expect(breaker.recordFailure).toHaveBeenCalled();
    });

    it("records failure when the ping returns an unexpected shape", async () => {
      const breaker = closedBreaker();
      const ds = fakeDataSource(healthy, {
        query: jest.fn(async () => [] as any),
      });

      await expect(DatabaseConfig.validateConnection(ds)).resolves.toBe(false);
      expect(breaker.recordFailure).toHaveBeenCalled();
    });

    it("refuses to validate while the breaker is open", async () => {
      const ds = fakeDataSource(healthy);
      (DatabaseConfig as unknown as Mutable).circuitBreaker = {
        canAttemptConnection: jest.fn(() => false),
        recordSuccess: jest.fn(),
        recordFailure: jest.fn(),
        reset: jest.fn(),
      };

      await expect(DatabaseConfig.validateConnection(ds)).resolves.toBe(false);
      expect(ds.query).not.toHaveBeenCalled();
    });

    it("treats a saturated pool as healthy even while the breaker is open-checked first", async () => {
      // Breaker gate runs first, so an open breaker still wins.
      const ds = fakeDataSource(busy);
      (DatabaseConfig as unknown as Mutable).circuitBreaker = {
        canAttemptConnection: jest.fn(() => false),
        recordSuccess: jest.fn(),
        recordFailure: jest.fn(),
        reset: jest.fn(),
      };

      await expect(DatabaseConfig.validateConnection(ds)).resolves.toBe(false);
    });
  });

  describe("attemptReconnection", () => {
    const attemptReconnection = (ds: DataSource) =>
      (
        DatabaseConfig as unknown as Mutable & {
          attemptReconnection(d: DataSource): Promise<void>;
        }
      ).attemptReconnection(ds);

    it("does NOT destroy a saturated pool", async () => {
      const ds = fakeDataSource(busy);

      await attemptReconnection(ds);

      expect(ds.destroy).not.toHaveBeenCalled();
      expect(ds.initialize).not.toHaveBeenCalled();
    });

    it("does NOT destroy a pool that has callers queued", async () => {
      const ds = fakeDataSource(queued);

      await attemptReconnection(ds);

      expect(ds.destroy).not.toHaveBeenCalled();
    });

    it("leaves the reconnect guard closed so later attempts can run", async () => {
      await attemptReconnection(fakeDataSource(busy));

      expect((DatabaseConfig as unknown as Mutable).isReconnecting).toBe(false);
    });

    it("skips entirely when a reconnection is already in flight", async () => {
      (DatabaseConfig as unknown as Mutable).isReconnecting = true;
      const ds = fakeDataSource(healthy);

      await attemptReconnection(ds);

      expect(ds.destroy).not.toHaveBeenCalled();
    });

    it("proceeds to destroy a pool that is NOT saturated", async () => {
      const ds = fakeDataSource(healthy);

      await attemptReconnection(ds);

      expect(ds.destroy).toHaveBeenCalledTimes(1);
    }, 20000);
  });
});
