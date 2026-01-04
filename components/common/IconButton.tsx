import { IconButton as RadixIconButton } from '@radix-ui/themes';
import { Icon } from './Icon';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'default' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  label?: string;
}

type RadixVariant = 'solid' | 'soft' | 'outline' | 'ghost';
type RadixColor = 'blue' | 'gray' | 'red' | 'green';

// Map our variants to Radix IconButton props
const VARIANT_MAP: Record<
  NonNullable<IconButtonProps['variant']>,
  { variant: RadixVariant; color: RadixColor }
> = {
  primary: { variant: 'solid', color: 'blue' },
  secondary: { variant: 'soft', color: 'gray' },
  danger: { variant: 'soft', color: 'red' },
  success: { variant: 'solid', color: 'green' },
  ghost: { variant: 'ghost', color: 'gray' },
  default: { variant: 'ghost', color: 'gray' },
};

// Map our sizes to Radix sizes
const SIZE_MAP: Record<string, '1' | '2' | '3'> = {
  sm: '1',
  md: '2',
  lg: '3',
};

export function IconButton({
  icon,
  variant = 'default',
  size = 'md',
  active,
  label,
  className,
  title,
  disabled,
  ...props
}: IconButtonProps) {
  const radixProps: { variant: RadixVariant; color: RadixColor } = active
    ? { variant: 'soft', color: 'blue' }
    : VARIANT_MAP[variant ?? 'default'];
  const radixSize = SIZE_MAP[size] || '2';
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  return (
    <RadixIconButton
      size={radixSize}
      variant={radixProps.variant}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      color={radixProps.color as any}
      disabled={disabled}
      className={className}
      title={title || label}
      aria-label={label || title}
      {...props}
    >
      <Icon name={icon} size={iconSize} />
    </RadixIconButton>
  );
}
