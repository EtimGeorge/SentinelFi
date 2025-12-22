import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config'; // <-- Import ConfigService
import { WbsBudgetEntity } from './wbs/wbs-budget.entity';
import { LiveExpenseEntity } from './wbs/live-expense.entity';
import { WbsModule } from './wbs/wbs.module';
import { AuthModule } from './auth/auth.module';
import { UserEntity } from './auth/user.entity';

@Module({
  imports: [
    // ConfigModule must be loaded first to make environment variables available globally
    ConfigModule.forRoot({ isGlobal: true }), 
    
    // Use forRootAsync to ensure ConfigService is available for injection
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], // Import ConfigModule here as well
      inject: [ConfigService], // Inject ConfigService
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL environment variable is not set');
        }
        return {
          type: 'postgres',
          url: databaseUrl,
          // Conditionally enable SSL for Neon databases
          ssl: databaseUrl.includes('neon.tech'),
          entities: [
            WbsBudgetEntity,
            LiveExpenseEntity,
            UserEntity,
          ],
          synchronize: false, 
          logging: true,
        };
      },
    }), 
    WbsModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
