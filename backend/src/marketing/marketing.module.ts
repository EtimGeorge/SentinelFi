import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MarketingController } from "./marketing.controller";
import { MarketingService } from "./marketing.service";
import { EmailModule } from "../email/email.module";
import { AcademyProgressEntity } from "./academy-progress.entity";

@Module({
  imports: [TypeOrmModule.forFeature([AcademyProgressEntity]), EmailModule],
  controllers: [MarketingController],
  providers: [MarketingService],
  exports: [MarketingService],
})
export class MarketingModule {}
