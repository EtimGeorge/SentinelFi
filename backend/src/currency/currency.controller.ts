import { Controller, Get, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { ConvertCurrencyDto, ConvertCurrencyResponseDto, GetExchangeRatesDto, GetSupportedCurrenciesDto } from './dto/currency.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('currency')
@UseGuards(JwtAuthGuard)
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  /**
   * Get list of all supported currencies with metadata
   */
  @Get('supported')
  async getSupportedCurrencies(): Promise<GetSupportedCurrenciesDto> {
    const currencies = await this.currencyService.getSupportedCurrencies();
    return { currencies };
  }

  /**
   * Get current exchange rates for all currencies (relative to USD)
   */
  @Get('rates')
  async getExchangeRates(): Promise<GetExchangeRatesDto> {
    return this.currencyService.getExchangeRates();
  }

  /**
   * Convert an amount from one currency to another
   */
  @Post('convert')
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
   * Manually trigger exchange rate update (admin use only)
   */
  @Post('update-rates')
  @HttpCode(HttpStatus.OK)
  async updateRates(): Promise<{ message: string }> {
    await this.currencyService.updateExchangeRates();
    return { message: 'Exchange rates updated successfully' };
  }
}
