import { useEffect } from 'react';
import { useRouter } from 'next/router';

const BudgetRedirect: React.FC = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/financials/projects');
  }, [router]);
  return null;
};

export default BudgetRedirect;
