import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe, Logger } from "@nestjs/common";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import hpp from "hpp";
import { ConfigService } from "@nestjs/config";
import { Request, Response, NextFunction } from "express";
import { json } from "express";
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

    // CORS: FRONTEND_URL is canonical; FRONTEND_ALLOWED_ORIGINS adds a
    // comma-separated allowlist (e.g. a staging origin or the Socket.io
    // origin). Previously `origin` was a single string, so a second legitimate
    // frontend could never be allowed.
    const allowedOrigins = Array.from(
      new Set(
        [
          frontendUrl,
          ...(configService.get<string>("FRONTEND_ALLOWED_ORIGINS") || "")
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean),
        ].map((o) => o.replace(/\/+$/, "")),
      ),
    );

    // Dev ergonomics: `localhost` and `127.0.0.1` are the same machine but
    // different browser origins. Accepting both in non-production prevents a
    // confusing CSRF/CORS rejection when a developer happens to open the app
    // via the other hostname. Production stays strict to the configured list.
    if (nodeEnv !== "production") {
      for (const origin of [...allowedOrigins]) {
        try {
          const url = new URL(origin);
          if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
            const aliasHost =
              url.hostname === "localhost" ? "127.0.0.1" : "localhost";
            allowedOrigins.push(
              `${url.protocol}//${aliasHost}${url.port ? `:${url.port}` : ""}`,
            );
          }
        } catch {
          // A non-URL entry (e.g. a custom scheme) is used verbatim.
        }
      }
    }

    app.enableCors({
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => {
        // Non-browser clients send no Origin; allow them (they can't be
        // exploited via a victim's cookies anyway).
        if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ""))) {
          return callback(null, true);
        }
        // Deny by omitting CORS headers (not by throwing — that would 500).
        return callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Correlation-ID", "X-Request-ID"],
      exposedHeaders: ["Set-Cookie", "X-Correlation-ID", "X-Request-ID"],
    });

    app.use(cookieParser());

    // CSRF defense: SameSite=Lax on the access cookie is the primary control,
    // but it is defense-in-depth to additionally verify Origin/Referer on
    // state-changing requests that authenticate via *cookie*. Bearer-token
    // clients (and webhooks, which carry no cookie) are unaffected, so this
    // can't break mobile/API integrations. csurf is deprecated; origin
    // validation is the recommended modern equivalent for same-origin SPAs.
    const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (SAFE_METHODS.has(req.method)) return next();
      const cookieAuth = Boolean((req as any).cookies?.access_token);
      if (!cookieAuth) return next();

      const origin = req.get("origin");
      const referer = req.get("referer");
      let source: string | null = null;
      if (origin) {
        source = origin;
      } else if (referer) {
        try {
          source = new URL(referer).origin;
        } catch {
          source = null;
        }
      }
      // Browsers attach Origin to cross-site state-changing requests. If it is
      // absent this is not a cross-site browser request; SameSite still covers
      // it. Reject only an explicitly disallowed source.
      if (source && !allowedOrigins.includes(source.replace(/\/+$/, ""))) {
        logger.warn(
          `[CSRF] Blocked ${req.method} ${req.originalUrl} from origin ${source} (cookie auth)`,
        );
        res.status(403).json({
          statusCode: 403,
          code: "CSRF_ORIGIN_MISMATCH",
          message: "Cross-site request blocked.",
        });
        return;
      }
      next();
    });

    // Capture rawBody for webhook HMAC verification (Paystack needs raw string, PayPal needs raw + headers)
    app.use(
      json({
        limit: "100kb",
        verify: (req: any, _res, buf) => {
          if (buf && buf.length) {
            req.rawBody = buf.toString("utf8");
          }
        },
      }),
    );

    // Security middleware: helmet (HSTS, CSP, X-Frame-Options, etc.) + hpp (HTTP parameter pollution)
    const isProd = nodeEnv === "production";
    app.use(helmet({
      contentSecurityPolicy: isProd ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", frontendUrl],
          imgSrc: ["'self'", "data:", "https:"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      } : false,
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: "no-referrer" },
      strictTransportSecurity: isProd
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : undefined,
    }));
    // helmet v8 does not set Permissions-Policy; emit it explicitly (off for a
    // data/ERP surface — no camera/mic/geo/payment, fullscreen only self).
    app.use((_req: Request, res: Response, next: NextFunction) => {
      res.setHeader(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)",
      );
      next();
    });
    app.use(hpp());
    // Trust proxy for correct IP behind Next.js proxy / load balancer
    const httpAdapter = app.getHttpAdapter();
    const instance: any = httpAdapter.getInstance();
    if (instance && typeof instance.set === "function") {
      instance.set("trust proxy", 1);
    }

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

    // OpenAPI/Swagger — dev & staging only; never exposed in production.
    // SWAGGER_ENABLED forces it on/off; default = enabled outside production.
    const swaggerOverride = configService.get<string>("SWAGGER_ENABLED");
    const swaggerEnabled = swaggerOverride
      ? swaggerOverride === "true"
      : !isProd;
    if (swaggerEnabled) {
      const { DocumentBuilder, SwaggerModule } = await import("@nestjs/swagger");
      const config = new DocumentBuilder()
        .setTitle("SentinelFi API")
        .setDescription("SentinelFi multi-tenant ERP REST API")
        .setVersion("1.0.0")
        .addBearerAuth(
          { type: "http", scheme: "bearer", bearerFormat: "JWT", in: "header" },
          "access-token",
        )
        .build();
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup("api/v1/docs", app, document, {
        swaggerOptions: { persistAuthorization: true },
      });
      logger.log("📖 Swagger UI available at /api/v1/docs");
    }

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
