// Initial entry point for the SentinelFi API
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";
import { DataSource } from "typeorm"; // Import DataSource
import { INestApplication } from "@nestjs/common"; // New import
import { WsAdapter } from "@nestjs/platform-ws"; // New import


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api/v1");

  // CRITICAL FIX: Add Cookie Parser Middleware
  app.use(cookieParser());

  // NEW: Configure NestJS to use the ws (WebSocket) adapter
  app.useWebSocketAdapter(new WsAdapter(app));

  
  // The TenantInterceptor has been removed in favor of the TenancyMiddleware,
  // which is correctly scoped in AppModule.

  // FINAL CORS: Ensure correct setup for cookie exchange
  app.enableCors({
    origin: "http://localhost:3000",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS", // Include OPTIONS for pre-flight checks
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  // CRITICAL FIX: Explicitly listen on localhost to avoid cookie domain mismatch with frontend during local dev.
  await app.listen(port, "localhost"); // Changed from "127.0.0.1" to "localhost"
  console.log(`SentinelFi API is running on: http://localhost:${port}/api/v1`); // Updated log message
}
bootstrap();