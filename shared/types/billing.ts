export enum InvoiceStatus {
  Paid = 'paid',
  Pending = 'pending',
  Overdue = 'overdue',
}

export interface InvoiceDto {
  id: string;
  tenantName: string;
  amount: number;
  date: Date;
  status: InvoiceStatus;
}

export interface BillingOverviewDto {
  totalMrr: number;
  activeSubscriptions: number;
  pendingInvoices: number;
  mrrGrowthPercentage: number;
  subscriptionGrowthPercentage: number;
}
