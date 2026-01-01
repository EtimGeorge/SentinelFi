import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'; // Example custom prop for different button styles
  size?: 'sm' | 'md' | 'lg';         // Example custom prop for different button sizes
}

const Button: React.FC<ButtonProps> = ({ className, children, variant = 'primary', size = 'md', ...props }) => {
  const baseStyles = "inline-flex items-center justify-center border border-transparent rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variantStyles = {
    primary: "text-white bg-brand-primary hover:bg-brand-primary/80", // Uses SentinelFi brand colors
    secondary: "text-brand-primary bg-white border-brand-primary hover:bg-gray-50",
  };
  const sizeStyles = {
    sm: "px-2 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
export default Button;
