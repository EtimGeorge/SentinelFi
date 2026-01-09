import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  className,
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles: Record<ButtonVariant, string> = {
    primary: "text-white bg-brand-primary hover:bg-brand-primary/90 focus:ring-brand-primary",
    secondary: "text-gray-300 bg-gray-700 hover:bg-gray-600 focus:ring-gray-500",
    outline: "text-gray-300 bg-transparent border border-gray-600 hover:bg-gray-800 focus:ring-gray-500",
    ghost: "text-gray-400 hover:text-white hover:bg-gray-700 focus:ring-gray-600 border-transparent",
    danger: "text-white bg-red-600 hover:bg-red-700 focus:ring-red-500",
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: "px-2 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const appliedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  return (
    <button
      className={appliedClassName}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
      {!isLoading && icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;