import React from 'react';

// Extend the standard input attributes
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; // Optional label
  icon?: React.ReactNode; // Optional left icon
  rightElement?: React.ReactNode; // Optional right element
  containerClassName?: string; // Optional class for the container div
}

const Input: React.FC<InputProps> = ({
  className,
  label,
  icon,
  rightElement,
  id,
  containerClassName,
  ...props
}) => {
  const inputId = id || props.name;

  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-gray-300 text-sm font-bold mb-2"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`block w-full py-2 border border-gray-600 rounded-lg shadow-sm
            focus:outline-none focus:ring-brand-primary focus:border-brand-primary
            bg-brand-dark/50 text-white
            ${icon ? 'pl-10' : 'px-4'} 
            ${rightElement ? 'pr-10' : ''}
            ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
};

export default Input;
