import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like } from "typeorm";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { UserEntity } from "../auth/user.entity";
import { LiveExpenseEntity } from "../wbs/live-expense.entity";

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(WbsBudgetEntity)
    private wbsRepository: Repository<WbsBudgetEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(LiveExpenseEntity)
    private expenseRepository: Repository<LiveExpenseEntity>,
  ) {}

  async search(query: string) {
    const wbsItems = await this.wbsRepository.find({
      where: [
        { wbs_code: Like(`%${query}%`) },
        { description: Like(`%${query}%`) },
      ],
    });

    const users = await this.userRepository.find({
      where: { email: Like(`%${query}%`) },
    });

    const expenses = await this.expenseRepository.find({
      where: { item_description: Like(`%${query}%`) },
    });

    return {
      wbsItems,
      users,
      expenses,
    };
  }
}
