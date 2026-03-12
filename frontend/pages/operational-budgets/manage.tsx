import { useEffect } from 'react';
import { useRouter } from 'next/router';

const OpBudgetRedirect: React.FC = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/financials/operations/manage');
  }, [router]);
  return null;
};

export default OpBudgetRedirect;
