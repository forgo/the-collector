import { Button as RadixButton } from '@radix-ui/themes';
import { Icon } from './Icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'default' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconPosition?: 'left' | 'right';
  children?: React.ReactNode;
}

type RadixVariant = 'solid' | 'soft' | 'outline' | 'ghost';
type RadixColor = 'blue' | 'gray' | 'red' | 'green';

// Map our variants to Radix Button props
const VARIANT_MAP: Record<
  NonNullable<ButtonProps['variant']>,
  { variant: RadixVariant; color: RadixColor }
> = {
  primary: { variant: 'solid', color: 'blue' },
  secondary: { variant: 'soft', color: 'gray' },
  danger: { variant: 'soft', color: 'red' },
  success: { variant: 'solid', color: 'green' },
  ghost: { variant: 'ghost', color: 'gray' },
  default: { variant: 'outline', color: 'gray' },
};

// Map our sizes to Radix sizes
const SIZE_MAP: Record<string, '1' | '2' | '3'> = {
  sm: '1',
  md: '2',
  lg: '3',
};

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
  const radixProps: { variant: RadixVariant; color: RadixColor } =
    VARIANT_MAP[variant ?? 'default'];
  const radixSize = SIZE_MAP[size] || '2';
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  return (
    <RadixButton
      size={radixSize}
      variant={radixProps.variant}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      color={radixProps.color as any}
      disabled={disabled}
      className={className}
      {...props}
    >
      {icon && iconPosition === 'left' && <Icon name={icon} size={iconSize} />}
      {children}
      {icon && iconPosition === 'right' && <Icon name={icon} size={iconSize} />}
    </RadixButton>
  );
}
