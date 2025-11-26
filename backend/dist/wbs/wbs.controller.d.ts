import { WbsService } from './wbs.service';
import { CreateWbsBudgetDto } from './dto/create-wbs-budget.dto';
import { CreateLiveExpenseDto } from './dto/create-live-expense.dto';
import { WbsBudgetEntity } from './wbs-budget.entity';
export declare class WbsController {
    private readonly wbsService;
    constructor(wbsService: WbsService);
    createDraft(createWbsDto: CreateWbsBudgetDto): Promise<WbsBudgetEntity>;
    logLiveExpense(expenseDto: CreateLiveExpenseDto): Promise<import("./live-expense.entity").LiveExpenseEntity>;
    getAllWbsWithRollup(): Promise<any[]>;
}
