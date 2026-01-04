import clsx from 'clsx';
import styles from './ExternalDropOverlay.module.css';

interface ExternalDropOverlayProps {
  visible: boolean;
  message: string;
  isInvalid?: boolean;
}

export function ExternalDropOverlay({
  visible,
  message,
  isInvalid = false,
}: ExternalDropOverlayProps) {
  return (
    <div
      className={clsx(styles.overlay, {
        [styles.visible]: visible,
        [styles.invalid]: isInvalid,
      })}
    >
      <span className={styles.dropIcon}>📥</span>
      <span className={styles.dropText}>{message}</span>
    </div>
  );
}
