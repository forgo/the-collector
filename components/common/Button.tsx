import clsx from 'clsx';
import { Icon } from './Icon';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'default' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconPosition?: 'left' | 'right';
  children?: React.ReactNode;
}

export function Button({
  variant = 'default',
  size = 'md',
  icon,
  iconPosition = 'left',
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

  return (
    <button
      className={clsx(
        styles.btn,
        styles[size],
        variant !== 'default' && styles[variant],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === 'left' && <Icon name={icon} size={iconSize} />}
      {children && <span>{children}</span>}
      {icon && iconPosition === 'right' && <Icon name={icon} size={iconSize} />}
    </button>
  );
}
