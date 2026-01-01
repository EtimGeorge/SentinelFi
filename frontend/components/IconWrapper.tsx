import React from 'react';
import { IconType } from 'react-icons';

interface IconWrapperProps {
  icon: IconType;
  className?: string;
  onClick?: () => void;
}

const IconWrapper: React.FC<IconWrapperProps> = ({ icon: Icon, className, onClick }) => {
  return (
    <span className={`inline-flex items-center justify-center ${className}`} onClick={onClick}>
      <Icon />
    </span>
  );
};

export default IconWrapper;
