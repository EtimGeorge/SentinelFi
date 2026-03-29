export interface BudgetImpactAnalysisDto {
  draftId: string;
  projectId: string;
  projectName: string;

  // Amounts
  draftAmount: number;
  totalApprovedAmount: number;
  totalPendingAmount: number;
  contractValue: number;

  // Impact Sim
  newTotalIfApproved: number;
  remainingContractBuffer: number;
  percentageOfContractValue: number;

  // Tax Analysis
  estimatedVatImpact: number;
  estimatedWhtImpact: number;

  // Risk Intelligence
  volatilityScore: number; // Based on audit logs
  previousRejectionsCount: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  // Context
  categoryName?: string;
}
