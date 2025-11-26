import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, ExtractJwt } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "./user.entity";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>
  ) {
    // CRITICAL FIX: Ensure the secret is defined at runtime (TS2345 fix)
    const secret = configService.get<string>("JWT_SECRET_KEY");
    if (!secret) {
      throw new Error(
        "JWT_SECRET_KEY is not defined in the environment. Cannot start JWT Strategy."
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret, // Pass the validated secret
    });
  }

  async validate(payload: any) {
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub, is_active: true },
      select: ["id", "email", "role"],
    });

    if (!user) {
      throw new UnauthorizedException(
        "User no longer active or token invalid."
      );
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
