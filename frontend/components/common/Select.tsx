import React from 'react';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  containerClassName?: string;
}

const Select: React.FC<SelectProps> = ({
  className,
  label,
  options,
  id,
  containerClassName,
  ...props
}) => {
  const selectId = id || props.name;

  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-gray-300 text-sm font-bold mb-2"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`block w-full appearance-none px-4 py-2 border border-gray-600 rounded-lg shadow-sm
            focus:outline-none focus:ring-brand-primary focus:border-brand-primary
            bg-brand-dark/50 text-white
            ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Select;
