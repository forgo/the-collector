import clsx from 'clsx';
import styles from './DropGhost.module.css';

interface DropGhostProps {
  count: number;
  viewMode: 'list' | 'grid';
  thumbnailSize: number;
}

export function DropGhost({ count, viewMode, thumbnailSize }: DropGhostProps) {
  return (
    <li
      className={clsx(styles.dropGhost, styles[viewMode])}
      style={
        {
          '--thumb-size': `${thumbnailSize}px`,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <div className={styles.inner}>
        {count > 1 ? (
          <div className={styles.summary}>
            <span className={styles.count}>{count}</span>
            <span className={styles.label}>images</span>
          </div>
        ) : (
          <div className={styles.single}>
            <span className={styles.icon}>📷</span>
          </div>
        )}
      </div>
    </li>
  );
}
