import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe, Logger } from "@nestjs/common";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import hpp from "hpp";
import { ConfigService } from "@nestjs/config";
import { Request, Response, NextFunction } from "express";
import { DataSource } from "typeorm";
import { DatabaseConfig } from "./common/config/database.config";
import { RedisIoAdapter } from "./messaging/adapters/redis-io.adapter";
async function bootstrap() {
  const logger = new Logger("Bootstrap");

  try {
    const app = await NestFactory.create(AppModule, {
      // Per senior dev, enable graceful shutdown hooks and abort on error
      abortOnError: false,
    });

    // Enable NestJS lifecycle shutdown hooks
    app.enableShutdownHooks();

    const configService = app.get(ConfigService);
    const port = configService.get<number>("PORT") || 3001;
    const frontendUrl =
      configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const nodeEnv = configService.get<string>("NODE_ENV") || "development";

    app.enableCors({
      origin: frontendUrl,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Correlation-ID", "X-Request-ID"],
      exposedHeaders: ["Set-Cookie", "X-Correlation-ID", "X-Request-ID"],
    });

    app.use(cookieParser());

    // Security middleware: helmet (HSTS, CSP, X-Frame-Options, etc.) + hpp (HTTP parameter pollution)
    app.use(helmet({
      contentSecurityPolicy: false, // Disable CSP in dev; enable per-route in production
      crossOriginEmbedderPolicy: false,
    }));
    app.use(hpp());

    app.setGlobalPrefix("api/v1");
    // Register the Socket.io adapter (with optional Redis for scaling)
    const redisIoAdapter = new RedisIoAdapter(app);
    const redisUrl = configService.get<string>("REDIS_URL");
    await redisIoAdapter.connectToRedis(redisUrl);
    app.useWebSocketAdapter(redisIoAdapter);

    // Correlation interceptor is registered globally in AppModule via APP_INTERCEPTOR provider

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const { AllExceptionsFilter } =
      await import("./common/filters/all-exceptions.filter");
    app.useGlobalFilters(new AllExceptionsFilter());

    if (nodeEnv === "development") {
      app.use((req: Request, res: Response, next: NextFunction) => {
        logger.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        next();
      });
      logger.log("Development request logging is enabled.");
    }

    // --- SENIOR DEV ENHANCEMENTS ---

    // 1. Get DataSource for health monitoring and shutdown
    const dataSource = app.get(DataSource);

    // 2. Initialize database health monitoring
    DatabaseConfig.initializeHealthMonitoring(dataSource);

    // 3. Graceful shutdown handlers
    const gracefulShutdown = async (signal: string) => {
      logger.log(`${signal} received, starting graceful shutdown...`);

      try {
        // Stop accepting new requests
        await app.close();

        // Shutdown database connections
        await DatabaseConfig.shutdown(dataSource);

        logger.log("✓ Graceful shutdown completed");
        process.exit(0);
      } catch (error) {
        logger.error("Error during graceful shutdown:", error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // 4. Uncaught exception handler
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception:", error);
      // It's often recommended to exit on uncaught exceptions
      gracefulShutdown("UNCAUGHT_EXCEPTION").finally(() => process.exit(1));
    });

    // 5. Unhandled promise rejection handler
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection at:", promise, "reason:", reason);
    });

    // --- END SENIOR DEV ENHANCEMENTS ---

    await app.listen(port, "0.0.0.0");

    logger.log(
      `🚀 SentinelFi API is running on: http://localhost:${port}/api/v1`,
    );
    logger.log(`📡 CORS enabled for: ${frontendUrl}`);
    logger.log(`🍪 Cookie-based authentication active`);
    logger.log(`📊 Health monitoring active`);
  } catch (error) {
    logger.error("Failed to start application:", error);
    process.exit(1);
  }
}

bootstrap();
