import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SuperAdminController } from "./superadmin.controller";
import { SuperAdminService } from "./superadmin.service";
import { TenantEntity } from "../tenants/tenant.entity";
import { SettingsEntity } from "../settings/settings.entity";
import { AuthModule } from "../auth/auth.module";
import { TenantModule } from "../tenants/tenant.module";
import { UserEntity } from "../auth/user.entity";
import { AuditModule } from "../audit/audit.module";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EmailModule } from "../email/email.module";
import * as ms from "ms";

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantEntity, UserEntity, SettingsEntity]),
    AuthModule,
    TenantModule,
    AuditModule,
    ConfigModule,
    EmailModule,
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => {
        const expiresInDuration =
          configService.get<string>("JWT_EXPIRATION_TIME") || "3600s";

        const expiresInMs = (ms as any).default(expiresInDuration);

        return {
          secret:
            configService.get<string>("JWT_SECRET") ??
            configService.get<string>("JWT_SECRET_KEY"),
          signOptions: {
            expiresIn: expiresInMs / 1000,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
