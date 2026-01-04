import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { Button } from '@/components/common/Button';
import { ITEM_HINTS, DROP_SOURCES, type ParsedDropItem } from '@/utils/drop-parser';
import styles from './DropSelectionModal.module.css';

interface DropSelectionModalProps {
  isOpen: boolean;
  items: ParsedDropItem[];
  targetGroupId?: string | null;
  onConfirm: (selectedItems: ParsedDropItem[]) => void;
  onClose: () => void;
}

// Source labels for display
const SOURCE_LABELS: Record<string, string> = {
  [DROP_SOURCES.FILE]: 'File',
  [DROP_SOURCES.HTML_IMG]: 'Image',
  [DROP_SOURCES.HTML_SVG]: 'SVG',
  [DROP_SOURCES.URI_LIST]: 'URL',
  [DROP_SOURCES.TEXT_URL]: 'Text',
  [DROP_SOURCES.EMBEDDED]: 'Embedded',
};

// Hint labels for display
const HINT_LABELS: Record<string, { text: string; className: string }> = {
  [ITEM_HINTS.PRIMARY]: { text: 'Primary', className: 'hintPrimary' },
  [ITEM_HINTS.DUPLICATE]: { text: 'Duplicate', className: 'hintDuplicate' },
  [ITEM_HINTS.UI_ELEMENT]: { text: 'UI Element', className: 'hintUi' },
};

export function DropSelectionModal({
  isOpen,
  items,
  targetGroupId: _targetGroupId,
  onConfirm,
  onClose,
}: DropSelectionModalProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  // Initialize selection when items change
  useEffect(() => {
    if (items.length > 0) {
      // Pre-select recommended items (primary and unknown, not duplicates or UI elements)
      const initialSelected = new Set<number>();
      items.forEach((item, index) => {
        if (item.hint === ITEM_HINTS.PRIMARY || item.hint === ITEM_HINTS.UNKNOWN) {
          initialSelected.add(index);
        }
      });
      setSelectedIndices(initialSelected);
      setImageErrors(new Set());
    }
  }, [items]);

  const toggleSelection = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIndices(new Set(items.map((_, i) => i)));
  }, [items]);

  const selectNone = useCallback(() => {
    setSelectedIndices(new Set());
  }, []);

  const selectRecommended = useCallback(() => {
    const recommended = new Set<number>();
    items.forEach((item, index) => {
      if (item.hint !== ITEM_HINTS.DUPLICATE && item.hint !== ITEM_HINTS.UI_ELEMENT) {
        recommended.add(index);
      }
    });
    setSelectedIndices(recommended);
  }, [items]);

  const handleConfirm = useCallback(() => {
    const selectedItems = items.filter((_, index) => selectedIndices.has(index));
    onConfirm(selectedItems);
  }, [items, selectedIndices, onConfirm]);

  const handleImageError = useCallback((index: number) => {
    setImageErrors((prev) => new Set(prev).add(index));
  }, []);

  if (!isOpen) return null;

  const selectedCount = selectedIndices.size;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Select Images to Add</h3>
          <span className={styles.count}>
            {selectedCount} of {items.length} selected
          </span>
        </div>

        <div className={styles.actions}>
          <Button size="sm" variant="ghost" onClick={selectAll}>
            Select All
          </Button>
          <Button size="sm" variant="ghost" onClick={selectNone}>
            Select None
          </Button>
          <Button size="sm" variant="ghost" onClick={selectRecommended}>
            Recommended
          </Button>
        </div>

        <div className={styles.items}>
          {items.map((item, index) => {
            const isSelected = selectedIndices.has(index);
            const hasError = imageErrors.has(index);
            const hintInfo = HINT_LABELS[item.hint];

            return (
              <div
                key={index}
                className={clsx(styles.item, isSelected && styles.selected)}
                onClick={() => toggleSelection(index)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(index)}
                  onClick={(e) => e.stopPropagation()}
                />

                <div className={styles.thumb}>
                  {!hasError ? (
                    <img
                      src={item.url}
                      alt={item.filename || 'Image'}
                      onError={() => handleImageError(index)}
                    />
                  ) : (
                    <span className={styles.thumbError}>{(item.format || '?').toUpperCase()}</span>
                  )}
                </div>

                <div className={styles.info}>
                  <div className={styles.filename} title={item.url}>
                    {item.filename || 'Unknown'}
                  </div>
                  <div className={styles.meta}>
                    {item.format && (
                      <span className={clsx(styles.badge, styles.format)}>
                        {item.format.toUpperCase()}
                      </span>
                    )}
                    <span className={clsx(styles.badge, styles.source)}>
                      {SOURCE_LABELS[item.source] || item.source}
                    </span>
                    {hintInfo && (
                      <span className={clsx(styles.badge, styles[hintInfo.className])}>
                        {hintInfo.text}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={selectedCount === 0}>
            Add Selected {selectedCount > 0 && `(${selectedCount})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
