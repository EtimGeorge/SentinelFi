import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe, Logger } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { ConfigService } from "@nestjs/config";
import { Request, Response, NextFunction } from "express";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT") || 3001;
  const frontendUrl =
    configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
  const nodeEnv = configService.get<string>("NODE_ENV") || "development";

  // CRITICAL FIX 1: Enhanced CORS configuration for cookie-based auth
  app.enableCors({
    origin: frontendUrl, // Explicitly allow frontend origin
    credentials: true, // MUST be true for cookies to work
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"], // Expose Set-Cookie header to client
  });

  // CRITICAL FIX 2: Cookie parser MUST be applied BEFORE any authentication
  // This ensures cookies are parsed into req.cookies before JwtStrategy runs
  app.use(cookieParser());

  // Global API prefix
  app.setGlobalPrefix("api/v1");

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ADVANCED FEATURE (UPGRADED): Conditional request logging middleware for debugging
  if (nodeEnv === "development") {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const timestamp = new Date().toISOString();
      logger.log(`[${timestamp}] ${req.method} ${req.url}`);
      // To avoid excessive logging, we'll log only the presence of cookies/headers, not their full values.
      logger.debug(
        `Cookies present: ${JSON.stringify(Object.keys(req.cookies || {}))}`,
      );
      logger.debug(
        `Authorization header present: ${!!req.headers["authorization"]}`,
      );
      next();
    });
    logger.log("Development request logging is enabled.");
  }

  // Listen on localhost (not 127.0.0.1 for Windows compatibility)
  await app.listen(port, "localhost");

  logger.log(
    `🚀 SentinelFi API is running on: http://localhost:${port}/api/v1`,
  );
  logger.log(`📡 CORS enabled for: ${frontendUrl}`);
  logger.log(`🍪 Cookie-based authentication active`);
}

bootstrap();
