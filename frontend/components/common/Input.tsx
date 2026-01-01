import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input: React.FC<InputProps> = ({ className, ...props }) => {
  return (
    <input
      className={`block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm
        focus:outline-none focus:ring-brand-primary focus:border-brand-primary
        ${className}`}
      {...props}
    />
  );
};
export default Input;
