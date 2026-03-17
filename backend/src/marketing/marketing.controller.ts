import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { MarketingService } from './marketing.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Public()
  @Post('contact')
  @HttpCode(HttpStatus.OK)
  async handleContactRequest(
    @Body() data: {
      name: string;
      email: string;
      company: string;
      message: string;
      interests: string[];
    },
  ) {
    return this.marketingService.processContactRequest(data);
  }
}
