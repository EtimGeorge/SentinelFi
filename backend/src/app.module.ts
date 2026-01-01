import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { WbsBudgetEntity } from "./wbs/wbs-budget.entity";
import { LiveExpenseEntity } from "./wbs/live-expense.entity";
import { WbsModule } from "./wbs/wbs.module";
import { AuthModule } from "./auth/auth.module";
import { UserEntity } from "./auth/user.entity";
import { WbsCategoryEntity } from "./wbs/wbs-category.entity";
import { TenantModule } from "./tenants/tenant.module";
import { TenantEntity } from "./tenants/tenant.entity";
import { SearchModule } from "./search/search.module";
import { TenancyMiddleware } from './common/middleware/tenancy.middleware';
import { NotificationsModule } from './notifications/notifications.module'; // NEW: Import NotificationsModule

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>("DATABASE_URL");
        if (!databaseUrl) {
          throw new Error("DATABASE_URL environment variable is not set");
        }
        return {
          type: "postgres",
          url: databaseUrl,
          ssl: databaseUrl.includes("neon.tech"),
          entities: [
            WbsBudgetEntity,
            LiveExpenseEntity,
            UserEntity,
            WbsCategoryEntity,
            TenantEntity,
          ],
          synchronize: false,
          logging: true,
        };
      },
    }),
    WbsModule,
    AuthModule,
    TenantModule,
    SearchModule,
    NotificationsModule, // NEW: Add NotificationsModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenancyMiddleware)
      .exclude('auth/(.*)') // Exclude all auth routes from this middleware
      .forRoutes('*'); // Apply TenancyMiddleware to all other routes
  }
}
