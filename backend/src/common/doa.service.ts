import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { Role } from "@shared/types/role.enum";
import { UserEntity } from "../auth/user.entity";
import { UserPayload } from "@shared/types/user";
import { CurrencyService } from "../currency/currency.service";

export enum DOATier {
  TIER_1_OFFICER = 1,
  TIER_2_MANAGER = 2,
  TIER_3_DIRECTOR = 3,
  TIER_4_EXECUTIVE = 4,
}

@Injectable()
export class DOAService {
  /**
   * Thresholds for approval authority
   */
  private readonly THRESHOLDS: Record<string, number> = {
    [Role.FinanceOfficer]: 0, // Can only prepare/submit
    [Role.AdminOfficer]: 0,
    [Role.ProjectManager]: 20000, // Up to $20k
    [Role.FinanceManager]: 20000,
    [Role.AdminManager]: 20000,
    [Role.CFO]: 100000, // Up to $100k
    [Role.AdminDirector]: 100000,
    [Role.OperationalDirector]: 100000,
    [Role.TechnicalDirector]: 100000, // Added TechnicalDirector
    [Role.CEO]: Infinity, // Unlimited
    [Role.SuperAdmin]: Infinity,
  };

  constructor(private readonly currencyService: CurrencyService) {}

  /**
   * Determine the required DOA Tier based on amount
   */
  getRequiredTier(amountInUSD: number): DOATier {
    if (amountInUSD <= 20000) return DOATier.TIER_2_MANAGER;
    if (amountInUSD <= 100000) return DOATier.TIER_3_DIRECTOR;
    return DOATier.TIER_4_EXECUTIVE;
  }

  /**
   * Check if a user has sufficient authority for a given amount
   */
  async canApprove(
    user: UserPayload | UserEntity,
    amount: number,
    currency: string = "USD",
  ): Promise<boolean> {
    const amountInUSD = (
      await this.currencyService.convertAmount(amount, currency, "USD")
    ).convertedAmount;

    const roles = "roles" in user ? user.roles : [];
    if (!roles || !Array.isArray(roles) || roles.length === 0) return false;

    // Get the highest limit among all assigned roles
    const roleNames = roles
      .map((r) => {
        if (!r) return "";
        return typeof r === "string" ? r : r.name;
      })
      .filter((name) => !!name);

    if (roleNames.length === 0) return false;
    const limits = roleNames.map((name) => this.THRESHOLDS[name] ?? 0);
    const maxLimit = Math.max(...limits);

    return maxLimit >= amountInUSD;
  }

  /**
   * Validate approval authority or throw
   */
  async validateAuthority(
    user: UserPayload | UserEntity,
    amount: number,
    currency: string = "USD",
  ) {
    const { convertedAmount: amountInUSD } =
      await this.currencyService.convertAmount(amount, currency, "USD");

    const hasAuthority = await this.canApprove(user, amount, currency);
    if (!hasAuthority) {
      const required = this.getRequiredTier(amountInUSD);
      const currencySymbol =
        currency === "NGN" ? "₦" : currency === "USD" ? "$" : currency;

      throw new ForbiddenException(
        `Insufficient authority. Amount ${currencySymbol}${amount.toLocaleString()} (approx. $${Math.round(amountInUSD).toLocaleString()} USD) requires ${DOATier[required]} or higher.`,
      );
    }
  }

  /**
   * Get target roles for a document that needs approval
   */
  getTargetRoles(amount: number): Role[] {
    if (amount <= 20000) {
      return [
        Role.FinanceManager,
        Role.AdminManager,
        Role.ProjectManager,
        Role.CFO,
        Role.AdminDirector,
        Role.CEO,
      ];
    }
    if (amount <= 100000) {
      return [Role.CFO, Role.AdminDirector, Role.CEO];
    }
    return [Role.CEO];
  }
}
