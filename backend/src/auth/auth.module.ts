import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "./user.entity";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./jwt.strategy";
import * as ms from "ms";
import { SeedTestUsersService } from "./seed-test-users.service"; // <-- New Import

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({

      useFactory: async (configService: ConfigService) => {
        const expiresInDuration =
          configService.get<string>("JWT_EXPIRATION_TIME") || "3600s";

        // FINAL FIX: Access the .default property to correctly call the function
        const expiresInMs = (ms as any).default(expiresInDuration);

        return {
          secret: configService.get<string>("JWT_SECRET_KEY"),
          signOptions: {
            // Use seconds (numeric) for expiresIn which is accepted by the library
            expiresIn: expiresInMs / 1000,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  // MODIFICATION: Include the Seeder Service as a provider
  providers: [AuthService, JwtStrategy, SeedTestUsersService],
  exports: [PassportModule, JwtStrategy, TypeOrmModule, JwtModule],
})
export class AuthModule {}
