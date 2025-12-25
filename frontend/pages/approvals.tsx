import React from 'react';
import SecuredLayout from '../../components/Layout/SecuredLayout';

const ApprovalsPage: React.FC = () => {
  return (
    <SecuredLayout>
      <div className="text-white">
        <h1 className="text-2xl font-bold">Approvals</h1>
        <p>This is a placeholder for the Approvals page.</p>
      </div>
    </SecuredLayout>
  );
};

export default ApprovalsPage;
