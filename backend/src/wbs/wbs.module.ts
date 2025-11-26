import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WbsBudgetEntity } from './wbs-budget.entity';
import { LiveExpenseEntity } from './live-expense.entity';
import { WbsService } from './wbs.service'; // Will be created next
import { WbsController } from './wbs.controller'; // Will be created next

@Module({
  imports: [
    // This makes the entities available to the WbsService within this module
    TypeOrmModule.forFeature([WbsBudgetEntity, LiveExpenseEntity]),
  ],
  controllers: [WbsController],
  providers: [WbsService],
  exports: [WbsService], // Export the service if other modules need to use it
})
export class WbsModule {}