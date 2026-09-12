import { useEffect } from 'react';
import { useRouter } from 'next/router';

const WbsManagerRedirect: React.FC = () => {
  const router = useRouter();
  useEffect(() => {
    const { edit, projectId } = router.query;
    const params = new URLSearchParams();
    if (typeof projectId === 'string' && projectId) params.set('projectId', projectId);
    if (typeof edit === 'string' && edit) params.set('edit', edit);
    const qs = params.toString();
    router.replace(`/financials/projects/wbs${qs ? `?${qs}` : ''}`);
  }, [router]);
  return null;
};

export default WbsManagerRedirect;
