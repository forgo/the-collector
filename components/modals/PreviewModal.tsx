import { useState, useRef, useEffect, useMemo } from 'react';
import type { ImageItem } from '@/types';
import { useApp } from '@/context/AppContext';
import { splitFilenameWithFallback } from '@/lib/filename';
import styles from './PreviewModal.module.css';

interface PreviewModalProps {
  image: ImageItem | null;
  groupId?: string | null;
  onClose: () => void;
}

export function PreviewModal({ image, groupId, onClose }: PreviewModalProps) {
  const { updateImageFilename } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse filename - use robust parsing that only recognizes valid image extensions
  const displayFilename = image?.customFilename || image?.filename || '';
  const { name: nameWithoutExt, extension } = useMemo(
    () => splitFilenameWithFallback(displayFilename, image?.extension || ''),
    [displayFilename, image?.extension]
  );

  const [editingName, setEditingName] = useState(nameWithoutExt);
  const [originalName, setOriginalName] = useState(nameWithoutExt);

  // Update local state when image changes
  useEffect(() => {
    if (image) {
      const newDisplayFilename = image.customFilename || image.filename;
      const { name: newName } = splitFilenameWithFallback(
        newDisplayFilename,
        image.extension || ''
      );
      setEditingName(newName);
      setOriginalName(newName);
    }
  }, [image]);

  if (!image) return null;

  const handleFilenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingName(e.target.value);
  };

  const handleFilenameSave = () => {
    const trimmedName = editingName.trim();
    if (trimmedName && trimmedName !== originalName) {
      const newFullFilename = trimmedName + extension;
      updateImageFilename(image.url, newFullFilename, groupId ?? null);
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
        <div className={styles.filenameEdit}>
          <input
            ref={inputRef}
            type="text"
            className={styles.filenameInput}
            value={editingName}
            onChange={handleFilenameChange}
            onBlur={handleFilenameSave}
            onKeyDown={handleFilenameKeyDown}
            title="Edit filename"
          />
          <span className={styles.filenameExtension}>{extension}</span>
        </div>
        {image.extension && (
          <div className={styles.type}>{image.extension.replace('.', '').toUpperCase()}</div>
        )}
      </div>
    </div>
  );
}
