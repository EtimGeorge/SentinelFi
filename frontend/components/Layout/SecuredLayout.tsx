import React from 'react';
import SecuredLayoutUI from './SecuredLayoutUI'; // Import the presentational component

interface SecuredLayoutProps {
  children: React.ReactNode;
}

const SecuredLayout: React.FC<SecuredLayoutProps> = ({ children }) => {
  return <SecuredLayoutUI>{children}</SecuredLayoutUI>;
};

export default SecuredLayout;
