import { useState, useEffect } from 'react';
import { Flex, Text, TextField } from '@radix-ui/themes';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/common/Button';
import { Modal } from './Modal';

interface DirectoryEditModalProps {
  isOpen: boolean;
  groupId?: string;
  currentValue?: string;
  onClose: () => void;
}

export function DirectoryEditModal({
  isOpen,
  groupId,
  currentValue,
  onClose,
}: DirectoryEditModalProps) {
  const { updateGroup, updateSettings } = useApp();
  const [directory, setDirectory] = useState(currentValue ?? '');

  useEffect(() => {
    setDirectory(currentValue ?? '');
  }, [currentValue, isOpen]);

  const handleSave = async () => {
    if (groupId) {
      await updateGroup(groupId, { directory: directory.trim() || undefined });
    } else {
      await updateSettings({ ungroupedDirectory: directory.trim() });
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  const title = groupId ? 'Custom Download Folder' : 'Ungrouped Download Folder';
  const hint = groupId
    ? 'Leave empty to use the group name as the folder name.'
    : 'Leave empty to use "Ungrouped" as the folder name.';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="400px">
      <Flex direction="column" gap="3">
        <Text size="2" color="gray">
          {hint}
        </Text>
        <TextField.Root
          value={directory}
          onChange={(e) => setDirectory(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., photos/vacation"
          autoFocus
        />
      </Flex>

      <Flex gap="3" mt="4" justify="end">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save
        </Button>
      </Flex>
    </Modal>
  );
}
