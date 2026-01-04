import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import type { Group, ImageItem as ImageItemType } from '@/types';
import { useApp } from '@/context/AppContext';
import { ImageItem } from './ImageItem';
import { DropGhost } from './DropGhost';
import { IconButton } from '@/components/common/IconButton';
import { Icon } from '@/components/common/Icon';
import styles from './GroupCard.module.css';

// Custom MIME type for internal drags - must match ImageItem
const INTERNAL_DRAG_TYPE = 'application/x-collector-internal';

interface GroupCardProps {
  group: Group;
  onPreviewImage: (image: ImageItemType, groupId?: string | null) => void;
  onEditDirectory: (groupId: string, currentDir?: string) => void;
  onGallery: (groupId: string) => void;
}

export function GroupCard({ group, onPreviewImage, onEditDirectory, onGallery }: GroupCardProps) {
  const {
    viewMode,
    updateGroup,
    deleteGroup,
    selectAll,
    selectedUrls,
    dragState,
    moveImages,
    reorderInGroup,
    settings,
    requestDropIntent,
  } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(group.collapsed ?? false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [isDragOver, setIsDragOver] = useState(false);
  const [ghostIndex, setGhostIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Clear drag-over state when drag ends globally
  useEffect(() => {
    if (!dragState.isDragging) {
      setIsDragOver(false);
      setGhostIndex(null);
    }
  }, [dragState.isDragging]);

  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    updateGroup(group.id, { collapsed: newCollapsed });
  };

  const handleNameSubmit = () => {
    if (editName.trim() && editName !== group.name) {
      updateGroup(group.id, { name: editName.trim() });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setEditName(group.name);
      setIsEditing(false);
    }
  };

  const selectedCount = group.images.filter((img) => selectedUrls.has(img.url)).length;
  const displayPath = group.directory || group.name;

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
    if (!listRef.current) return group.images.length;

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
    return group.images.length;
  };

  const handleDragOver = (e: React.DragEvent) => {
    // Handle internal drags (reordering/moving between groups)
    if (isInternalDrag(e)) {
      e.preventDefault();
      // Show drop zone if dragging from different source OR within same group for reorder
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
    // Only clear if we're actually leaving the group card
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

        // Moving between groups
        if (sourceGroupId !== group.id) {
          // Calculate the insertion index for cross-group moves
          const toIndex = calculateInsertionIndex(e);

          // Check if we should show the intent modal
          // Show modal if: dragged item is selected AND there are other selected items
          const isSelected = selectedUrls.has(draggedUrl);
          const selectedCount = selectedUrls.size;

          if (isSelected && selectedCount > 1) {
            // Show modal to ask user intent
            requestDropIntent(draggedUrl, [...selectedUrls], group.id, toIndex);
          } else {
            // Just move the dragged item(s) to the specific position
            moveImages(dragState.draggedUrls, group.id, toIndex);
          }
        } else {
          // Reordering within same group
          const toIndex = calculateInsertionIndex(e);
          if (sourceIndex !== toIndex && sourceIndex !== toIndex - 1) {
            reorderInGroup(group.id, sourceIndex, toIndex > sourceIndex ? toIndex - 1 : toIndex);
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
      className={clsx(
        styles.groupCard,
        isCollapsed && styles.collapsed,
        isDragOver && styles.dragOver
      )}
      style={{ '--group-color': group.color } as React.CSSProperties}
      data-group-id={group.id}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.header}>
        <div className={styles.info}>
          <button className={styles.collapseToggle} onClick={toggleCollapse}>
            <Icon name={isCollapsed ? 'chevron-right' : 'chevron-down'} size={14} />
          </button>
          <span className={styles.colorDot} style={{ backgroundColor: group.color }} />
          {isEditing ? (
            <input
              type="text"
              className={styles.nameInput}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          ) : (
            <span className={styles.name} onDoubleClick={() => setIsEditing(true)}>
              {group.name}
            </span>
          )}
          <span className={styles.count}>({group.images.length})</span>
        </div>

        <div className={styles.path}>
          <span className={styles.pathText} title={displayPath}>
            {displayPath}
          </span>
          <IconButton
            icon="pencil"
            size="sm"
            variant="ghost"
            onClick={() => onEditDirectory(group.id, group.directory)}
            title="Edit folder path"
          />
        </div>

        <div className={styles.actions}>
          {selectedCount > 0 && (
            <span className={styles.selectionCount}>{selectedCount} selected</span>
          )}
          <IconButton
            icon="play"
            size="sm"
            variant="ghost"
            onClick={() => onGallery(group.id)}
            title="View in gallery"
            disabled={group.images.length === 0}
          />
          <IconButton
            icon="check-circle"
            size="sm"
            variant="ghost"
            onClick={() => selectAll(group.id)}
            title="Select all in group"
          />
          <IconButton
            icon="trash"
            size="sm"
            variant="danger"
            onClick={() => deleteGroup(group.id)}
            title="Delete group"
          />
        </div>
      </div>

      {!isCollapsed && (
        <ul ref={listRef} className={clsx(styles.imageList, styles[viewMode])}>
          {group.images.map((image, index) => {
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
                <ImageItem
                  image={image}
                  groupId={group.id}
                  index={index}
                  onPreview={onPreviewImage}
                />
              </React.Fragment>
            );
          })}
          {/* Show ghost at end if dropping at end (only for non-empty groups) */}
          {group.images.length > 0 &&
            ghostIndex === group.images.length &&
            dragState.isDragging && (
              <DropGhost
                count={dragState.draggedUrls.length}
                viewMode={viewMode}
                thumbnailSize={
                  viewMode === 'list' ? settings.listThumbnailSize : settings.gridThumbnailSize
                }
              />
            )}
          {/* Empty group states */}
          {group.images.length === 0 && !dragState.isDragging && (
            <li className={styles.emptyGroup}>Drop images here or select images to add</li>
          )}
          {group.images.length === 0 && dragState.isDragging && (
            <DropGhost
              count={dragState.draggedUrls.length}
              viewMode={viewMode}
              thumbnailSize={
                viewMode === 'list' ? settings.listThumbnailSize : settings.gridThumbnailSize
              }
            />
          )}
        </ul>
      )}
    </div>
  );
}
