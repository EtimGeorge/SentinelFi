import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { DataSource, Repository } from "typeorm";
import { UserEntity } from "./user.entity";
import { Request } from "express";
import { JwtPayload, UserPayload } from "../common/interfaces/request.interface";

// Utility function to extract the JWT from the cookie
const cookieExtractor = (req: Request) => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies["access_token"];
  }
  return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private usersRepository: Repository<UserEntity>;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource, // Inject the main DataSource
  ) {
    const secret = configService.get<string>("JWT_SECRET_KEY");
    if (!secret) {
      throw new Error(
        "JWT_SECRET_KEY is not defined. Cannot start JWT Strategy.",
      );
    }
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
    // Get a repository that is not tied to the request-scoped query runner
    this.usersRepository = this.dataSource.getRepository(UserEntity);
  }

  async validate(payload: JwtPayload): Promise<UserPayload> {
    // This query will now reliably use the public schema because the repository
    // is derived from the global DataSource, not a request-scoped manager.
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub, is_active: true },
      select: ["id", "email", "role", "tenant_id"],
    });

    if (!user) {
      throw new UnauthorizedException(
        "User no longer active or token invalid.",
      );
    }

    // Return the payload that will be attached to req.user
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
    };
  }
}