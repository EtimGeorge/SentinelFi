import { PartialType } from "@nestjs/mapped-types";
import { CreateOperationalBudgetDto } from "./create-operational-budget.dto";

export class UpdateOperationalBudgetDto extends PartialType(
  CreateOperationalBudgetDto,
) {}
