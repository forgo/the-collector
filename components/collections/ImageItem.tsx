import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import type { ImageItem as ImageItemType } from '@/types';
import { useApp } from '@/context/AppContext';
import { IconButton } from '@/components/common/IconButton';
import styles from './ImageItem.module.css';

// Custom MIME type for internal drags - distinguishes from external drops
const INTERNAL_DRAG_TYPE = 'application/x-collector-internal';

interface ImageItemProps {
  image: ImageItemType;
  groupId?: string;
  index: number;
  onPreview: (image: ImageItemType, groupId?: string | null) => void;
}

export function ImageItem({ image, groupId, index, onPreview }: ImageItemProps) {
  const {
    selectedUrls,
    toggleSelection,
    removeImage,
    settings,
    viewMode,
    startDrag,
    endDrag,
    dragState,
    updateImageFilename,
  } = useApp();
  const [imageError, setImageError] = useState(false);
  const [dragOver, setDragOver] = useState<'before' | 'after' | null>(null);

  // Editable filename state
  const displayFilename = image.customFilename || image.filename;
  const extMatch = displayFilename.match(/(\.[^.]+)$/);
  const extension = extMatch ? extMatch[1] : image.extension || '';
  const nameWithoutExt = extension ? displayFilename.slice(0, -extension.length) : displayFilename;

  const [editingName, setEditingName] = useState(nameWithoutExt);
  const [originalName, setOriginalName] = useState(nameWithoutExt);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local state when image changes
  useEffect(() => {
    const newDisplayFilename = image.customFilename || image.filename;
    const newExtMatch = newDisplayFilename.match(/(\.[^.]+)$/);
    const newExt = newExtMatch ? newExtMatch[1] : image.extension || '';
    const newName = newExt ? newDisplayFilename.slice(0, -newExt.length) : newDisplayFilename;
    setEditingName(newName);
    setOriginalName(newName);
  }, [image.customFilename, image.filename, image.extension]);

  const isSelected = selectedUrls.has(image.url);
  const isDragging = dragState.isDragging && dragState.draggedUrls.includes(image.url);
  const thumbnailSize =
    viewMode === 'list' ? settings.listThumbnailSize : settings.gridThumbnailSize;

  // Check if item was recently added (within last 2 seconds)
  const isNewlyAdded = image.addedAt && Date.now() - image.addedAt < 2000;
  const itemRef = useRef<HTMLLIElement>(null);

  // Scroll newly added items into view
  useEffect(() => {
    if (isNewlyAdded && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isNewlyAdded]);

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      toggleSelection(image.url);
    } else {
      onPreview(image, groupId ?? null);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeImage(image.url, groupId);
  };

  // Filename editing handlers
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
      // Reset to original if empty
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
    }
  };

  const handleFilenameClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering preview
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    // Use custom MIME type to distinguish internal drags
    e.dataTransfer.setData(
      INTERNAL_DRAG_TYPE,
      JSON.stringify({
        url: image.url,
        sourceGroupId: groupId ?? null,
        sourceIndex: index,
      })
    );
    startDrag(image.url, groupId ?? null);
  };

  const handleDragEnd = () => {
    endDrag();
    setDragOver(null);
  };

  // Check if this is an internal drag (from within the extension)
  const isInternalDrag = (e: React.DragEvent) => {
    return e.dataTransfer.types.includes(INTERNAL_DRAG_TYPE);
  };

  const handleDragOver = (e: React.DragEvent) => {
    // Only handle internal drags - let external ones bubble up
    if (!isInternalDrag(e)) return;
    if (!dragState.isDragging) return;

    e.preventDefault();
    // Don't stop propagation - section needs to know about drag

    // Don't allow dropping on self
    if (dragState.draggedUrl === image.url) return;

    // Determine drop position based on mouse location
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = viewMode === 'list' ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
    const position = viewMode === 'list' ? e.clientY : e.clientX;

    setDragOver(position < midpoint ? 'before' : 'after');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving this element
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
      return;
    }
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    // Only handle internal drags - let external ones bubble up to document
    if (!isInternalDrag(e)) return;
    if (!dragState.isDragging) {
      setDragOver(null);
      return;
    }

    e.preventDefault();
    // Don't stop propagation here - let it bubble to section handler
    setDragOver(null);
  };

  return (
    <li
      ref={itemRef}
      className={clsx(
        styles.imageItem,
        styles[viewMode],
        isSelected && styles.selected,
        isDragging && styles.dragging,
        dragOver === 'before' && styles.dragOverBefore,
        dragOver === 'after' && styles.dragOverAfter,
        isNewlyAdded && styles.newlyAdded
      )}
      onClick={handleClick}
      draggable
      data-url={image.url}
      data-index={index}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.checkboxWrapper} onClick={handleCheckboxClick}>
        <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(image.url)} />
      </div>

      <div
        className={styles.thumbnail}
        style={{
          width: thumbnailSize,
          height: viewMode === 'grid' ? thumbnailSize : 'auto',
        }}
      >
        {!imageError ? (
          <img
            src={image.url}
            alt={image.filename}
            loading="lazy"
            onError={(e) => {
              console.log('[ImageItem] Failed to load:', image.url);
              console.log('[ImageItem] Error event:', e);
              setImageError(true);
            }}
          />
        ) : (
          <div className={styles.thumbnailError}>Failed to load</div>
        )}
      </div>

      <div className={styles.info}>
        {viewMode === 'list' ? (
          <div className={styles.filenameEdit} onClick={handleFilenameClick}>
            <input
              ref={inputRef}
              type="text"
              className={styles.filenameInput}
              value={editingName}
              onChange={handleFilenameChange}
              onBlur={handleFilenameSave}
              onKeyDown={handleFilenameKeyDown}
              title={displayFilename}
            />
            <span className={styles.filenameExtension}>{extension}</span>
          </div>
        ) : (
          <span className={styles.filename} title={displayFilename}>
            {displayFilename}
          </span>
        )}
        {settings.showDimensions && image.width && image.height && (
          <span className={styles.dimensions}>
            {image.width} × {image.height}
          </span>
        )}
        {settings.showFiletype && image.extension && (
          <span className={styles.filetype}>{image.extension.replace('.', '').toUpperCase()}</span>
        )}
      </div>

      <div className={styles.actions}>
        <IconButton
          icon="eye"
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(image, groupId ?? null);
          }}
          title="Preview"
        />
        <IconButton icon="trash" size="sm" variant="danger" onClick={handleRemove} title="Remove" />
      </div>
    </li>
  );
}
