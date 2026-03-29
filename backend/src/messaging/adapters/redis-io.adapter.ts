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

    try {
      const pubClient = new Redis(redisUrl);
      const subClient = pubClient.duplicate();

      pubClient.on("error", (err) =>
        this.logger.error("Redis Pub Client Error", err),
      );
      subClient.on("error", (err) =>
        this.logger.error("Redis Sub Client Error", err),
      );

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log(
        `Connected to Redis for Socket.io horizontal scaling at ${redisUrl}`,
      );
    } catch (err) {
      this.logger.error(
        "Failed to connect to Redis, falling back to in-memory adapter",
        err,
      );
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
