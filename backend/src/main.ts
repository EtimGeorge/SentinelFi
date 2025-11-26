// Initial entry point for the SentinelFi API
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Creating the NestJS application instance
  const app = await NestFactory.create(AppModule);

  // Apply global configurations
  app.setGlobalPrefix('api/v1'); // Standard API versioning
  
  // CORS enabled for the Next.js frontend running on a different port
  app.enableCors({
    origin: 'http://localhost:3001', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`SentinelFi API is running on: http://localhost:${port}/api/v1`);
}
bootstrap();