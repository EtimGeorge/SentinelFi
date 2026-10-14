import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CreateOperationalExpenseDto } from "./create-operational-expense.dto";
import { UpdateOperationalExpenseDto } from "./update-operational-expense.dto";
import { LogPayrollEntryDto } from "./log-payroll-entry.dto";

const FORBID = { whitelist: true, forbidNonWhitelisted: true };

describe("OPEX DTO hardening — workflow fields are not client-settable", () => {
  const validExpense = {
    operational_budget_category_id: "11111111-1111-4111-8111-111111111111",
    item_description: "Diesel top-up",
    amount: 1000,
    expense_date: new Date(),
  };

  it("rejects a client-supplied `status` on expense creation", async () => {
    const dto = plainToInstance(CreateOperationalExpenseDto, {
      ...validExpense,
      status: "APPROVED",
    });
    const errors = await validate(dto, FORBID);
    expect(errors.some((e) => e.property === "status")).toBe(true);
  });

  it("rejects a client-supplied `variance_flag` on expense creation", async () => {
    const dto = plainToInstance(CreateOperationalExpenseDto, {
      ...validExpense,
      variance_flag: "NO_VARIANCE",
    });
    const errors = await validate(dto, FORBID);
    expect(errors.some((e) => e.property === "variance_flag")).toBe(true);
  });

  it("accepts a clean expense payload", async () => {
    const dto = plainToInstance(CreateOperationalExpenseDto, validExpense);
    const errors = await validate(dto, FORBID);
    expect(errors).toHaveLength(0);
  });

  it("rejects a client-supplied `variance_flag` on expense update", async () => {
    const dto = plainToInstance(UpdateOperationalExpenseDto, {
      amount: 500,
      variance_flag: "NO_VARIANCE",
    });
    const errors = await validate(dto, FORBID);
    expect(errors.some((e) => e.property === "variance_flag")).toBe(true);
  });

  it("rejects a client-supplied `status` on payroll logging", async () => {
    const dto = plainToInstance(LogPayrollEntryDto, {
      operational_budget_id: "22222222-2222-2222-2222-222222222222",
      employee_name: "Ada Okafor",
      base_salary: 500000,
      pay_period_start: new Date(),
      pay_period_end: new Date(),
      payment_date: new Date(),
      status: "PENDING",
    });
    const errors = await validate(dto, FORBID);
    expect(errors.some((e) => e.property === "status")).toBe(true);
  });
});
