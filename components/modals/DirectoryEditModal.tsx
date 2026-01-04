import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/common/Button';
import styles from './DirectoryEditModal.module.css';

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
    <Modal isOpen={isOpen} onClose={onClose} title={title} className={styles.modal}>
      <div className={styles.dialog}>
        <p className={styles.hint}>{hint}</p>
        <input
          type="text"
          value={directory}
          onChange={(e) => setDirectory(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., photos/vacation"
          autoFocus
        />
        <div className={styles.buttons}>
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
