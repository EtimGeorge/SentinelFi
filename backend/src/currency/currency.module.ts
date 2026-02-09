import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';
import { CurrencyExchangeRateEntity } from './currency.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CurrencyExchangeRateEntity]),
    ScheduleModule.forRoot(), // Enable cron scheduling
  ],
  controllers: [CurrencyController],
  providers: [CurrencyService],
  exports: [CurrencyService], // Export for use in other modules
})
export class CurrencyModule {}
