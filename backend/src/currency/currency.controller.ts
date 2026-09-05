import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { CurrencyService } from "./currency.service";
import {
  ConvertCurrencyDto,
  ConvertCurrencyResponseDto,
  GetExchangeRatesDto,
  GetSupportedCurrenciesDto,
} from "./dto/currency.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "@shared/types/role.enum";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../common/decorators/public.decorator";

@Controller("currency")
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  /**
   * Get list of all supported currencies with metadata.
   * PUBLIC — no auth required (used by public pricing page)
   */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get("supported")
  async getSupportedCurrencies(): Promise<GetSupportedCurrenciesDto> {
    const currencies = await this.currencyService.getSupportedCurrencies();
    return { currencies };
  }

  /**
   * Get current exchange rates for all currencies (relative to USD).
   * PUBLIC — no auth required (used by public pricing page)
   */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get("rates")
  async getExchangeRates(): Promise<GetExchangeRatesDto> {
    return this.currencyService.getExchangeRates();
  }

  /**
   * Convert an amount from one currency to another
   */
  @Post("convert")
  @HttpCode(HttpStatus.OK)
  async convertCurrency(
    @Body() dto: ConvertCurrencyDto,
  ): Promise<ConvertCurrencyResponseDto> {
    const { amount, fromCurrency, toCurrency } = dto;

    const { convertedAmount, rate } = await this.currencyService.convertAmount(
      amount,
      fromCurrency,
      toCurrency,
    );

    return {
      originalAmount: amount,
      convertedAmount,
      fromCurrency,
      toCurrency,
      rate,
      timestamp: new Date(),
    };
  }

  /**
   * Manually trigger exchange rate update (SuperAdmin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post("update-rates")
  @HttpCode(HttpStatus.OK)
  async updateRates(): Promise<{ message: string }> {
    await this.currencyService.updateExchangeRates();
    return { message: "Exchange rates updated successfully" };
  }
}
