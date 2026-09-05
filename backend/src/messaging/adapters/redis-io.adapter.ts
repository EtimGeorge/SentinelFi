import { IoAdapter } from "@nestjs/platform-socket.io";
import { ServerOptions } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { Logger } from "@nestjs/common";
import { INestApplicationContext } from "@nestjs/common";

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private readonly logger = new Logger(RedisIoAdapter.name);

  constructor(app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(redisUrl?: string): Promise<void> {
    if (!redisUrl) {
      this.logger.warn(
        "REDIS_URL not provided. Falling back to in-memory Socket.io adapter. This is fine for local dev, but will not support horizontal scaling in production.",
      );
      return;
    }

    let pubClient: Redis | null = null;
    let subClient: Redis | null = null;

    try {
      // Fail-soft connection: bounded retries and no infinite reconnect spam so
      // that an unreachable Redis degrades to the in-memory adapter instead of
      // flooding logs / blocking startup.
      pubClient = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 2500,
        retryStrategy: () => null,
      });
      subClient = pubClient.duplicate();

      pubClient.on("error", () => {});
      subClient.on("error", () => {});

      await Promise.all([pubClient.connect(), subClient.connect()]);

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log(
        `Connected to Redis for Socket.io horizontal scaling at ${redisUrl}`,
      );
    } catch (err) {
      // Degrade gracefully — ignored errors already swallowed above.
      this.logger.warn(
        "Redis unavailable for Socket.io; falling back to the in-memory adapter. Horizontal scaling is disabled.",
      );
      for (const client of [pubClient, subClient]) {
        if (client) {
          try {
            client.disconnect();
          } catch {
            /* noop */
          }
        }
      }
      this.adapterConstructor = null;
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
