import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './backend/src/app.module';
import { Logger } from '@nestjs/common';

async function verify() {
  const logger = new Logger('VerifyBoot');
  try {
    logger.log('Starting NestJS boot verification...');
    const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log', 'debug', 'verbose'] });
    logger.log('✓ NestJS Application successfully created!');
    await app.close();
    logger.log('✓ App closed gracefully. Verification PASSED.');
    process.exit(0);
  } catch (e) {
    logger.error('✗ Verification FAILED during boot:', e);
    process.exit(1);
  }
}

verify();
