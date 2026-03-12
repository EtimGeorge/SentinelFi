import { useEffect } from 'react';
import { useRouter } from 'next/router';

const WbsManagerRedirect: React.FC = () => {
  const router = useRouter();
  useEffect(() => {
    const { edit } = router.query;
    const target = edit ? `/financials/projects/wbs?edit=${edit}` : '/financials/projects/wbs';
    router.replace(target);
  }, [router]);
  return null;
};

export default WbsManagerRedirect;
