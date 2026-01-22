import { Module, ValidationPipe, Logger } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "./user.entity";
import { RoleEntity } from "./role.entity"; // Import RoleEntity
import { PermissionEntity } from "./permission.entity"; // Import PermissionEntity
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtStrategy } from "./jwt.strategy";
import * as ms from "ms";
import { InitialSuperAdminSeederService } from "./initial-superadmin-seeder.service";
import { AuditModule } from "../audit/audit.module";
import { TenantRepositoriesModule } from "../tenant-repositories.module"; // Import the new module

@Module({
  imports: [
    TenantRepositoriesModule, // Import the tenant repositories module
    TypeOrmModule.forFeature([UserEntity, RoleEntity, PermissionEntity]), // Add RoleEntity and PermissionEntity
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => {
        const expiresInDuration =
          configService.get<string>("JWT_EXPIRATION_TIME") || "3600s";
        const expiresInMs = (ms as any).default(expiresInDuration);

        return {
          secret: configService.get<string>("JWT_SECRET_KEY"),
          signOptions: {
            expiresIn: expiresInMs / 1000,
          },
        };
      },
      inject: [ConfigService],
    }),
    AuditModule,
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    InitialSuperAdminSeederService,
    {
      provide: "APP_PIPE",
      useValue: new ValidationPipe({ whitelist: true }),
    },
    Logger,
  ],
  exports: [TypeOrmModule, JwtModule, AuthService],
})
export class AuthModule {}