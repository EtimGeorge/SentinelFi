import { Repository } from 'typeorm';
import { WbsBudgetEntity } from './wbs-budget.entity';
import { LiveExpenseEntity } from './live-expense.entity';
import { CreateWbsBudgetDto } from './dto/create-wbs-budget.dto';
import { CreateLiveExpenseDto } from './dto/create-live-expense.dto';
export declare class WbsService {
    private wbsRepository;
    private expenseRepository;
    constructor(wbsRepository: Repository<WbsBudgetEntity>, expenseRepository: Repository<LiveExpenseEntity>);
    createWbsBudgetDraft(createWbsDto: CreateWbsBudgetDto): Promise<WbsBudgetEntity>;
    logLiveExpenseEntry(expenseDto: CreateLiveExpenseDto, userId: string): Promise<LiveExpenseEntity>;
    findAllWbsBudgetsWithRollup(): Promise<any[]>;
    private calculateLiveExpenseVariance;
}
