import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { UserEntity } from "../auth/user.entity";
import { LiveExpenseEntity } from "../wbs/live-expense.entity";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([WbsBudgetEntity, UserEntity, LiveExpenseEntity]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
