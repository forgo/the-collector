import clsx from 'clsx';
import { Icon } from './Icon';
import styles from './IconButton.module.css';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'default' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  label?: string;
}

export function IconButton({
  icon,
  variant = 'default',
  size = 'md',
  active,
  label,
  className,
  title,
  ...props
}: IconButtonProps) {
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

  return (
    <button
      className={clsx(
        styles.iconBtn,
        styles[size],
        variant !== 'default' && styles[variant],
        active && styles.active,
        className
      )}
      title={title || label}
      aria-label={label || title}
      {...props}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
}
