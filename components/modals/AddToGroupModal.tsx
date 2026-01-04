import { useState } from 'react';
import { Modal } from './Modal';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/common/Button';
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
    // Only move images if some are selected
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
    <Modal isOpen={isOpen} onClose={onClose} className={styles.modal}>
      <div className={styles.dialog}>
        <h4>
          {selectedCount > 0 ? (
            <>
              Add <span>{selectedCount}</span> image{selectedCount !== 1 ? 's' : ''} to group
            </>
          ) : (
            <>Create new group</>
          )}
        </h4>
        <div className={styles.options}>
          <div className={styles.section}>
            <label className={styles.label}>Create new group:</label>
            <div className={styles.inputRow}>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter group name..."
                autoFocus
              />
              <Button variant="primary" onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
                Create
              </Button>
            </div>
          </div>

          {groups.length > 0 && selectedCount > 0 && (
            <>
              <div className={styles.divider}>
                <span>or</span>
              </div>
              <div className={styles.section}>
                <label className={styles.label}>Add to existing group:</label>
                <div className={styles.existingGroupsList}>
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
                      <span className={styles.groupCount}>({group.images.length})</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        <button className={styles.cancelBtn} onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
