import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import type { ImageItem as ImageItemType } from '@/types';
import { useApp } from '@/context/AppContext';
import { ImageItem } from './ImageItem';
import { DropGhost } from './DropGhost';
import { IconButton } from '@/components/common/IconButton';
import styles from './UngroupedSection.module.css';

// Custom MIME type for internal drags - must match ImageItem
const INTERNAL_DRAG_TYPE = 'application/x-collector-internal';

interface UngroupedSectionProps {
  onPreviewImage: (image: ImageItemType, groupId?: string | null) => void;
  onEditDirectory: () => void;
}

export function UngroupedSection({ onPreviewImage, onEditDirectory }: UngroupedSectionProps) {
  const {
    ungrouped,
    viewMode,
    settings,
    selectAll,
    deselectAll,
    clearUngrouped,
    selectedUrls,
    reorderInGroup,
    dragState,
    moveImages,
    requestDropIntent,
  } = useApp();
  const [isDragOver, setIsDragOver] = useState(false);
  const [ghostIndex, setGhostIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedCount = ungrouped.filter((img) => selectedUrls.has(img.url)).length;
  const displayPath = settings.ungroupedDirectory || 'Downloads/Ungrouped';

  // Clear drag-over state when drag ends globally
  useEffect(() => {
    if (!dragState.isDragging) {
      setIsDragOver(false);
      setGhostIndex(null);
    }
  }, [dragState.isDragging]);

  // Check if this is an internal drag
  const isInternalDrag = (e: React.DragEvent) => {
    return e.dataTransfer.types.includes(INTERNAL_DRAG_TYPE);
  };

  // Check if this is an external drag (images from outside the extension)
  const isExternalDrag = (e: React.DragEvent) => {
    const dt = e.dataTransfer;
    if (!dt) return false;
    const hasExternalContent =
      dt.types.includes('text/html') ||
      dt.types.includes('text/uri-list') ||
      dt.types.includes('Files');
    return hasExternalContent && !isInternalDrag(e);
  };

  // Calculate insertion index based on mouse position over items
  const calculateInsertionIndex = (e: React.DragEvent): number => {
    if (!listRef.current) return ungrouped.length;

    const items = listRef.current.querySelectorAll('[data-index]');
    if (items.length === 0) return 0;

    const mouseY = e.clientY;
    const mouseX = e.clientX;

    // Check if cursor is before the first non-dragged item
    const firstNonDraggedItem = Array.from(items).find(
      (item) => !item.classList.contains(styles.dragging)
    ) as HTMLElement | undefined;

    if (firstNonDraggedItem) {
      const firstRect = firstNonDraggedItem.getBoundingClientRect();
      const firstStart = viewMode === 'list' ? firstRect.top : firstRect.left;
      const position = viewMode === 'list' ? mouseY : mouseX;

      // If cursor is before the start of the first item, insert at index 0
      if (position < firstStart) {
        return 0;
      }
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i] as HTMLElement;
      // Skip dragged items
      if (item.classList.contains(styles.dragging)) continue;

      const rect = item.getBoundingClientRect();
      const midpoint =
        viewMode === 'list' ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
      const position = viewMode === 'list' ? mouseY : mouseX;

      if (position < midpoint) {
        return parseInt(item.getAttribute('data-index') || '0', 10);
      }
    }

    // If we're past all items, insert at end
    return ungrouped.length;
  };

  const handleDragOver = (e: React.DragEvent) => {
    // Handle internal drags (reordering/moving between groups)
    if (isInternalDrag(e)) {
      e.preventDefault();
      // Show drop zone if dragging from a group (moving to ungrouped)
      // or from ungrouped itself (reordering)
      if (dragState.isDragging) {
        setIsDragOver(true);
        // Calculate and update ghost position
        const newIndex = calculateInsertionIndex(e);
        setGhostIndex(newIndex);
      }
      return;
    }

    // Handle external drags (images from webpages)
    if (isExternalDrag(e)) {
      e.preventDefault();
      setIsDragOver(true);
      // Don't stop propagation - let it bubble to document for overlay
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the section
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
      return;
    }
    setIsDragOver(false);
    setGhostIndex(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    setIsDragOver(false);
    setGhostIndex(null);

    // Handle internal drags
    if (isInternalDrag(e)) {
      e.preventDefault();
      e.stopPropagation(); // Prevent document handler for internal drops

      if (!dragState.isDragging) return;

      try {
        const data = JSON.parse(e.dataTransfer.getData(INTERNAL_DRAG_TYPE));
        const sourceGroupId = data.sourceGroupId;
        const sourceIndex = data.sourceIndex;
        const draggedUrl = data.url;

        // Moving from a group to ungrouped
        if (sourceGroupId !== null) {
          // Calculate the insertion index for cross-group moves
          const toIndex = calculateInsertionIndex(e);

          // Check if we should show the intent modal
          // Show modal if: dragged item is selected AND there are other selected items
          const isSelected = selectedUrls.has(draggedUrl);
          const selectedCount = selectedUrls.size;

          if (isSelected && selectedCount > 1) {
            // Show modal to ask user intent
            requestDropIntent(draggedUrl, [...selectedUrls], null, toIndex);
          } else {
            // Just move the dragged item(s) to the specific position
            moveImages(dragState.draggedUrls, null, toIndex);
          }
        } else {
          // Reordering within ungrouped
          const toIndex = calculateInsertionIndex(e);
          if (sourceIndex !== toIndex && sourceIndex !== toIndex - 1) {
            reorderInGroup(null, sourceIndex, toIndex > sourceIndex ? toIndex - 1 : toIndex);
          }
        }
      } catch {
        // Ignore parse errors
      }
      return;
    }

    // External drops bubble up to document handler
  };

  return (
    <div
      className={clsx(styles.section, isDragOver && styles.dragOver)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.header}>
        <div className={styles.info}>
          <div className={styles.infoRow}>
            <span className={styles.title}>Ungrouped</span>
            <span className={styles.count}>({ungrouped.length})</span>
          </div>
          <div className={styles.path}>
            {displayPath}
            <IconButton
              icon="pencil"
              size="sm"
              variant="ghost"
              onClick={onEditDirectory}
              title="Edit folder path"
            />
          </div>
        </div>
        <div className={styles.actions}>
          {selectedCount > 0 && (
            <span className={styles.selectionCount}>{selectedCount} selected</span>
          )}
          {ungrouped.length > 0 && (
            <>
              <IconButton
                icon="check-circle"
                size="sm"
                onClick={() => selectAll()}
                title="Select all ungrouped images"
              />
              <IconButton
                icon="x-circle"
                size="sm"
                onClick={deselectAll}
                title="Deselect all ungrouped images"
              />
              <IconButton
                icon="trash"
                size="sm"
                variant="danger"
                onClick={clearUngrouped}
                title="Remove all ungrouped images"
              />
            </>
          )}
        </div>
      </div>

      <ul ref={listRef} className={clsx(styles.imageList, styles[viewMode])}>
        {ungrouped.map((image, index) => {
          const isDraggedItem = dragState.isDragging && dragState.draggedUrls.includes(image.url);
          return (
            <React.Fragment key={image.url}>
              {/* Show ghost before this item if appropriate */}
              {ghostIndex === index && dragState.isDragging && !isDraggedItem && (
                <DropGhost
                  count={dragState.draggedUrls.length}
                  viewMode={viewMode}
                  thumbnailSize={
                    viewMode === 'list' ? settings.listThumbnailSize : settings.gridThumbnailSize
                  }
                />
              )}
              <ImageItem image={image} index={index} onPreview={onPreviewImage} />
            </React.Fragment>
          );
        })}
        {/* Show ghost at end if dropping at end (only for non-empty lists) */}
        {ungrouped.length > 0 && ghostIndex === ungrouped.length && dragState.isDragging && (
          <DropGhost
            count={dragState.draggedUrls.length}
            viewMode={viewMode}
            thumbnailSize={
              viewMode === 'list' ? settings.listThumbnailSize : settings.gridThumbnailSize
            }
          />
        )}
        {/* Empty state */}
        {ungrouped.length === 0 && !dragState.isDragging && (
          <li className={styles.emptyState}>Drop images here or collect from webpages</li>
        )}
        {/* Ghost for empty state during drag */}
        {ungrouped.length === 0 && dragState.isDragging && (
          <DropGhost
            count={dragState.draggedUrls.length}
            viewMode={viewMode}
            thumbnailSize={
              viewMode === 'list' ? settings.listThumbnailSize : settings.gridThumbnailSize
            }
          />
        )}
      </ul>
    </div>
  );
}
