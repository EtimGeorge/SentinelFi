// Initial entry point for the SentinelFi API
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
const cookieParser = require('cookie-parser'); 

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  // CRITICAL FIX: Add Cookie Parser Middleware
  app.use(cookieParser()); 
  
  // FINAL CORS: Ensure correct setup for cookie exchange
  app.enableCors({
    origin: 'http://localhost:3001', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // Include OPTIONS for pre-flight checks
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  // CRITICAL FIX: Explicitly listen on 127.0.0.1 to avoid external access issues and ensure local network routing works.
  await app.listen(port, '127.0.0.1'); 
  console.log(`SentinelFi API is running on: http://127.0.0.1:${port}/api/v1`);
}
bootstrap();