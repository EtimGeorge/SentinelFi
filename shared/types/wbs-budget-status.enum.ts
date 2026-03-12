export enum WbsBudgetStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RECALLED = 'recalled',  // Approver revoked their own approval (reverts to PENDING for re-review)
}
