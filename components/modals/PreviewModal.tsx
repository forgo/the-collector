import { useState, useRef, useEffect } from 'react';
import type { ImageItem } from '@/types';
import { useApp } from '@/context/AppContext';
import styles from './PreviewModal.module.css';

interface PreviewModalProps {
  image: ImageItem | null;
  groupId?: string | null;
  onClose: () => void;
}

export function PreviewModal({ image, groupId, onClose }: PreviewModalProps) {
  const { updateImageFilename } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);

  // Edit the full filename as-is (no extension splitting)
  // Note: image.filename is base name without extension, so we append image.extension
  const displayFilename =
    image?.customFilename || (image?.filename || '') + (image?.extension || '');
  const [editingName, setEditingName] = useState(displayFilename);
  const [originalName, setOriginalName] = useState(displayFilename);

  // Update local state when image changes
  useEffect(() => {
    if (image) {
      const newDisplayFilename = image.customFilename || image.filename + (image.extension || '');
      setEditingName(newDisplayFilename);
      setOriginalName(newDisplayFilename);
    }
  }, [image]);

  if (!image) return null;

  const handleFilenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingName(e.target.value);
  };

  const handleFilenameSave = () => {
    const trimmedName = editingName.trim();
    if (trimmedName && trimmedName !== originalName) {
      updateImageFilename(image.url, trimmedName, groupId ?? null);
      setOriginalName(trimmedName);
    } else if (!trimmedName) {
      setEditingName(originalName);
    }
  };

  const handleFilenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFilenameSave();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditingName(originalName);
      inputRef.current?.blur();
      onClose();
    }
  };

  return (
    <div className={styles.previewModal} onClick={onClose}>
      <button className={styles.closeBtn} onClick={onClose}>
        &times;
      </button>
      <img src={image.url} alt={displayFilename} onClick={(e) => e.stopPropagation()} />
      <div className={styles.info} onClick={(e) => e.stopPropagation()}>
        {image.width && image.height && (
          <div className={styles.dimensions}>
            {image.width} × {image.height}
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          className={styles.filenameInput}
          value={editingName}
          onChange={handleFilenameChange}
          onBlur={handleFilenameSave}
          onKeyDown={handleFilenameKeyDown}
          title="Click to edit filename"
        />
        {image.extension && (
          <div className={styles.type}>{image.extension.replace('.', '').toUpperCase()}</div>
        )}
      </div>
    </div>
  );
}
