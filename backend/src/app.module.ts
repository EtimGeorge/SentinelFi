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
import { TenantService } from "./tenants/tenant.service"; // Import TenantService

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
  ],
  controllers: [],
  providers: [], // Remove TenantService from AppModule providers
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenancyMiddleware)
      .forRoutes('*'); // Apply TenancyMiddleware to all routes
  }
}