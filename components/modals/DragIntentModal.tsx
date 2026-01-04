import { Button } from '@/components/common/Button';
import styles from './DragIntentModal.module.css';

interface DragIntentModalProps {
  isOpen: boolean;
  selectedCount: number;
  onMoveOne: () => void;
  onMoveAll: () => void;
  onCancel: () => void;
}

export function DragIntentModal({
  isOpen,
  selectedCount,
  onMoveOne,
  onMoveAll,
  onCancel,
}: DragIntentModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Move Selection?</h3>
        </div>

        <p className={styles.message}>
          You have {selectedCount} images selected. Would you like to move them all or just this
          one?
        </p>

        <div className={styles.buttons}>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="default" onClick={onMoveOne}>
            Just This One
          </Button>
          <Button variant="primary" onClick={onMoveAll}>
            Move All ({selectedCount})
          </Button>
        </div>
      </div>
    </div>
  );
}
