import React from 'react';
import SecuredLayoutUI from './SecuredLayoutUI'; // Import the presentational component

interface SecuredLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const SecuredLayout: React.FC<SecuredLayoutProps> = ({ children, title }) => {
  return <SecuredLayoutUI title={title}>{children}</SecuredLayoutUI>;
};

export default SecuredLayout;
