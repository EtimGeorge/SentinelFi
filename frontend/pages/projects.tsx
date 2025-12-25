import React, { useState, useEffect } from 'react';
import SecuredLayout from '../../components/Layout/SecuredLayout';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';

const ProjectsPage: React.FC = () => {
  const api = useSecuredApi();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/v1/wbs/budget/rollup');
        setProjects(response.data);
      } catch (err) {
        setError('Failed to fetch project data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [api]);

  if (loading) {
    return (
      <SecuredLayout>
        <div className="text-center text-white">Loading Projects...</div>
      </SecuredLayout>
    );
  }

  if (error) {
    return (
      <SecuredLayout>
        <div className="text-center text-red-500">{error}</div>
      </SecuredLayout>
    );
  }

  return (
    <SecuredLayout>
      <div className="text-white">
        <h1 className="text-3xl font-bold mb-6">Projects Overview</h1>
        <div className="bg-brand-charcoal p-6 rounded-lg shadow-lg">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="p-3">Project Name</th>
                <th className="p-3">WBS ID</th>
                <th className="p-3">Total Budget</th>
                <th className="p-3">Total Actuals</th>
                <th className="p-3">Variance</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project, index) => (
                <tr key={index} className="border-b border-gray-800 hover:bg-gray-700/50">
                  <td className="p-3">{project.wbsName}</td>
                  <td className="p-3">{project.wbsId}</td>
                  <td className="p-3">${project.totalBudget.toLocaleString()}</td>
                  <td className="p-3">${project.totalActuals.toLocaleString()}</td>
                  <td className={`p-3 ${project.variance >= 0 ? 'text-alert-positive' : 'text-alert-critical'}`}>
                    {project.variance.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SecuredLayout>
  );
};

export default ProjectsPage;
