import { useState, useEffect, useCallback } from 'react';
import { Flex, Text, Badge, Checkbox, ScrollArea, Heading } from '@radix-ui/themes';
import { Button } from '@/components/common/Button';
import { Modal } from './Modal';
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

// Hint badge colors
const HINT_COLORS: Record<string, 'green' | 'orange' | 'gray'> = {
  [ITEM_HINTS.PRIMARY]: 'green',
  [ITEM_HINTS.DUPLICATE]: 'orange',
  [ITEM_HINTS.UI_ELEMENT]: 'gray',
};

const HINT_LABELS: Record<string, string> = {
  [ITEM_HINTS.PRIMARY]: 'Primary',
  [ITEM_HINTS.DUPLICATE]: 'Duplicate',
  [ITEM_HINTS.UI_ELEMENT]: 'UI Element',
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

  const selectedCount = selectedIndices.size;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="500px">
      <Flex justify="between" align="center" mb="3">
        <Heading size="4">Select Images to Add</Heading>
        <Text size="2" color="gray">
          {selectedCount} of {items.length} selected
        </Text>
      </Flex>

      <Flex gap="2" mb="3">
        <Button size="sm" variant="ghost" onClick={selectAll}>
          Select All
        </Button>
        <Button size="sm" variant="ghost" onClick={selectNone}>
          Select None
        </Button>
        <Button size="sm" variant="ghost" onClick={selectRecommended}>
          Recommended
        </Button>
      </Flex>

      <ScrollArea style={{ height: '300px' }}>
        <Flex direction="column" gap="2">
          {items.map((item, index) => {
            const isSelected = selectedIndices.has(index);
            const hasError = imageErrors.has(index);

            return (
              <Flex
                key={index}
                className={styles.item}
                data-selected={isSelected}
                gap="3"
                align="center"
                p="2"
                onClick={() => toggleSelection(index)}
                style={{ cursor: 'pointer' }}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelection(index)}
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

                <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 0 }}>
                  <Text size="2" weight="medium" truncate title={item.url}>
                    {item.filename || 'Unknown'}
                  </Text>
                  <Flex gap="1" wrap="wrap">
                    {item.format && (
                      <Badge size="1" variant="soft">
                        {item.format.toUpperCase()}
                      </Badge>
                    )}
                    <Badge size="1" variant="soft" color="gray">
                      {SOURCE_LABELS[item.source] || item.source}
                    </Badge>
                    {HINT_LABELS[item.hint] && (
                      <Badge size="1" variant="soft" color={HINT_COLORS[item.hint]}>
                        {HINT_LABELS[item.hint]}
                      </Badge>
                    )}
                  </Flex>
                </Flex>
              </Flex>
            );
          })}
        </Flex>
      </ScrollArea>

      <Flex gap="3" mt="4" justify="end">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={selectedCount === 0}>
          Add Selected {selectedCount > 0 && `(${selectedCount})`}
        </Button>
      </Flex>
    </Modal>
  );
}
