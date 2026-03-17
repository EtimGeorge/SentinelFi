import { Module } from '@nestjs/common';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [MarketingController],
  providers: [MarketingService],
  exports: [MarketingService],
})
export class MarketingModule {}
