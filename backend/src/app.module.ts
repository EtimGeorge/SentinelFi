import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { ConfigModule } from '@nestjs/config'; // <-- New Import
import { WbsBudgetEntity } from './wbs/wbs-budget.entity';
import { LiveExpenseEntity } from './wbs/live-expense.entity';
import { WbsModule } from './wbs/wbs.module';
import { AuthModule } from './auth/auth.module'; // <-- New Import (Module structure to be created next)
import { UserEntity } from './auth/user.entity'; // <-- New Import (Entity to be created next)

// Database connection configuration using the environment variable
const dbConfig: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL, 
  ssl: process.env.NODE_ENV === 'production', 
  entities: [
    WbsBudgetEntity,
    LiveExpenseEntity,
    UserEntity, // <-- New Entity Added
  ],
  synchronize: false, 
  logging: true,
};

@Module({
  imports: [
    // Must be first: Loads environment variables from .env file
    ConfigModule.forRoot({ isGlobal: true }), 
    
    TypeOrmModule.forRoot(dbConfig), 
    WbsModule,
    AuthModule, // <-- New Feature Module Added
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
