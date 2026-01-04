import clsx from 'clsx';
import { Tooltip } from '@/components/common/Tooltip';
import { Icon } from '@/components/common/Icon';
import styles from './SettingItem.module.css';

interface SettingItemProps {
  label: string;
  tooltip?: string;
  checkbox?: boolean;
  children: React.ReactNode;
}

export function SettingItem({ label, tooltip, checkbox, children }: SettingItemProps) {
  return (
    <div className={clsx(styles.settingItem, checkbox && styles.checkbox)}>
      <div className={styles.label}>
        <span>{label}</span>
        {tooltip && (
          <Tooltip content={tooltip}>
            <span className={styles.info}>
              <Icon name="info" size={14} />
            </span>
          </Tooltip>
        )}
      </div>
      <div className={styles.control}>{children}</div>
    </div>
  );
}
