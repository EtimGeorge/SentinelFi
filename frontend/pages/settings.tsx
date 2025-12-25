import React from 'react';
import SecuredLayout from '../../components/Layout/SecuredLayout';

const SettingsPage: React.FC = () => {
  return (
    <SecuredLayout>
      <div className="text-white">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p>This is a placeholder for the Settings page.</p>
      </div>
    </SecuredLayout>
  );
};

export default SettingsPage;
