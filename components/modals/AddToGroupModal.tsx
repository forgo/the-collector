import { useState } from 'react';
import { Flex, Text, TextField, Separator, Heading } from '@radix-ui/themes';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/common/Button';
import { Modal } from './Modal';
import styles from './AddToGroupModal.module.css';

interface AddToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddToGroupModal({ isOpen, onClose }: AddToGroupModalProps) {
  const { groups, selectedUrls, createGroup, moveImages } = useApp();
  const [newGroupName, setNewGroupName] = useState('');

  const selectedCount = selectedUrls.size;

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    const group = await createGroup(newGroupName.trim());
    if (selectedUrls.size > 0) {
      await moveImages([...selectedUrls], group.id);
    }
    setNewGroupName('');
    onClose();
  };

  const handleAddToExisting = async (groupId: string) => {
    await moveImages([...selectedUrls], groupId);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateGroup();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="400px">
      <Heading size="4" mb="4">
        {selectedCount > 0 ? (
          <>
            Add <Text color="blue">{selectedCount}</Text> image{selectedCount !== 1 ? 's' : ''} to
            group
          </>
        ) : (
          <>Create new group</>
        )}
      </Heading>

      <Flex direction="column" gap="4">
        <Flex direction="column" gap="2">
          <Text as="label" size="2" weight="medium">
            Create new group:
          </Text>
          <Flex gap="2">
            <TextField.Root
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter group name..."
              autoFocus
              style={{ flex: 1 }}
            />
            <Button variant="primary" onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
              Create
            </Button>
          </Flex>
        </Flex>

        {groups.length > 0 && selectedCount > 0 && (
          <>
            <Flex align="center" gap="3">
              <Separator size="4" />
              <Text size="2" color="gray">
                or
              </Text>
              <Separator size="4" />
            </Flex>

            <Flex direction="column" gap="2">
              <Text as="label" size="2" weight="medium">
                Add to existing group:
              </Text>
              <Flex direction="column" gap="1" className={styles.existingGroupsList}>
                {groups.map((group) => (
                  <button
                    key={group.id}
                    className={styles.existingGroupBtn}
                    onClick={() => handleAddToExisting(group.id)}
                  >
                    <span
                      className={styles.groupColorDot}
                      style={{ backgroundColor: group.color }}
                    />
                    <span className={styles.groupName}>{group.name}</span>
                    <Text size="1" color="gray">
                      ({group.images.length})
                    </Text>
                  </button>
                ))}
              </Flex>
            </Flex>
          </>
        )}
      </Flex>

      <Flex gap="3" mt="4" justify="end">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </Flex>
    </Modal>
  );
}
