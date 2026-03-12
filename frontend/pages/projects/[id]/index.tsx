import { useEffect } from 'react';
import { useRouter } from 'next/router';

const ProjectIndex = () => {
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (id) {
      router.replace(`/projects/${id}/overview`);
    }
  }, [id, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-brand-dark text-white">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading project overview...</p>
      </div>
    </div>
  );
};

export default ProjectIndex;
