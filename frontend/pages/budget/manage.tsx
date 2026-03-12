import { useEffect } from 'react';
import { useRouter } from 'next/router';

const BudgetManageRedirect: React.FC = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/financials/projects/budgets');
  }, [router]);
  return null;
};

export default BudgetManageRedirect;
