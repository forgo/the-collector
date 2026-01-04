import { Flex, Text } from '@radix-ui/themes';
import { Button } from '@/components/common/Button';
import { Modal } from './Modal';

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
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Move Selection?" maxWidth="400px">
      <Text as="p" size="2">
        You have {selectedCount} images selected. Would you like to move them all or just this one?
      </Text>

      <Flex gap="3" mt="4" justify="end">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="default" onClick={onMoveOne}>
          Just This One
        </Button>
        <Button variant="primary" onClick={onMoveAll}>
          Move All ({selectedCount})
        </Button>
      </Flex>
    </Modal>
  );
}
