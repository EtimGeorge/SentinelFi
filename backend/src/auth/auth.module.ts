import { Module, ValidationPipe, Logger } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "./user.entity";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./jwt.strategy";
import * as ms from "ms";
import { SeedTestUsersService } from "./seed-test-users.service";

// Throttler imports
import { ThrottlerModule, ThrottlerGuard, ThrottlerModuleOptions } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    PassportModule.register({ defaultStrategy: "jwt" }),
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
    // ThrottlerModule configuration
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): ThrottlerModuleOptions => ({ // Return a single options object
        throttlers: [ // This object contains the throttlers array
          {
            ttl: Number(config.get('THROTTLE_TTL') || 60), // Use ttl
            limit: Number(config.get('THROTTLE_LIMIT') || 10), // Use limit
          },
        ],
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    SeedTestUsersService,
    // Global ThrottlerGuard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: "APP_PIPE",
      useValue: new ValidationPipe({ whitelist: true }),
    },
    Logger, // Add Logger as a provider for injection
  ],
  exports: [PassportModule, JwtStrategy, TypeOrmModule, JwtModule],
})
export class AuthModule {}
